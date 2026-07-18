import type { ExportFileMeta, ExportFileType } from "./exportCost";
import {
  createDefaultLogoLayer,
  type LogoWatermarkLayer,
  type TextWatermarkLayer,
  type WatermarkPosition,
} from "./watermarkLayers";

/** Public asset — always available at export time, independent of user uploads. */
export const FORCED_TILE_LOGO_PATH = "/Put%20Watermark%20-%20Icon.png";

export const FORCED_TILE_SITE_TEXT = "putwatermark.com";

export const FORCED_TILE_LAYER_ID = "forced-export-tile";

/** Locked free-tier / watermarked export tile — icon + site text, S / 45° / 130%. */
export const FORCED_TILE_SETTINGS = {
  fontSizeScale: 100,
  logoFileName: "Put Watermark - Forced Tile Unit.png",
  tileAngle: 45,
  tileDensity: "sparse",
  tileGap: 130,
  watermarkMode: "tile",
  watermarkOpacity: 34,
  watermarkType: "logo",
} as const;

const FORCED_TILE_OPACITY = FORCED_TILE_SETTINGS.watermarkOpacity;
const FORCED_TILE_ANGLE = FORCED_TILE_SETTINGS.tileAngle;
const FORCED_TILE_DENSITY = FORCED_TILE_SETTINGS.tileDensity;
const FORCED_TILE_GAP = FORCED_TILE_SETTINGS.tileGap;
const FORCED_TILE_FONT_SIZE_SCALE = FORCED_TILE_SETTINGS.fontSizeScale;
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
      reject(new Error("Could not create the forced tile composite image."));
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
        throw new Error("Could not measure the forced tile composite text.");
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
        throw new Error("Could not render the forced tile composite image.");
      }

      context.scale(scale, scale);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      const iconX = (unitWidth - iconBaseWidth) / 2;
      context.drawImage(
        logoImage,
        iconX,
        padding / 2,
        iconBaseWidth,
        iconHeight,
      );

      context.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      context.fillStyle = "#5c5c5c";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(
        FORCED_TILE_SITE_TEXT,
        unitWidth / 2,
        padding / 2 + iconHeight + textGap,
      );

      const compositeImage = await canvasToImage(canvas);
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
        reject(new Error("Could not load the forced tile logo icon."));
      };
      image.src = FORCED_TILE_LOGO_PATH;
    });
  }

  return forcedTileLogoImagePromise;
}

export async function createForcedTileWatermarkSettings<
  T extends ForcedTileSettings,
>(settings: T, logoImage: HTMLImageElement): Promise<T> {
  const compositeImage = await createForcedTileCompositeImage(logoImage);
  const forcedLogoLayer: LogoWatermarkLayer = {
    ...createDefaultLogoLayer(),
    id: FORCED_TILE_LAYER_ID,
    fontSizeScale: FORCED_TILE_FONT_SIZE_SCALE,
    logoFileName: FORCED_TILE_SETTINGS.logoFileName,
    logoImage: compositeImage,
    opacity: FORCED_TILE_OPACITY,
    originalLogoImage: compositeImage,
  };

  return {
    ...settings,
    activeLogoLayerId: forcedLogoLayer.id,
    activeTextLayerId: forcedLogoLayer.id,
    customPosition: null,
    fontSizeScale: FORCED_TILE_FONT_SIZE_SCALE,
    logoImage: compositeImage,
    logoLayers: [forcedLogoLayer],
    textLayers: [],
    tileAngle: FORCED_TILE_ANGLE,
    tileDensity: FORCED_TILE_DENSITY,
    tileGap: FORCED_TILE_GAP,
    watermarkMode: "tile",
    watermarkOpacity: FORCED_TILE_OPACITY,
    watermarkText: "",
    watermarkType: "logo",
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
  mediaKind: "image" | "pdf" | "video" | null;
  watermarkType: "text" | "logo" | "signature";
}): ExportFileType {
  if (watermarkType === "signature") {
    return "signature";
  }

  if (mediaKind === "pdf") {
    return "pdf";
  }

  if (mediaKind === "video") {
    return "video";
  }

  return "photo";
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
  const response = await fetch("/api/export/upload-url", {
    body: JSON.stringify({ exportId, fileName }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Could not prepare PDF upload for export authorization.");
  }

  const payload = (await response.json()) as {
    uploadPath?: string;
    uploadUrl?: string;
  };

  if (!payload.uploadPath || !payload.uploadUrl) {
    throw new Error("Could not prepare PDF upload for export authorization.");
  }

  const uploadResponse = await fetch(payload.uploadUrl, {
    body: new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
    headers: { "Content-Type": "application/pdf" },
    method: "PUT",
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text().catch(() => "");
    throw new Error(
      errorBody
        ? `PDF upload failed (${uploadResponse.status}): ${errorBody}`
        : `PDF upload failed (${uploadResponse.status}).`,
    );
  }

  return {
    storagePath: payload.uploadPath,
  } satisfies ExportFileMeta;
}
