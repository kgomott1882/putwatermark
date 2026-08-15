import type { ExportFileMeta, ExportFileType } from "./exportCost";
import { applyHighQualityCanvasDefaults } from "./imageWatermarkExport";
import {
  loadWatermarkFont,
  MONSERRAT_WATERMARK_FONT_FAMILY,
} from "./watermarkFonts";
import {
  createDefaultLogoLayer,
  type LogoWatermarkLayer,
  type TextWatermarkLayer,
  type WatermarkPosition,
} from "./watermarkLayers";
import {
  DEFAULT_TEXT_SHADOW_ENABLED,
  DEFAULT_TEXT_WATERMARK_COLOR,
  DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
  resolveTextWatermarkPaint,
} from "./watermarkTextStyle";

/** Public asset — always available at export time, independent of user uploads. */
export const FORCED_TILE_LOGO_PATH = "/Put%20Watermark%20-%20Icon.png";

export const FORCED_TILE_SITE_TEXT = "PutWatermark.com";

export const FORCED_TILE_LAYER_ID = "forced-export-tile";

export const FORCED_EXPORT_EDGE_UPSELL_TEXT =
  "Buy credits to remove watermark.";

/** ~72% of content width at export (2× prior prominence at scale 400). */
export const FORCED_TILE_SETTINGS = {
  fontSizeScale: 400,
  logoFileName: "Put Watermark - Forced Center Stamp.png",
  tileAngle: 0,
  tileDensity: "medium",
  tileGap: 130,
  watermarkMode: "single",
  watermarkOpacity: 44,
  watermarkPosition: "center",
  watermarkType: "logo",
} as const;

/** Paid Tile mode match — background text tile for free/forced photo + video exports only. */
export const FORCED_TILE_PATTERN_SETTINGS = {
  fontFamily: MONSERRAT_WATERMARK_FONT_FAMILY,
  fontSizeScale: 20,
  tileAngle: 45,
  tileDensity: "sparse",
  tileGap: 130,
  watermarkMode: "tile",
  watermarkOpacity: 20,
  watermarkText: FORCED_TILE_SITE_TEXT,
  watermarkType: "text",
} as const;

const FORCED_TILE_PATTERN_DENSITY_REPETITIONS = {
  dense: 9.5,
  medium: 6.5,
  sparse: 4.5,
} as const;

const FORCED_TILE_TEXT_COLOR = "#ffffff";
const FORCED_TILE_TEXT_STROKE = "rgba(0, 0, 0, 0.5)";
const FORCED_TILE_ICON_LIGHT_HALO = "rgba(255, 255, 255, 0.85)";
const FORCED_TILE_ICON_DARK_EDGE = "rgba(0, 0, 0, 0.55)";

function drawForcedTileWhiteIcon(
  context: CanvasRenderingContext2D,
  logoImage: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = Math.max(1, Math.ceil(width));
  maskCanvas.height = Math.max(1, Math.ceil(height));
  const maskContext = maskCanvas.getContext("2d");

  if (!maskContext) {
    context.drawImage(logoImage, x, y, width, height);
    return;
  }

  maskContext.drawImage(logoImage, 0, 0, width, height);
  maskContext.globalCompositeOperation = "source-in";
  maskContext.fillStyle = FORCED_TILE_TEXT_COLOR;
  maskContext.fillRect(0, 0, width, height);
  context.drawImage(maskCanvas, x, y);
}

function drawForcedTileIconWithOutline(
  context: CanvasRenderingContext2D,
  logoImage: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const strokeWidth = Math.max(1, Math.round(width * 0.04));

  context.save();
  context.shadowColor = FORCED_TILE_ICON_DARK_EDGE;
  context.shadowBlur = strokeWidth * 2.2;
  context.shadowOffsetY = Math.max(1, strokeWidth * 0.35);
  drawForcedTileWhiteIcon(context, logoImage, x, y, width, height);
  context.restore();

  context.save();
  context.shadowColor = FORCED_TILE_ICON_LIGHT_HALO;
  context.shadowBlur = strokeWidth * 1.6;
  context.shadowOffsetY = 0;
  drawForcedTileWhiteIcon(context, logoImage, x, y, width, height);
  context.restore();

  drawForcedTileWhiteIcon(context, logoImage, x, y, width, height);
}

function drawForcedTileSiteText(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  fontSize: number,
) {
  context.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.lineJoin = "round";
  context.lineWidth = Math.max(1.5, fontSize / 10);
  context.strokeStyle = FORCED_TILE_TEXT_STROKE;
  context.fillStyle = FORCED_TILE_TEXT_COLOR;
  context.strokeText(FORCED_TILE_SITE_TEXT, x, y);
  context.fillText(FORCED_TILE_SITE_TEXT, x, y);
}

const FORCED_TILE_OPACITY = FORCED_TILE_SETTINGS.watermarkOpacity;
const FORCED_TILE_FONT_SIZE_SCALE = FORCED_TILE_SETTINGS.fontSizeScale;
const FORCED_TILE_POSITION: WatermarkPosition =
  FORCED_TILE_SETTINGS.watermarkPosition;
const FORCED_CENTER_POSITION = { xPercent: 0.5, yPercent: 0.5 } as const;
const FORCED_TILE_COMPOSITE_ICON_WIDTH = Math.round(
  56 * (FORCED_TILE_FONT_SIZE_SCALE / 25),
);

type TileAngle = 0 | 45 | 90 | 180;
type TileDensity = "sparse" | "medium" | "dense";
type WatermarkMode = "single" | "tile";

type ForcedTileSettings = {
  activeLogoLayerId: string;
  activeTextLayerId: string;
  customPosition: { xPercent: number; yPercent: number } | null;
  fontFamily: string;
  fontSizeScale: number;
  logoImage: HTMLImageElement | null;
  logoLayers: LogoWatermarkLayer[];
  textLayers: TextWatermarkLayer[];
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  watermarkMode: WatermarkMode;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
  watermarkText: string;
  watermarkType: "text" | "logo" | "signature";
};

let forcedTileLogoImageCache: HTMLImageElement | null = null;
let forcedTileLogoImagePromise: Promise<HTMLImageElement> | null = null;
let forcedTileCompositeWithTextCache: HTMLImageElement | null = null;
let forcedTileCompositeWithTextPromise: Promise<HTMLImageElement> | null = null;
let forcedTileCompositeIconOnlyCache: HTMLImageElement | null = null;
let forcedTileCompositeIconOnlyPromise: Promise<HTMLImageElement> | null = null;

function canvasToImage(canvas: HTMLCanvasElement) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => {
      reject(new Error("Could not create the forced watermark composite image."));
    };
    image.src = canvas.toDataURL("image/png");
  });
}

export function createForcedTileCompositeImage(
  logoImage: HTMLImageElement,
  options?: { includeSiteText?: boolean },
) {
  const includeSiteText = options?.includeSiteText ?? true;
  const cachedImage = includeSiteText
    ? forcedTileCompositeWithTextCache
    : forcedTileCompositeIconOnlyCache;

  if (cachedImage) {
    return Promise.resolve(cachedImage);
  }

  const pendingPromise = includeSiteText
    ? forcedTileCompositeWithTextPromise
    : forcedTileCompositeIconOnlyPromise;

  if (!pendingPromise) {
    const compositePromise = (async () => {
      const iconBaseWidth = FORCED_TILE_COMPOSITE_ICON_WIDTH;
      const iconAspect =
        logoImage.naturalWidth > 0
          ? logoImage.naturalHeight / logoImage.naturalWidth
          : 1;
      const iconHeight = iconBaseWidth * iconAspect;
      const fontSize = Math.max(7, Math.round(iconBaseWidth * 0.2));
      const textGap = Math.max(3, Math.round(iconBaseWidth * 0.1));
      const padding = 4;

      const measureCanvas = document.createElement("canvas");
      const measureContext = measureCanvas.getContext("2d");

      if (!measureContext) {
        throw new Error("Could not measure the forced watermark composite text.");
      }

      measureContext.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      const textMetrics = measureContext.measureText(FORCED_TILE_SITE_TEXT);
      const textWidth = textMetrics.width;
      const textHeight = fontSize * 1.15;
      const unitWidth = Math.ceil(Math.max(iconBaseWidth, textWidth) + padding * 2);
      const unitHeight = Math.ceil(
        iconHeight + textGap + textHeight + padding * 1.5,
      );
      const scale =
        typeof window !== "undefined"
          ? Math.min(window.devicePixelRatio || 1, 2)
          : 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(unitWidth * scale);
      canvas.height = Math.round(unitHeight * scale);
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not render the forced watermark composite image.");
      }

      context.scale(scale, scale);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      const iconX = (unitWidth - iconBaseWidth) / 2;
      const iconY = padding / 2;
      drawForcedTileIconWithOutline(
        context,
        logoImage,
        iconX,
        iconY,
        iconBaseWidth,
        iconHeight,
      );

      if (includeSiteText) {
        drawForcedTileSiteText(
          context,
          unitWidth / 2,
          iconY + iconHeight + textGap,
          fontSize,
        );
      }

      const compositeImage = await canvasToImage(canvas);
      if (typeof compositeImage.decode === "function") {
        await compositeImage.decode().catch(() => undefined);
      }

      if (includeSiteText) {
        forcedTileCompositeWithTextCache = compositeImage;
      } else {
        forcedTileCompositeIconOnlyCache = compositeImage;
      }

      return compositeImage;
    })().catch((error) => {
      if (includeSiteText) {
        forcedTileCompositeWithTextPromise = null;
      } else {
        forcedTileCompositeIconOnlyPromise = null;
      }
      throw error;
    });

    if (includeSiteText) {
      forcedTileCompositeWithTextPromise = compositePromise;
    } else {
      forcedTileCompositeIconOnlyPromise = compositePromise;
    }

    return compositePromise;
  }

  return pendingPromise;
}

export function loadForcedTileLogoImage() {
  if (forcedTileLogoImageCache) {
    return Promise.resolve(forcedTileLogoImageCache);
  }

  if (!forcedTileLogoImagePromise) {
    forcedTileLogoImagePromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        forcedTileLogoImageCache = image;
        resolve(image);
      };
      image.onerror = () => {
        forcedTileLogoImagePromise = null;
        reject(new Error("Could not load the forced watermark logo icon."));
      };
      image.src = FORCED_TILE_LOGO_PATH;
    });
  }

  return forcedTileLogoImagePromise;
}

export function hasForcedWatermarkOverlay(settings: {
  logoLayers?: LogoWatermarkLayer[];
}) {
  return (settings.logoLayers ?? []).some(
    (layer) => layer.id === FORCED_TILE_LAYER_ID,
  );
}

type ForcedExportTilePatternInput = {
  context: CanvasRenderingContext2D;
  displayScale?: number;
  imageHeight: number;
  imageWidth: number;
  imageX: number;
  imageY: number;
  watermarkReferenceWidth: number;
};

function measureForcedTilePatternDrawable(
  context: CanvasRenderingContext2D,
  fontSize: number,
  text: string,
  fontFamily: string,
) {
  context.save();
  context.font = `${DEFAULT_TEXT_WATERMARK_FONT_WEIGHT} ${fontSize}px ${fontFamily}`;
  const metrics = context.measureText(text);
  context.restore();

  return {
    fontFamily,
    fontSize,
    height:
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
      fontSize,
    text,
    width: metrics.width,
  };
}

function drawForcedTilePatternUnit(
  context: CanvasRenderingContext2D,
  drawable: ReturnType<typeof measureForcedTilePatternDrawable>,
  x: number,
  y: number,
  alpha: number,
) {
  context.save();
  context.font = `${DEFAULT_TEXT_WATERMARK_FONT_WEIGHT} ${drawable.fontSize}px ${drawable.fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = Math.max(3, drawable.fontSize / 12);
  const paint = resolveTextWatermarkPaint({
    alpha,
    textColor: DEFAULT_TEXT_WATERMARK_COLOR,
    textShadowEnabled: DEFAULT_TEXT_SHADOW_ENABLED,
  });
  context.strokeStyle = paint.strokeStyle;
  context.fillStyle = paint.fillStyle;
  context.shadowColor = paint.shadowColor;
  context.shadowBlur = paint.shadowBlur;
  context.strokeText(drawable.text, x, y);
  context.fillText(drawable.text, x, y);
  context.restore();
}

function resolveForcedExportEdgeUpsellFontSize(
  context: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  displayScale: number,
) {
  const shortSide = Math.min(imageWidth, imageHeight);
  let fontSize =
    Math.max(9, Math.min(16, shortSide * 0.024)) * Math.max(displayScale, 1);
  const maxWidth = imageWidth * 0.9;

  context.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;

  while (
    fontSize > 7 * Math.max(displayScale, 1) &&
    context.measureText(FORCED_EXPORT_EDGE_UPSELL_TEXT).width > maxWidth
  ) {
    fontSize *= 0.92;
    context.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  }

  return fontSize;
}

/** Upsell copy along all four edges of forced-export frames. */
export function paintForcedExportEdgeUpsellText({
  context,
  displayScale = 1,
  imageHeight,
  imageWidth,
  imageX,
  imageY,
}: {
  context: CanvasRenderingContext2D;
  displayScale?: number;
  imageHeight: number;
  imageWidth: number;
  imageX: number;
  imageY: number;
}) {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return;
  }

  const fontSize = resolveForcedExportEdgeUpsellFontSize(
    context,
    imageWidth,
    imageHeight,
    displayScale,
  );
  const padding = Math.max(8, fontSize * 0.65);
  const text = FORCED_EXPORT_EDGE_UPSELL_TEXT;

  context.save();
  context.beginPath();
  context.rect(imageX, imageY, imageWidth, imageHeight);
  context.clip();
  applyHighQualityCanvasDefaults(context);
  context.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  context.fillStyle = "rgba(255, 255, 255, 0.94)";
  context.strokeStyle = "rgba(0, 0, 0, 0.58)";
  context.lineWidth = Math.max(1, fontSize / 9);
  context.lineJoin = "round";
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.strokeText(
    text,
    imageX + imageWidth / 2,
    imageY + padding + fontSize / 2,
  );
  context.fillText(
    text,
    imageX + imageWidth / 2,
    imageY + padding + fontSize / 2,
  );

  context.strokeText(
    text,
    imageX + imageWidth / 2,
    imageY + imageHeight - padding - fontSize / 2,
  );
  context.fillText(
    text,
    imageX + imageWidth / 2,
    imageY + imageHeight - padding - fontSize / 2,
  );

  context.save();
  context.translate(imageX + padding + fontSize / 2, imageY + imageHeight / 2);
  context.rotate(-Math.PI / 2);
  context.strokeText(text, 0, 0);
  context.fillText(text, 0, 0);
  context.restore();

  context.save();
  context.translate(
    imageX + imageWidth - padding - fontSize / 2,
    imageY + imageHeight / 2,
  );
  context.rotate(Math.PI / 2);
  context.strokeText(text, 0, 0);
  context.fillText(text, 0, 0);
  context.restore();

  context.restore();
}

/** Ensures Montserrat is loaded before painting the forced tile text layer. */
export async function ensureForcedTilePatternFontLoaded() {
  await loadWatermarkFont(
    FORCED_TILE_PATTERN_SETTINGS.fontFamily,
    DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
  );
}

/** Full-frame text tile for client video free exports (matches photo drawTiledWatermark output). */
export function paintForcedExportTilePattern({
  context,
  displayScale = 1,
  imageHeight,
  imageWidth,
  imageX,
  imageY,
  watermarkReferenceWidth,
}: ForcedExportTilePatternInput) {
  const {
    fontFamily,
    tileAngle,
    tileDensity,
    tileGap,
    fontSizeScale,
    watermarkOpacity,
    watermarkText,
  } = FORCED_TILE_PATTERN_SETTINGS;
  const baseFontSize =
    Math.max(
      8,
      Math.min(watermarkReferenceWidth / 12, 72) * (fontSizeScale / 100),
    ) * displayScale;
  const drawable = measureForcedTilePatternDrawable(
    context,
    baseFontSize,
    watermarkText,
    fontFamily,
  );
  const alpha = watermarkOpacity / 100;
  const repetitionsAcross =
    FORCED_TILE_PATTERN_DENSITY_REPETITIONS[tileDensity] ??
    FORCED_TILE_PATTERN_DENSITY_REPETITIONS.medium;
  const densitySpacing =
    (watermarkReferenceWidth / repetitionsAcross) * displayScale;
  const diagonal = Math.hypot(imageWidth, imageHeight);

  context.save();
  context.beginPath();
  context.rect(imageX, imageY, imageWidth, imageHeight);
  context.clip();
  context.translate(imageX + imageWidth / 2, imageY + imageHeight / 2);
  context.rotate((-tileAngle * Math.PI) / 180);

  const gapPixels = Math.max(drawable.height, drawable.width * (tileGap / 100));
  const xSpacing = Math.max(densitySpacing, drawable.width + gapPixels);
  const ySpacing = Math.max(drawable.height * 2.4, densitySpacing * 0.65);
  const patternExtent = diagonal + Math.max(xSpacing, ySpacing) * 2;

  applyHighQualityCanvasDefaults(context);

  for (let y = -patternExtent; y <= patternExtent; y += ySpacing) {
    for (let x = -patternExtent; x <= patternExtent; x += xSpacing) {
      drawForcedTilePatternUnit(context, drawable, x, y, alpha);
    }
  }

  context.restore();
}

export async function createForcedTileWatermarkSettings<
  T extends ForcedTileSettings,
>(
  settings: T,
  logoImage: HTMLImageElement,
  options?: { iconOnlyCenterStamp?: boolean },
): Promise<T> {
  const compositeImage = await createForcedTileCompositeImage(logoImage, {
    includeSiteText: !options?.iconOnlyCenterStamp,
  });
  const forcedLogoLayer: LogoWatermarkLayer = {
    ...createDefaultLogoLayer(),
    id: FORCED_TILE_LAYER_ID,
    customPosition: FORCED_CENTER_POSITION,
    fontSizeScale: FORCED_TILE_FONT_SIZE_SCALE,
    logoFileName: FORCED_TILE_SETTINGS.logoFileName,
    logoImage: compositeImage,
    opacity: FORCED_TILE_OPACITY,
    originalLogoImage: compositeImage,
    watermarkPosition: FORCED_TILE_POSITION,
  };

  const userLogoLayers = (settings.logoLayers ?? []).filter(
    (layer) => layer.id !== FORCED_TILE_LAYER_ID,
  );

  return {
    ...settings,
    logoLayers: [...userLogoLayers, forcedLogoLayer],
  };
}

export async function applyForcedTileWatermarkSettings<
  T extends ForcedTileSettings,
>(settings: T, options?: { iconOnlyCenterStamp?: boolean }): Promise<T> {
  const logoImage = await loadForcedTileLogoImage();
  return createForcedTileWatermarkSettings(settings, logoImage, options);
}

export function getExportFileType({
  mediaKind,
  watermarkType,
}: {
  hasFillFields?: boolean;
  mediaKind: "image" | "pdf" | "video" | null;
  watermarkType: "text" | "logo" | "signature";
}): ExportFileType {
  if (mediaKind === "pdf") {
    return "pdf";
  }

  if (watermarkType === "signature") {
    return "signature";
  }

  if (mediaKind === "video") {
    return "video";
  }

  return "photo";
}

async function readExportUploadError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

async function uploadExportArtifactViaServer(formData: FormData) {
  const response = await fetch("/api/export/upload", {
    body: formData,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readExportUploadError(response, "Export upload failed."));
  }

  return (await response.json()) as {
    fillManifestPath?: string;
    signaturePlacementManifestPath?: string;
    storagePath?: string;
  };
}

export async function uploadPdfForExportAuthorization({
  exportId,
  fileName,
  pdfBytes,
}: {
  exportId: string;
  fileName: string;
  pdfBytes: Uint8Array;
}) {
  const safeFileName = fileName.trim() || "document.pdf";
  const uploadFileName = safeFileName.toLowerCase().endsWith(".pdf")
    ? safeFileName
    : `${safeFileName}.pdf`;
  const formData = new FormData();

  formData.append("exportId", exportId);
  formData.append("fileName", uploadFileName);
  formData.append(
    "file",
    new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
    uploadFileName,
  );

  const payload = await uploadExportArtifactViaServer(formData);

  if (!payload.storagePath) {
    throw new Error("Could not upload PDF for credit check.");
  }

  return {
    storagePath: payload.storagePath,
  } satisfies ExportFileMeta;
}

export async function uploadFillManifestForExportAuthorization({
  exportId,
  manifestJson,
}: {
  exportId: string;
  manifestJson: string;
}) {
  const formData = new FormData();

  formData.append("artifact", "fill-manifest");
  formData.append("exportId", exportId);
  formData.append(
    "manifest",
    new Blob([manifestJson], { type: "application/json" }),
    "fill-manifest.json",
  );

  const payload = await uploadExportArtifactViaServer(formData);

  if (!payload.fillManifestPath) {
    throw new Error("Could not upload fill manifest for credit check.");
  }

  return {
    fillManifestPath: payload.fillManifestPath,
  } satisfies ExportFileMeta;
}

export async function uploadSignaturePlacementManifestForExportAuthorization({
  exportId,
  manifestJson,
}: {
  exportId: string;
  manifestJson: string;
}) {
  const formData = new FormData();

  formData.append("artifact", "signature-placements");
  formData.append("exportId", exportId);
  formData.append(
    "manifest",
    new Blob([manifestJson], { type: "application/json" }),
    "signature-placements.json",
  );

  const payload = await uploadExportArtifactViaServer(formData);

  if (!payload.signaturePlacementManifestPath) {
    throw new Error("Could not upload signature placement manifest for credit check.");
  }

  return {
    signaturePlacementManifestPath: payload.signaturePlacementManifestPath,
  } satisfies ExportFileMeta;
}
