export type ImageEffectId =
  | "none"
  | "border"
  | "exposure"
  | "grayscale"
  | "sepia"
  | "vintage";

export type EffectBorderWidth = "thin" | "medium" | "thick";
export type EffectBorderColor = "ink" | "paper";

export type ImageEffectSettings = {
  activeEffect: ImageEffectId;
  borderColor: EffectBorderColor;
  borderWidth: EffectBorderWidth;
  exposure: number;
};

export const defaultImageEffectSettings: ImageEffectSettings = {
  activeEffect: "none",
  borderColor: "ink",
  borderWidth: "medium",
  exposure: 0,
};

export const imageEffectOptions: Array<{
  id: ImageEffectId;
  label: string;
}> = [
  { id: "none", label: "Original" },
  { id: "border", label: "Border" },
  { id: "exposure", label: "Exposure" },
  { id: "grayscale", label: "Grayscale" },
  { id: "sepia", label: "Sepia" },
  { id: "vintage", label: "Vintage" },
];

function getBorderWidthPx(
  width: EffectBorderWidth,
  destWidth: number,
  destHeight: number,
) {
  const minDimension = Math.min(destWidth, destHeight);

  switch (width) {
    case "thin":
      return Math.max(2, Math.round(minDimension * 0.015));
    case "thick":
      return Math.max(4, Math.round(minDimension * 0.05));
    default:
      return Math.max(3, Math.round(minDimension * 0.03));
  }
}

function getBorderColor(color: EffectBorderColor) {
  return color === "paper" ? "#FFFFFF" : "#000000";
}

export function drawBaseImageWithEffect(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  destX: number,
  destY: number,
  destWidth: number,
  destHeight: number,
  settings: ImageEffectSettings,
) {
  const { activeEffect, borderColor, borderWidth, exposure } = settings;

  if (activeEffect === "none") {
    context.drawImage(image, destX, destY, destWidth, destHeight);
    return;
  }

  if (activeEffect === "border") {
    const frameWidth = getBorderWidthPx(borderWidth, destWidth, destHeight);
    const innerWidth = Math.max(1, destWidth - frameWidth * 2);
    const innerHeight = Math.max(1, destHeight - frameWidth * 2);

    context.fillStyle = getBorderColor(borderColor);
    context.fillRect(destX, destY, destWidth, destHeight);
    context.drawImage(
      image,
      destX + frameWidth,
      destY + frameWidth,
      innerWidth,
      innerHeight,
    );
    return;
  }

  context.save();

  if (activeEffect === "exposure") {
    const brightness = 1 + exposure / 100;
    context.filter = `brightness(${brightness})`;
    context.drawImage(image, destX, destY, destWidth, destHeight);
    context.restore();
    return;
  }

  if (activeEffect === "grayscale") {
    context.filter = "grayscale(100%)";
    context.drawImage(image, destX, destY, destWidth, destHeight);
    context.restore();
    return;
  }

  if (activeEffect === "sepia") {
    context.filter = "sepia(100%)";
    context.drawImage(image, destX, destY, destWidth, destHeight);
    context.restore();
    return;
  }

  if (activeEffect === "vintage") {
    context.filter =
      "saturate(78%) sepia(32%) contrast(96%) brightness(104%)";
    context.drawImage(image, destX, destY, destWidth, destHeight);
    context.filter = "none";

    const centerX = destX + destWidth / 2;
    const centerY = destY + destHeight / 2;
    const radius = Math.max(destWidth, destHeight) * 0.72;
    const gradient = context.createRadialGradient(
      centerX,
      centerY,
      radius * 0.25,
      centerX,
      centerY,
      radius,
    );

    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.42)");
    context.fillStyle = gradient;
    context.fillRect(destX, destY, destWidth, destHeight);
    context.restore();
    return;
  }

  context.drawImage(image, destX, destY, destWidth, destHeight);
  context.restore();
}

export function createEffectThumbnailDataUrl(
  image: HTMLImageElement,
  effectId: ImageEffectId,
  settings: ImageEffectSettings,
  size = 80,
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return "";
  }

  canvas.width = size;
  canvas.height = size;
  context.fillStyle = "#DCDCDD";
  context.fillRect(0, 0, size, size);

  const scale = Math.min(
    size / image.naturalWidth,
    size / image.naturalHeight,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (size - width) / 2;
  const y = (size - height) / 2;

  drawBaseImageWithEffect(context, image, x, y, width, height, {
    ...settings,
    activeEffect: effectId,
  });

  return canvas.toDataURL("image/jpeg", 0.82);
}
