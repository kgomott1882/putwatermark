import { createCanvas, loadImage } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, "scripts", ".export-test-output");
const pageW = 612;
const pageH = 792;
const exportScale = 3;
const fontSizeScale = 100;
const angleDegrees = 45;
const gapPercent = 130;
const opacity = 0.44;
const repetitionsAcross = 4.5;

const FORCED_TILE_SITE_TEXT = "putwatermark.com";
const FORCED_TILE_TEXT_COLOR = "#5c5c5c";
const FORCED_TILE_TEXT_STROKE = "rgba(255, 255, 255, 0.45)";
const FORCED_TILE_ICON_LIGHT_HALO = "rgba(255, 255, 255, 0.85)";
const FORCED_TILE_ICON_DARK_EDGE = "rgba(0, 0, 0, 0.35)";

function drawIconOutline(context, logoImage, x, y, width, height) {
  const strokeWidth = Math.max(1, Math.round(width * 0.04));

  context.save();
  context.shadowColor = FORCED_TILE_ICON_LIGHT_HALO;
  context.shadowBlur = strokeWidth * 1.5;
  context.drawImage(logoImage, x, y, width, height);
  context.restore();

  context.save();
  context.shadowColor = FORCED_TILE_ICON_DARK_EDGE;
  context.shadowBlur = strokeWidth;
  context.drawImage(logoImage, x, y, width, height);
  context.restore();

  context.drawImage(logoImage, x, y, width, height);
}

function drawSiteText(context, x, y, fontSize) {
  context.font = `600 ${fontSize}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.lineJoin = "round";
  context.lineWidth = Math.max(1.5, fontSize / 10);
  context.strokeStyle = FORCED_TILE_TEXT_STROKE;
  context.fillStyle = FORCED_TILE_TEXT_COLOR;
  context.strokeText(FORCED_TILE_SITE_TEXT, x, y);
  context.fillText(FORCED_TILE_SITE_TEXT, x, y);
}

async function createCompositeUnit(logoImage) {
  const iconBaseWidth = Math.round(56 * (fontSizeScale / 25));
  const iconAspect =
    logoImage.width > 0 ? logoImage.height / logoImage.width : 1;
  const iconHeight = iconBaseWidth * iconAspect;
  const fontSize = Math.max(7, Math.round(iconBaseWidth * 0.2));
  const textGap = Math.max(3, Math.round(iconBaseWidth * 0.1));
  const padding = 4;

  const measure = createCanvas(1, 1).getContext("2d");
  measure.font = `600 ${fontSize}px sans-serif`;
  const textWidth = measure.measureText(FORCED_TILE_SITE_TEXT).width;
  const unitWidth = Math.ceil(Math.max(iconBaseWidth, textWidth) + padding * 2);
  const unitHeight = Math.ceil(
    iconHeight + textGap + fontSize * 1.15 + padding * 1.5,
  );

  const canvas = createCanvas(Math.round(unitWidth * 2), Math.round(unitHeight * 2));
  const context = canvas.getContext("2d");
  context.scale(2, 2);

  const iconX = (unitWidth - iconBaseWidth) / 2;
  const iconY = padding / 2;
  context.save();
  context.translate(iconX + iconBaseWidth / 2, iconY + iconHeight / 2);
  context.rotate((angleDegrees * Math.PI) / 180);
  drawIconOutline(
    context,
    logoImage,
    -iconBaseWidth / 2,
    -iconHeight / 2,
    iconBaseWidth,
    iconHeight,
  );
  context.restore();
  drawSiteText(context, unitWidth / 2, iconY + iconHeight + textGap, fontSize);

  return {
    aspectRatio: unitHeight / unitWidth,
    canvas,
    unitHeight,
    unitWidth,
  };
}

function getOrientedTileUnitBounds(tileWidth, tileHeight, angle) {
  if (angle === 0) {
    return { height: tileHeight, width: tileWidth };
  }

  const radians = (angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));

  return {
    height: tileWidth * sin + tileHeight * cos,
    width: tileWidth * cos + tileHeight * sin,
  };
}

function computeTileCenters(tileWidth, tileHeight) {
  const densitySpacing = pageW / repetitionsAcross;
  const diagonal = Math.hypot(pageW, pageH);
  const gapPixels = Math.max(tileHeight, tileWidth * (gapPercent / 100));
  const xSpacing = Math.max(densitySpacing, tileWidth + gapPixels);
  const ySpacing = Math.max(tileHeight * 2.4, densitySpacing * 0.65);
  const patternExtent = diagonal + Math.max(xSpacing, ySpacing) * 2;
  const angleRadians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const pageCenterX = pageW / 2;
  const pageCenterY = pageH / 2;
  const centers = [];

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

function getPdfTileDrawImageArgs(centerX, centerY, tileWidth, tileHeight) {
  const pdfCenterX = centerX;
  const pdfCenterY = pageH - centerY;

  return {
    height: tileHeight,
    width: tileWidth,
    x: pdfCenterX - tileWidth / 2,
    y: pdfCenterY - tileHeight / 2,
  };
}

function renderReferenceOverlay(unitCanvas, tileWidth, tileHeight) {
  const densitySpacing = pageW / repetitionsAcross;
  const diagonal = Math.hypot(pageW, pageH);
  const gapPixels = Math.max(tileHeight, tileWidth * (gapPercent / 100));
  const xSpacing = Math.max(densitySpacing, tileWidth + gapPixels);
  const ySpacing = Math.max(tileHeight * 2.4, densitySpacing * 0.65);
  const patternExtent = diagonal + Math.max(xSpacing, ySpacing) * 2;
  const canvas = createCanvas(pageW, pageH);
  const context = canvas.getContext("2d");

  context.fillStyle = "#f7f4ef";
  context.fillRect(0, 0, pageW, pageH);
  context.fillStyle = "#374151";
  context.font = "22px serif";
  context.fillText("Reference overlay (legacy full-page canvas path)", 72, 96);

  context.save();
  context.beginPath();
  context.rect(0, 0, pageW, pageH);
  context.clip();
  context.translate(pageW / 2, pageH / 2);
  context.rotate((-angleDegrees * Math.PI) / 180);

  for (let y = -patternExtent; y <= patternExtent; y += ySpacing) {
    for (let x = -patternExtent; x <= patternExtent; x += xSpacing) {
      context.save();
      context.globalAlpha = opacity;
      context.drawImage(
        unitCanvas,
        x - tileWidth / 2,
        y - tileHeight / 2,
        tileWidth,
        tileHeight,
      );
      context.restore();
    }
  }

  context.restore();

  return canvas.toBuffer("image/png");
}

function renderOrientedUnitPng(unitCanvas, tileWidth, tileHeight) {
  const orientedBounds = getOrientedTileUnitBounds(
    tileWidth,
    tileHeight,
    angleDegrees,
  );
  const canvas = createCanvas(
    Math.round(orientedBounds.width * exportScale),
    Math.round(orientedBounds.height * exportScale),
  );
  const context = canvas.getContext("2d");
  context.scale(exportScale, exportScale);
  context.translate(orientedBounds.width / 2, orientedBounds.height / 2);
  context.rotate((-angleDegrees * Math.PI) / 180);
  context.drawImage(unitCanvas, -tileWidth / 2, -tileHeight / 2, tileWidth, tileHeight);

  return {
    bounds: orientedBounds,
    png: canvas.toBuffer("image/png"),
  };
}

async function buildFixedReusePdf(originalBytes, unitPng, centers, unitWidth, unitHeight) {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const tileImage = await pdfDoc.embedPng(unitPng);

  for (const page of pdfDoc.getPages()) {
    for (const center of centers) {
      const drawArgs = getPdfTileDrawImageArgs(
        center.x,
        center.y,
        unitWidth,
        unitHeight,
      );

      page.drawImage(tileImage, {
        height: drawArgs.height,
        opacity,
        width: drawArgs.width,
        x: drawArgs.x,
        y: drawArgs.y,
      });
    }
  }

  return pdfDoc.save();
}

async function createOriginalPdf(pageCount = 2) {
  const pdfDoc = await PDFDocument.create();

  for (let index = 0; index < pageCount; index += 1) {
    const page = pdfDoc.addPage([pageW, pageH]);
    page.drawText(`Sample PDF page ${index + 1}`, {
      opacity: 0.8,
      size: 14,
      x: 72,
      y: pageH - 96,
    });
  }

  return pdfDoc.save();
}

const logo = await loadImage(join(root, "public", "Put Watermark - Icon.png"));
const composite = await createCompositeUnit(logo);
const tileWidth = Math.min(
  pageW * 0.6,
  Math.max(24, pageW * 0.18 * (fontSizeScale / 100)),
);
const tileHeight = tileWidth * composite.aspectRatio;
const centers = computeTileCenters(tileWidth, tileHeight);
const referenceOverlay = renderReferenceOverlay(
  composite.canvas,
  tileWidth,
  tileHeight,
);
const orientedUnit = renderOrientedUnitPng(composite.canvas, tileWidth, tileHeight);
const originalBytes = await createOriginalPdf(2);
const fixedPdfBytes = await buildFixedReusePdf(
  originalBytes,
  orientedUnit.png,
  centers,
  orientedUnit.bounds.width,
  orientedUnit.bounds.height,
);

writeFileSync(join(outputDir, "pdf-tile-reference-overlay.png"), referenceOverlay);
writeFileSync(join(outputDir, "pdf-tile-oriented-unit.png"), orientedUnit.png);
writeFileSync(join(outputDir, "pdf-tile-fixed-export.pdf"), fixedPdfBytes);

console.log(
  JSON.stringify(
    {
      centersPerPage: centers.length,
      fixedExportPdfKB: Number((fixedPdfBytes.length / 1024).toFixed(1)),
      orientedUnitBoundsPoints: [
        Number(orientedUnit.bounds.width.toFixed(1)),
        Number(orientedUnit.bounds.height.toFixed(1)),
      ],
      orientedUnitPngKB: Number((orientedUnit.png.length / 1024).toFixed(1)),
      outputs: {
        fixedExportPdf: "scripts/.export-test-output/pdf-tile-fixed-export.pdf",
        orientedUnitPng: "scripts/.export-test-output/pdf-tile-oriented-unit.png",
        referenceOverlayPng:
          "scripts/.export-test-output/pdf-tile-reference-overlay.png",
      },
      tileDrawSizePoints: [Number(tileWidth.toFixed(1)), Number(tileHeight.toFixed(1))],
    },
    null,
    2,
  ),
);
