export type WatermarkLayerKind = "text" | "logo";

export type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type CustomPosition = {
  xPercent: number;
  yPercent: number;
};

import {
  DEFAULT_TEXT_SHADOW_ENABLED,
  DEFAULT_TEXT_WATERMARK_COLOR,
  DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
  type TextWatermarkFontWeight,
} from "./watermarkTextStyle";
import { GEOMETRIC_SANS_FONT_FAMILY } from "./watermarkFonts";

export type TextWatermarkLayer = {
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  fontWeight: TextWatermarkFontWeight;
  id: string;
  opacity: number;
  text: string;
  textColor: string;
  textShadowEnabled: boolean;
  type: "text";
  visibleFromSeconds?: number;
  visibleUntilSeconds?: number;
  watermarkPosition: WatermarkPosition;
};

export type LogoWatermarkLayer = {
  backgroundRemovedLogoImage: HTMLImageElement | null;
  customPosition: CustomPosition | null;
  fontSizeScale: number;
  id: string;
  isLogoBackgroundRemoved: boolean;
  logoFileName: string;
  logoImage: HTMLImageElement | null;
  logoObjectUrl: string | null;
  opacity: number;
  originalLogoImage: HTMLImageElement | null;
  type: "logo";
  watermarkPosition: WatermarkPosition;
};

export type WatermarkLayer = TextWatermarkLayer | LogoWatermarkLayer;

export type WatermarkLayerSnapshot =
  | {
      customPosition: CustomPosition | null;
      fontFamily: string;
      fontSizeScale: number;
      fontWeight?: TextWatermarkFontWeight;
      id: string;
      logoDataUrl: null;
      opacity: number;
      text: string;
      textColor?: string;
      textShadowEnabled?: boolean;
      type: "text";
      visibleFromSeconds?: number;
      visibleUntilSeconds?: number;
      watermarkPosition: WatermarkPosition;
    }
  | {
      backgroundRemovedLogoDataUrl: string | null;
      customPosition: CustomPosition | null;
      fontSizeScale: number;
      id: string;
      isLogoBackgroundRemoved: boolean;
      logoDataUrl: string | null;
      logoFileName: string;
      opacity: number;
      originalLogoDataUrl: string | null;
      type: "logo";
      watermarkPosition: WatermarkPosition;
    };

const defaultFontFamily =
  'Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const DEFAULT_TEXT_LAYER_FONT_FAMILY = GEOMETRIC_SANS_FONT_FAMILY;
export const DEFAULT_TEXT_LAYER_FONT_SIZE_SCALE = 50;
export const DEFAULT_TEXT_LAYER_OPACITY = 20;

/** Above preview zoom/control icons (bottom-right) in single-text mode. */
export const DEFAULT_SINGLE_TEXT_WATERMARK_POSITION: CustomPosition = {
  xPercent: 0.88,
  yPercent: 0.84,
};

export function createWatermarkLayerId() {
  return `wm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultTextLayer(
  partial?: Partial<Pick<TextWatermarkLayer, "text">>,
): TextWatermarkLayer {
  return {
    customPosition: { ...DEFAULT_SINGLE_TEXT_WATERMARK_POSITION },
    fontFamily: DEFAULT_TEXT_LAYER_FONT_FAMILY,
    fontSizeScale: DEFAULT_TEXT_LAYER_FONT_SIZE_SCALE,
    fontWeight: DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
    id: createWatermarkLayerId(),
    opacity: DEFAULT_TEXT_LAYER_OPACITY,
    text: partial?.text ?? "",
    textColor: DEFAULT_TEXT_WATERMARK_COLOR,
    textShadowEnabled: DEFAULT_TEXT_SHADOW_ENABLED,
    type: "text",
    watermarkPosition: "bottom-right",
  };
}

export function createDefaultLogoLayer(): LogoWatermarkLayer {
  return {
    backgroundRemovedLogoImage: null,
    customPosition: null,
    fontSizeScale: 100,
    id: createWatermarkLayerId(),
    isLogoBackgroundRemoved: false,
    logoFileName: "",
    logoImage: null,
    logoObjectUrl: null,
    opacity: 70,
    originalLogoImage: null,
    type: "logo",
    watermarkPosition: "top-left",
  };
}

export function isTextLayer(layer: WatermarkLayer): layer is TextWatermarkLayer {
  return layer.type === "text";
}

export function isLogoLayer(layer: WatermarkLayer): layer is LogoWatermarkLayer {
  return layer.type === "logo";
}

export function revokeLogoLayerUrls(layer: LogoWatermarkLayer) {
  if (layer.logoObjectUrl) {
    URL.revokeObjectURL(layer.logoObjectUrl);
  }
}

export async function imageElementToDataUrl(image: HTMLImageElement | null) {
  if (!image) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

export async function createImageFromDataUrl(dataUrl: string) {
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = dataUrl;
  });

  return image;
}

export async function serializeTextLayer(
  layer: TextWatermarkLayer,
): Promise<Extract<WatermarkLayerSnapshot, { type: "text" }>> {
  return {
    customPosition: layer.customPosition ? { ...layer.customPosition } : null,
    fontFamily: layer.fontFamily,
    fontSizeScale: layer.fontSizeScale,
    fontWeight: layer.fontWeight,
    id: layer.id,
    logoDataUrl: null,
    opacity: layer.opacity,
    text: layer.text,
    textColor: layer.textColor,
    textShadowEnabled: layer.textShadowEnabled,
    type: "text",
    visibleFromSeconds: layer.visibleFromSeconds,
    visibleUntilSeconds: layer.visibleUntilSeconds,
    watermarkPosition: layer.watermarkPosition,
  };
}

export async function serializeLogoLayer(
  layer: LogoWatermarkLayer,
): Promise<Extract<WatermarkLayerSnapshot, { type: "logo" }>> {
  return {
    backgroundRemovedLogoDataUrl: await imageElementToDataUrl(
      layer.backgroundRemovedLogoImage,
    ),
    customPosition: layer.customPosition ? { ...layer.customPosition } : null,
    fontSizeScale: layer.fontSizeScale,
    id: layer.id,
    isLogoBackgroundRemoved: layer.isLogoBackgroundRemoved,
    logoDataUrl: await imageElementToDataUrl(layer.logoImage),
    logoFileName: layer.logoFileName,
    opacity: layer.opacity,
    originalLogoDataUrl: await imageElementToDataUrl(layer.originalLogoImage),
    type: "logo",
    watermarkPosition: layer.watermarkPosition,
  };
}

export async function deserializeTextLayer(
  snapshot: Extract<WatermarkLayerSnapshot, { type: "text" }>,
): Promise<TextWatermarkLayer> {
  return {
    customPosition: snapshot.customPosition ? { ...snapshot.customPosition } : null,
    fontFamily: snapshot.fontFamily,
    fontSizeScale: snapshot.fontSizeScale,
    fontWeight: snapshot.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
    id: snapshot.id,
    opacity: snapshot.opacity,
    text: snapshot.text,
    textColor: snapshot.textColor ?? DEFAULT_TEXT_WATERMARK_COLOR,
    textShadowEnabled: snapshot.textShadowEnabled ?? DEFAULT_TEXT_SHADOW_ENABLED,
    type: "text",
    visibleFromSeconds: snapshot.visibleFromSeconds,
    visibleUntilSeconds: snapshot.visibleUntilSeconds,
    watermarkPosition: snapshot.watermarkPosition,
  };
}

export async function deserializeLogoLayer(
  snapshot: Extract<WatermarkLayerSnapshot, { type: "logo" }>,
): Promise<LogoWatermarkLayer> {
  const originalLogoImage = snapshot.originalLogoDataUrl
    ? await createImageFromDataUrl(snapshot.originalLogoDataUrl)
    : snapshot.logoDataUrl
      ? await createImageFromDataUrl(snapshot.logoDataUrl)
      : null;
  const backgroundRemovedLogoImage = snapshot.backgroundRemovedLogoDataUrl
    ? await createImageFromDataUrl(snapshot.backgroundRemovedLogoDataUrl)
    : null;
  const logoImage = snapshot.logoDataUrl
    ? await createImageFromDataUrl(snapshot.logoDataUrl)
    : originalLogoImage;

  return {
    backgroundRemovedLogoImage,
    customPosition: snapshot.customPosition ? { ...snapshot.customPosition } : null,
    fontSizeScale: snapshot.fontSizeScale,
    id: snapshot.id,
    isLogoBackgroundRemoved: snapshot.isLogoBackgroundRemoved,
    logoFileName: snapshot.logoFileName,
    logoImage,
    logoObjectUrl: null,
    opacity: snapshot.opacity,
    originalLogoImage,
    type: "logo",
    watermarkPosition: snapshot.watermarkPosition,
  };
}

export function legacySnapshotToTextLayer(snapshot: {
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  fontWeight?: TextWatermarkFontWeight;
  textColor?: string;
  textShadowEnabled?: boolean;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
  watermarkText: string;
}): TextWatermarkLayer {
  return {
    customPosition: snapshot.customPosition ? { ...snapshot.customPosition } : null,
    fontFamily: snapshot.fontFamily,
    fontSizeScale: snapshot.fontSizeScale,
    fontWeight: snapshot.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
    id: createWatermarkLayerId(),
    opacity: snapshot.watermarkOpacity,
    text: snapshot.watermarkText,
    textColor: snapshot.textColor ?? DEFAULT_TEXT_WATERMARK_COLOR,
    textShadowEnabled: snapshot.textShadowEnabled ?? DEFAULT_TEXT_SHADOW_ENABLED,
    type: "text",
    watermarkPosition: snapshot.watermarkPosition,
  };
}

export function legacySnapshotToLogoLayer(snapshot: {
  backgroundRemovedLogoImage: HTMLImageElement | null;
  customPosition: CustomPosition | null;
  fontSizeScale: number;
  isLogoBackgroundRemoved: boolean;
  logoFileName: string;
  logoImage: HTMLImageElement | null;
  originalLogoImage: HTMLImageElement | null;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
}): LogoWatermarkLayer {
  return {
    backgroundRemovedLogoImage: snapshot.backgroundRemovedLogoImage,
    customPosition: snapshot.customPosition ? { ...snapshot.customPosition } : null,
    fontSizeScale: snapshot.fontSizeScale,
    id: createWatermarkLayerId(),
    isLogoBackgroundRemoved: snapshot.isLogoBackgroundRemoved,
    logoFileName: snapshot.logoFileName,
    logoImage: snapshot.logoImage,
    logoObjectUrl: null,
    opacity: snapshot.watermarkOpacity,
    originalLogoImage: snapshot.originalLogoImage,
    type: "logo",
    watermarkPosition: snapshot.watermarkPosition,
  };
}
