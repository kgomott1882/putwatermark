import type { ExportFileMeta, ExportFileType } from "./exportCost";
import {
  createDefaultLogoLayer,
  type LogoWatermarkLayer,
  type TextWatermarkLayer,
  type WatermarkPosition,
} from "./watermarkLayers";

/** Public asset — always available at export time, independent of user uploads. */
export const FORCED_TILE_LOGO_PATH = "/Put%20Watermark%20-%20Icon.png";

export const FORCED_TILE_SITE_TEXT = "PutWatermark.com";

export const FORCED_TILE_LAYER_ID = "forced-export-tile";

/** ~36% of content width at export (was ~34% at 190, ~27% at 150). Deliberately prominent. */
export const FORCED_TILE_SETTINGS = {
  fontSizeScale: 200,
  logoFileName: "Put Watermark - Forced Center Stamp.png",
  tileAngle: 0,
  tileDensity: "medium",
  tileGap: 130,
  watermarkMode: "single",
  watermarkOpacity: 44,
  watermarkPosition: "center",
  watermarkType: "logo",
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
let forcedTileCompositeImageCache: HTMLImageElement | null = null;
let forcedTileCompositeImagePromise: Promise<HTMLImageElement> | null = null;

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

export function createForcedTileCompositeImage(logoImage: HTMLImageElement) {
  if (forcedTileCompositeImageCache) {
    return Promise.resolve(forcedTileCompositeImageCache);
  }

  if (!forcedTileCompositeImagePromise) {
    forcedTileCompositeImagePromise = (async () => {
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

      drawForcedTileSiteText(
        context,
        unitWidth / 2,
        iconY + iconHeight + textGap,
        fontSize,
      );

      const compositeImage = await canvasToImage(canvas);
      if (typeof compositeImage.decode === "function") {
        await compositeImage.decode().catch(() => undefined);
      }
      forcedTileCompositeImageCache = compositeImage;
      return compositeImage;
    })().catch((error) => {
      forcedTileCompositeImagePromise = null;
      throw error;
    });
  }

  return forcedTileCompositeImagePromise;
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

export async function createForcedTileWatermarkSettings<
  T extends ForcedTileSettings,
>(settings: T, logoImage: HTMLImageElement): Promise<T> {
  const compositeImage = await createForcedTileCompositeImage(logoImage);
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
>(settings: T): Promise<T> {
  const logoImage = await loadForcedTileLogoImage();
  return createForcedTileWatermarkSettings(settings, logoImage);
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
