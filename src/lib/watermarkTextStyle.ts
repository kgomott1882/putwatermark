export type TextWatermarkFontWeight = 400 | 700;

export const DEFAULT_TEXT_WATERMARK_COLOR = "#FFFFFF";
export const DEFAULT_TEXT_WATERMARK_FONT_WEIGHT: TextWatermarkFontWeight = 400;
export const DEFAULT_TEXT_SHADOW_ENABLED = true;

export type TextWatermarkColorOption = {
  label: string;
  value: string;
};

export const TEXT_WATERMARK_COLOR_PALETTE: readonly TextWatermarkColorOption[] = [
  { label: "White", value: "#FFFFFF" },
  { label: "Black", value: "#000000" },
  { label: "Beige", value: "#F2EBE3" },
  { label: "Sand", value: "#CDBA9A" },
  { label: "Signal", value: "#D97757" },
  { label: "Red", value: "#EF4444" },
  { label: "Orange", value: "#F97316" },
  { label: "Yellow", value: "#EAB308" },
  { label: "Green", value: "#22C55E" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Pink", value: "#EC4899" },
  { label: "Gray", value: "#6B7280" },
] as const;

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    return `rgba(255, 255, 255, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function isLightTextColor(hex: string) {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    return true;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return luminance > 0.6;
}

export function resolveTextWatermarkPaint({
  alpha,
  textColor,
  textShadowEnabled,
}: {
  alpha: number;
  textColor: string;
  textShadowEnabled: boolean;
}) {
  const light = isLightTextColor(textColor);
  const contrastRgb = light ? "0, 0, 0" : "255, 255, 255";

  return {
    fillStyle: hexToRgba(textColor, alpha),
    shadowBlur: textShadowEnabled ? 10 : 0,
    shadowColor: textShadowEnabled
      ? `rgba(${contrastRgb}, ${Math.min(alpha, 0.4)})`
      : "transparent",
    strokeStyle: `rgba(${contrastRgb}, ${Math.min(alpha, light ? 0.5 : 0.45)})`,
  };
}

export function normalizeTextWatermarkFontWeight(
  value: number | undefined,
): TextWatermarkFontWeight {
  return value === 400 ? 400 : 700;
}
