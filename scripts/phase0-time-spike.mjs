/**
 * Phase 0 time-scoped watermark spike (text PNG + FFmpeg enable= timing).
 *
 * Part A — single clip: overlay visible only between t=15s and t=45s.
 * Part B — two-chunk join: visibility 50s–70s spans a 60s split; each
 *           chunk gets chunk-local enable= windows, then concat-copy.
 *
 * Usage: node scripts/phase0-time-spike.mjs
 */
import { spawn } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SPIKE_DIR = path.join(ROOT, "spike-phase0-time");
const INPUT_DIR = path.join(SPIKE_DIR, "input");
const ENCODED_DIR = path.join(SPIKE_DIR, "encoded");
const CHUNKS_DIR = path.join(SPIKE_DIR, "chunks");
const OUTPUT_DIR = path.join(SPIKE_DIR, "output");
const INSPECTION_DIR = path.join(OUTPUT_DIR, "inspection");

const FRAME_RATE = 24;
const SOURCE_DURATION_SECONDS = 120;
const OVERLAY_VISIBLE_START = 15;
const OVERLAY_VISIBLE_END = 45;

const CHUNK_SPLIT_SECONDS = 60;
const SPAN_VISIBLE_START = 50;
const SPAN_VISIBLE_END = 70;

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

async function ffprobeDurationSeconds(inputPath) {
  const stderr = await run(["-hide_banner", "-i", inputPath, "-f", "null", "-"]);
  const match = stderr.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Could not parse duration for ${inputPath}`);
  }

  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

async function formatBytes(filePath) {
  const { size } = await stat(filePath);
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

async function ensureTimedTestSource() {
  await mkdir(INPUT_DIR, { recursive: true });
  const sourcePath = path.join(INPUT_DIR, "timed-test-source.mp4");

  try {
    const existing = await stat(sourcePath);
    if (existing.size > 1_000_000) {
      const duration = await ffprobeDurationSeconds(sourcePath);
      if (Math.abs(duration - SOURCE_DURATION_SECONDS) <= 1) {
        return sourcePath;
      }
    }
  } catch {
    // generate below
  }

  console.log(
    `Generating ${SOURCE_DURATION_SECONDS}s 1080p source with frame counter...`,
  );
  await run([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `testsrc2=size=1920x1080:rate=${FRAME_RATE}`,
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=48000",
    "-vf",
    [
      "drawtext=text='FRAME %{n}':x=60:y=60:fontsize=72:fontcolor=white:box=1:boxcolor=black@0.55",
      "drawtext=text='TIME %{pts\\:hms}':x=60:y=160:fontsize=56:fontcolor=yellow:box=1:boxcolor=black@0.55",
      "drawtext=text='Phase 0 time spike':x=60:y=260:fontsize=40:fontcolor=cyan",
    ].join(","),
    "-t",
    String(SOURCE_DURATION_SECONDS),
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "18",
    "-g",
    String(FRAME_RATE * 2),
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    sourcePath,
  ]);

  return sourcePath;
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
      "drawtext=text='PutWatermark TIMED':fontsize=48:fontcolor=black@0.85:x=(w-text_w)/2:y=h-84",
      "drawtext=text='VISIBLE WINDOW TEST':fontsize=30:fontcolor=black@0.65:x=(w-text_w)/2:y=h-36",
    ].join(","),
    "-frames:v",
    "1",
    "-update",
    "1",
    overlayPath,
  ]);
}

async function productionTimedOverlayEncode({
  enableExpression,
  inputPath,
  outputPath,
  overlayPath,
}) {
  await run([
    "-y",
    "-i",
    inputPath,
    "-i",
    overlayPath,
    "-filter_complex",
    `[0:v][1:v]overlay=0:0:enable='${enableExpression}'`,
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
  ]);
}

async function streamCopySplit(inputPath, splitSeconds) {
  await mkdir(CHUNKS_DIR, { recursive: true });
  const chunk1Path = path.join(CHUNKS_DIR, "chunk-01.mp4");
  const chunk2Path = path.join(CHUNKS_DIR, "chunk-02.mp4");

  await run([
    "-y",
    "-i",
    inputPath,
    "-to",
    String(splitSeconds),
    "-c",
    "copy",
    "-avoid_negative_ts",
    "make_zero",
    "-reset_timestamps",
    "1",
    chunk1Path,
  ]);

  await run([
    "-y",
    "-i",
    inputPath,
    "-ss",
    String(splitSeconds),
    "-c",
    "copy",
    "-avoid_negative_ts",
    "make_zero",
    "-reset_timestamps",
    "1",
    chunk2Path,
  ]);

  return { chunk1Path, chunk2Path };
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

async function measureWatermarkTextRegionSize(videoPath, timestampSeconds) {
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
      "crop=400:40:760:980",
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
  timestampSeconds,
  videoPath,
}) {
  const jpegBytes = await measureWatermarkTextRegionSize(
    videoPath,
    timestampSeconds,
  );

  const visible = jpegBytes > 1500;
  if (visible !== expectVisible) {
    throw new Error(
      `${label} @ ${timestampSeconds}s: expected overlay ${expectVisible ? "visible" : "hidden"}, jpegBytes=${jpegBytes}`,
    );
  }

  return jpegBytes;
}

function computeChunkLocalEnableWindow({
  chunkDurationSeconds,
  chunkStartSeconds,
  visibleEndSeconds,
  visibleStartSeconds,
}) {
  const windowStart = Math.max(visibleStartSeconds, chunkStartSeconds);
  const windowEnd = Math.min(
    visibleEndSeconds,
    chunkStartSeconds + chunkDurationSeconds,
  );

  if (windowStart >= windowEnd) {
    return null;
  }

  return {
    localEnd: windowEnd - chunkStartSeconds,
    localStart: windowStart - chunkStartSeconds,
  };
}

function buildBetweenExpression(startSeconds, endSeconds) {
  return `between(t,${startSeconds},${endSeconds})`;
}

async function runPartA(sourcePath, overlayPath) {
  console.log("\n=== Part A: single-clip timed overlay ===");
  await mkdir(ENCODED_DIR, { recursive: true });
  await mkdir(INSPECTION_DIR, { recursive: true });

  const outputPath = path.join(OUTPUT_DIR, "part-a-timed-single.mp4");
  const enableExpression = buildBetweenExpression(
    OVERLAY_VISIBLE_START,
    OVERLAY_VISIBLE_END,
  );

  console.log(`enable='${enableExpression}'`);
  const startedAt = Date.now();
  await productionTimedOverlayEncode({
    enableExpression,
    inputPath: sourcePath,
    outputPath,
    overlayPath,
  });
  console.log(
    `Encoded in ${((Date.now() - startedAt) / 1000).toFixed(1)}s (${await formatBytes(outputPath)})`,
  );

  const checks = [
    { expectVisible: false, label: "before window", t: 10 },
    { expectVisible: true, label: "inside window", t: 30 },
    { expectVisible: true, label: "inside window (late)", t: 44 },
    { expectVisible: false, label: "after window", t: 55 },
  ];

  const measurements = [];
  for (const check of checks) {
    const framePath = path.join(
      INSPECTION_DIR,
      `part-a_${check.label.replace(/\s+/g, "-")}_${check.t}s.jpg`,
    );
    await extractFrame(outputPath, check.t, framePath);
    const jpegBytes = await assertOverlayVisibility({
      expectVisible: check.expectVisible,
      label: check.label,
      timestampSeconds: check.t,
      videoPath: outputPath,
    });
    measurements.push({ ...check, framePath, jpegBytes });
    console.log(
      `  ${check.label} @ ${check.t}s → jpegBytes ${jpegBytes} (${check.expectVisible ? "visible" : "hidden"} OK)`,
    );
  }

  return {
    enableExpression,
    measurements,
    outputPath,
  };
}

async function runPartB(sourcePath, overlayPath) {
  console.log("\n=== Part B: two-chunk timed overlay spanning split ===");
  await mkdir(ENCODED_DIR, { recursive: true });
  await mkdir(INSPECTION_DIR, { recursive: true });

  const { chunk1Path, chunk2Path } = await streamCopySplit(
    sourcePath,
    CHUNK_SPLIT_SECONDS,
  );
  const chunk1Duration = await ffprobeDurationSeconds(chunk1Path);
  const chunk2Duration = await ffprobeDurationSeconds(chunk2Path);
  console.log(
    `Split @ ${CHUNK_SPLIT_SECONDS}s → chunks ${chunk1Duration.toFixed(3)}s + ${chunk2Duration.toFixed(3)}s`,
  );

  const chunk1Window = computeChunkLocalEnableWindow({
    chunkDurationSeconds: chunk1Duration,
    chunkStartSeconds: 0,
    visibleEndSeconds: SPAN_VISIBLE_END,
    visibleStartSeconds: SPAN_VISIBLE_START,
  });
  const chunk2Window = computeChunkLocalEnableWindow({
    chunkDurationSeconds: chunk2Duration,
    chunkStartSeconds: CHUNK_SPLIT_SECONDS,
    visibleEndSeconds: SPAN_VISIBLE_END,
    visibleStartSeconds: SPAN_VISIBLE_START,
  });

  if (!chunk1Window || !chunk2Window) {
    throw new Error("Timed window did not intersect both chunks as expected.");
  }

  const chunk1Enable = buildBetweenExpression(
    chunk1Window.localStart,
    chunk1Window.localEnd,
  );
  const chunk2Enable = buildBetweenExpression(
    chunk2Window.localStart,
    chunk2Window.localEnd,
  );

  console.log(
    `Chunk 1 enable='${chunk1Enable}' (global ${SPAN_VISIBLE_START}-${CHUNK_SPLIT_SECONDS}s)`,
  );
  console.log(
    `Chunk 2 enable='${chunk2Enable}' (global ${CHUNK_SPLIT_SECONDS}-${SPAN_VISIBLE_END}s)`,
  );

  const encoded1Path = path.join(ENCODED_DIR, "chunk-01-timed.mp4");
  const encoded2Path = path.join(ENCODED_DIR, "chunk-02-timed.mp4");

  await productionTimedOverlayEncode({
    enableExpression: chunk1Enable,
    inputPath: chunk1Path,
    outputPath: encoded1Path,
    overlayPath,
  });
  await productionTimedOverlayEncode({
    enableExpression: chunk2Enable,
    inputPath: chunk2Path,
    outputPath: encoded2Path,
    overlayPath,
  });

  const concatListPath = path.join(SPIKE_DIR, "concat-list.txt");
  await writeFile(
    concatListPath,
    [
      `file '${encoded1Path.replace(/\\/g, "/")}'`,
      `file '${encoded2Path.replace(/\\/g, "/")}'`,
    ].join("\n"),
    "utf8",
  );

  const finalPath = path.join(OUTPUT_DIR, "part-b-timed-chunk-join.mp4");
  await run([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-c",
    "copy",
    finalPath,
  ]);

  const sourceDuration = await ffprobeDurationSeconds(sourcePath);
  const finalDuration = await ffprobeDurationSeconds(finalPath);
  const durationDelta = finalDuration - sourceDuration;

  const checks = [
    { expectVisible: false, label: "before span", t: 45 },
    { expectVisible: true, label: "inside span (chunk1)", t: 55 },
    { expectVisible: true, label: "inside span (chunk2)", t: 65 },
    { expectVisible: false, label: "after span", t: 75 },
    { expectVisible: true, label: "join boundary before (still in span)", t: 59.5 },
    { expectVisible: true, label: "join boundary after (still in span)", t: 60.5 },
    { expectVisible: false, label: "just before span", t: 49 },
    { expectVisible: false, label: "just after span", t: 71 },
  ];

  const measurements = [];
  for (const check of checks) {
    const framePath = path.join(
      INSPECTION_DIR,
      `part-b_${check.label.replace(/[^\w.-]+/g, "-")}_${check.t}s.jpg`,
    );
    await extractFrame(finalPath, check.t, framePath);
    const jpegBytes = await assertOverlayVisibility({
      expectVisible: check.expectVisible,
      label: check.label,
      timestampSeconds: check.t,
      videoPath: finalPath,
    });
    measurements.push({ ...check, framePath, jpegBytes });
    console.log(
      `  ${check.label} @ ${check.t}s → jpegBytes ${jpegBytes} (${check.expectVisible ? "visible" : "hidden"} OK)`,
    );
  }

  return {
    chunk1Enable,
    chunk2Enable,
    chunk1Window,
    chunk2Window,
    durationDelta,
    finalDuration,
    finalPath,
    measurements,
    sourceDuration,
  };
}

async function main() {
  await mkdir(SPIKE_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const sourcePath = await ensureTimedTestSource();
  const sourceDuration = await ffprobeDurationSeconds(sourcePath);
  const overlayPath = path.join(SPIKE_DIR, "overlay-timed-rgba.png");

  console.log(`Source: ${sourcePath} (${sourceDuration.toFixed(3)}s)`);
  await createTimedOverlayPng(overlayPath, 1920, 1080);
  console.log(`Overlay: ${overlayPath}`);

  const partA = await runPartA(sourcePath, overlayPath);
  const partB = await runPartB(sourcePath, overlayPath);

  const report = {
    generatedAt: new Date().toISOString(),
    partA: {
      enableExpression: partA.enableExpression,
      measurements: partA.measurements,
      outputPath: partA.outputPath,
      window: {
        end: OVERLAY_VISIBLE_END,
        start: OVERLAY_VISIBLE_START,
      },
    },
    partB: {
      chunk1Enable: partB.chunk1Enable,
      chunk2Enable: partB.chunk2Enable,
      chunk1Window: partB.chunk1Window,
      chunk2Window: partB.chunk2Window,
      durationDeltaSeconds: partB.durationDelta,
      finalDurationSeconds: partB.finalDuration,
      measurements: partB.measurements,
      outputPath: partB.finalPath,
      sourceDurationSeconds: partB.sourceDuration,
      splitSeconds: CHUNK_SPLIT_SECONDS,
      visibleWindow: {
        end: SPAN_VISIBLE_END,
        start: SPAN_VISIBLE_START,
      },
    },
    pass: true,
    settings: {
      encode:
        "libx264 preset fast crf 22 yuv420p + aac 128k + rgba overlay + enable=between(t,...)",
      overlayTextRegionCrop: "400x40 center-bottom text band, jpegBytes threshold 1500",
    },
  };

  const reportPath = path.join(OUTPUT_DIR, "phase0-time-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\n=== Phase 0 time spike PASSED ===");
  console.log(`Part A output: ${partA.outputPath}`);
  console.log(`Part B output: ${partB.finalPath}`);
  console.log(
    `Part B duration delta: ${partB.durationDelta >= 0 ? "+" : ""}${partB.durationDelta.toFixed(3)}s`,
  );
  console.log(`Report: ${reportPath}`);
}

main().catch((error) => {
  console.error("\n=== Phase 0 time spike FAILED ===");
  console.error(error);
  process.exitCode = 1;
});
