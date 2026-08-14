import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  shouldApplyForcedWatermarkForClientVideoExport,
  shouldApplyForcedWatermarkForPhotoExport,
  wouldReceiveWatermarkedExport,
  type WatermarkedExportUpsellContext,
} from "../src/lib/exportUpsellEligibility";
import { getVideoExportRoute } from "../src/lib/videoExportLimits";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconPath = join(root, "public", "Put Watermark - Icon.png");
const outputPath = join(
  root,
  "public",
  "previews",
  "client-video-forced-watermark-test.jpg",
);

function qualifiesForCleanExport({
  balance,
  cost,
  fileType,
  videoServerRouted,
}: {
  balance: number;
  cost: number;
  fileType: "photo" | "pdf" | "video" | "signature";
  videoServerRouted?: boolean;
}) {
  if (fileType === "video" && !videoServerRouted && cost === 0) {
    return balance > 0;
  }

  return balance >= cost;
}

function shouldApplyForcedWatermarkForClientVideo({
  authTier,
  creditBalance,
  exportRoute,
  resolvedBalance,
}: {
  authTier: "clean" | "watermarked";
  creditBalance: number | null;
  exportRoute: ReturnType<typeof getVideoExportRoute>;
  resolvedBalance?: number | null;
}) {
  return shouldApplyForcedWatermarkForClientVideoExport({
    authTier,
    creditBalance,
    exportRoute,
    resolvedBalance,
  });
}

function averageChannel(
  context: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const { data } = context.getImageData(x, y, width, height);
  let total = 0;

  for (let index = 0; index < data.length; index += 4) {
    total += data[index]! + data[index + 1]! + data[index + 2]!;
  }

  return total / (data.length / 4) / 3;
}

function createMockForcedSettings(userText: string) {
  return {
    textLayers: [
      {
        id: "text-1",
        text: userText,
      },
    ],
  };
}

async function renderClientVideoOverlayPreview(
  compositeImage: Awaited<ReturnType<typeof loadImage>>,
  userText: string,
) {
  const width = 1280;
  const height = 720;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#dbeafe");
  gradient.addColorStop(1, "#fce7f3");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const settings = createMockForcedSettings(userText);

  context.save();
  context.font = "600 36px sans-serif";
  context.textAlign = "right";
  context.textBaseline = "bottom";
  context.globalAlpha = 0.72;
  context.fillStyle = "#111827";
  context.fillText(userText, width * 0.9, height * 0.92);
  context.restore();

  const stampWidth = width * 0.34;
  const stampHeight = stampWidth * 0.45;
  context.save();
  context.globalAlpha = 0.44;
  context.drawImage(
    compositeImage,
    width / 2 - stampWidth / 2,
    height / 2 - stampHeight / 2,
    stampWidth,
    stampHeight,
  );
  context.restore();

  return { canvas, context, height, settings, width };
}

async function main() {
  const clientRoute = getVideoExportRoute(45, 1280, 720, 12 * 1024 * 1024);
  assert.equal(clientRoute, "client");

  const zeroBalanceContext: WatermarkedExportUpsellContext = {
    creditBalance: 0,
    estimatedExportCost: 0,
    fileType: "video",
    isAuthenticated: true,
    videoServerRouted: false,
  };

  assert.equal(
    qualifiesForCleanExport({
      balance: 0,
      cost: 0,
      fileType: "video",
      videoServerRouted: false,
    }),
    false,
    "zero-balance client video should not qualify for clean export",
  );
  assert.equal(
    qualifiesForCleanExport({
      balance: 50,
      cost: 0,
      fileType: "video",
      videoServerRouted: false,
    }),
    true,
    "paid-balance client video should qualify for clean export",
  );
  assert.equal(
    wouldReceiveWatermarkedExport(zeroBalanceContext),
    true,
    "zero-balance client video should receive forced watermark upsell",
  );
  assert.equal(
    shouldApplyForcedWatermarkForClientVideo({
      authTier: "watermarked",
      creditBalance: 0,
      exportRoute: "client",
    }),
    true,
  );
  assert.equal(
    shouldApplyForcedWatermarkForClientVideo({
      authTier: "clean",
      creditBalance: 0,
      exportRoute: "client",
      resolvedBalance: 0,
    }),
    true,
    "zero-balance client video with clean auth tier still needs forced stamp",
  );

  assert.equal(
    shouldApplyForcedWatermarkForPhotoExport({
      authTier: "watermarked",
      creditBalance: 0,
    }),
    true,
    "watermarked photo export always needs forced stamp",
  );
  assert.equal(
    shouldApplyForcedWatermarkForPhotoExport({
      authTier: "clean",
      creditBalance: 0,
      resolvedBalance: 0,
    }),
    true,
    "zero-balance photo export needs forced stamp even if auth tier is clean",
  );
  assert.equal(
    shouldApplyForcedWatermarkForPhotoExport({
      authTier: "clean",
      creditBalance: 500,
      resolvedBalance: 500,
    }),
    false,
    "paid photo export with clean tier skips forced stamp",
  );
  assert.equal(
    wouldReceiveWatermarkedExport({
      creditBalance: 0,
      estimatedExportCost: 150,
      fileType: "photo",
      isAuthenticated: true,
    }),
    true,
    "zero-balance batch photo upsell should offer watermarked export",
  );

  const buggyUpsellContext: WatermarkedExportUpsellContext = {
    creditBalance: 0,
    estimatedExportCost: 0,
    fileType: "video",
    isAuthenticated: true,
    videoServerRouted: true,
  };
  assert.equal(
    wouldReceiveWatermarkedExport(buggyUpsellContext),
    false,
    "server-routed upsell context suppresses watermarked upsell",
  );
  assert.equal(
    shouldApplyForcedWatermarkForClientVideo({
      authTier: "clean",
      creditBalance: 0,
      exportRoute: "client",
      resolvedBalance: 0,
    }),
    true,
    "client export route must not rely on buggy upsell context",
  );
  assert.equal(
    shouldApplyForcedWatermarkForClientVideo({
      authTier: "clean",
      creditBalance: 100,
      exportRoute: "client",
      resolvedBalance: 100,
    }),
    false,
    "paid client video should not apply forced watermark",
  );

  const logo = await loadImage(iconPath);
  const measureCanvas = createCanvas(400, 200);
  const measureContext = measureCanvas.getContext("2d");
  measureContext.font = "600 28px sans-serif";
  const textWidth = measureContext.measureText("PutWatermark.com").width;
  const compositeCanvas = createCanvas(
    Math.ceil(Math.max(180, textWidth + 40)),
    120,
  );
  const compositeContext = compositeCanvas.getContext("2d");
  compositeContext.drawImage(logo, 62, 8, 56, 56);
  compositeContext.font = "600 28px sans-serif";
  compositeContext.textAlign = "center";
  compositeContext.fillStyle = "#ffffff";
  compositeContext.strokeStyle = "rgba(0,0,0,0.5)";
  compositeContext.lineWidth = 2;
  compositeContext.strokeText("PutWatermark.com", compositeCanvas.width / 2, 96);
  compositeContext.fillText("PutWatermark.com", compositeCanvas.width / 2, 96);

  const userText = "© Your Brand Studio";
  const { canvas, context, height, width } = await renderClientVideoOverlayPreview(
    compositeCanvas as unknown as Awaited<ReturnType<typeof loadImage>>,
    userText,
  );

  const centerBrightness = averageChannel(
    context,
    Math.floor(width * 0.35),
    Math.floor(height * 0.35),
    Math.floor(width * 0.3),
    Math.floor(height * 0.3),
  );
  const cornerBrightness = averageChannel(
    context,
    Math.floor(width * 0.72),
    Math.floor(height * 0.82),
    Math.floor(width * 0.22),
    Math.floor(height * 0.12),
  );
  const blankBrightness = averageChannel(
    context,
    40,
    40,
    120,
    80,
  );

  assert.ok(
    Math.abs(centerBrightness - cornerBrightness) > 1.5,
    "center stamp and user watermark corner should render different regions",
  );
  assert.ok(
    cornerBrightness < blankBrightness - 2,
    "user watermark corner should be darker than blank background",
  );

  writeFileSync(outputPath, canvas.toBuffer("image/jpeg", 92));

  console.log("Client video forced-watermark tests passed.");
  console.log(`Wrote overlay verification image to ${outputPath}`);
}

await main();
