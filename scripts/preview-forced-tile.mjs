import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FORCED_TILE_SITE_TEXT = "putwatermark.com";
const FORCED_TILE_TEXT_COLOR = "#5c5c5c";
const FORCED_TILE_TEXT_STROKE = "rgba(255, 255, 255, 0.45)";
const FORCED_TILE_ICON_LIGHT_HALO = "rgba(255, 255, 255, 0.85)";
const FORCED_TILE_ICON_DARK_EDGE = "rgba(0, 0, 0, 0.35)";

const TILE_SETTINGS = {
  angle: 45,
  densityRepetitionsAcross: 4.5,
  fontSizeScale: 100,
  gap: 130,
  opacity: 0.44,
};

function drawForcedTileIconWithOutline(context, logoImage, x, y, width, height) {
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

function drawForcedTileSiteText(context, x, y, fontSize) {
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
  const iconBaseWidth = Math.round(56 * (TILE_SETTINGS.fontSizeScale / 25));
  const iconAspect =
    logoImage.width > 0 ? logoImage.height / logoImage.width : 1;
  const iconHeight = iconBaseWidth * iconAspect;
  const fontSize = Math.max(7, Math.round(iconBaseWidth * 0.2));
  const textGap = Math.max(3, Math.round(iconBaseWidth * 0.1));
  const padding = 4;

  const measureCanvas = createCanvas(1, 1);
  const measureContext = measureCanvas.getContext("2d");
  measureContext.font = `600 ${fontSize}px sans-serif`;
  const textMetrics = measureContext.measureText(FORCED_TILE_SITE_TEXT);
  const textWidth = textMetrics.width;
  const textHeight = fontSize * 1.15;
  const unitWidth = Math.ceil(Math.max(iconBaseWidth, textWidth) + padding * 2);
  const unitHeight = Math.ceil(
    iconHeight + textGap + textHeight + padding * 1.5,
  );

  const canvas = createCanvas(unitWidth * 2, unitHeight * 2);
  const context = canvas.getContext("2d");
  context.scale(2, 2);
  context.imageSmoothingEnabled = true;

  const iconX = (unitWidth - iconBaseWidth) / 2;
  const iconY = padding / 2;
  drawForcedTileIconWithOutline(
    context,
    logoImage,
    iconX,
    iconY,
    iconBaseWidth,
    iconHeight,
  );
  drawForcedTileSiteText(
    context,
    unitWidth / 2,
    iconY + iconHeight + textGap,
    fontSize,
  );

  return {
    canvas,
    height: unitHeight,
    width: unitWidth,
  };
}

function drawTiledWatermark({
  alpha,
  angle,
  context,
  drawable,
  gap,
  imageHeight,
  imageWidth,
}) {
  const densitySpacing = imageWidth / TILE_SETTINGS.densityRepetitionsAcross;
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
      context.save();
      context.globalAlpha = alpha;
      context.drawImage(
        drawable.canvas,
        x - drawable.width / 2,
        y - drawable.height / 2,
        drawable.width,
        drawable.height,
      );
      context.restore();
    }
  }

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
  context.fillText("Prepared for review — page 1 of 3", 96, 170);

  context.strokeStyle = "rgba(17, 24, 39, 0.08)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(96, 210);
  context.lineTo(width - 96, 210);
  context.stroke();

  context.fillStyle = "#374151";
  context.font = "22px serif";
  const paragraph =
    "This document demonstrates how the forced export tile reads on bright paper backgrounds. Body text remains selectable in real PDF exports; only the watermark overlay is added at export time.";

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

async function renderPreview({ background, outputPath }) {
  const logo = await loadImage(
    join(root, "public", "Put Watermark - Icon.png"),
  );
  const composite = await createCompositeUnit(logo);

  const drawableWidth = Math.max(
    24,
    background.width * 0.18 * (TILE_SETTINGS.fontSizeScale / 100),
  );
  const drawableHeight = composite.height * (drawableWidth / composite.width);

  const canvas = createCanvas(background.width, background.height);
  const context = canvas.getContext("2d");

  if (background.canvas) {
    context.drawImage(background.canvas, 0, 0);
  } else {
    context.drawImage(background, 0, 0, background.width, background.height);
  }

  drawTiledWatermark({
    alpha: TILE_SETTINGS.opacity,
    angle: TILE_SETTINGS.angle,
    context,
    drawable: {
      canvas: composite.canvas,
      height: drawableHeight,
      width: drawableWidth,
    },
    gap: TILE_SETTINGS.gap,
    imageHeight: background.height,
    imageWidth: background.width,
  });

  writeFileSync(outputPath, canvas.toBuffer("image/jpeg", { quality: 92 }));
  console.log(`Wrote ${outputPath}`);
}

const darkPhoto = await loadImage(join(root, "public", "Black_horse.jpeg"));
const lightDocument = createLightDocumentBackground();

await renderPreview({
  background: darkPhoto,
  outputPath: join(root, "public", "previews", "forced-tile-preview-dark.jpg"),
});

await renderPreview({
  background: lightDocument,
  outputPath: join(
    root,
    "public",
    "previews",
    "forced-tile-preview-light.jpg",
  ),
});

await renderPreview({
  background: darkPhoto,
  outputPath: join(root, "public", "previews", "forced-tile-preview.jpg"),
});
