import { PDFDocument, type PDFImage } from "pdf-lib";
import { getPdfTileDrawImageArgs } from "./pdfTileWatermarkLayout";

/** Target pixel density multiplier for watermark overlay PNGs (PDF points × scale). */
export const PDF_WATERMARK_EXPORT_SCALE = 3;

/** Conservative per-side limit (Safari and some GPUs cap around 8192px). */
const PDF_WATERMARK_MAX_CANVAS_DIMENSION = 8192;

/** Common total pixel budget (16384²) enforced by several browsers. */
const PDF_WATERMARK_MAX_CANVAS_PIXELS = 268_435_456;

export function getPdfWatermarkExportScale(pageWidth: number, pageHeight: number) {
  const pageW = Math.max(1, Math.floor(pageWidth));
  const pageH = Math.max(1, Math.floor(pageHeight));
  const longEdge = Math.max(pageW, pageH);
  const scaleByDimension = Math.floor(
    PDF_WATERMARK_MAX_CANVAS_DIMENSION / longEdge,
  );
  const scaleByArea = Math.floor(
    Math.sqrt(PDF_WATERMARK_MAX_CANVAS_PIXELS / (pageW * pageH)),
  );
  const maxSafeScale = Math.max(1, Math.min(scaleByDimension, scaleByArea));

  return Math.max(1, Math.min(PDF_WATERMARK_EXPORT_SCALE, maxSafeScale));
}

export type PdfTilePatternWatermark = {
  angleDegrees: 0 | 45 | 90 | 180;
  centers: { x: number; y: number }[];
  kind: "tilePattern";
  opacity: number;
  unitHeightPoints: number;
  unitPngBytes: Uint8Array;
  unitWidthPoints: number;
};

export type PdfFullOverlayWatermark = {
  kind: "fullOverlay";
  pngBytes: Uint8Array;
};

export type PdfPageWatermark = PdfFullOverlayWatermark | PdfTilePatternWatermark;

function getTileUnitCacheKey(watermark: PdfTilePatternWatermark) {
  const bytes = watermark.unitPngBytes;
  const sample = bytes.length > 64 ? bytes.subarray(0, 64) : bytes;

  return [
    watermark.unitWidthPoints,
    watermark.unitHeightPoints,
    watermark.angleDegrees,
    watermark.opacity,
    bytes.length,
    Array.from(sample).join(","),
  ].join("|");
}

export async function exportWatermarkedPdf(
  originalBytes: Uint8Array,
  renderPageWatermark: (
    pageIndex: number,
    pageWidth: number,
    pageHeight: number,
  ) => Promise<PdfPageWatermark>,
  onProgress?: (current: number, total: number) => void,
) {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const pages = pdfDoc.getPages();
  const embeddedTileImages = new Map<string, PDFImage>();

  for (let index = 0; index < pages.length; index += 1) {
    onProgress?.(index + 1, pages.length);

    const page = pages[index];
    const { width, height } = page.getSize();
    const watermark = await renderPageWatermark(index, width, height);

    if (watermark.kind === "fullOverlay") {
      const pngImage = await pdfDoc.embedPng(watermark.pngBytes);

      page.drawImage(pngImage, {
        height,
        width,
        x: 0,
        y: 0,
      });
      continue;
    }

    const cacheKey = getTileUnitCacheKey(watermark);
    let tileImage = embeddedTileImages.get(cacheKey);

    if (!tileImage) {
      tileImage = await pdfDoc.embedPng(watermark.unitPngBytes);
      embeddedTileImages.set(cacheKey, tileImage);
    }

    for (const center of watermark.centers) {
      const drawArgs = getPdfTileDrawImageArgs({
        centerX: center.x,
        centerY: center.y,
        pageHeight: height,
        tileHeight: watermark.unitHeightPoints,
        tileWidth: watermark.unitWidthPoints,
      });

      page.drawImage(tileImage, {
        height: drawArgs.height,
        opacity: watermark.opacity,
        width: drawArgs.width,
        x: drawArgs.x,
        y: drawArgs.y,
      });
    }
  }

  return pdfDoc.save();
}

export function getPdfExportFileName(fileName: string) {
  const fallbackName = "watermarked-document";
  const baseName = fileName.trim()
    ? fileName.replace(/\.pdf$/i, "")
    : fallbackName;

  return `${baseName || fallbackName}-watermarked.pdf`;
}
