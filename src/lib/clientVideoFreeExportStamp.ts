import { applyHighQualityCanvasDefaults } from "./imageWatermarkExport";
import {
  paintForcedExportEdgeUpsellText,
  paintForcedExportTilePattern,
} from "./forcedTileExport";

/** Static pre-rendered stamp for free client-side video exports (see scripts/generate-forced-export-stamp.mjs). */
export const CLIENT_VIDEO_FREE_EXPORT_STAMP_PATH = "/forced-export-stamp.png";

/** Matches photo/PDF forced stamp prominence (~72% of content width at scale 400). */
export const CLIENT_VIDEO_FREE_EXPORT_STAMP_FONT_SIZE_SCALE = 400;

export const CLIENT_VIDEO_FREE_EXPORT_STAMP_OPACITY = 0.44;

let stampImageCache: HTMLImageElement | null = null;
let stampImagePromise: Promise<HTMLImageElement> | null = null;

export function getClientVideoFreeExportStampDrawableWidth(contentWidth: number) {
  return Math.min(
    contentWidth * 0.6,
    Math.max(
      24,
      contentWidth *
        0.18 *
        (CLIENT_VIDEO_FREE_EXPORT_STAMP_FONT_SIZE_SCALE / 100),
    ),
  );
}

export function loadClientVideoFreeExportStampImage() {
  if (stampImageCache) {
    return Promise.resolve(stampImageCache);
  }

  if (!stampImagePromise) {
    stampImagePromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        stampImageCache = image;
        resolve(image);
      };
      image.onerror = () => {
        stampImagePromise = null;
        reject(
          new Error("Could not load the client video free export stamp image."),
        );
      };
      image.src = CLIENT_VIDEO_FREE_EXPORT_STAMP_PATH;
    });
  }

  return stampImagePromise;
}

export async function paintClientVideoFreeExportStamp(
  context: CanvasRenderingContext2D,
  contentWidth: number,
  contentHeight: number,
  stampImage?: HTMLImageElement,
) {
  const image = stampImage ?? (await loadClientVideoFreeExportStampImage());

  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    throw new Error("Client video free export stamp image is not ready.");
  }

  paintForcedExportTilePattern({
    context,
    imageHeight: contentHeight,
    imageWidth: contentWidth,
    imageX: 0,
    imageY: 0,
    watermarkReferenceWidth: contentWidth,
  });

  const drawableWidth = getClientVideoFreeExportStampDrawableWidth(contentWidth);
  const drawableHeight = drawableWidth * (image.naturalHeight / image.naturalWidth);
  const centerX = contentWidth / 2;
  const centerY = contentHeight / 2;

  context.save();
  context.globalAlpha = CLIENT_VIDEO_FREE_EXPORT_STAMP_OPACITY;
  applyHighQualityCanvasDefaults(context);
  context.drawImage(
    image,
    centerX - drawableWidth / 2,
    centerY - drawableHeight / 2,
    drawableWidth,
    drawableHeight,
  );
  context.restore();

  paintForcedExportEdgeUpsellText({
    context,
    imageHeight: contentHeight,
    imageWidth: contentWidth,
    imageX: 0,
    imageY: 0,
  });
}
