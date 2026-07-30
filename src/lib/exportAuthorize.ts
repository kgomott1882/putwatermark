import { createAdminClient } from "../../utils/supabase/admin";
import {
  PDF_CREDITS_PER_PAGE,
  PDF_FILL_CREDITS_PER_PAGE,
  calculateExportCost,
  ExportCostError,
  formatVideoExportCostNotice,
  resolvePhotoExportCount,
  type ExportFileMeta,
  type ExportFileType,
} from "./exportCost";
import type { PdfBillingMode } from "./exportCost";
import {
  type SignatureManifestEntry,
  validateSignatureManifest,
} from "./signatureValidation";

export const EXPORT_AUTHORIZE_RATE_LIMIT = 10;
export const EXPORT_AUTHORIZE_RATE_WINDOW_MS = 60_000;

export type ExportAuthorizeDecision = "clean" | "watermarked";

export type ExportAuthorizeReason = "anonymous" | "insufficient_credits";

export type ExportAuthorizeResult = {
  allowed: true;
  balance?: number;
  cost: number;
  costNotice?: string;
  fillPageCount?: number;
  fillSurchargeCredits?: number;
  pageCount?: number;
  signedPageCount?: number;
  billablePageCount?: number;
  reason?: ExportAuthorizeReason;
  tier: ExportAuthorizeDecision;
  videoDurationBaseCredits?: number;
  videoServerRouted?: boolean;
  videoSizeSurchargeCredits?: number;
};

export class ExportAuthorizeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ExportAuthorizeError";
    this.status = status;
  }
}

const EXPORT_FILE_TYPES = new Set<ExportFileType>([
  "photo",
  "pdf",
  "video",
  "signature",
]);

const EXPORT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeExportId(exportId: string) {
  const normalized = exportId.trim();

  if (!EXPORT_ID_PATTERN.test(normalized)) {
    throw new ExportAuthorizeError("Invalid exportId.");
  }

  return normalized;
}

export function parseExportFileType(fileType: string): ExportFileType {
  if (!EXPORT_FILE_TYPES.has(fileType as ExportFileType)) {
    throw new ExportAuthorizeError("Invalid fileType.");
  }

  return fileType as ExportFileType;
}

export function parseExportFileMeta(
  fileType: ExportFileType,
  exportId: string,
  fileMeta: unknown,
): ExportFileMeta {
  if (!fileMeta || typeof fileMeta !== "object") {
    if (fileType === "pdf") {
      throw new ExportAuthorizeError("PDF export requires fileMeta.storagePath.");
    }

    return {};
  }

  const meta = fileMeta as {
    durationSeconds?: unknown;
    fileSizeBytes?: unknown;
    fillManifestPath?: unknown;
    height?: unknown;
    pdfBillingMode?: unknown;
    photoCount?: unknown;
    signatureManifest?: unknown;
    signaturePlacementManifestPath?: unknown;
    storagePath?: unknown;
    width?: unknown;
  };

  const parsed: ExportFileMeta = {};

  if (fileType === "photo") {
    if (meta.photoCount === undefined) {
      parsed.photoCount = 1;
    } else if (
      typeof meta.photoCount === "number" &&
      Number.isInteger(meta.photoCount)
    ) {
      parsed.photoCount = meta.photoCount;
    } else {
      throw new ExportAuthorizeError("photoCount must be an integer.");
    }

    try {
      resolvePhotoExportCount(parsed);
    } catch (error) {
      if (error instanceof ExportCostError) {
        throw new ExportAuthorizeError(error.message);
      }

      throw error;
    }
  }

  if (typeof meta.storagePath === "string" && meta.storagePath.trim()) {
    const storagePath = meta.storagePath.trim();

    if (!storagePath.startsWith(`exports/${exportId}/`)) {
      throw new ExportAuthorizeError("storagePath does not match exportId.");
    }

    parsed.storagePath = storagePath;
  }

  if (
    typeof meta.fillManifestPath === "string" &&
    meta.fillManifestPath.trim()
  ) {
    const fillManifestPath = meta.fillManifestPath.trim();

    if (!fillManifestPath.startsWith(`exports/${exportId}/`)) {
      throw new ExportAuthorizeError("fillManifestPath does not match exportId.");
    }

    parsed.fillManifestPath = fillManifestPath;
  }

  if (
    typeof meta.signaturePlacementManifestPath === "string" &&
    meta.signaturePlacementManifestPath.trim()
  ) {
    const signaturePlacementManifestPath =
      meta.signaturePlacementManifestPath.trim();

    if (!signaturePlacementManifestPath.startsWith(`exports/${exportId}/`)) {
      throw new ExportAuthorizeError(
        "signaturePlacementManifestPath does not match exportId.",
      );
    }

    parsed.signaturePlacementManifestPath = signaturePlacementManifestPath;
  }

  if (meta.pdfBillingMode === "watermark" || meta.pdfBillingMode === "signFill") {
    parsed.pdfBillingMode = meta.pdfBillingMode;
  }

  if (Array.isArray(meta.signatureManifest)) {
    parsed.signatureManifest = meta.signatureManifest as SignatureManifestEntry[];
  }

  if (
    typeof meta.durationSeconds === "number" &&
    Number.isFinite(meta.durationSeconds) &&
    meta.durationSeconds > 0
  ) {
    parsed.durationSeconds = meta.durationSeconds;
  }

  if (
    typeof meta.fileSizeBytes === "number" &&
    Number.isFinite(meta.fileSizeBytes) &&
    meta.fileSizeBytes > 0
  ) {
    parsed.fileSizeBytes = meta.fileSizeBytes;
  }

  if (
    typeof meta.width === "number" &&
    Number.isFinite(meta.width) &&
    meta.width > 0
  ) {
    parsed.width = meta.width;
  }

  if (
    typeof meta.height === "number" &&
    Number.isFinite(meta.height) &&
    meta.height > 0
  ) {
    parsed.height = meta.height;
  }

  if (fileType === "pdf" && !parsed.storagePath) {
    throw new ExportAuthorizeError("PDF export requires fileMeta.storagePath.");
  }

  if (fileType === "video") {
    if (
      !parsed.durationSeconds ||
      !parsed.fileSizeBytes ||
      !parsed.width ||
      !parsed.height
    ) {
      throw new ExportAuthorizeError(
        "Video export requires durationSeconds, fileSizeBytes, width, and height.",
      );
    }
  }

  return parsed;
}

function formatPdfExportCostNotice({
  billablePageCount = 0,
  cost,
  fillPageCount = 0,
  fillSurchargeCredits = 0,
  pageCount = 0,
  pdfBillingMode = "watermark",
  signedPageCount = 0,
}: {
  billablePageCount?: number;
  cost: number;
  fillPageCount?: number;
  fillSurchargeCredits?: number;
  pageCount?: number;
  pdfBillingMode?: PdfBillingMode;
  signedPageCount?: number;
}) {
  if (pdfBillingMode === "watermark") {
    const baseCost = PDF_CREDITS_PER_PAGE * pageCount;

    if (fillPageCount > 0) {
      return `${pageCount} pages → ${baseCost} credits + ${fillPageCount} fill pages → ${fillSurchargeCredits} credits = ${cost} credits.`;
    }

    return `${pageCount} pages → ${cost} credits.`;
  }

  const baseCost = PDF_CREDITS_PER_PAGE * billablePageCount;

  if (fillPageCount > 0 && signedPageCount > 0) {
    return `${billablePageCount} billable pages → ${baseCost} credits + ${fillPageCount} fill pages → ${fillSurchargeCredits} credits = ${cost} credits.`;
  }

  if (fillPageCount > 0) {
    return `${fillPageCount} fill pages → ${baseCost} credits + ${fillSurchargeCredits} credits fill surcharge = ${cost} credits.`;
  }

  return `${signedPageCount} signed pages → ${cost} credits.`;
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const firstHop = forwarded.split(",")[0]?.trim();
    if (firstHop) {
      return firstHop;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || null;
}

export async function countRecentExportAuthorizations({
  ipAddress,
  userId,
}: {
  ipAddress: string | null;
  userId: string | null;
}) {
  if (!userId && !ipAddress) {
    return 0;
  }

  const supabase = createAdminClient();
  const windowStart = new Date(
    Date.now() - EXPORT_AUTHORIZE_RATE_WINDOW_MS,
  ).toISOString();

  let query = supabase
    .from("export_authorizations")
    .select("id", { count: "exact", head: true })
    .gt("created_at", windowStart);

  // Authenticated: count by user_id only. Anonymous: count by ip_address only.
  // Do not use PostgREST `.or()` string filters with raw UUIDs/IPs — hyphens and
  // dots break parsing and can silently return count 0.
  if (userId) {
    query = query.eq("user_id", userId);
  } else if (ipAddress) {
    query = query.eq("ip_address", ipAddress);
  }

  const { count, error } = await query;

  if (error) {
    throw new ExportAuthorizeError(
      "Could not verify export authorization rate limit.",
      503,
    );
  }

  return count ?? 0;
}

async function getUserCreditBalance(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("credit_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ExportAuthorizeError("Could not read credit balance.", 503);
  }

  return data?.balance ?? 0;
}

function qualifiesForCleanExport({
  balance,
  cost,
  fileType,
  videoServerRouted,
}: {
  balance: number;
  cost: number;
  fileType: ExportFileType;
  videoServerRouted?: boolean;
}) {
  // In-browser video exports bill 0 credits; free tier is balance <= 0 (see exportUpsellEligibility).
  if (fileType === "video" && !videoServerRouted && cost === 0) {
    return balance > 0;
  }

  return balance >= cost;
}

async function logExportAuthorization({
  balanceAtCheck,
  cost,
  decision,
  exportId,
  fileType,
  ipAddress,
  reason,
  userId,
}: {
  balanceAtCheck: number | null;
  cost: number;
  decision: ExportAuthorizeDecision;
  exportId: string;
  fileType: ExportFileType;
  ipAddress: string | null;
  reason: ExportAuthorizeReason | null;
  userId: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("try_insert_export_authorization", {
    p_balance_at_check: balanceAtCheck,
    p_cost: cost,
    p_decision: decision,
    p_export_id: exportId,
    p_file_type: fileType,
    p_ip_address: ipAddress,
    p_limit: EXPORT_AUTHORIZE_RATE_LIMIT,
    p_reason: reason,
    p_user_id: userId,
    p_window_seconds: EXPORT_AUTHORIZE_RATE_WINDOW_MS / 1000,
  });

  if (error) {
    if (error.message?.includes("export_authorize_rate_limited")) {
      throw new ExportAuthorizeError(
        "Too many export authorization requests. Please wait a moment and try again.",
        429,
      );
    }

    throw new ExportAuthorizeError(
      "Could not record export authorization.",
      503,
    );
  }
}

export async function authorizeExport({
  exportId,
  fileMeta,
  fileType,
  ipAddress,
  userId,
}: {
  exportId: string;
  fileMeta: ExportFileMeta;
  fileType: ExportFileType;
  ipAddress: string | null;
  userId: string | null;
}): Promise<ExportAuthorizeResult> {
  const recentCount = await countRecentExportAuthorizations({
    ipAddress,
    userId,
  });

  if (recentCount >= EXPORT_AUTHORIZE_RATE_LIMIT) {
    throw new ExportAuthorizeError(
      "Too many export authorization requests. Please wait a moment and try again.",
      429,
    );
  }

  let costResult;

  const signatureValidationError = validateSignatureManifest(
    fileMeta.signatureManifest ?? [],
  );

  if (signatureValidationError) {
    throw new ExportAuthorizeError(signatureValidationError, 400);
  }

  try {
    costResult = await calculateExportCost(fileType, fileMeta, { exportId });
  } catch (error) {
    if (error instanceof ExportCostError) {
      throw new ExportAuthorizeError(error.message, 400);
    }

    throw error;
  }

  const cost = costResult.cost;
  const authorizeExtras =
    fileType === "pdf"
      ? {
          costNotice: formatPdfExportCostNotice({
            billablePageCount: costResult.billablePageCount,
            cost,
            fillPageCount: costResult.fillPageCount,
            fillSurchargeCredits: costResult.fillSurchargeCredits,
            pageCount: costResult.pageCount,
            pdfBillingMode: costResult.pdfBillingMode,
            signedPageCount: costResult.signedPageCount,
          }),
          billablePageCount: costResult.billablePageCount,
          fillPageCount: costResult.fillPageCount,
          fillSurchargeCredits: costResult.fillSurchargeCredits,
          pageCount: costResult.pageCount,
          signedPageCount: costResult.signedPageCount,
        }
      : fileType === "video" && costResult.videoServerRouted
        ? {
            costNotice: formatVideoExportCostNotice({
              cost,
              durationBase: costResult.videoDurationBaseCredits ?? 0,
              durationSeconds: costResult.durationSeconds ?? 0,
              fileSizeBytes: costResult.fileSizeBytes ?? 0,
              longVideoChunkSurcharge:
                costResult.videoLongVideoChunkSurchargeCredits ?? 0,
              longVideoExtraChunks: costResult.videoEstimatedExtraChunks ?? 0,
              longVideoSurchargeEstimated: Boolean(
                costResult.videoLongVideoChunkSurchargeEstimated,
              ),
              sizeSurcharge: costResult.videoSizeSurchargeCredits ?? 0,
            }),
            videoDurationBaseCredits: costResult.videoDurationBaseCredits,
            videoEstimatedExtraChunks: costResult.videoEstimatedExtraChunks,
            videoLongServerRouted: costResult.videoLongServerRouted,
            videoLongVideoChunkSurchargeCredits:
              costResult.videoLongVideoChunkSurchargeCredits,
            videoServerRouted: costResult.videoServerRouted,
            videoSizeSurchargeCredits: costResult.videoSizeSurchargeCredits,
          }
        : {};

  if (fileType === "photo") {
    console.info("[export-authorize] photo export", {
      cost,
      exportId,
      photoCount: costResult.photoCount ?? resolvePhotoExportCount(fileMeta),
      userId,
    });
  }

  if (!userId) {
    throw new ExportAuthorizeError(
      "Sign in is required to export files.",
      401,
    );
  }

  const balance = await getUserCreditBalance(userId);

  if (
    fileType === "video" &&
    costResult.videoServerRouted &&
    balance < cost
  ) {
    throw new ExportAuthorizeError(
      "Server video export requires sufficient credits. Add credits to continue.",
      402,
    );
  }

  const isClientVideoExport =
    fileType === "video" &&
    !costResult.videoServerRouted &&
    cost === 0;

  if (isClientVideoExport && balance <= 0) {
    await logExportAuthorization({
      balanceAtCheck: balance,
      cost,
      decision: "watermarked",
      exportId,
      fileType,
      ipAddress,
      reason: "insufficient_credits",
      userId,
    });

    return {
      allowed: true,
      balance,
      cost,
      reason: "insufficient_credits",
      tier: "watermarked",
      ...authorizeExtras,
    };
  }

  if (
    qualifiesForCleanExport({
      balance,
      cost,
      fileType,
      videoServerRouted: costResult.videoServerRouted,
    })
  ) {
    await logExportAuthorization({
      balanceAtCheck: balance,
      cost,
      decision: "clean",
      exportId,
      fileType,
      ipAddress,
      reason: null,
      userId,
    });

    return {
      allowed: true,
      balance,
      cost,
      tier: "clean",
      ...authorizeExtras,
    };
  }

  await logExportAuthorization({
    balanceAtCheck: balance,
    cost,
    decision: "watermarked",
    exportId,
    fileType,
    ipAddress,
    reason: "insufficient_credits",
    userId,
  });

  return {
    allowed: true,
    balance,
    cost,
    reason: "insufficient_credits",
    tier: "watermarked",
    ...authorizeExtras,
  };
}
