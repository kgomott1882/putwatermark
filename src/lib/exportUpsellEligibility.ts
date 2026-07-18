/** Mirrors server rates in exportCost.ts — client-only estimate for upsell UX. */
const PHOTO_EXPORT_CREDIT_COST = 50;
const PDF_CREDITS_PER_PAGE = 50;

export type ExportUpsellFileType = "photo" | "pdf" | "video" | "signature";

export type WatermarkedExportUpsellContext = {
  creditBalance: number | null;
  estimatedExportCost: number;
  fileType: ExportUpsellFileType;
  isAuthenticated: boolean;
};

export function estimateClientExportCost(
  fileType: ExportUpsellFileType,
  {
    pdfPageCount = 1,
    photoCount = 1,
  }: {
    pdfPageCount?: number;
    photoCount?: number;
  } = {},
) {
  switch (fileType) {
    case "photo":
      return PHOTO_EXPORT_CREDIT_COST * Math.max(1, photoCount);
    case "pdf":
      return PDF_CREDITS_PER_PAGE * Math.max(1, pdfPageCount);
    case "video":
    case "signature":
      return 0;
    default: {
      const exhaustiveCheck: never = fileType;
      return exhaustiveCheck;
    }
  }
}

/** True when this export would likely receive forced-tile (watermarked) output. */
export function wouldReceiveWatermarkedExport({
  creditBalance,
  estimatedExportCost,
  fileType,
  isAuthenticated,
}: WatermarkedExportUpsellContext) {
  if (!isAuthenticated) {
    return true;
  }

  if (creditBalance === null) {
    return true;
  }

  if (fileType === "video") {
    // Mirrors authorizeExport placeholder gate while video cost is still 0.
    return creditBalance <= 0;
  }

  return creditBalance < estimatedExportCost;
}

export function shouldShowWatermarkedExportUpsell(
  context: WatermarkedExportUpsellContext,
) {
  return wouldReceiveWatermarkedExport(context);
}
