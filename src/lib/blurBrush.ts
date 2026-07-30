export type BlurBrushSize = "large" | "medium" | "small";

export type BlurStrokePoint = {
  x: number;
  y: number;
};

export type BlurStroke = {
  brushSize: BlurBrushSize;
  id: string;
  points: BlurStrokePoint[];
};

const BLUR_BRUSH_RADIUS: Record<BlurBrushSize, number> = {
  large: 52,
  medium: 28,
  small: 14,
};

const MOSAIC_BLOCK_SIZE: Record<BlurBrushSize, number> = {
  large: 48,
  medium: 22,
  small: 10,
};

const REFERENCE_IMAGE_SIZE = 800;

export function getBlurBrushRadius(
  brushSize: BlurBrushSize,
  imageWidth: number,
  imageHeight: number,
) {
  const scale = Math.min(imageWidth, imageHeight) / REFERENCE_IMAGE_SIZE;

  return BLUR_BRUSH_RADIUS[brushSize] * Math.max(0.55, scale);
}

function getMosaicBlockSize(
  brushSize: BlurBrushSize,
  imageWidth: number,
  imageHeight: number,
) {
  const scale = Math.min(imageWidth, imageHeight) / REFERENCE_IMAGE_SIZE;

  return Math.max(
    4,
    Math.round(MOSAIC_BLOCK_SIZE[brushSize] * Math.max(0.55, scale)),
  );
}

export function cloneBlurStrokes(strokes: BlurStroke[]): BlurStroke[] {
  return strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => ({ ...point })),
  }));
}

export function areBlurStrokesEqual(first: BlurStroke[], second: BlurStroke[]) {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((stroke, index) => {
    const other = second[index];

    if (
      stroke.id !== other.id ||
      stroke.brushSize !== other.brushSize ||
      stroke.points.length !== other.points.length
    ) {
      return false;
    }

    return stroke.points.every(
      (point, pointIndex) =>
        point.x === other.points[pointIndex]?.x &&
        point.y === other.points[pointIndex]?.y,
    );
  });
}

type ApplyBlurStrokesInput = {
  destHeight: number;
  destWidth: number;
  destX: number;
  destY: number;
  source: CanvasImageSource;
  sourceHeight: number;
  sourceWidth: number;
  strokes: BlurStroke[];
};

function getCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function drawSingleStrokeMask(
  context: CanvasRenderingContext2D,
  stroke: BlurStroke,
  sourceWidth: number,
  sourceHeight: number,
) {
  const radius = getBlurBrushRadius(stroke.brushSize, sourceWidth, sourceHeight);

  if (stroke.points.length === 0) {
    return;
  }

  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(stroke.points[0].x, stroke.points[0].y, radius, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.lineWidth = radius * 2;
  context.beginPath();

  stroke.points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
      return;
    }

    context.lineTo(point.x, point.y);
  });
  context.stroke();
}

function createPixelatedCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  blockSize: number,
) {
  const pixelatedCanvas = getCanvas(sourceWidth, sourceHeight);
  const context = pixelatedCanvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return pixelatedCanvas;
  }

  context.drawImage(source, 0, 0, sourceWidth, sourceHeight);

  const imageData = context.getImageData(0, 0, sourceWidth, sourceHeight);
  const { data, height, width } = imageData;

  for (let blockY = 0; blockY < height; blockY += blockSize) {
    const blockHeight = Math.min(blockSize, height - blockY);

    for (let blockX = 0; blockX < width; blockX += blockSize) {
      const blockWidth = Math.min(blockSize, width - blockX);
      let redTotal = 0;
      let greenTotal = 0;
      let blueTotal = 0;
      let alphaTotal = 0;
      let sampleCount = 0;

      for (let y = blockY; y < blockY + blockHeight; y += 1) {
        for (let x = blockX; x < blockX + blockWidth; x += 1) {
          const index = (y * width + x) * 4;
          redTotal += data[index];
          greenTotal += data[index + 1];
          blueTotal += data[index + 2];
          alphaTotal += data[index + 3];
          sampleCount += 1;
        }
      }

      const red = Math.round(redTotal / sampleCount);
      const green = Math.round(greenTotal / sampleCount);
      const blue = Math.round(blueTotal / sampleCount);
      const alpha = Math.round(alphaTotal / sampleCount);

      for (let y = blockY; y < blockY + blockHeight; y += 1) {
        for (let x = blockX; x < blockX + blockWidth; x += 1) {
          const index = (y * width + x) * 4;
          data[index] = red;
          data[index + 1] = green;
          data[index + 2] = blue;
          data[index + 3] = alpha;
        }
      }
    }
  }

  context.putImageData(imageData, 0, 0);

  return pixelatedCanvas;
}

export function applyBlurStrokes(
  context: CanvasRenderingContext2D,
  {
    destHeight,
    destWidth,
    destX,
    destY,
    source,
    sourceHeight,
    sourceWidth,
    strokes,
  }: ApplyBlurStrokesInput,
) {
  if (
    strokes.length === 0 ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    destWidth <= 0 ||
    destHeight <= 0
  ) {
    return;
  }

  const compositeCanvas = getCanvas(sourceWidth, sourceHeight);
  const compositeContext = compositeCanvas.getContext("2d");

  if (!compositeContext) {
    return;
  }

  const pixelatedByBlockSize = new Map<number, HTMLCanvasElement>();

  for (const stroke of strokes) {
    if (stroke.points.length === 0) {
      continue;
    }

    const blockSize = getMosaicBlockSize(
      stroke.brushSize,
      sourceWidth,
      sourceHeight,
    );
    let pixelatedCanvas = pixelatedByBlockSize.get(blockSize);

    if (!pixelatedCanvas) {
      pixelatedCanvas = createPixelatedCanvas(
        source,
        sourceWidth,
        sourceHeight,
        blockSize,
      );
      pixelatedByBlockSize.set(blockSize, pixelatedCanvas);
    }

    const maskCanvas = getCanvas(sourceWidth, sourceHeight);
    const maskContext = maskCanvas.getContext("2d");

    if (!maskContext) {
      continue;
    }

    maskContext.clearRect(0, 0, sourceWidth, sourceHeight);
    maskContext.fillStyle = "#ffffff";
    maskContext.strokeStyle = "#ffffff";
    maskContext.lineCap = "round";
    maskContext.lineJoin = "round";
    drawSingleStrokeMask(maskContext, stroke, sourceWidth, sourceHeight);

    const strokeCanvas = getCanvas(sourceWidth, sourceHeight);
    const strokeContext = strokeCanvas.getContext("2d");

    if (!strokeContext) {
      continue;
    }

    strokeContext.drawImage(pixelatedCanvas, 0, 0, sourceWidth, sourceHeight);
    strokeContext.globalCompositeOperation = "destination-in";
    strokeContext.drawImage(maskCanvas, 0, 0, sourceWidth, sourceHeight);
    strokeContext.globalCompositeOperation = "source-over";

    compositeContext.drawImage(strokeCanvas, 0, 0, sourceWidth, sourceHeight);
  }

  context.drawImage(
    compositeCanvas,
    0,
    0,
    sourceWidth,
    sourceHeight,
    destX,
    destY,
    destWidth,
    destHeight,
  );
}
