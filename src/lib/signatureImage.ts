export const SIGNATURE_SCRIPT_FONT =
  '"Brush Script MT", "Segoe Script", cursive';

export const SIGNATURE_DRAG_MIME = "application/x-putwatermark-signature-id";

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
): HTMLCanvasElement {
  const trimmedText = text.trim();
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");

  if (!measureContext || !trimmedText) {
    return measureCanvas;
  }

  const fontSize = 72;

  measureContext.font = `${fontSize}px ${fontFamily}`;
  const metrics = measureContext.measureText(trimmedText);
  const canvas = document.createElement("canvas");

  canvas.width = Math.ceil(metrics.width) + 32;
  canvas.height = fontSize + 32;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.font = `${fontSize}px ${fontFamily}`;
  context.fillStyle = "#000000";
  context.textBaseline = "middle";
  context.fillText(trimmedText, 16, canvas.height / 2);

  return trimCanvasToContent(canvas);
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
