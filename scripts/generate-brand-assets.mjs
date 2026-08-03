/**
 * Generates original PutWatermark brand PNG assets (layer-stack mark).
 * Run: node scripts/generate-brand-assets.mjs
 */
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const picsDir = join(publicDir, "Pics");

const BRAND = {
  ink: "#171717",
  night: "#23292F",
  signal: "#D97757",
  white: "#FFFFFF",
};

/** Three offset rounded bars — watermark layer stack, not organic/leaf shapes. */
function drawLayerStackMark(context, centerX, centerY, size, color) {
  const barHeight = size * 0.11;
  const barWidth = size * 0.62;
  const gap = size * 0.09;
  const radius = barHeight * 0.45;
  const offsets = [-gap, 0, gap];

  context.save();
  context.fillStyle = color;

  for (const offsetY of offsets) {
    const x = centerX - barWidth / 2;
    const y = centerY - barHeight * 1.5 + offsetY;
    context.beginPath();
    context.roundRect(x, y, barWidth, barHeight, radius);
    context.fill();
  }

  context.restore();
}

function drawMarkInRoundedSquare(
  context,
  size,
  backgroundColor,
  markColor,
  { insetRatio = 0.04 } = {},
) {
  const inset = size * insetRatio;
  const side = size - inset * 2;
  const radius = side * 0.24;

  context.clearRect(0, 0, size, size);
  context.fillStyle = backgroundColor;
  context.beginPath();
  context.roundRect(inset, inset, side, side, radius);
  context.fill();

  drawLayerStackMark(context, size / 2, size / 2, side * 0.58, markColor);
}

function writePng(canvas, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, canvas.toBuffer("image/png"));
  console.log(`Wrote ${outputPath}`);
}

function createTransparentIconMark(size = 512) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, size, size);
  drawLayerStackMark(context, size / 2, size / 2, size * 0.72, BRAND.ink);
  return canvas;
}

function createFaviconSource(size = 512) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext("2d");
  drawMarkInRoundedSquare(context, size, BRAND.signal, BRAND.white);
  return canvas;
}

function createHorizontalWordmark({
  height = 120,
  darkText = true,
  showBackground = false,
} = {}) {
  const canvas = createCanvas(720, height);
  const context = canvas.getContext("2d");

  if (showBackground) {
    context.fillStyle = BRAND.white;
    context.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  const iconSize = height * 0.72;
  const iconX = height * 0.14;
  const iconY = (height - iconSize) / 2;
  const markCanvas = createCanvas(iconSize, iconSize);
  const markContext = markCanvas.getContext("2d");
  drawMarkInRoundedSquare(markContext, iconSize, BRAND.signal, BRAND.white);
  context.drawImage(markCanvas, iconX, iconY, iconSize, iconSize);

  const text = "PutWatermark";
  const fontSize = Math.round(height * 0.34);
  context.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  context.fillStyle = darkText ? BRAND.night : BRAND.white;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(text, iconX + iconSize + height * 0.12, height / 2);

  return canvas;
}

const transparentIcon = createTransparentIconMark();
writePng(transparentIcon, join(publicDir, "Put Watermark - Icon.png"));
writePng(transparentIcon, join(picsDir, "Put Watermark - Icon.png"));

const faviconSource = createFaviconSource();
writePng(faviconSource, join(publicDir, "Icon.png"));

const wordmark = createHorizontalWordmark();
writePng(wordmark, join(publicDir, "pw-logo.png"));
writePng(wordmark, join(picsDir, "PW- Logo.png"));
writePng(wordmark, join(picsDir, "Put Watermark - Logo.png"));

console.log("\nBrand assets generated. Run: node scripts/generate-forced-export-stamp.mjs");
