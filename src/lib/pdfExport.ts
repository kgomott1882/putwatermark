import { PDFDocument } from "pdf-lib";

/** Target pixel density multiplier for watermark overlay PNGs (PDF points × scale). */
export const PDF_WATERMARK_EXPORT_SCALE = 6;

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

export async function exportWatermarkedPdf(
  originalBytes: Uint8Array,
  renderPageOverlay: (
    pageIndex: number,
    pageWidth: number,
    pageHeight: number,
  ) => Promise<Uint8Array>,
  onProgress?: (current: number, total: number) => void,
) {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const pages = pdfDoc.getPages();

  for (let index = 0; index < pages.length; index += 1) {
    onProgress?.(index + 1, pages.length);

    const page = pages[index];
    const { width, height } = page.getSize();
    const overlayPng = await renderPageOverlay(index, width, height);
    const pngImage = await pdfDoc.embedPng(overlayPng);

    // Overlay PNG is rendered at getPdfWatermarkExportScale× point resolution;
    // draw at page size in points so pdf-lib downscales the high-res image.
    page.drawImage(pngImage, {
      height,
      width,
      x: 0,
      y: 0,
    });
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
