export type PdfTileDensity = "sparse" | "medium" | "dense";

export type PdfTileAngle = 0 | 45 | 90 | 180;

const TILE_DENSITY_REPETITIONS: Record<PdfTileDensity, number> = {
  dense: 9.5,
  medium: 6.5,
  sparse: 4.5,
};

export type PdfTileCenter = {
  /** Tile center X in canvas-style page coords (origin top-left, Y down). */
  x: number;
  /** Tile center Y in canvas-style page coords (origin top-left, Y down). */
  y: number;
};

export function computePdfTileCenters({
  angleDegrees,
  density,
  gapPercent,
  pageHeight,
  pageWidth,
  tileHeight,
  tileWidth,
}: {
  angleDegrees: PdfTileAngle;
  density: PdfTileDensity;
  gapPercent: number;
  pageHeight: number;
  pageWidth: number;
  tileHeight: number;
  tileWidth: number;
}): PdfTileCenter[] {
  const imageWidth = Math.max(1, pageWidth);
  const imageHeight = Math.max(1, pageHeight);
  const repetitionsAcross = TILE_DENSITY_REPETITIONS[density];
  const densitySpacing = imageWidth / repetitionsAcross;
  const diagonal = Math.hypot(imageWidth, imageHeight);
  const gapPixels = Math.max(tileHeight, tileWidth * (gapPercent / 100));
  const xSpacing = Math.max(densitySpacing, tileWidth + gapPixels);
  const ySpacing = Math.max(tileHeight * 2.4, densitySpacing * 0.65);
  const patternExtent = diagonal + Math.max(xSpacing, ySpacing) * 2;
  const angleRadians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const pageCenterX = imageWidth / 2;
  const pageCenterY = imageHeight / 2;
  const centers: PdfTileCenter[] = [];

  for (let y = -patternExtent; y <= patternExtent; y += ySpacing) {
    for (let x = -patternExtent; x <= patternExtent; x += xSpacing) {
      centers.push({
        x: pageCenterX + cos * x - sin * y,
        y: pageCenterY + sin * x + cos * y,
      });
    }
  }

  return centers;
}

export function getOrientedTileUnitBounds(
  tileWidth: number,
  tileHeight: number,
  angleDegrees: PdfTileAngle,
) {
  if (angleDegrees === 0) {
    return {
      height: tileHeight,
      width: tileWidth,
    };
  }

  const angleRadians = (angleDegrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angleRadians));
  const sin = Math.abs(Math.sin(angleRadians));

  return {
    height: tileWidth * sin + tileHeight * cos,
    width: tileWidth * cos + tileHeight * sin,
  };
}

/** Map a canvas-style tile center to axis-aligned pdf-lib drawImage args. */
export function getPdfTileDrawImageArgs({
  centerX,
  centerY,
  pageHeight,
  tileHeight,
  tileWidth,
}: {
  centerX: number;
  centerY: number;
  pageHeight: number;
  tileHeight: number;
  tileWidth: number;
}) {
  const pdfCenterX = centerX;
  const pdfCenterY = pageHeight - centerY;

  return {
    height: tileHeight,
    width: tileWidth,
    x: pdfCenterX - tileWidth / 2,
    y: pdfCenterY - tileHeight / 2,
  };
}
