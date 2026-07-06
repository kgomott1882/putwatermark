type WatermarkType = "text" | "logo";

type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

type WatermarkMode = "single" | "tile";

type TileDensity = "sparse" | "medium" | "dense";

type TileAngle = 0 | 45 | 90 | 180;

type CustomPosition = {
  xPercent: number;
  yPercent: number;
};

export type StoredWatermarkSettings = {
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  isLogoBackgroundRemoved: boolean;
  logoFileName: string;
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  watermarkMode: WatermarkMode;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
  watermarkText: string;
  watermarkType: WatermarkType;
};

export const WATERMARK_SETTINGS_STORAGE_KEY =
  "putwatermark.watermark-settings.v1";

const defaultFontFamily =
  'Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function getDefaultStoredWatermarkSettings(): StoredWatermarkSettings {
  return {
    customPosition: null,
    fontFamily: defaultFontFamily,
    fontSizeScale: 100,
    isLogoBackgroundRemoved: false,
    logoFileName: "",
    tileAngle: 45,
    tileDensity: "medium",
    tileGap: 120,
    watermarkMode: "single",
    watermarkOpacity: 70,
    watermarkPosition: "bottom-right",
    watermarkText: "",
    watermarkType: "text",
  };
}

function isValidStoredSettings(value: unknown): value is StoredWatermarkSettings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const settings = value as StoredWatermarkSettings;

  return (
    typeof settings.fontFamily === "string" &&
    typeof settings.fontSizeScale === "number" &&
    typeof settings.isLogoBackgroundRemoved === "boolean" &&
    typeof settings.logoFileName === "string" &&
    typeof settings.tileGap === "number" &&
    typeof settings.watermarkOpacity === "number" &&
    typeof settings.watermarkText === "string" &&
    (settings.watermarkType === "text" || settings.watermarkType === "logo") &&
    (settings.watermarkMode === "single" || settings.watermarkMode === "tile") &&
    typeof settings.watermarkPosition === "string" &&
    typeof settings.tileDensity === "string" &&
    [0, 45, 90, 180].includes(settings.tileAngle) &&
    (settings.customPosition === null ||
      (typeof settings.customPosition.xPercent === "number" &&
        typeof settings.customPosition.yPercent === "number"))
  );
}

export function readStoredWatermarkSettings() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(WATERMARK_SETTINGS_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isValidStoredSettings(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredWatermarkSettings(settings: StoredWatermarkSettings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      WATERMARK_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // Ignore quota or privacy errors.
  }
}

export function clearStoredWatermarkSettings() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(WATERMARK_SETTINGS_STORAGE_KEY);
}

export function storedSettingsFromSnapshot(snapshot: {
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  isLogoBackgroundRemoved: boolean;
  logoFileName: string;
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  watermarkMode: WatermarkMode;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
  watermarkText: string;
  watermarkType: WatermarkType;
}): StoredWatermarkSettings {
  return {
    customPosition: snapshot.customPosition
      ? { ...snapshot.customPosition }
      : null,
    fontFamily: snapshot.fontFamily,
    fontSizeScale: snapshot.fontSizeScale,
    isLogoBackgroundRemoved: snapshot.isLogoBackgroundRemoved,
    logoFileName: snapshot.logoFileName,
    tileAngle: snapshot.tileAngle,
    tileDensity: snapshot.tileDensity,
    tileGap: snapshot.tileGap,
    watermarkMode: snapshot.watermarkMode,
    watermarkOpacity: snapshot.watermarkOpacity,
    watermarkPosition: snapshot.watermarkPosition,
    watermarkText: snapshot.watermarkText,
    watermarkType: snapshot.watermarkType,
  };
}
