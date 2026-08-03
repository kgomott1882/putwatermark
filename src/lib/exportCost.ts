import { PDFDocument } from "pdf-lib";
import {
  countFillPagesFromManifest,
  parseFillManifestDocument,
  validateFillManifestForPdf,
  type FillManifestDocument,
} from "./fillManifest";
import {
  countBillableSignFillPagesFromManifests,
  countSignedPagesFromManifest,
  parseSignaturePlacementManifestDocument,
  validateSignaturePlacementManifestForPdf,
  type SignaturePlacementManifestDocument,
} from "./signaturePlacementManifest";
import type { SignatureManifestEntry } from "./signatureValidation";
import {
  createAdminClient,
  WATERMARK_TEMP_BUCKET,
} from "../../utils/supabase/admin";
import { getVideoExportJobByExportId } from "./serverVideoExportJob";
import {
  getVideoExportRejectionMessage,
  getVideoExportRoute,
  isServerSideVideoExportRoute,
  LONG_VIDEO_CHUNK_MAX_DURATION_SECONDS,
} from "./videoExportLimits";

export const PHOTO_EXPORT_CREDIT_COST = 50;
export const PDF_CREDITS_PER_PAGE = 50;
export const PDF_FILL_CREDITS_PER_PAGE = 5;

export const VIDEO_DURATION_CREDITS_PER_MINUTE = 50;
export const VIDEO_SIZE_FREE_THRESHOLD_BYTES = 60 * 1024 * 1024;
export const VIDEO_SIZE_SURCHARGE_BLOCK_BYTES = 10 * 1024 * 1024;
export const VIDEO_SIZE_SURCHARGE_CREDITS_PER_BLOCK = 75;
export const LONG_VIDEO_CHUNK_SURCHARGE_CREDITS_PER_EXTRA_CHUNK = 100;

export type ExportCostOptions = {
  exportId?: string;
  /** Load chunk_count from video_export_jobs for long-server final billing. */
  useActualLongVideoChunkCount?: boolean;
  userId?: string;
};

export type ExportFileType = "photo" | "pdf" | "video" | "signature";

export type PdfBillingMode = "watermark" | "signFill";

/**
 * Metadata supplied alongside fileType. Page count is never accepted from the
 * client — PDF cost is derived from the uploaded file in storage.
 *
 * PDF flow (Stage 2+): client uploads to watermark-temp via signed URL first,
 * then passes `storagePath` here (e.g. `exports/{exportId}/input.pdf`).
 */
export type ExportFileMeta = {
  durationSeconds?: number;
  fileSizeBytes?: number;
  height?: number;
  /** Photo exports only. Defaults to 1. Batch ZIP passes the number of images exported. */
  photoCount?: number;
  storagePath?: string;
  fillManifestPath?: string;
  signaturePlacementManifestPath?: string;
  signatureManifest?: SignatureManifestEntry[];
  pdfBillingMode?: PdfBillingMode;
  width?: number;
};

export type ExportCostResult = {
  cost: number;
  durationSeconds?: number;
  fileSizeBytes?: number;
  fileType: ExportFileType;
  fillPageCount?: number;
  fillSurchargeCredits?: number;
  pageCount?: number;
  signedPageCount?: number;
  billablePageCount?: number;
  photoCount?: number;
  pdfBillingMode?: PdfBillingMode;
  videoDurationBaseCredits?: number;
  videoEstimatedExtraChunks?: number;
  videoLongServerRouted?: boolean;
  videoLongVideoChunkCount?: number;
  videoLongVideoChunkSurchargeCredits?: number;
  videoLongVideoChunkSurchargeEstimated?: boolean;
  videoServerRouted?: boolean;
  videoSizeSurchargeCredits?: number;
};

export class ExportCostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportCostError";
  }
}

const EXPORT_STORAGE_PATH_PATTERN =
  /^exports\/[0-9a-f-]{36}\/input\.[a-z0-9]+$/i;

const FILL_MANIFEST_PATH_PATTERN =
  /^exports\/[0-9a-f-]{36}\/fill-manifest\.json$/i;

const SIGNATURE_PLACEMENT_MANIFEST_PATH_PATTERN =
  /^exports\/[0-9a-f-]{36}\/signature-placements\.json$/i;

const MAX_PHOTO_EXPORT_COUNT = 500;

export function resolvePhotoExportCount(fileMeta: ExportFileMeta = {}) {
  const rawCount = fileMeta.photoCount;

  if (rawCount === undefined) {
    return 1;
  }

  if (
    !Number.isInteger(rawCount) ||
    rawCount < 1 ||
    rawCount > MAX_PHOTO_EXPORT_COUNT
  ) {
    throw new ExportCostError(
      `photoCount must be an integer from 1 to ${MAX_PHOTO_EXPORT_COUNT}.`,
    );
  }

  return rawCount;
}

export function sanitizeExportStoragePath(storagePath: string) {
  const normalized = storagePath.trim();

  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    !EXPORT_STORAGE_PATH_PATTERN.test(normalized)
  ) {
    throw new ExportCostError(
      "Invalid storage path. Expected exports/{exportId}/input.{ext}.",
    );
  }

  return normalized;
}

export function sanitizeFillManifestPath(storagePath: string) {
  const normalized = storagePath.trim();

  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    !FILL_MANIFEST_PATH_PATTERN.test(normalized)
  ) {
    throw new ExportCostError(
      "Invalid fill manifest path. Expected exports/{exportId}/fill-manifest.json.",
    );
  }

  return normalized;
}

export function sanitizeSignaturePlacementManifestPath(storagePath: string) {
  const normalized = storagePath.trim();

  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    !SIGNATURE_PLACEMENT_MANIFEST_PATH_PATTERN.test(normalized)
  ) {
    throw new ExportCostError(
      "Invalid signature placement manifest path. Expected exports/{exportId}/signature-placements.json.",
    );
  }

  return normalized;
}

async function readJsonManifestFromStorage(storagePath: string, label: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(WATERMARK_TEMP_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new ExportCostError(`Could not read the uploaded ${label} from storage.`);
  }

  const text = await data.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ExportCostError(`Uploaded ${label} is not valid JSON.`);
  }
}

async function readFillManifestFromStorage(storagePath: string) {
  const safePath = sanitizeFillManifestPath(storagePath);
  return readJsonManifestFromStorage(safePath, "fill manifest");
}

async function readSignaturePlacementManifestFromStorage(storagePath: string) {
  const safePath = sanitizeSignaturePlacementManifestPath(storagePath);
  return readJsonManifestFromStorage(safePath, "signature placement manifest");
}

function resolvePdfBillingMode(
  fileMeta: ExportFileMeta,
  signedPageCount: number,
  fillPageCount: number,
): PdfBillingMode {
  if (fileMeta.pdfBillingMode === "watermark" || fileMeta.pdfBillingMode === "signFill") {
    return fileMeta.pdfBillingMode;
  }

  return signedPageCount > 0 || fillPageCount > 0 ? "signFill" : "watermark";
}

export function calculatePdfExportCost(input: {
  pageCount: number;
  billingMode: PdfBillingMode;
  signedPageCount: number;
  fillPageCount: number;
  billablePageCount: number;
}) {
  const fillSurchargeCredits = PDF_FILL_CREDITS_PER_PAGE * input.fillPageCount;
  const baseCost =
    input.billingMode === "watermark"
      ? PDF_CREDITS_PER_PAGE * input.pageCount
      : PDF_CREDITS_PER_PAGE * input.billablePageCount;

  return {
    baseCost,
    billablePageCount: input.billablePageCount,
    cost: baseCost + fillSurchargeCredits,
    fillPageCount: input.fillPageCount,
    fillSurchargeCredits,
    pageCount: input.pageCount,
    pdfBillingMode: input.billingMode,
    signedPageCount: input.signedPageCount,
  };
}

export function estimateLongVideoChunkCount(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 1;
  }

  return Math.ceil(durationSeconds / LONG_VIDEO_CHUNK_MAX_DURATION_SECONDS);
}

export function calculateLongVideoChunkSurcharge(chunkCount: number) {
  const normalizedChunkCount = Math.max(1, Math.floor(chunkCount));
  const extraChunks = Math.max(0, normalizedChunkCount - 1);

  return {
    chunkCount: normalizedChunkCount,
    extraChunks,
    surcharge: extraChunks * LONG_VIDEO_CHUNK_SURCHARGE_CREDITS_PER_EXTRA_CHUNK,
  };
}

export function calculateServerVideoCreditCost(
  durationSeconds: number,
  fileSizeBytes: number,
  longVideoChunkCount?: number,
) {
  const durationBase =
    Math.ceil(durationSeconds / 60) * VIDEO_DURATION_CREDITS_PER_MINUTE;
  const sizeBlocks = Math.ceil(
    Math.max(0, fileSizeBytes - VIDEO_SIZE_FREE_THRESHOLD_BYTES) /
      VIDEO_SIZE_SURCHARGE_BLOCK_BYTES,
  );
  const sizeSurcharge = sizeBlocks * VIDEO_SIZE_SURCHARGE_CREDITS_PER_BLOCK;
  const longVideoChunkBilling =
    longVideoChunkCount === undefined
      ? null
      : calculateLongVideoChunkSurcharge(longVideoChunkCount);
  const longVideoChunkSurcharge = longVideoChunkBilling?.surcharge ?? 0;

  return {
    cost: durationBase + sizeSurcharge + longVideoChunkSurcharge,
    durationBase,
    longVideoChunkCount: longVideoChunkBilling?.chunkCount,
    longVideoExtraChunks: longVideoChunkBilling?.extraChunks ?? 0,
    longVideoChunkSurcharge,
    sizeBlocks,
    sizeSurcharge,
  };
}

async function resolveLongVideoChunkCountForBilling(
  durationSeconds: number,
  exportId: string | undefined,
  useActualLongVideoChunkCount: boolean,
  userId?: string,
) {
  if (!useActualLongVideoChunkCount) {
    return estimateLongVideoChunkCount(durationSeconds);
  }

  if (!exportId) {
    throw new ExportCostError(
      "Long video export billing requires an exportId.",
    );
  }

  const job = await getVideoExportJobByExportId(exportId, userId);

  if (!job || job.chunk_count < 1) {
    throw new ExportCostError(
      "Could not verify long video processing cost from the completed export job.",
    );
  }

  return job.chunk_count;
}

export function formatVideoExportCostNotice({
  cost,
  durationBase,
  durationSeconds,
  fileSizeBytes,
  longVideoChunkSurcharge = 0,
  longVideoExtraChunks = 0,
  longVideoSurchargeEstimated = false,
  sizeSurcharge,
}: {
  cost: number;
  durationBase: number;
  durationSeconds: number;
  fileSizeBytes: number;
  longVideoChunkSurcharge?: number;
  longVideoExtraChunks?: number;
  longVideoSurchargeEstimated?: boolean;
  sizeSurcharge: number;
}) {
  const sizeMb = Math.max(1, Math.round(fileSizeBytes / (1024 * 1024)));
  const billedMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const minuteLabel = billedMinutes === 1 ? "1 min" : `${billedMinutes} min`;
  const longVideoLabel = longVideoSurchargeEstimated ? "estimated " : "";
  const parts: string[] = [`${durationBase} credits (duration)`];

  if (sizeSurcharge > 0) {
    parts.push(`${sizeSurcharge} credits (size)`);
  }

  if (longVideoChunkSurcharge > 0) {
    parts.push(
      `${longVideoChunkSurcharge} credits (${longVideoExtraChunks} ${longVideoLabel}extra chunks × ${LONG_VIDEO_CHUNK_SURCHARGE_CREDITS_PER_EXTRA_CHUNK}, long video processing)`,
    );
  }

  if (parts.length === 1 && longVideoChunkSurcharge <= 0) {
    return `Server processing: ${sizeMb}MB, ${minuteLabel} → ${cost} credits.`;
  }

  return `Server processing: ${sizeMb}MB, ${minuteLabel} → ${parts.join(" + ")} = ${cost} credits.`;
}

export type VideoServerCostEstimate = {
  cost: number;
  durationBase: number;
  durationSeconds: number;
  estimatedExtraChunks: number;
  estimatedLongVideoChunkSurcharge: number;
  fileSizeBytes: number;
  longServerRoute: boolean;
  sizeSurcharge: number;
};

export function getVideoServerCostEstimate(
  fileMeta: ExportFileMeta,
): VideoServerCostEstimate | null {
  const durationSeconds = fileMeta.durationSeconds;
  const fileSizeBytes = fileMeta.fileSizeBytes;
  const width = fileMeta.width;
  const height = fileMeta.height;

  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    typeof fileSizeBytes !== "number" ||
    !Number.isFinite(fileSizeBytes) ||
    fileSizeBytes <= 0 ||
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== "number" ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    return null;
  }

  const route = getVideoExportRoute(
    durationSeconds,
    width,
    height,
    fileSizeBytes,
  );

  if (!isServerSideVideoExportRoute(route)) {
    return null;
  }

  const estimatedChunkCount =
    route === "long-server"
      ? estimateLongVideoChunkCount(durationSeconds)
      : undefined;
  const {
    cost,
    durationBase,
    longVideoChunkSurcharge,
    longVideoExtraChunks,
    sizeSurcharge,
  } = calculateServerVideoCreditCost(
    durationSeconds,
    fileSizeBytes,
    estimatedChunkCount,
  );

  return {
    cost,
    durationBase,
    durationSeconds,
    estimatedExtraChunks: longVideoExtraChunks,
    estimatedLongVideoChunkSurcharge: longVideoChunkSurcharge,
    fileSizeBytes,
    longServerRoute: route === "long-server",
    sizeSurcharge,
  };
}

function buildVideoExportCostResult(
  durationSeconds: number,
  fileSizeBytes: number,
  route: "server" | "long-server",
  billing: ReturnType<typeof calculateServerVideoCreditCost>,
  longVideoChunkSurchargeEstimated: boolean,
): ExportCostResult {
  return {
    cost: billing.cost,
    durationSeconds,
    fileSizeBytes,
    fileType: "video",
    videoDurationBaseCredits: billing.durationBase,
    videoEstimatedExtraChunks:
      route === "long-server" ? billing.longVideoExtraChunks : undefined,
    videoLongServerRouted: route === "long-server",
    videoLongVideoChunkCount: billing.longVideoChunkCount,
    videoLongVideoChunkSurchargeCredits: billing.longVideoChunkSurcharge,
    videoLongVideoChunkSurchargeEstimated:
      route === "long-server" ? longVideoChunkSurchargeEstimated : undefined,
    videoServerRouted: true,
    videoSizeSurchargeCredits: billing.sizeSurcharge,
  };
}

async function resolveVideoExportCost(
  fileMeta: ExportFileMeta,
  options: ExportCostOptions = {},
): Promise<ExportCostResult> {
  const durationSeconds = fileMeta.durationSeconds;
  const fileSizeBytes = fileMeta.fileSizeBytes;
  const width = fileMeta.width;
  const height = fileMeta.height;

  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    typeof fileSizeBytes !== "number" ||
    !Number.isFinite(fileSizeBytes) ||
    fileSizeBytes <= 0 ||
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== "number" ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw new ExportCostError(
      "Video export cost requires durationSeconds, fileSizeBytes, width, and height.",
    );
  }

  const route = getVideoExportRoute(
    durationSeconds,
    width,
    height,
    fileSizeBytes,
  );

  if (route === "reject") {
    throw new ExportCostError(getVideoExportRejectionMessage());
  }

  if (route === "client") {
    return {
      cost: 0,
      durationSeconds,
      fileSizeBytes,
      fileType: "video",
      videoServerRouted: false,
    };
  }

  if (!isServerSideVideoExportRoute(route)) {
    throw new ExportCostError(getVideoExportRejectionMessage());
  }

  const longVideoChunkCount =
    route === "long-server"
      ? await resolveLongVideoChunkCountForBilling(
          durationSeconds,
          options.exportId,
          options.useActualLongVideoChunkCount ?? false,
          options.userId,
        )
      : undefined;
  const billing = calculateServerVideoCreditCost(
    durationSeconds,
    fileSizeBytes,
    longVideoChunkCount,
  );

  return buildVideoExportCostResult(
    durationSeconds,
    fileSizeBytes,
    route,
    billing,
    route === "long-server" && !(options.useActualLongVideoChunkCount ?? false),
  );
}

async function readPdfPageCountFromStorage(storagePath: string) {
  const safePath = sanitizeExportStoragePath(storagePath);
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(WATERMARK_TEMP_BUCKET)
    .download(safePath);

  if (error || !data) {
    throw new ExportCostError(
      "Could not read the uploaded PDF from storage for page-count verification.",
    );
  }

  const pdfBytes = new Uint8Array(await data.arrayBuffer());

  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    if (!Number.isFinite(pageCount) || pageCount < 1) {
      throw new ExportCostError("Uploaded PDF has no readable pages.");
    }

    return pageCount;
  } catch (error) {
    if (error instanceof ExportCostError) {
      throw error;
    }

    throw new ExportCostError("Uploaded file is not a valid PDF.");
  }
}

export function isServerRoutedVideoFileMeta(fileMeta: ExportFileMeta): boolean {
  const { durationSeconds, fileSizeBytes, width, height } = fileMeta;

  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    typeof fileSizeBytes !== "number" ||
    !Number.isFinite(fileSizeBytes) ||
    fileSizeBytes <= 0 ||
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== "number" ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    return false;
  }

  return isServerSideVideoExportRoute(
    getVideoExportRoute(durationSeconds, width, height, fileSizeBytes),
  );
}

export async function calculateExportCost(
  fileType: ExportFileType,
  fileMeta: ExportFileMeta = {},
  options: ExportCostOptions = {},
): Promise<ExportCostResult> {
  switch (fileType) {
    case "photo": {
      const photoCount = resolvePhotoExportCount(fileMeta);

      return {
        cost: PHOTO_EXPORT_CREDIT_COST * photoCount,
        fileType,
        photoCount,
      };
    }

    case "pdf": {
      if (!fileMeta.storagePath) {
        throw new ExportCostError(
          "PDF export cost requires an uploaded storagePath.",
        );
      }

      const pageCount = await readPdfPageCountFromStorage(fileMeta.storagePath);
      let fillPageCount = 0;
      let signedPageCount = 0;
      let fillManifest: FillManifestDocument | null = null;
      let signaturePlacementManifest: SignaturePlacementManifestDocument | null =
        null;

      if (fileMeta.fillManifestPath) {
        const rawManifest = await readFillManifestFromStorage(
          fileMeta.fillManifestPath,
        );
        fillManifest = parseFillManifestDocument(rawManifest);
        validateFillManifestForPdf(fillManifest, pageCount);
        fillPageCount = countFillPagesFromManifest(fillManifest, pageCount);
      }

      if (fileMeta.signaturePlacementManifestPath) {
        const rawManifest = await readSignaturePlacementManifestFromStorage(
          fileMeta.signaturePlacementManifestPath,
        );
        signaturePlacementManifest =
          parseSignaturePlacementManifestDocument(rawManifest);
        validateSignaturePlacementManifestForPdf(
          signaturePlacementManifest,
          pageCount,
        );
        signedPageCount = countSignedPagesFromManifest(
          signaturePlacementManifest,
          pageCount,
        );
      }

      const billingMode = resolvePdfBillingMode(
        fileMeta,
        signedPageCount,
        fillPageCount,
      );
      const billablePageCount =
        billingMode === "watermark"
          ? pageCount
          : countBillableSignFillPagesFromManifests(
              signaturePlacementManifest,
              fillManifest,
              pageCount,
            );

      return {
        ...calculatePdfExportCost({
          billablePageCount,
          billingMode,
          fillPageCount,
          pageCount,
          signedPageCount,
        }),
        fileType,
      };
    }

    case "video":
      return resolveVideoExportCost(fileMeta, options);

    case "signature":
      return {
        cost: 0,
        fileType,
      };

    default: {
      const exhaustiveCheck: never = fileType;
      throw new ExportCostError(`Unsupported export file type: ${exhaustiveCheck}`);
    }
  }
}

export function estimateVideoExportCost(fileMeta: ExportFileMeta) {
  const durationSeconds = fileMeta.durationSeconds;
  const fileSizeBytes = fileMeta.fileSizeBytes;
  const width = fileMeta.width;
  const height = fileMeta.height;

  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    typeof fileSizeBytes !== "number" ||
    !Number.isFinite(fileSizeBytes) ||
    fileSizeBytes <= 0 ||
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== "number" ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw new ExportCostError(
      "Video export cost requires durationSeconds, fileSizeBytes, width, and height.",
    );
  }

  const route = getVideoExportRoute(
    durationSeconds,
    width,
    height,
    fileSizeBytes,
  );

  if (route === "reject") {
    throw new ExportCostError(getVideoExportRejectionMessage());
  }

  if (route === "client") {
    return 0;
  }

  const estimatedChunkCount =
    route === "long-server"
      ? estimateLongVideoChunkCount(durationSeconds)
      : undefined;

  return calculateServerVideoCreditCost(
    durationSeconds,
    fileSizeBytes,
    estimatedChunkCount,
  ).cost;
}
