/**
 * Real export-stack test for Proposal A forced tile watermark.
 * Produces photo + video overlay JPEGs using the same constants and paint
 * logic as production (forcedTileExport + clientVideoFreeExportStamp).
 *
 * Run: node scripts/test-forced-tile-export.mjs
 */
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const previewsDir = join(root, "public", "previews");

/** Mirrors src/lib/forcedTileExport.ts */
const FORCED_TILE_SITE_TEXT = "PutWatermark.com";
const FORCED_TILE_FONT_FAMILY = "Montserrat";
const FORCED_TILE_PATTERN_SETTINGS = {
  fontSizeScale: 20,
  tileAngle: 45,
  tileDensity: "sparse",
  tileGap: 130,
  watermarkOpacity: 20,
  watermarkText: FORCED_TILE_SITE_TEXT,
};
const FORCED_TILE_PATTERN_DENSITY_REPETITIONS = { sparse: 4.5 };
const CLIENT_VIDEO_FREE_EXPORT_STAMP_FONT_SIZE_SCALE = 200;
const CLIENT_VIDEO_FREE_EXPORT_STAMP_OPACITY = 0.44;

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
  context.lineWidth = Math.max(3, drawable.fontSize / 12);
  context.strokeStyle = "rgba(0, 0, 0, 0.55)";
  context.fillStyle = "#ffffff";
  context.shadowColor = "rgba(0, 0, 0, 0.35)";
  context.shadowBlur = Math.max(2, drawable.fontSize / 8);
  context.strokeText(drawable.text, x, y);
  context.fillText(drawable.text, x, y);
  context.restore();
}

function paintForcedExportTilePattern({
  context,
  displayScale = 1,
  imageHeight,
  imageWidth,
  imageX,
  imageY,
  watermarkReferenceWidth,
}) {
  const { tileAngle, tileGap, fontSizeScale, watermarkOpacity, watermarkText } =
    FORCED_TILE_PATTERN_SETTINGS;
  const fontSize = getTextTileFontSize(watermarkReferenceWidth, fontSizeScale) * displayScale;
  const drawable = measureTextTileDrawable(context, fontSize, watermarkText);
  const alpha = watermarkOpacity / 100;
  const repetitionsAcross = FORCED_TILE_PATTERN_DENSITY_REPETITIONS.sparse;
  const densitySpacing =
    (watermarkReferenceWidth / repetitionsAcross) * displayScale;
  const diagonal = Math.hypot(imageWidth, imageHeight);

  context.save();
  context.beginPath();
  context.rect(imageX, imageY, imageWidth, imageHeight);
  context.clip();
  context.translate(imageX + imageWidth / 2, imageY + imageHeight / 2);
  context.rotate((-tileAngle * Math.PI) / 180);

  const gapPixels = Math.max(drawable.height, drawable.width * (tileGap / 100));
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
      contentWidth * 0.18 * (CLIENT_VIDEO_FREE_EXPORT_STAMP_FONT_SIZE_SCALE / 100),
    ),
  );
}

function paintCenterStamp(context, stampImage, contentWidth, contentHeight) {
  const drawableWidth = getCenterStampDrawableWidth(contentWidth);
  const drawableHeight =
    drawableWidth * (stampImage.height / stampImage.width);
  const centerX = contentWidth / 2;
  const centerY = contentHeight / 2;

  context.save();
  context.globalAlpha = CLIENT_VIDEO_FREE_EXPORT_STAMP_OPACITY;
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

function averageChannel(context, x, y, width, height) {
  const { data } = context.getImageData(x, y, width, height);
  let total = 0;

  for (let index = 0; index < data.length; index += 4) {
    total += data[index] + data[index + 1] + data[index + 2];
  }

  return total / (data.length / 4) / 3;
}

async function renderPhotoExportTest(background, stampImage) {
  const imageWidth = background.width;
  const imageHeight = background.height;
  const canvas = createCanvas(imageWidth, imageHeight);
  const context = canvas.getContext("2d");

  context.drawImage(background, 0, 0, imageWidth, imageHeight);

  paintForcedExportTilePattern({
    context,
    imageHeight,
    imageWidth,
    imageX: 0,
    imageY: 0,
    watermarkReferenceWidth: imageWidth,
  });

  paintCenterStamp(context, stampImage, imageWidth, imageHeight);

  return { canvas, context, height: imageHeight, width: imageWidth };
}

async function renderVideoOverlayTest(stampImage) {
  const width = 1280;
  const height = 720;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#dbeafe");
  gradient.addColorStop(1, "#fce7f3");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.font = "600 36px sans-serif";
  context.textAlign = "right";
  context.textBaseline = "bottom";
  context.globalAlpha = 0.72;
  context.fillStyle = "#111827";
  context.fillText("© Your Brand Studio", width * 0.9, height * 0.92);
  context.restore();

  paintForcedExportTilePattern({
    context,
    imageHeight: height,
    imageWidth: width,
    imageX: 0,
    imageY: 0,
    watermarkReferenceWidth: width,
  });

  paintCenterStamp(context, stampImage, width, height);

  return { canvas, context, height, width };
}

mkdirSync(previewsDir, { recursive: true });

await ensureMontserratRegistered();

const photoBackground = await loadImage(join(root, "public", "Black_horse.jpeg"));
const centerStamp = await loadImage(join(root, "public", "forced-export-stamp.png"));

const photoOutput = join(previewsDir, "forced-tile-export-test-photo.jpg");
const videoOutput = join(previewsDir, "forced-tile-export-test-video.jpg");

const photo = await renderPhotoExportTest(photoBackground, centerStamp);
writeFileSync(photoOutput, photo.canvas.toBuffer("image/jpeg", { quality: 92 }));
console.log(`Wrote ${photoOutput}`);

const video = await renderVideoOverlayTest(centerStamp);
writeFileSync(videoOutput, video.canvas.toBuffer("image/jpeg", { quality: 92 }));
console.log(`Wrote ${videoOutput}`);

const photoTileBrightness = averageChannel(
  photo.context,
  Math.floor(photo.width * 0.08),
  Math.floor(photo.height * 0.08),
  Math.floor(photo.width * 0.2),
  Math.floor(photo.height * 0.2),
);
const photoCenterBrightness = averageChannel(
  photo.context,
  Math.floor(photo.width * 0.35),
  Math.floor(photo.height * 0.35),
  Math.floor(photo.width * 0.3),
  Math.floor(photo.height * 0.3),
);
const videoTileBrightness = averageChannel(
  video.context,
  80,
  80,
  180,
  140,
);
const videoCenterBrightness = averageChannel(
  video.context,
  Math.floor(video.width * 0.35),
  Math.floor(video.height * 0.35),
  Math.floor(video.width * 0.3),
  Math.floor(video.height * 0.3),
);

console.log("\nPixel checks (higher = brighter overlay):");
console.log(`  Photo tile corner: ${photoTileBrightness.toFixed(2)}`);
console.log(`  Photo center stamp: ${photoCenterBrightness.toFixed(2)}`);
console.log(`  Video tile region: ${videoTileBrightness.toFixed(2)}`);
console.log(`  Video center stamp: ${videoCenterBrightness.toFixed(2)}`);

if (photoCenterBrightness <= photoTileBrightness) {
  throw new Error("Photo center stamp should read brighter than tile corner.");
}

if (videoCenterBrightness <= videoTileBrightness) {
  throw new Error("Video center stamp should read brighter than tile region.");
}

console.log("\nForced tile export test passed.");
