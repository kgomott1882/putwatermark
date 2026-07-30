import type { PdfFillTextField } from "./pdfPageFillFields";
import {
  applyRectResize,
  drawPlacementFrameActions,
  drawPlacementSelectionFrame,
  PLACEMENT_RESIZE_HANDLE_SIZE,
  type PlacementBounds,
  type PlacementResizeHandle,
} from "./placementSelectionFrame";

export type FillFieldBounds = PlacementBounds & {
  fieldId: string;
};

export type FillResizeHandle = PlacementResizeHandle;

export const FILL_RESIZE_HANDLE_SIZE = PLACEMENT_RESIZE_HANDLE_SIZE;

export {
  getPlacementFrameActionAtPoint as getFillFrameActionAtPoint,
  getPlacementFrameActionRects as getFillFrameActionRects,
  getPlacementResizeCursor as getFillResizeCursor,
  getPlacementResizeHandleAtPoint as getFillResizeHandleAtPoint,
  type PlacementFrameAction as FillFrameAction,
} from "./placementSelectionFrame";

export function getFillFieldRect(
  field: PdfFillTextField,
  canvasWidth: number,
  canvasHeight: number,
) {
  return {
    height: field.heightPercent * canvasHeight,
    width: field.widthPercent * canvasWidth,
    x: field.xPercent * canvasWidth,
    y: field.yPercent * canvasHeight,
  };
}

export function applyFillFieldResize({
  canvasHeight,
  canvasWidth,
  handle,
  pointer,
  startField,
  startRect,
}: {
  canvasHeight: number;
  canvasWidth: number;
  handle: FillResizeHandle;
  pointer: { x: number; y: number };
  startField: PdfFillTextField;
  startRect: ReturnType<typeof getFillFieldRect>;
}): PdfFillTextField {
  const nextRect = applyRectResize({
    canvasHeight,
    canvasWidth,
    handle,
    pointer,
    startRect,
  });
  const { height, width, x, y } = nextRect;

  const widthScale = width / startRect.width;
  const heightScale = height / startRect.height;
  const scale = Math.sqrt(widthScale * heightScale);

  return {
    ...startField,
    fontSize: Math.max(8, Math.round(startField.fontSize * scale)),
    heightPercent: height / canvasHeight,
    widthPercent: width / canvasWidth,
    xPercent: x / canvasWidth,
    yPercent: y / canvasHeight,
  };
}

export function paintFillFields({
  activeFieldId,
  canvasHeight,
  canvasWidth,
  context,
  fields,
}: {
  activeFieldId: string | null;
  canvasHeight: number;
  canvasWidth: number;
  context: CanvasRenderingContext2D;
  fields: PdfFillTextField[];
}) {
  const boundsByField: Record<string, FillFieldBounds> = {};

  for (const field of fields) {
    if (!field.text.trim()) {
      continue;
    }

    const rect = getFillFieldRect(field, canvasWidth, canvasHeight);
    const isActive = field.id === activeFieldId;

    context.save();

    if (isActive) {
      const bounds: PlacementBounds = {
        bottom: rect.y + rect.height,
        left: rect.x,
        right: rect.x + rect.width,
        top: rect.y,
      };
      drawPlacementSelectionFrame(context, bounds);
      drawPlacementFrameActions(context, bounds);
    }

    context.fillStyle = field.color;
    context.font = `${field.fontSize}px ${field.fontFamily}`;
    context.textBaseline = "top";
    context.textAlign = "left";

    const padding = 4;
    const lines = wrapFillText(context, field.text, rect.width - padding * 2);
    let lineY = rect.y + padding;

    for (const line of lines) {
      if (lineY + field.fontSize > rect.y + rect.height - padding) {
        break;
      }

      context.fillText(line, rect.x + padding, lineY);
      lineY += field.fontSize * 1.2;
    }

    context.restore();

    boundsByField[field.id] = {
      bottom: rect.y + rect.height,
      fieldId: field.id,
      left: rect.x,
      right: rect.x + rect.width,
      top: rect.y,
    };
  }

  return boundsByField;
}

function wrapFillText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);

  if (!words.length) {
    return [];
  }

  const lines: string[] = [];
  let currentLine = words[0] ?? "";

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index];
    const candidate = `${currentLine} ${word}`;

    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  lines.push(currentLine);
  return lines;
}

function getPdfPreviewLetterbox({
  canvasSize,
  pageHeight,
  pageWidth,
}: {
  canvasSize: { height: number; width: number };
  pageHeight: number;
  pageWidth: number;
}) {
  const imageScale = Math.min(
    canvasSize.width / pageWidth,
    canvasSize.height / pageHeight,
  );
  const imageWidth = pageWidth * imageScale;
  const imageHeight = pageHeight * imageScale;
  const imageX = (canvasSize.width - imageWidth) / 2;
  const imageY = (canvasSize.height - imageHeight) / 2;

  return {
    imageHeight,
    imageWidth,
    imageX,
    imageY,
    pointScale: pageWidth / imageWidth,
  };
}

export function mapFillFieldToPdfExportRect({
  canvasSize,
  field,
  pageHeight,
  pageWidth,
}: {
  canvasSize: { height: number; width: number };
  field: PdfFillTextField;
  pageHeight: number;
  pageWidth: number;
}) {
  const { imageHeight, imageWidth, imageX, imageY, pointScale } =
    getPdfPreviewLetterbox({ canvasSize, pageHeight, pageWidth });

  return {
    fontSize: field.fontSize * pointScale,
    height: field.heightPercent * canvasSize.height * pointScale,
    padding: 4 * pointScale,
    width: field.widthPercent * canvasSize.width * pointScale,
    x:
      ((field.xPercent * canvasSize.width - imageX) / imageWidth) * pageWidth,
    y:
      ((field.yPercent * canvasSize.height - imageY) / imageHeight) * pageHeight,
  };
}

export function paintFillFieldsForPdfExport({
  canvasSize,
  context,
  fields,
  pageHeight,
  pageWidth,
}: {
  canvasSize: { height: number; width: number };
  context: CanvasRenderingContext2D;
  fields: PdfFillTextField[];
  pageHeight: number;
  pageWidth: number;
}) {
  for (const field of fields) {
    if (!field.text.trim()) {
      continue;
    }

    const { fontSize, height, padding, width, x, y } = mapFillFieldToPdfExportRect({
      canvasSize,
      field,
      pageHeight,
      pageWidth,
    });

    context.save();
    context.fillStyle = field.color;
    context.font = `${fontSize}px ${field.fontFamily}`;
    context.textBaseline = "top";
    context.textAlign = "left";

    const lines = wrapFillText(context, field.text, width - padding * 2);
    let lineY = y + padding;

    for (const line of lines) {
      if (lineY + fontSize > y + height - padding) {
        break;
      }

      context.fillText(line, x + padding, lineY);
      lineY += fontSize * 1.2;
    }

    context.restore();
  }
}
