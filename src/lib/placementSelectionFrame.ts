export type PlacementBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export type PlacementResizeHandle =
  | "e"
  | "n"
  | "ne"
  | "nw"
  | "s"
  | "se"
  | "sw"
  | "w";

export type PlacementFrameAction = "delete" | "done";

export const PLACEMENT_RESIZE_HANDLE_SIZE = 8;
export const PLACEMENT_FRAME_ACTION_SIZE = 22;
export const PLACEMENT_FRAME_ACTION_GAP = 4;

export function boundsToRect(bounds: PlacementBounds) {
  return {
    height: bounds.bottom - bounds.top,
    width: bounds.right - bounds.left,
    x: bounds.left,
    y: bounds.top,
  };
}

export function getPlacementFrameActionRects(bounds: PlacementBounds) {
  const actionTop = bounds.top - PLACEMENT_FRAME_ACTION_SIZE - PLACEMENT_FRAME_ACTION_GAP;

  return {
    delete: {
      height: PLACEMENT_FRAME_ACTION_SIZE,
      left: bounds.left,
      top: actionTop,
      width: PLACEMENT_FRAME_ACTION_SIZE,
    },
    done: {
      height: PLACEMENT_FRAME_ACTION_SIZE,
      left: bounds.right - PLACEMENT_FRAME_ACTION_SIZE,
      top: actionTop,
      width: PLACEMENT_FRAME_ACTION_SIZE,
    },
  };
}

export function isPointInRect(
  point: { x: number; y: number },
  rect: { height: number; left?: number; top: number; width: number; x?: number },
) {
  const left = rect.left ?? rect.x ?? 0;

  return (
    point.x >= left &&
    point.x <= left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}

export function getPlacementFrameActionAtPoint(
  point: { x: number; y: number },
  bounds: PlacementBounds,
): PlacementFrameAction | null {
  const rects = getPlacementFrameActionRects(bounds);

  if (isPointInRect(point, rects.delete)) {
    return "delete";
  }

  if (isPointInRect(point, rects.done)) {
    return "done";
  }

  return null;
}

export function getPlacementResizeHandleAtPoint(
  point: { x: number; y: number },
  bounds: PlacementBounds,
  handleSize = PLACEMENT_RESIZE_HANDLE_SIZE,
): PlacementResizeHandle | null {
  const nearLeft =
    point.x >= bounds.left - handleSize / 2 &&
    point.x <= bounds.left + handleSize;
  const nearRight =
    point.x >= bounds.right - handleSize &&
    point.x <= bounds.right + handleSize / 2;
  const nearTop =
    point.y >= bounds.top - handleSize / 2 &&
    point.y <= bounds.top + handleSize;
  const nearBottom =
    point.y >= bounds.bottom - handleSize &&
    point.y <= bounds.bottom + handleSize / 2;
  const withinX = point.x >= bounds.left && point.x <= bounds.right;
  const withinY = point.y >= bounds.top && point.y <= bounds.bottom;

  if (nearRight && nearBottom) {
    return "se";
  }

  if (nearLeft && nearBottom) {
    return "sw";
  }

  if (nearRight && nearTop) {
    return "ne";
  }

  if (nearLeft && nearTop) {
    return "nw";
  }

  if (nearRight && withinY) {
    return "e";
  }

  if (nearLeft && withinY) {
    return "w";
  }

  if (nearBottom && withinX) {
    return "s";
  }

  if (nearTop && withinX) {
    return "n";
  }

  return null;
}

export function getPlacementResizeCursor(handle: PlacementResizeHandle) {
  switch (handle) {
    case "n":
      return "n-resize";
    case "s":
      return "s-resize";
    case "e":
      return "e-resize";
    case "w":
      return "w-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "nw":
    case "se":
      return "nwse-resize";
  }
}

export function applyRectResize({
  canvasHeight,
  canvasWidth,
  handle,
  minHeight = 24,
  minWidth = 40,
  pointer,
  startRect,
}: {
  canvasHeight: number;
  canvasWidth: number;
  handle: PlacementResizeHandle;
  minHeight?: number;
  minWidth?: number;
  pointer: { x: number; y: number };
  startRect: { height: number; width: number; x: number; y: number };
}) {
  let x = startRect.x;
  let y = startRect.y;
  let width = startRect.width;
  let height = startRect.height;

  const right = startRect.x + startRect.width;
  const bottom = startRect.y + startRect.height;

  switch (handle) {
    case "se":
      width = Math.max(minWidth, pointer.x - startRect.x);
      height = Math.max(minHeight, pointer.y - startRect.y);
      break;
    case "sw":
      width = Math.max(minWidth, right - pointer.x);
      x = right - width;
      height = Math.max(minHeight, pointer.y - startRect.y);
      break;
    case "ne":
      width = Math.max(minWidth, pointer.x - startRect.x);
      height = Math.max(minHeight, bottom - pointer.y);
      y = bottom - height;
      break;
    case "nw":
      width = Math.max(minWidth, right - pointer.x);
      x = right - width;
      height = Math.max(minHeight, bottom - pointer.y);
      y = bottom - height;
      break;
    case "e":
      width = Math.max(minWidth, pointer.x - startRect.x);
      break;
    case "w":
      width = Math.max(minWidth, right - pointer.x);
      x = right - width;
      break;
    case "s":
      height = Math.max(minHeight, pointer.y - startRect.y);
      break;
    case "n":
      height = Math.max(minHeight, bottom - pointer.y);
      y = bottom - height;
      break;
  }

  x = Math.max(0, Math.min(x, canvasWidth - minWidth));
  y = Math.max(0, Math.min(y, canvasHeight - minHeight));
  width = Math.min(width, canvasWidth - x);
  height = Math.min(height, canvasHeight - y);
  width = Math.max(minWidth, width);
  height = Math.max(minHeight, height);

  return { height, width, x, y };
}

export function applyCenteredPlacementResize({
  canvasHeight,
  canvasWidth,
  handle,
  maxFontSizeScale = 200,
  minFontSizeScale = 10,
  pointer,
  startBounds,
  startFontSizeScale,
}: {
  canvasHeight: number;
  canvasWidth: number;
  handle: PlacementResizeHandle;
  maxFontSizeScale?: number;
  minFontSizeScale?: number;
  pointer: { x: number; y: number };
  startBounds: PlacementBounds;
  startFontSizeScale: number;
}) {
  const startRect = boundsToRect(startBounds);
  const nextRect = applyRectResize({
    canvasHeight,
    canvasWidth,
    handle,
    pointer,
    startRect,
  });
  const widthScale = nextRect.width / startRect.width;
  const heightScale = nextRect.height / startRect.height;
  const scale = Math.sqrt(widthScale * heightScale);
  const centerX = nextRect.x + nextRect.width / 2;
  const centerY = nextRect.y + nextRect.height / 2;

  return {
    customPosition: {
      xPercent: centerX / canvasWidth,
      yPercent: centerY / canvasHeight,
    },
    fontSizeScale: Math.max(
      minFontSizeScale,
      Math.min(maxFontSizeScale, Math.round(startFontSizeScale * scale)),
    ),
  };
}

function drawPlacementResizeHandles(
  context: CanvasRenderingContext2D,
  rect: { height: number; width: number; x: number; y: number },
) {
  const handleRadius = 3;
  const midX = rect.x + rect.width / 2;
  const midY = rect.y + rect.height / 2;
  const points = [
    { x: rect.x, y: rect.y },
    { x: midX, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: midY },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: midX, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x, y: midY },
  ];

  context.fillStyle = "#ffffff";
  context.strokeStyle = "#e85d04";
  context.lineWidth = 1.5;

  for (const point of points) {
    context.beginPath();
    context.arc(point.x, point.y, handleRadius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
}

function drawFrameActionButton(
  context: CanvasRenderingContext2D,
  rect: { height: number; left: number; top: number; width: number },
  label: string,
  accent: "danger" | "neutral",
) {
  context.save();
  context.fillStyle = accent === "danger" ? "#fff5f5" : "#ffffff";
  context.strokeStyle = accent === "danger" ? "#dc2626" : "#e85d04";
  context.lineWidth = 1.5;
  context.beginPath();
  context.rect(rect.left, rect.top, rect.width, rect.height);
  context.fill();
  context.stroke();

  context.fillStyle = accent === "danger" ? "#dc2626" : "#111111";
  context.font = "600 11px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    label,
    rect.left + rect.width / 2,
    rect.top + rect.height / 2 + 0.5,
  );
  context.restore();
}

export function drawPlacementSelectionFrame(
  context: CanvasRenderingContext2D,
  bounds: PlacementBounds,
) {
  const rect = boundsToRect(bounds);

  context.save();
  context.strokeStyle = "#e85d04";
  context.lineWidth = 2;
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  drawPlacementResizeHandles(context, rect);
  context.restore();
}

export function drawPlacementFrameActions(
  context: CanvasRenderingContext2D,
  bounds: PlacementBounds,
) {
  const rects = getPlacementFrameActionRects(bounds);

  drawFrameActionButton(context, rects.delete, "×", "danger");
  drawFrameActionButton(context, rects.done, "Done", "neutral");
}
