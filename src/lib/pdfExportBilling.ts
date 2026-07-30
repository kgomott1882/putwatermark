import type { PdfPageFillMap } from "./pdfPageFillFields";
import { buildPdfPageId } from "./pdfPageSignatures";
import type { PdfPageSignatureMap } from "./pdfPageSignatures";
import {
  PDF_CREDITS_PER_PAGE,
  PDF_FILL_CREDITS_PER_PAGE,
  type PdfBillingMode,
} from "./exportCost";

export type { PdfBillingMode };

export type PdfWatermarkSettingsLike = {
  logoLayers?: Array<{ logoImage: HTMLImageElement | null }>;
  textLayers?: Array<{ text: string }>;
  watermarkText: string;
  watermarkType: "text" | "logo" | "signature";
};

export function hasPdfWatermarkExportContent(
  settings: PdfWatermarkSettingsLike,
): boolean {
  if (settings.watermarkType === "text") {
    if (settings.textLayers?.some((layer) => layer.text.trim().length > 0)) {
      return true;
    }

    return settings.watermarkText.trim().length > 0;
  }

  if (settings.watermarkType === "logo") {
    return Boolean(settings.logoLayers?.some((layer) => layer.logoImage));
  }

  return false;
}

export function getPdfBillingMode(
  settings: PdfWatermarkSettingsLike,
): PdfBillingMode {
  return hasPdfWatermarkExportContent(settings) ? "watermark" : "signFill";
}

export function countBillableSignFillPages(
  signatureMap: PdfPageSignatureMap,
  fillMap: PdfPageFillMap,
  pageCount: number,
): number {
  const billable = new Set<number>();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const pageId = buildPdfPageId(pageNumber);

    if ((signatureMap[pageId] ?? []).length > 0) {
      billable.add(pageNumber);
    }

    if ((fillMap[pageId] ?? []).some((field) => field.text.trim().length > 0)) {
      billable.add(pageNumber);
    }
  }

  return billable.size;
}

export function countSignedPdfPagesFromMap(map: PdfPageSignatureMap): number {
  return Object.values(map).filter((placements) => placements.length > 0).length;
}

export function estimatePdfExportCost(input: {
  billingMode: PdfBillingMode;
  fillPageCount: number;
  pageCount: number;
  signatureMap: PdfPageSignatureMap;
  fillMap: PdfPageFillMap;
}) {
  const billablePageCount =
    input.billingMode === "watermark"
      ? input.pageCount
      : countBillableSignFillPages(
          input.signatureMap,
          input.fillMap,
          input.pageCount,
        );
  const baseCost = PDF_CREDITS_PER_PAGE * billablePageCount;
  const fillSurchargeCredits = PDF_FILL_CREDITS_PER_PAGE * input.fillPageCount;

  return baseCost + fillSurchargeCredits;
}

export function getMinimumCreditsForSignFillAction(input: {
  action: "addFillText" | "placeSignature";
  pageHasSignaturePlacement: boolean;
}) {
  if (input.action === "placeSignature") {
    return PDF_CREDITS_PER_PAGE;
  }

  return input.pageHasSignaturePlacement
    ? PDF_FILL_CREDITS_PER_PAGE
    : PDF_CREDITS_PER_PAGE + PDF_FILL_CREDITS_PER_PAGE;
}
