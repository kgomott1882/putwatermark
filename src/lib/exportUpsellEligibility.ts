import {
  estimateVideoExportCost,
  isServerRoutedVideoFileMeta,
  PHOTO_EXPORT_CREDIT_COST,
  type ExportFileMeta,
} from "./exportCost";
import {
  estimatePdfExportCost,
  type PdfBillingMode,
} from "./pdfExportBilling";
import type { PdfPageFillMap } from "./pdfPageFillFields";
import type { PdfPageSignatureMap } from "./pdfPageSignatures";
import {
  getVideoExportRoute,
  isServerSideVideoExportRoute,
} from "./videoExportLimits";

/** Mirrors server rates in exportCost.ts — client-only estimate for upsell UX. */

export type ExportUpsellFileType = "photo" | "pdf" | "video" | "signature";

export type WatermarkedExportUpsellContext = {
  creditBalance: number | null;
  estimatedExportCost: number;
  fileType: ExportUpsellFileType;
  isAuthenticated: boolean;
  videoServerRouted?: boolean;
};

export function isServerRoutedVideoUpsellContext({
  fileType,
  videoServerRouted,
}: Pick<WatermarkedExportUpsellContext, "fileType" | "videoServerRouted">) {
  return fileType === "video" && Boolean(videoServerRouted);
}

export function estimateClientExportCost(
  fileType: ExportUpsellFileType,
  {
    fillMap,
    fillPageCount = 0,
    pdfBillingMode = "watermark",
    pdfPageCount = 1,
    photoCount = 1,
    signatureMap,
    videoFileMeta,
  }: {
    fillMap?: PdfPageFillMap;
    fillPageCount?: number;
    pdfBillingMode?: PdfBillingMode;
    pdfPageCount?: number;
    photoCount?: number;
    signatureMap?: PdfPageSignatureMap;
    videoFileMeta?: ExportFileMeta;
  } = {},
) {
  switch (fileType) {
    case "photo":
      return PHOTO_EXPORT_CREDIT_COST * Math.max(1, photoCount);
    case "pdf":
      if (signatureMap && fillMap) {
        return estimatePdfExportCost({
          billingMode: pdfBillingMode,
          fillMap,
          fillPageCount,
          pageCount: Math.max(1, pdfPageCount),
          signatureMap,
        });
      }

      return estimatePdfExportCost({
        billingMode: pdfBillingMode,
        fillMap: {},
        fillPageCount,
        pageCount: Math.max(1, pdfPageCount),
        signatureMap: {},
      });
    case "video":
      if (!videoFileMeta) {
        return 0;
      }

      try {
        return estimateVideoExportCost(videoFileMeta);
      } catch {
        return 0;
      }
    case "signature":
      return 0;
    default: {
      const exhaustiveCheck: never = fileType;
      return exhaustiveCheck;
    }
  }
}

export function resolveVideoServerRoutedFromFileMeta(
  videoFileMeta?: ExportFileMeta,
) {
  if (!videoFileMeta) {
    return false;
  }

  if (isServerRoutedVideoFileMeta(videoFileMeta)) {
    return true;
  }

  const { durationSeconds, fileSizeBytes, width, height } = videoFileMeta;

  if (
    typeof durationSeconds !== "number" ||
    typeof fileSizeBytes !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    return false;
  }

  return isServerSideVideoExportRoute(
    getVideoExportRoute(durationSeconds, width, height, fileSizeBytes),
  );
}

/** Server-routed video exports require paid credits — no free/watermarked fallback. */
export function shouldRequireCreditsBeforeExport(
  context: WatermarkedExportUpsellContext,
) {
  if (!isServerRoutedVideoUpsellContext(context) || !context.isAuthenticated) {
    return false;
  }

  if (context.creditBalance === null) {
    return true;
  }

  return context.creditBalance < context.estimatedExportCost;
}

export function shouldApplyForcedWatermarkForClientVideoExport({
  authTier,
  creditBalance,
  exportRoute,
  resolvedBalance,
}: {
  authTier: "clean" | "watermarked";
  creditBalance: number | null;
  exportRoute: ReturnType<typeof getVideoExportRoute>;
  resolvedBalance?: number | null;
}) {
  if (exportRoute !== "client") {
    return false;
  }

  if (authTier !== "clean") {
    return true;
  }

  const balance = resolvedBalance ?? creditBalance ?? 0;
  return balance <= 0;
}

/** Photo exports (single or batch ZIP) use the forced stamp when tier is watermarked or balance is free. */
export function shouldApplyForcedWatermarkForPhotoExport({
  authTier,
  creditBalance,
  resolvedBalance,
}: {
  authTier: "clean" | "watermarked";
  creditBalance: number | null;
  resolvedBalance?: number | null;
}) {
  if (authTier !== "clean") {
    return true;
  }

  const balance = resolvedBalance ?? creditBalance ?? 0;
  return balance <= 0;
}

/** True when this export would likely receive the forced center watermark. */
export function wouldReceiveWatermarkedExport({
  creditBalance,
  estimatedExportCost,
  fileType,
  isAuthenticated,
  videoServerRouted,
}: WatermarkedExportUpsellContext) {
  if (isServerRoutedVideoUpsellContext({ fileType, videoServerRouted })) {
    return false;
  }

  if (!isAuthenticated) {
    return true;
  }

  if (creditBalance === null) {
    return true;
  }

  if (fileType === "signature") {
    return false;
  }

  if (creditBalance <= 0 && estimatedExportCost <= 0) {
    return true;
  }

  return creditBalance < estimatedExportCost;
}

export function shouldShowWatermarkedExportUpsell(
  context: WatermarkedExportUpsellContext,
) {
  if (shouldRequireCreditsBeforeExport(context)) {
    return false;
  }

  return wouldReceiveWatermarkedExport(context);
}
