/**
 * Generates public/forced-export-stamp.png — icon-only center stamp for client video
 * free exports (site text lives in the tiled background layer).
 * Run once (or when stamp art changes): node scripts/generate-forced-export-stamp.mjs
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconPath = join(root, "public", "Put Watermark - Icon.png");
const outputPath = join(root, "public", "forced-export-stamp.png");

const FORCED_WATERMARK_SITE_TEXT = "PutWatermark.com";
const FORCED_WATERMARK_TEXT_COLOR = "#ffffff";
const FORCED_WATERMARK_TEXT_STROKE = "rgba(0, 0, 0, 0.5)";
const FORCED_WATERMARK_ICON_LIGHT_HALO = "rgba(255, 255, 255, 0.85)";
const FORCED_WATERMARK_ICON_DARK_EDGE = "rgba(0, 0, 0, 0.55)";
const FONT_SIZE_SCALE = 200;

function drawWhiteIcon(context, logoImage, x, y, width, height) {
  const maskCanvas = createCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
  const maskContext = maskCanvas.getContext("2d");
  maskContext.drawImage(logoImage, 0, 0, width, height);
  maskContext.globalCompositeOperation = "source-in";
  maskContext.fillStyle = FORCED_WATERMARK_TEXT_COLOR;
  maskContext.fillRect(0, 0, width, height);
  context.drawImage(maskCanvas, x, y);
}

function drawStampIconWithOutline(context, logoImage, x, y, width, height) {
  const strokeWidth = Math.max(1, Math.round(width * 0.04));

  context.save();
  context.shadowColor = FORCED_WATERMARK_ICON_DARK_EDGE;
  context.shadowBlur = strokeWidth * 2.2;
  context.shadowOffsetY = Math.max(1, strokeWidth * 0.35);
  drawWhiteIcon(context, logoImage, x, y, width, height);
  context.restore();

  context.save();
  context.shadowColor = FORCED_WATERMARK_ICON_LIGHT_HALO;
  context.shadowBlur = strokeWidth * 1.6;
  context.shadowOffsetY = 0;
  drawWhiteIcon(context, logoImage, x, y, width, height);
  context.restore();

  drawWhiteIcon(context, logoImage, x, y, width, height);
}

function drawStampSiteText(context, x, y, fontSize) {
  context.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.lineJoin = "round";
  context.lineWidth = Math.max(1.5, fontSize / 10);
  context.strokeStyle = FORCED_WATERMARK_TEXT_STROKE;
  context.fillStyle = FORCED_WATERMARK_TEXT_COLOR;
  context.strokeText(FORCED_WATERMARK_SITE_TEXT, x, y);
  context.fillText(FORCED_WATERMARK_SITE_TEXT, x, y);
}

async function main() {
  const logoImage = await loadImage(iconPath);
  const iconBaseWidth = Math.round(56 * (FONT_SIZE_SCALE / 25));
  const iconAspect =
    logoImage.width > 0 ? logoImage.height / logoImage.width : 1;
  const iconHeight = iconBaseWidth * iconAspect;
  const fontSize = Math.max(7, Math.round(iconBaseWidth * 0.2));
  const textGap = Math.max(3, Math.round(iconBaseWidth * 0.1));
  const padding = 4;

  const measureCanvas = createCanvas(1, 1);
  const measureContext = measureCanvas.getContext("2d");
  measureContext.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const textWidth = measureContext.measureText(FORCED_WATERMARK_SITE_TEXT).width;
  const textHeight = fontSize * 1.15;
  const unitWidth = Math.ceil(Math.max(iconBaseWidth, textWidth) + padding * 2);
  const unitHeight = Math.ceil(iconHeight + textGap + textHeight + padding * 1.5);
  const scale = 2;

  const canvas = createCanvas(unitWidth * scale, unitHeight * scale);
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const iconX = (unitWidth - iconBaseWidth) / 2;
  const iconY = padding / 2;
  drawStampIconWithOutline(context, logoImage, iconX, iconY, iconBaseWidth, iconHeight);

  writeFileSync(outputPath, canvas.toBuffer("image/png"));
  console.log(`Wrote ${outputPath} (${unitWidth * scale}x${unitHeight * scale}px)`);
}

await main();
