export const SIGNATURE_SCRIPT_FONT =
  '"Brush Script MT", "Segoe Script", cursive';

export const SIGNATURE_DRAG_MIME = "application/x-putwatermark-signature-id";

export const DEFAULT_SIGNATURE_STROKE_WIDTH = 2.75;
/** @deprecated Use DEFAULT_SIGNATURE_STROKE_WIDTH */
export const DEFAULT_DRAW_SIGNATURE_STROKE_WIDTH = DEFAULT_SIGNATURE_STROKE_WIDTH;
/** @deprecated Use DEFAULT_SIGNATURE_STROKE_WIDTH */
export const DEFAULT_TYPED_SIGNATURE_STROKE_WIDTH = DEFAULT_SIGNATURE_STROKE_WIDTH;
export const MIN_SIGNATURE_STROKE_WIDTH = 1;
export const MAX_SIGNATURE_STROKE_WIDTH = 6;
/** @deprecated Use MAX_SIGNATURE_STROKE_WIDTH */
export const MAX_DRAW_SIGNATURE_STROKE_WIDTH = MAX_SIGNATURE_STROKE_WIDTH;
/** @deprecated Use MAX_SIGNATURE_STROKE_WIDTH */
export const MAX_TYPED_SIGNATURE_STROKE_WIDTH = MAX_SIGNATURE_STROKE_WIDTH;

export function createImageFromDataUrl(
  dataUrl: string,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load signature image."));
    image.src = dataUrl;
  });
}

export function trimCanvasToContent(
  source: HTMLCanvasElement,
  padding = 8,
): HTMLCanvasElement {
  const context = source.getContext("2d");

  if (!context) {
    return source;
  }

  const { width, height } = source;
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];

      if (alpha > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    return source;
  }

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;
  const trimmedCanvas = document.createElement("canvas");

  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;

  const trimmedContext = trimmedCanvas.getContext("2d");

  if (!trimmedContext) {
    return source;
  }

  trimmedContext.drawImage(
    source,
    minX,
    minY,
    trimmedWidth,
    trimmedHeight,
    0,
    0,
    trimmedWidth,
    trimmedHeight,
  );

  return trimmedCanvas;
}

export function renderTypedSignatureCanvas(
  text: string,
  fontFamily: string = SIGNATURE_SCRIPT_FONT,
  strokeWidth = DEFAULT_SIGNATURE_STROKE_WIDTH,
): HTMLCanvasElement {
  const trimmedText = text.trim();
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");

  if (!measureContext || !trimmedText) {
    return measureCanvas;
  }

  const fontSize = 72;
  const lineWidth = strokeWidth;

  measureContext.font = `${fontSize}px ${fontFamily}`;
  const metrics = measureContext.measureText(trimmedText);
  const canvas = document.createElement("canvas");

  canvas.width = Math.ceil(metrics.width) + 32 + lineWidth * 2;
  canvas.height = fontSize + 32 + lineWidth * 2;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.font = `${fontSize}px ${fontFamily}`;
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineCap = "round";
  context.fillStyle = "#000000";
  context.strokeStyle = "#000000";
  context.lineWidth = lineWidth;

  const x = 16 + lineWidth;
  const y = canvas.height / 2;

  if (strokeWidth <= 1.5) {
    context.fillText(trimmedText, x, y);
  } else if (strokeWidth <= 2.5) {
    context.strokeText(trimmedText, x, y);
  } else {
    context.strokeText(trimmedText, x, y);
    context.fillText(trimmedText, x, y);
  }

  return trimCanvasToContent(canvas);
}

async function loadDrawnSignatureSource(
  sourceDataUrl: string,
): Promise<HTMLImageElement> {
  return createImageFromDataUrl(sourceDataUrl);
}

export async function regenerateDrawnSignatureCanvas(
  sourceDataUrl: string,
  strokeWidth: number,
  baseStrokeWidth: number,
): Promise<HTMLCanvasElement> {
  const sourceImage = await loadDrawnSignatureSource(sourceDataUrl);
  const delta = strokeWidth - baseStrokeWidth;

  if (Math.abs(delta) < 0.05) {
    const canvas = document.createElement("canvas");
    canvas.width = sourceImage.width;
    canvas.height = sourceImage.height;
    const context = canvas.getContext("2d");

    if (!context) {
      return canvas;
    }

    context.drawImage(sourceImage, 0, 0);
    return canvas;
  }

  const padding = Math.ceil(Math.abs(delta) * 6) + 10;
  const canvas = document.createElement("canvas");
  canvas.width = sourceImage.width + padding * 2;
  canvas.height = sourceImage.height + padding * 2;
  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const drawX = padding;
  const drawY = padding;

  if (delta > 0) {
    const radius = delta * 2.4;
    const steps = Math.max(8, Math.ceil(radius * 2));

    for (let index = 0; index < steps; index += 1) {
      const angle = (index / steps) * Math.PI * 2;
      context.drawImage(
        sourceImage,
        drawX + Math.cos(angle) * radius,
        drawY + Math.sin(angle) * radius,
      );
    }
  }

  const scale = delta < 0 ? strokeWidth / baseStrokeWidth : 1;
  const scaledWidth = sourceImage.width * scale;
  const scaledHeight = sourceImage.height * scale;
  const offsetX = drawX + (sourceImage.width - scaledWidth) / 2;
  const offsetY = drawY + (sourceImage.height - scaledHeight) / 2;

  context.drawImage(sourceImage, offsetX, offsetY, scaledWidth, scaledHeight);

  return trimCanvasToContent(canvas);
}

function resolveSignatureTypedText(input: {
  kind: "full" | "initials";
  label: string;
  source: "draw" | "type";
  typedText?: string | null;
}) {
  const typedText = input.typedText?.trim();

  if (typedText) {
    return typedText;
  }

  if (input.source !== "type") {
    return null;
  }

  const label = input.label.trim();

  if (!label) {
    return null;
  }

  if (input.kind === "initials") {
    return label;
  }

  return label;
}

export async function regenerateSignatureImage(input: {
  baseStrokeWidth?: number | null;
  kind: "full" | "initials";
  label?: string;
  previewSrc?: string | null;
  source: "draw" | "type";
  sourceDataUrl?: string | null;
  strokeWidth: number;
  typedText?: string | null;
}): Promise<{ image: HTMLImageElement; previewSrc: string }> {
  let canvas: HTMLCanvasElement;
  const typedText = resolveSignatureTypedText({
    kind: input.kind,
    label: input.label ?? "",
    source: input.source,
    typedText: input.typedText,
  });
  const sourceDataUrl =
    input.sourceDataUrl?.trim() || input.previewSrc?.trim() || null;

  if (input.source === "type" && typedText) {
    canvas = renderTypedSignatureCanvas(
      typedText,
      SIGNATURE_SCRIPT_FONT,
      input.strokeWidth,
    );
  } else if (input.source === "draw" && sourceDataUrl) {
    canvas = await regenerateDrawnSignatureCanvas(
      sourceDataUrl,
      input.strokeWidth,
      input.baseStrokeWidth ?? input.strokeWidth,
    );
  } else {
    throw new Error("Could not regenerate signature image.");
  }

  const image = await loadImageFromCanvas(canvas);

  return {
    image,
    previewSrc: image.src,
  };
}

export async function loadImageFromCanvas(
  canvas: HTMLCanvasElement,
): Promise<HTMLImageElement> {
  return createImageFromDataUrl(canvas.toDataURL("image/png"));
}

export function createSignatureId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `signature-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
