import { PDFDocument } from "pdf-lib";
import {
  createAdminClient,
  WATERMARK_TEMP_BUCKET,
} from "../../utils/supabase/admin";
import { CLIENT_VIDEO_MAX_DURATION_SECONDS } from "./videoExportLimits";

export const PHOTO_EXPORT_CREDIT_COST = 50;
export const PDF_CREDITS_PER_PAGE = 50;

export type ExportFileType = "photo" | "pdf" | "video" | "signature";

/**
 * Metadata supplied alongside fileType. Page count is never accepted from the
 * client — PDF cost is derived from the uploaded file in storage.
 *
 * PDF flow (Stage 2+): client uploads to watermark-temp via signed URL first,
 * then passes `storagePath` here (e.g. `exports/{exportId}/input.pdf`).
 */
export type ExportFileMeta = {
  storagePath?: string;
  durationSeconds?: number;
  /** Photo exports only. Defaults to 1. Batch ZIP passes the number of images exported. */
  photoCount?: number;
};

export type ExportCostResult = {
  cost: number;
  fileType: ExportFileType;
  pageCount?: number;
  photoCount?: number;
  durationSeconds?: number;
  videoWithinAllowance?: boolean;
};

export class ExportCostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportCostError";
  }
}

const EXPORT_STORAGE_PATH_PATTERN =
  /^exports\/[0-9a-f-]{36}\/input\.[a-z0-9]+$/i;

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

export async function calculateExportCost(
  fileType: ExportFileType,
  fileMeta: ExportFileMeta = {},
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

      return {
        cost: PDF_CREDITS_PER_PAGE * pageCount,
        fileType,
        pageCount,
      };
    }

    case "video": {
      const durationSeconds =
        typeof fileMeta.durationSeconds === "number" &&
        Number.isFinite(fileMeta.durationSeconds) &&
        fileMeta.durationSeconds > 0
          ? fileMeta.durationSeconds
          : undefined;

      // Overage pricing is not calibrated yet — treat all videos as within
      // plan allowance and charge 0 credits until per-second rates are defined.
      return {
        cost: 0,
        durationSeconds,
        fileType,
        videoWithinAllowance: true,
      };
    }

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

/** Documented allowance threshold for future video overage work. */
export function getVideoIncludedDurationSeconds() {
  return CLIENT_VIDEO_MAX_DURATION_SECONDS;
}
