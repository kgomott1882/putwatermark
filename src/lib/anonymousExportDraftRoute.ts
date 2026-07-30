import {
  ANONYMOUS_DRAFTS_BUCKET,
  ANONYMOUS_DRAFT_EXPIRY_HOURS,
  createAdminClient,
} from "../../utils/supabase/admin";
import {
  type AnonymousDraftMediaKind,
  type AnonymousDraftUploadDescriptor,
  type AnonymousExportDraftState,
  isAnonymousExportDraftState,
  isValidAnonymousSessionId,
} from "./anonymousExportDraftState";
import {
  buildSignatureManifestEntry,
  normalizeSignatureKind,
  validateSignatureManifest,
} from "./signatureValidation";

export class AnonymousExportDraftError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AnonymousExportDraftError";
    this.status = status;
  }
}

const MAX_DRAFT_FILES = 50;
const MAX_DRAFT_TOTAL_BYTES = 262144000;

function sanitizeSessionId(sessionId: string) {
  const normalized = sessionId.trim();

  if (!isValidAnonymousSessionId(normalized)) {
    throw new AnonymousExportDraftError("Invalid anonymous session id.");
  }

  return normalized;
}

function getDraftExpiryIso() {
  return new Date(
    Date.now() + ANONYMOUS_DRAFT_EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension && extension.length <= 8 ? extension : "bin";
}

function buildStoragePath(sessionId: string, fileKey: string, fileName: string) {
  const extension = getFileExtension(fileName);
  const safeKey = fileKey.replace(/[^a-zA-Z0-9_-]/g, "-");

  if (safeKey === "source") {
    return `sessions/${sessionId}/source.${extension}`;
  }

  return `sessions/${sessionId}/batch/${safeKey}.${extension}`;
}

function validateUploadDescriptors(
  mediaKind: AnonymousDraftMediaKind,
  files: AnonymousDraftUploadDescriptor[],
) {
  if (!files.length || files.length > MAX_DRAFT_FILES) {
    throw new AnonymousExportDraftError("Invalid draft file list.");
  }

  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);

  if (totalBytes <= 0 || totalBytes > MAX_DRAFT_TOTAL_BYTES) {
    throw new AnonymousExportDraftError(
      "Draft files exceed the maximum allowed upload size.",
    );
  }

  if (mediaKind === "video" && files.length !== 1) {
    throw new AnonymousExportDraftError("Video drafts must include one source file.");
  }
}

function validateAnonymousDraftState(state: AnonymousExportDraftState) {
  if (state.pdfDocumentTool === "fill") {
    throw new AnonymousExportDraftError(
      "Fill text requires sign-in and cannot be saved in anonymous drafts.",
    );
  }

  const signatureManifest = state.savedSignatures.map((signature) =>
    buildSignatureManifestEntry({
      id: signature.id,
      kind: normalizeSignatureKind(signature.kind),
      label: signature.label,
      source: signature.source,
      typedText: signature.typedText ?? null,
    }),
  );
  const signatureError = validateSignatureManifest(signatureManifest);

  if (signatureError) {
    throw new AnonymousExportDraftError(signatureError);
  }
}

export async function prepareAnonymousExportDraft({
  files,
  mediaKind,
  sessionId,
}: {
  files: AnonymousDraftUploadDescriptor[];
  mediaKind: AnonymousDraftMediaKind;
  sessionId: string;
}) {
  const safeSessionId = sanitizeSessionId(sessionId);
  validateUploadDescriptors(mediaKind, files);

  const supabase = createAdminClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new AnonymousExportDraftError(
      "Anonymous draft storage is not configured.",
      503,
    );
  }

  const expiresAt = getDraftExpiryIso();
  const { error: upsertError } = await supabase.from("anonymous_export_drafts").upsert(
    {
      expires_at: expiresAt,
      media_kind: mediaKind,
      session_id: safeSessionId,
      state_json: {},
      storage_paths: [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );

  if (upsertError) {
    throw new AnonymousExportDraftError(
      "Could not prepare anonymous export draft.",
      503,
    );
  }

  const uploads = await Promise.all(
    files.map(async (file) => {
      const uploadPath = buildStoragePath(
        safeSessionId,
        file.fileKey,
        file.fileName,
      );
      const { data, error } = await supabase.storage
        .from(ANONYMOUS_DRAFTS_BUCKET)
        .createSignedUploadUrl(uploadPath, { upsert: true });

      if (error || !data?.token || !data.signedUrl) {
        throw new AnonymousExportDraftError(
          "Could not prepare draft file upload.",
          503,
        );
      }

      return {
        contentType: file.contentType,
        fileKey: file.fileKey,
        fileName: file.fileName,
        sizeBytes: file.sizeBytes,
        uploadPath,
        uploadToken: data.token,
        uploadUrl: data.signedUrl,
        uploadMethod: "put" as const,
        tusEndpoint: null,
      };
    }),
  );

  return {
    bucketName: ANONYMOUS_DRAFTS_BUCKET,
    expiresAt,
    sessionId: safeSessionId,
    uploads,
  };
}

export async function finalizeAnonymousExportDraft({
  sessionId,
  state,
  storagePaths,
  claimedByUserId,
}: {
  sessionId: string;
  state: AnonymousExportDraftState;
  storagePaths: string[];
  claimedByUserId?: string | null;
}) {
  const safeSessionId = sanitizeSessionId(sessionId);

  if (!isAnonymousExportDraftState(state)) {
    throw new AnonymousExportDraftError("Invalid draft state payload.");
  }

  validateAnonymousDraftState(state);

  if (!storagePaths.length) {
    throw new AnonymousExportDraftError("Draft storage paths are required.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("anonymous_export_drafts")
    .update({
      claimed_by_user_id: claimedByUserId ?? null,
      expires_at: getDraftExpiryIso(),
      state_json: state,
      storage_paths: storagePaths,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", safeSessionId);

  if (error) {
    throw new AnonymousExportDraftError("Could not save anonymous export draft.", 503);
  }
}

export async function getAnonymousExportDraft(sessionId: string) {
  const safeSessionId = sanitizeSessionId(sessionId);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("anonymous_export_drafts")
    .select(
      "expires_at, media_kind, session_id, state_json, storage_paths, claimed_by_user_id",
    )
    .eq("session_id", safeSessionId)
    .maybeSingle();

  if (error) {
    throw new AnonymousExportDraftError("Could not load anonymous export draft.", 503);
  }

  if (!data) {
    throw new AnonymousExportDraftError("Anonymous export draft not found.", 404);
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    await deleteAnonymousExportDraft(safeSessionId);
    throw new AnonymousExportDraftError("Anonymous export draft expired.", 410);
  }

  if (!isAnonymousExportDraftState(data.state_json)) {
    throw new AnonymousExportDraftError("Anonymous export draft is invalid.", 500);
  }

  const downloads = await Promise.all(
    data.storage_paths.map(async (path: string) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from(ANONYMOUS_DRAFTS_BUCKET)
        .createSignedUrl(path, 60 * 30);

      if (signedError || !signed?.signedUrl) {
        throw new AnonymousExportDraftError(
          "Could not prepare draft file download.",
          503,
        );
      }

      return {
        downloadUrl: signed.signedUrl,
        path,
      };
    }),
  );

  return {
    downloads,
    expiresAt: data.expires_at,
    mediaKind: data.media_kind as AnonymousDraftMediaKind,
    sessionId: data.session_id,
    state: data.state_json,
  };
}

export async function deleteAnonymousExportDraft(sessionId: string) {
  const safeSessionId = sanitizeSessionId(sessionId);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("anonymous_export_drafts")
    .select("storage_paths")
    .eq("session_id", safeSessionId)
    .maybeSingle();

  if (error) {
    throw new AnonymousExportDraftError("Could not delete anonymous export draft.", 503);
  }

  if (data?.storage_paths?.length) {
    await supabase.storage.from(ANONYMOUS_DRAFTS_BUCKET).remove(data.storage_paths);
  }

  await supabase
    .from("anonymous_export_drafts")
    .delete()
    .eq("session_id", safeSessionId);
}

export async function cleanupExpiredAnonymousExportDrafts() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("anonymous_export_drafts")
    .select("session_id, storage_paths")
    .lt("expires_at", new Date().toISOString());

  if (error) {
    throw new AnonymousExportDraftError("Could not query expired drafts.", 503);
  }

  const expired = data ?? [];
  const allPaths = expired.flatMap((row) => row.storage_paths ?? []);

  if (allPaths.length) {
    await supabase.storage.from(ANONYMOUS_DRAFTS_BUCKET).remove(allPaths);
  }

  if (expired.length) {
    await supabase
      .from("anonymous_export_drafts")
      .delete()
      .in(
        "session_id",
        expired.map((row) => row.session_id),
      );
  }

  return { deletedCount: expired.length };
}

export function assertValidAnonymousSessionId(sessionId: string) {
  if (!isValidAnonymousSessionId(sessionId)) {
    throw new AnonymousExportDraftError("Invalid anonymous session id.");
  }
}
