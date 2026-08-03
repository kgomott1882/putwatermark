/**
 * Preview forced export watermark stack:
 * - Text-only tile: Montserrat, sparse (UI 0%), 20% opacity, scale 20, 45°, gap 130
 * - Center stamp: icon-only wave/swoosh at 44% opacity, scale 200 (no site text)
 *
 * Run: node scripts/preview-forced-tile.mjs
 */
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const previewsDir = join(root, "public", "previews");

const FORCED_TILE_SITE_TEXT = "PutWatermark.com";
const FORCED_TILE_FONT_FAMILY = "Montserrat";
const FORCED_TILE_TEXT_COLOR = "#ffffff";
const FORCED_TILE_TEXT_STROKE = "rgba(0, 0, 0, 0.5)";

/** Mirrors src/lib/forcedTileExport.ts FORCED_TILE_PATTERN_SETTINGS */
const TILE_PATTERN_SETTINGS = {
  angle: 45,
  densityRepetitionsAcross: 4.5,
  fontFamily: FORCED_TILE_FONT_FAMILY,
  fontSizeScale: 20,
  gap: 130,
  opacity: 0.2,
};

/** Existing center stamp — unchanged */
const CENTER_STAMP_SETTINGS = {
  fontSizeScale: 200,
  opacity: 0.44,
};

function getTextTileFontSize(watermarkReferenceWidth, fontSizeScale) {
  return Math.max(
    8,
    Math.min(watermarkReferenceWidth / 12, 72) * (fontSizeScale / 100),
  );
}

function measureTextTileDrawable(context, fontSize, text) {
  context.save();
  context.font = `400 ${fontSize}px ${FORCED_TILE_FONT_FAMILY}, sans-serif`;
  const metrics = context.measureText(text);
  context.restore();

  return {
    fontSize,
    height:
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
      fontSize,
    text,
    width: metrics.width,
  };
}

function drawTextTileUnit(context, drawable, x, y, alpha) {
  context.save();
  context.globalAlpha = alpha;
  context.font = `400 ${drawable.fontSize}px ${FORCED_TILE_FONT_FAMILY}, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = Math.max(1.5, drawable.fontSize / 10);
  context.strokeStyle = FORCED_TILE_TEXT_STROKE;
  context.fillStyle = FORCED_TILE_TEXT_COLOR;
  context.strokeText(drawable.text, x, y);
  context.fillText(drawable.text, x, y);
  context.restore();
}

function drawTiledTextWatermark({
  alpha,
  angle,
  context,
  drawable,
  gap,
  imageHeight,
  imageWidth,
  watermarkReferenceWidth,
}) {
  const densitySpacing =
    watermarkReferenceWidth / TILE_PATTERN_SETTINGS.densityRepetitionsAcross;
  const diagonal = Math.hypot(imageWidth, imageHeight);

  context.save();
  context.beginPath();
  context.rect(0, 0, imageWidth, imageHeight);
  context.clip();
  context.translate(imageWidth / 2, imageHeight / 2);
  context.rotate((-angle * Math.PI) / 180);

  const gapPixels = Math.max(drawable.height, drawable.width * (gap / 100));
  const xSpacing = Math.max(densitySpacing, drawable.width + gapPixels);
  const ySpacing = Math.max(drawable.height * 2.4, densitySpacing * 0.65);
  const patternExtent = diagonal + Math.max(xSpacing, ySpacing) * 2;

  for (let y = -patternExtent; y <= patternExtent; y += ySpacing) {
    for (let x = -patternExtent; x <= patternExtent; x += xSpacing) {
      drawTextTileUnit(context, drawable, x, y, alpha);
    }
  }

  context.restore();
}

function getCenterStampDrawableWidth(contentWidth) {
  return Math.min(
    contentWidth * 0.6,
    Math.max(
      24,
      contentWidth *
        0.18 *
        (CENTER_STAMP_SETTINGS.fontSizeScale / 100),
    ),
  );
}

function paintCenterStamp(context, stampImage, contentWidth, contentHeight) {
  if (stampImage.width <= 0 || stampImage.height <= 0) {
    return;
  }

  const drawableWidth = getCenterStampDrawableWidth(contentWidth);
  const drawableHeight =
    drawableWidth * (stampImage.height / stampImage.width);
  const centerX = contentWidth / 2;
  const centerY = contentHeight / 2;

  context.save();
  context.globalAlpha = CENTER_STAMP_SETTINGS.opacity;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    stampImage,
    centerX - drawableWidth / 2,
    centerY - drawableHeight / 2,
    drawableWidth,
    drawableHeight,
  );
  context.restore();
}

function createLightDocumentBackground(width = 1200, height = 1600) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  context.fillStyle = "#f7f4ef";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#1f2937";
  context.font = "700 42px serif";
  context.fillText("Sample Contract Agreement", 96, 120);

  context.fillStyle = "#4b5563";
  context.font = "24px serif";
  context.fillText("Prepared for review, page 1 of 3", 96, 170);

  context.strokeStyle = "rgba(17, 24, 39, 0.08)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(96, 210);
  context.lineTo(width - 96, 210);
  context.stroke();

  context.fillStyle = "#374151";
  context.font = "22px serif";
  const paragraph =
    "This preview shows how the forced export tile reads on bright paper backgrounds. Body text remains readable; only the watermark overlay is added at export time.";

  let y = 260;
  const maxWidth = width - 192;
  const words = paragraph.split(" ");
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, 96, y);
      line = word;
      y += 34;
    } else {
      line = testLine;
    }
  }

  if (line) {
    context.fillText(line, 96, y);
  }

  for (let lineY = y + 70; lineY < height - 120; lineY += 34) {
    context.fillStyle = "rgba(55, 65, 81, 0.72)";
    context.fillText(
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.",
      96,
      lineY,
    );
  }

  return canvas;
}

async function renderPreview({ background, outputPath, stampImage }) {
  const imageWidth = background.width ?? background.canvas?.width;
  const imageHeight = background.height ?? background.canvas?.height;

  const measureCanvas = createCanvas(1, 1);
  const measureContext = measureCanvas.getContext("2d");
  const fontSize = getTextTileFontSize(
    imageWidth,
    TILE_PATTERN_SETTINGS.fontSizeScale,
  );
  const drawable = measureTextTileDrawable(
    measureContext,
    fontSize,
    FORCED_TILE_SITE_TEXT,
  );

  const canvas = createCanvas(imageWidth, imageHeight);
  const context = canvas.getContext("2d");

  if (background.canvas) {
    context.drawImage(background.canvas, 0, 0);
  } else {
    context.drawImage(background, 0, 0, imageWidth, imageHeight);
  }

  drawTiledTextWatermark({
    alpha: TILE_PATTERN_SETTINGS.opacity,
    angle: TILE_PATTERN_SETTINGS.angle,
    context,
    drawable,
    gap: TILE_PATTERN_SETTINGS.gap,
    imageHeight,
    imageWidth,
    watermarkReferenceWidth: imageWidth,
  });

  paintCenterStamp(context, stampImage, imageWidth, imageHeight);

  writeFileSync(outputPath, canvas.toBuffer("image/jpeg", { quality: 92 }));
  console.log(`Wrote ${outputPath}`);
}

mkdirSync(previewsDir, { recursive: true });

async function ensureMontserratRegistered() {
  if (GlobalFonts.has(FORCED_TILE_FONT_FAMILY)) {
    return;
  }

  const response = await fetch(
    "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@5.2.5/latin-400-normal.ttf",
  );

  if (!response.ok) {
    throw new Error("Could not download Montserrat for preview rendering.");
  }

  GlobalFonts.register(Buffer.from(await response.arrayBuffer()), FORCED_TILE_FONT_FAMILY);
}

await ensureMontserratRegistered();

const darkPhoto = await loadImage(join(root, "public", "Black_horse.jpeg"));
const centerStamp = await loadImage(join(root, "public", "forced-export-stamp.png"));
const lightDocument = createLightDocumentBackground();

await renderPreview({
  background: darkPhoto,
  outputPath: join(previewsDir, "forced-tile-preview-a-dark.jpg"),
  stampImage: centerStamp,
});

await renderPreview({
  background: lightDocument,
  outputPath: join(previewsDir, "forced-tile-preview-a-light.jpg"),
  stampImage: centerStamp,
});

console.log("\nForced tile preview settings:");
console.log(JSON.stringify({ TILE_PATTERN_SETTINGS, CENTER_STAMP_SETTINGS }, null, 2));
