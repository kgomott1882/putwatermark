import type {
  AnonymousDraftUploadDescriptor,
  AnonymousExportDraftState,
} from "./anonymousExportDraftState";
import {
  clearAnonymousSessionId,
  getOrCreateAnonymousSessionId,
} from "./anonymousExportDraftSession";

type DraftUploadTarget = {
  bucketName: string;
  contentType: string;
  fileKey: string;
  fileName: string;
  sizeBytes: number;
  uploadMethod: "put";
  uploadPath: string;
  uploadUrl: string;
};

type PrepareDraftResponse = {
  bucketName: string;
  sessionId: string;
  uploads: DraftUploadTarget[];
};

async function uploadDraftFilePut({
  blob,
  contentType,
  uploadUrl,
}: {
  blob: Blob;
  contentType: string;
  uploadUrl: string;
}) {
  const response = await fetch(uploadUrl, {
    body: blob,
    headers: {
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    method: "PUT",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      body ? `Draft upload failed: ${body}` : `Draft upload failed (${response.status}).`,
    );
  }
}

async function uploadDraftFiles(
  uploads: DraftUploadTarget[],
  blobsByKey: Record<string, Blob>,
) {
  for (const upload of uploads) {
    const blob = blobsByKey[upload.fileKey];

    if (!blob) {
      throw new Error(`Missing draft file payload for ${upload.fileKey}.`);
    }

    await uploadDraftFilePut({
      blob,
      contentType: upload.contentType,
      uploadUrl: upload.uploadUrl,
    });
  }
}

export async function saveAnonymousExportDraft({
  blobsByKey,
  files,
  mediaKind,
  state,
}: {
  blobsByKey: Record<string, Blob>;
  files: AnonymousDraftUploadDescriptor[];
  mediaKind: AnonymousExportDraftState["mediaKind"];
  state: AnonymousExportDraftState;
}) {
  const sessionId = getOrCreateAnonymousSessionId();
  const prepareResponse = await fetch("/api/watermark/anonymous-draft/prepare", {
    body: JSON.stringify({ files, mediaKind, sessionId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!prepareResponse.ok) {
    const payload = (await prepareResponse.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Could not prepare draft upload.");
  }

  const prepared = (await prepareResponse.json()) as PrepareDraftResponse;
  await uploadDraftFiles(prepared.uploads, blobsByKey);

  const finalizeResponse = await fetch("/api/watermark/anonymous-draft/finalize", {
    body: JSON.stringify({
      sessionId: prepared.sessionId,
      state,
      storagePaths: prepared.uploads.map((upload) => upload.uploadPath),
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!finalizeResponse.ok) {
    const payload = (await finalizeResponse.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Could not save draft state.");
  }

  return prepared.sessionId;
}

export async function loadAnonymousExportDraft(sessionId = getOrCreateAnonymousSessionId()) {
  const response = await fetch(
    `/api/watermark/anonymous-draft?sessionId=${encodeURIComponent(sessionId)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Could not load saved draft.");
  }

  return (await response.json()) as {
    downloads: Array<{ downloadUrl: string; path: string }>;
    mediaKind: AnonymousExportDraftState["mediaKind"];
    sessionId: string;
    state: AnonymousExportDraftState;
  };
}

export async function deleteAnonymousExportDraft(sessionId = getOrCreateAnonymousSessionId()) {
  await fetch("/api/watermark/anonymous-draft", {
    body: JSON.stringify({ sessionId }),
    headers: { "Content-Type": "application/json" },
    method: "DELETE",
  });
  clearAnonymousSessionId();
}

export async function downloadDraftFiles(
  downloads: Array<{ downloadUrl: string; path: string }>,
) {
  const files = await Promise.all(
    downloads.map(async (entry) => {
      const response = await fetch(entry.downloadUrl);

      if (!response.ok) {
        throw new Error("Could not download saved draft file.");
      }

      const blob = await response.blob();
      const fileName = entry.path.split("/").pop() ?? "draft-file";
      return new File([blob], fileName, {
        type: blob.type || "application/octet-stream",
      });
    }),
  );

  return files;
}
