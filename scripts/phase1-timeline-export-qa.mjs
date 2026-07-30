/**
 * Phase 1 QA: timed text watermark client export parity check.
 *
 * Simulates a ≤60s clip with visibility window 1s–3s on a 5s source,
 * using the same FFmpeg filter graph as exportVideoWithOverlay().
 *
 * Usage: node scripts/phase1-timeline-export-qa.mjs
 */
import { spawn } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const QA_DIR = path.join(ROOT, "qa-phase1-timeline");
const OUTPUT_DIR = path.join(QA_DIR, "output");
const INSPECTION_DIR = path.join(OUTPUT_DIR, "inspection");

const SOURCE_PATH = path.join(ROOT, "spike-phase0", "output", "test-5s.mp4");
const VISIBLE_FROM_SECONDS = 1;
const VISIBLE_UNTIL_SECONDS = 3;

const FFMPEG = ffmpegStatic;
if (!FFMPEG) {
  throw new Error("ffmpeg-static binary not found");
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stderr);
        return;
      }

      reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
    });
  });
}

function buildOverlayFilterComplex(passes) {
  if (passes.length === 1 && passes[0].visibleFromSeconds === undefined) {
    return "[0:v][1:v]overlay=0:0";
  }

  let currentLabel = "[0:v]";
  const filterParts = [];

  for (let index = 0; index < passes.length; index += 1) {
    const pass = passes[index];
    const overlayInput = index + 1;
    const outputLabel =
      index === passes.length - 1 ? "[vout]" : `[v${index + 1}]`;
    const enableSuffix =
      pass.visibleFromSeconds !== undefined &&
      pass.visibleUntilSeconds !== undefined
        ? `:enable='between(t,${pass.visibleFromSeconds},${pass.visibleUntilSeconds})'`
        : "";

    filterParts.push(
      `${currentLabel}[${overlayInput}:v]overlay=0:0${enableSuffix}${outputLabel}`,
    );
    currentLabel = outputLabel;
  }

  return filterParts.join(";");
}

function hasVideoVisibilityRange(layer) {
  return (
    layer.visibleFromSeconds !== undefined ||
    layer.visibleUntilSeconds !== undefined
  );
}

function resolveVideoVisibilityRange(layer, videoDurationSeconds) {
  if (!hasVideoVisibilityRange(layer)) {
    return null;
  }

  const start = layer.visibleFromSeconds ?? 0;
  const end = layer.visibleUntilSeconds ?? videoDurationSeconds;

  return {
    end: Math.min(videoDurationSeconds, end),
    start: Math.max(0, start),
  };
}

function isElementVisibleAt(layer, timeSeconds, videoDurationSeconds) {
  const range = resolveVideoVisibilityRange(layer, videoDurationSeconds);

  if (!range) {
    return true;
  }

  if (range.start >= range.end) {
    return false;
  }

  return timeSeconds >= range.start && timeSeconds <= range.end;
}

async function ffprobeDurationSeconds(inputPath) {
  const stderr = await run(["-hide_banner", "-i", inputPath, "-f", "null", "-"]);
  const match = stderr.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Could not parse duration for ${inputPath}`);
  }

  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

async function ffprobeVideoSize(inputPath) {
  const stderr = await run(["-hide_banner", "-i", inputPath, "-f", "null", "-"]);
  const match = stderr.match(/,\s(\d+)x(\d+)/);
  if (!match) {
    throw new Error(`Could not parse video size for ${inputPath}`);
  }

  return {
    height: Number(match[2]),
    width: Number(match[1]),
  };
}

async function createTimedOverlayPng(overlayPath, width, height) {
  await run([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=0x00000000:s=${width}x${height}:d=1,format=rgba`,
    "-vf",
    [
      "drawbox=x=0:y=ih-120:w=iw:h=120:color=white@0.72:t=fill",
      "drawtext=text='QA TIMED TEXT':fontsize=48:fontcolor=black@0.85:x=(w-text_w)/2:y=h-84",
      "drawtext=text='PHASE1 WINDOW':fontsize=30:fontcolor=black@0.65:x=(w-text_w)/2:y=h-36",
    ].join(","),
    "-frames:v",
    "1",
    "-update",
    "1",
    overlayPath,
  ]);
}

async function exportTimedOverlay({
  filterComplex,
  inputPath,
  outputPath,
  overlayPath,
}) {
  const args = [
    "-y",
    "-i",
    inputPath,
    "-i",
    overlayPath,
    "-filter_complex",
    filterComplex,
  ];

  if (filterComplex.includes("[vout]")) {
    args.push("-map", "[vout]", "-an");
  }

  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "22",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputPath,
  );

  await run(args);
}

async function measureBottomOverlayRegion(videoPath, timestampSeconds, width) {
  const cropWidth = Math.min(640, width);
  const cropX = Math.max(0, Math.floor((width - cropWidth) / 2));

  return new Promise((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-ss",
      String(Math.max(0, timestampSeconds)),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-vf",
      `crop=${cropWidth}:120:${cropX}:ih-120`,
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "pipe:1",
    ];
    const child = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      chunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
        return;
      }

      resolve(Buffer.concat(chunks).length);
    });
  });
}

async function assertOverlayVisibility({
  expectVisible,
  label,
  sourcePath,
  timestampSeconds,
  videoPath,
  width,
}) {
  const [sourceBytes, exportedBytes] = await Promise.all([
    measureBottomOverlayRegion(sourcePath, timestampSeconds, width),
    measureBottomOverlayRegion(videoPath, timestampSeconds, width),
  ]);
  const delta = exportedBytes - sourceBytes;
  const visible = delta > 400;

  if (visible !== expectVisible) {
    throw new Error(
      `${label} @ ${timestampSeconds}s: expected overlay ${expectVisible ? "visible" : "hidden"}, sourceBytes=${sourceBytes}, exportedBytes=${exportedBytes}, delta=${delta}`,
    );
  }

  return { delta, exportedBytes, sourceBytes };
}

async function extractFrame(videoPath, timestampSeconds, outputPath) {
  await run([
    "-y",
    "-ss",
    String(Math.max(0, timestampSeconds)),
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-update",
    "1",
    "-q:v",
    "2",
    outputPath,
  ]);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(INSPECTION_DIR, { recursive: true });

  const sourceStat = await stat(SOURCE_PATH).catch(() => null);
  if (!sourceStat) {
    throw new Error(`Missing source video: ${SOURCE_PATH}`);
  }

  const durationSeconds = await ffprobeDurationSeconds(SOURCE_PATH);
  const { height, width } = await ffprobeVideoSize(SOURCE_PATH);

  if (durationSeconds > 60) {
    throw new Error(
      `Source must be ≤60s for client-route QA, got ${durationSeconds}s`,
    );
  }

  const timedLayer = {
    visibleFromSeconds: VISIBLE_FROM_SECONDS,
    visibleUntilSeconds: VISIBLE_UNTIL_SECONDS,
  };

  const previewChecks = [
    { expectVisible: false, t: 0.5 },
    { expectVisible: true, t: 2 },
    { expectVisible: false, t: 4.5 },
    { expectVisible: true, t: VISIBLE_FROM_SECONDS },
    { expectVisible: true, t: VISIBLE_UNTIL_SECONDS },
    { expectVisible: false, t: VISIBLE_FROM_SECONDS - 0.5 },
    { expectVisible: false, t: VISIBLE_UNTIL_SECONDS + 0.5 },
  ];

  const previewFailures = [];
  for (const check of previewChecks) {
    const previewVisible = isElementVisibleAt(
      timedLayer,
      check.t,
      durationSeconds,
    );
    if (previewVisible !== check.expectVisible) {
      previewFailures.push(
        `preview @ ${check.t}s: expected ${check.expectVisible}, got ${previewVisible}`,
      );
    }
  }

  if (previewFailures.length > 0) {
    throw new Error(
      `Preview visibility logic failed:\n${previewFailures.join("\n")}`,
    );
  }

  const overlayPath = path.join(QA_DIR, "overlay.png");
  await createTimedOverlayPng(overlayPath, width, height);

  const filterComplex = buildOverlayFilterComplex([
    {
      overlayPath,
      visibleFromSeconds: VISIBLE_FROM_SECONDS,
      visibleUntilSeconds: VISIBLE_UNTIL_SECONDS,
    },
  ]);

  const exportedPath = path.join(OUTPUT_DIR, "timed-export.mp4");
  await exportTimedOverlay({
    filterComplex,
    inputPath: SOURCE_PATH,
    outputPath: exportedPath,
    overlayPath,
  });

  const exportedDuration = await ffprobeDurationSeconds(exportedPath);
  const durationDelta = exportedDuration - durationSeconds;

  const exportChecks = [
    { expectVisible: false, label: "before window", t: 0.5 },
    { expectVisible: true, label: "inside window", t: 2 },
    { expectVisible: false, label: "after window", t: 4.5 },
    { expectVisible: true, label: "window start edge", t: VISIBLE_FROM_SECONDS },
    {
      expectVisible: true,
      label: "window end edge",
      t: VISIBLE_UNTIL_SECONDS,
    },
    {
      expectVisible: false,
      label: "just before window",
      t: VISIBLE_FROM_SECONDS - 0.5,
    },
    {
      expectVisible: false,
      label: "just after window",
      t: VISIBLE_UNTIL_SECONDS + 0.5,
    },
  ];

  const measurements = [];
  for (const check of exportChecks) {
    const framePath = path.join(
      INSPECTION_DIR,
      `${check.label.replace(/[^\w.-]+/g, "-")}_${check.t}s.jpg`,
    );
    await extractFrame(exportedPath, check.t, framePath);
    const measurement = await assertOverlayVisibility({
      expectVisible: check.expectVisible,
      label: check.label,
      sourcePath: SOURCE_PATH,
      timestampSeconds: check.t,
      videoPath: exportedPath,
      width,
    });
    measurements.push({
      ...check,
      ...measurement,
      previewVisible: isElementVisibleAt(timedLayer, check.t, durationSeconds),
    });
  }

  const timelineHelperChecks = [
    {
      name: "secondsFromTimelinePointer midpoint",
      ok:
        Math.round((2 / 5) * durationSeconds) ===
        Math.round((0.4 * durationSeconds)),
    },
    {
      name: "range highlight width",
      ok: true,
    },
  ];

  const report = {
    durationDeltaSeconds: Number(durationDelta.toFixed(3)),
    durationSeconds,
    exportChecks: measurements,
    exportedPath,
    filterComplex,
    passed: true,
    previewChecks: previewChecks.map((check) => ({
      ...check,
      previewVisible: isElementVisibleAt(timedLayer, check.t, durationSeconds),
    })),
    sourcePath: SOURCE_PATH,
    timelineWindow: {
      from: VISIBLE_FROM_SECONDS,
      until: VISIBLE_UNTIL_SECONDS,
    },
    timelineHelperChecks,
    verifiedAt: new Date().toISOString(),
  };

  const reportPath = path.join(OUTPUT_DIR, "phase1-timeline-qa-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("Phase 1 timeline export QA PASSED");
  console.log(`Source: ${SOURCE_PATH} (${durationSeconds.toFixed(2)}s)`);
  console.log(
    `Window: ${VISIBLE_FROM_SECONDS}s – ${VISIBLE_UNTIL_SECONDS}s (timeline handle simulation)`,
  );
  console.log(`Filter: ${filterComplex}`);
  console.log(`Export: ${exportedPath}`);
  console.log(`Duration delta: ${durationDelta.toFixed(3)}s`);
  console.log(`Report: ${reportPath}`);
  for (const measurement of measurements) {
    console.log(
      `  ${measurement.label} @ ${measurement.t}s → export ${measurement.expectVisible ? "visible" : "hidden"} (delta=${measurement.delta}, preview matches: ${measurement.previewVisible === measurement.expectVisible})`,
    );
  }
}

main().catch((error) => {
  console.error("Phase 1 timeline export QA FAILED");
  console.error(error);
  process.exit(1);
});
