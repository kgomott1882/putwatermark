/** Target pixel density multiplier for raster image watermark overlays. */
export const IMAGE_WATERMARK_EXPORT_SCALE = 8;

/** High-DPI multiplier for the exported image when canvas limits allow. */
export const IMAGE_EXPORT_OUTPUT_SCALE = 3;

export const IMAGE_EXPORT_JPEG_QUALITY = 1;

const IMAGE_EXPORT_MAX_CANVAS_DIMENSION = 8192;
const IMAGE_EXPORT_MAX_CANVAS_PIXELS = 268_435_456;

function getMaxSafeExportScale(width: number, height: number, maxScale: number) {
  const pageW = Math.max(1, Math.floor(width));
  const pageH = Math.max(1, Math.floor(height));
  const longEdge = Math.max(pageW, pageH);
  const scaleByDimension = Math.floor(
    IMAGE_EXPORT_MAX_CANVAS_DIMENSION / longEdge,
  );
  const scaleByArea = Math.floor(
    Math.sqrt(IMAGE_EXPORT_MAX_CANVAS_PIXELS / (pageW * pageH)),
  );
  const maxSafeScale = Math.max(1, Math.min(scaleByDimension, scaleByArea));

  return Math.max(1, Math.min(maxScale, maxSafeScale));
}

export function getImageWatermarkExportScale(width: number, height: number) {
  return getMaxSafeExportScale(width, height, IMAGE_WATERMARK_EXPORT_SCALE);
}

export function getImageExportOutputScale(width: number, height: number) {
  return getMaxSafeExportScale(width, height, IMAGE_EXPORT_OUTPUT_SCALE);
}

export function applyHighQualityCanvasDefaults(
  context: CanvasRenderingContext2D,
) {
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
}
