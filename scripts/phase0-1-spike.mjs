/**
 * Phase 0.1 spike: fixed stream-copy split + continuous-motion source.
 * - Split: -i first, chunk1 uses -to, chunk2 uses -ss AFTER -i, reset timestamps
 * - Source: generates frame-counter test video if missing (15 min, 1080p, 24fps)
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SPIKE_DIR = path.join(ROOT, "spike-phase0-1");
const INPUT_DIR = path.join(SPIKE_DIR, "input");
const CHUNKS_DIR = path.join(SPIKE_DIR, "chunks");
const ENCODED_DIR = path.join(SPIKE_DIR, "encoded");
const OUTPUT_DIR = path.join(SPIKE_DIR, "output");
const INSPECTION_DIR = path.join(OUTPUT_DIR, "join-inspection");

const SOURCE_PATH = path.join(INPUT_DIR, "phase01-continuous-source.mp4");
const SOURCE_DURATION_SECONDS = 900;
const FRAME_RATE = 24;
const FRAME_TOLERANCE_SECONDS = 1 / FRAME_RATE;

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
      if (code === 0) resolve(stderr);
      else reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
    });
  });
}

async function ffprobeDurationSeconds(inputPath) {
  const stderr = await run(["-hide_banner", "-i", inputPath, "-f", "null", "-"]);
  const match = stderr.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`Could not parse duration for ${inputPath}`);
  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

async function ffprobeVideoFrameCount(inputPath) {
  const stderr = await run([
    "-hide_banner",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-c",
    "copy",
    "-f",
    "null",
    "-",
  ]);
  const match = stderr.match(/frame=\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

async function listKeyframeTimes(inputPath) {
  const stderr = await run([
    "-hide_banner",
    "-i",
    inputPath,
    "-vf",
    "select='eq(pict_type,I)',showinfo",
    "-vsync",
    "vfr",
    "-f",
    "null",
    "-",
  ]);
  const times = [];
  for (const line of stderr.split("\n")) {
    const match = line.match(/pts_time:([0-9.]+)/);
    if (match) times.push(Number(match[1]));
  }
  if (!times.length) throw new Error("No keyframes found");
  return times;
}

function pickSplitKeyframe(keyframes, durationSeconds) {
  const target = durationSeconds / 2;
  let best = keyframes[0];
  for (const time of keyframes) {
    if (time <= target && time >= best) best = time;
  }
  if (best < target) {
    for (const time of keyframes) {
      if (time >= target) return time;
    }
  }
  return best;
}

async function formatBytes(filePath) {
  const { size } = await stat(filePath);
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function ensureContinuousSource() {
  await mkdir(INPUT_DIR, { recursive: true });
  try {
    const existing = await stat(SOURCE_PATH);
    if (existing.size > 10_000_000) {
      console.log(`Using existing source: ${SOURCE_PATH}`);
      return;
    }
  } catch {
    // generate below
  }

  console.log(
    `Generating ${SOURCE_DURATION_SECONDS}s continuous-motion source with frame counter...`,
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
      "drawtext=text='Phase 0.1 continuous test':x=60:y=260:fontsize=40:fontcolor=cyan",
    ].join(","),
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "18",
    "-g",
    String(FRAME_RATE * 2),
    "-keyint_min",
    String(FRAME_RATE * 2),
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-t",
    String(SOURCE_DURATION_SECONDS),
    "-shortest",
    SOURCE_PATH,
  ]);
}

async function streamCopySplit(inputPath, splitTime) {
  const chunk1Path = path.join(CHUNKS_DIR, "chunk-01.mp4");
  const chunk2Path = path.join(CHUNKS_DIR, "chunk-02.mp4");

  console.log("\n[1/4] Stream-copy split (accurate: -i first, -ss after -i for chunk 2)...");
  await run([
    "-y",
    "-i",
    inputPath,
    "-to",
    String(splitTime),
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
    String(splitTime),
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

async function createOverlayPng(overlayPath, width, height) {
  await run([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=0x00000000:s=${width}x${height}:d=1,format=rgba`,
    "-vf",
    "drawtext=text='PutWatermark Phase 0.1':fontsize=42:fontcolor=white@0.55:x=(w-text_w)/2:y=h-96,drawtext=text='CONFIDENTIAL':fontsize=28:fontcolor=white@0.35:x=48:y=48",
    "-frames:v",
    "1",
    "-update",
    "1",
    overlayPath,
  ]);
}

async function productionOverlayEncode(inputPath, overlayPath, outputPath) {
  await run([
    "-y",
    "-i",
    inputPath,
    "-i",
    overlayPath,
    "-filter_complex",
    "[0:v][1:v]overlay=0:0",
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

async function getFrameTimes(videoPath, startSeconds, durationSeconds) {
  const stderr = await run([
    "-hide_banner",
    "-ss",
    String(startSeconds),
    "-t",
    String(durationSeconds),
    "-i",
    videoPath,
    "-vf",
    "showinfo",
    "-vsync",
    "vfr",
    "-f",
    "null",
    "-",
  ]);
  const times = [];
  for (const line of stderr.split("\n")) {
    const match = line.match(/pts_time:([0-9.]+)/);
    if (match) times.push(Number(match[1]));
  }
  return times;
}

async function measureAudioPeaks(videoPath, splitTime) {
  const window = 0.25;
  const before = path.join(INSPECTION_DIR, "audio-before-join.wav");
  const after = path.join(INSPECTION_DIR, "audio-after-join.wav");
  await run([
    "-y",
    "-ss",
    String(splitTime - window),
    "-t",
    String(window),
    "-i",
    videoPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "48000",
    "-f",
    "wav",
    before,
  ]);
  await run([
    "-y",
    "-ss",
    String(splitTime),
    "-t",
    String(window),
    "-i",
    videoPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "48000",
    "-f",
    "wav",
    after,
  ]);

  async function peak(wavPath) {
    const stderr = await run([
      "-hide_banner",
      "-i",
      wavPath,
      "-af",
      "astats=metadata=1:reset=1,ametadata=print:file=-",
      "-f",
      "null",
      "-",
    ]);
    const peaks = [];
    for (const line of stderr.split("\n")) {
      const match = line.match(/Peak level dB:\s(-?[0-9.]+)/);
      if (match) peaks.push(Number(match[1]));
    }
    return peaks.length ? Math.max(...peaks) : null;
  }

  return { before: await peak(before), after: await peak(after) };
}

async function runJoinInspection(finalPath, splitTime) {
  await mkdir(INSPECTION_DIR, { recursive: true });
  const offsets = [-0.5, -0.25, -0.083, 0, 0.083, 0.25, 0.5];
  const frameExtractions = [];

  for (const offset of offsets) {
    const ts = splitTime + offset;
    const label =
      offset === 0 ? "join" : offset < 0 ? `before_${Math.abs(offset)}s` : `after_${offset}s`;
    const framePath = path.join(INSPECTION_DIR, `${label}.jpg`);
    await extractFrame(finalPath, ts, framePath);
    frameExtractions.push({ label, timestampSeconds: ts, framePath });
  }

  const frameTimesAroundJoin = await getFrameTimes(finalPath, splitTime - 0.2, 0.4);
  const gaps = [];
  for (let i = 1; i < frameTimesAroundJoin.length; i++) {
    gaps.push(Number((frameTimesAroundJoin[i] - frameTimesAroundJoin[i - 1]).toFixed(6)));
  }

  const audioPeakDb = await measureAudioPeaks(finalPath, splitTime);

  return {
    splitTimeSeconds: splitTime,
    frameExtractions,
    frameTimesAroundJoin,
    frameTimeGapsSeconds: gaps,
    audioPeakDb: {
      windowBeforeJoin: audioPeakDb.before,
      windowAfterJoin: audioPeakDb.after,
      peakDeltaDb:
        audioPeakDb.before != null && audioPeakDb.after != null
          ? Number((audioPeakDb.after - audioPeakDb.before).toFixed(2))
          : null,
    },
  };
}

function durationVerdict(deltaSeconds) {
  const abs = Math.abs(deltaSeconds);
  if (abs <= FRAME_TOLERANCE_SECONDS) return "pass";
  if (abs <= FRAME_TOLERANCE_SECONDS * 2) return "pass_within_two_frames";
  return "fail";
}

async function main() {
  await mkdir(CHUNKS_DIR, { recursive: true });
  await mkdir(ENCODED_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  await ensureContinuousSource();

  const inputPath = SOURCE_PATH;
  const duration = await ffprobeDurationSeconds(inputPath);
  const sourceFrames = await ffprobeVideoFrameCount(inputPath);
  const keyframes = await listKeyframeTimes(inputPath);
  const splitTime = pickSplitKeyframe(keyframes, duration);
  const expectedSplitFrame = Math.round(splitTime * FRAME_RATE);

  console.log(`Source: ${inputPath}`);
  console.log(`Duration: ${duration.toFixed(3)}s (${(duration / 60).toFixed(1)} min)`);
  console.log(`Source frames decoded: ${sourceFrames ?? "unknown"}`);
  console.log(`Split at keyframe: ${splitTime.toFixed(3)}s (~frame ${expectedSplitFrame})`);

  const { chunk1Path, chunk2Path } = await streamCopySplit(inputPath, splitTime);
  const chunk1Duration = await ffprobeDurationSeconds(chunk1Path);
  const chunk2Duration = await ffprobeDurationSeconds(chunk2Path);
  const chunkSum = chunk1Duration + chunk2Duration;
  const splitDelta = chunkSum - duration;

  console.log(
    `Raw chunks: ${chunk1Duration.toFixed(3)}s + ${chunk2Duration.toFixed(3)}s = ${chunkSum.toFixed(3)}s (delta ${splitDelta >= 0 ? "+" : ""}${splitDelta.toFixed(3)}s)`,
  );

  const overlayPath = path.join(SPIKE_DIR, "overlay-rgba.png");
  console.log("\n[2/4] Creating 1920x1080 RGBA overlay PNG...");
  await createOverlayPng(overlayPath, 1920, 1080);

  const encoded1Path = path.join(ENCODED_DIR, "chunk-01-watermarked.mp4");
  const encoded2Path = path.join(ENCODED_DIR, "chunk-02-watermarked.mp4");

  console.log("\n[3/4] Production overlay encode chunk 1...");
  const t1 = Date.now();
  await productionOverlayEncode(chunk1Path, overlayPath, encoded1Path);
  console.log(
    `Chunk 1 done in ${((Date.now() - t1) / 60000).toFixed(1)} min (${await formatBytes(encoded1Path)})`,
  );

  console.log("\n[3/4] Production overlay encode chunk 2...");
  const t2 = Date.now();
  await productionOverlayEncode(chunk2Path, overlayPath, encoded2Path);
  console.log(
    `Chunk 2 done in ${((Date.now() - t2) / 60000).toFixed(1)} min (${await formatBytes(encoded2Path)})`,
  );

  const encoded1Duration = await ffprobeDurationSeconds(encoded1Path);
  const encoded2Duration = await ffprobeDurationSeconds(encoded2Path);

  const concatListPath = path.join(SPIKE_DIR, "concat-list.txt");
  await writeFile(
    concatListPath,
    [
      `file '${encoded1Path.replace(/\\/g, "/")}'`,
      `file '${encoded2Path.replace(/\\/g, "/")}'`,
    ].join("\n"),
    "utf8",
  );

  const finalPath = path.join(OUTPUT_DIR, "phase01-concat-copy.mp4");
  console.log("\n[4/4] Concat with stream copy...");
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

  const finalDuration = await ffprobeDurationSeconds(finalPath);
  const finalFrames = await ffprobeVideoFrameCount(finalPath);
  const finalDelta = finalDuration - duration;
  const joinInspection = await runJoinInspection(finalPath, splitTime);

  const report = {
    generatedAt: new Date().toISOString(),
    phase: "0.1",
    input: {
      path: inputPath,
      type: "scripted_continuous_motion_with_frame_counter",
      durationSeconds: duration,
      videoFrames: sourceFrames,
      frameRate: FRAME_RATE,
      resolution: "1920x1080",
      sizeMb: await formatBytes(inputPath),
    },
    split: {
      method: "stream copy; chunk1: -i -to SPLIT; chunk2: -i -ss SPLIT (after -i); -reset_timestamps 1",
      keyframeSeconds: splitTime,
      expectedFrameAtSplit: expectedSplitFrame,
      chunk1Seconds: chunk1Duration,
      chunk2Seconds: chunk2Duration,
      sumSeconds: chunkSum,
      durationDeltaSeconds: splitDelta,
      durationVerdict: durationVerdict(splitDelta),
    },
    encode: {
      settings: "libx264 preset fast crf 22 yuv420p + aac 128k + rgba overlay + faststart",
      chunk1Seconds: encoded1Duration,
      chunk2Seconds: encoded2Duration,
      chunk1SizeMb: await formatBytes(encoded1Path),
      chunk2SizeMb: await formatBytes(encoded2Path),
    },
    concat: {
      method: "concat demuxer + stream copy",
      outputPath: finalPath,
      outputDurationSeconds: finalDuration,
      outputVideoFrames: finalFrames,
      outputSizeMb: await formatBytes(finalPath),
      durationDeltaSeconds: finalDelta,
      durationVerdict: durationVerdict(finalDelta),
      frameToleranceSeconds: FRAME_TOLERANCE_SECONDS,
    },
    joinInspection,
    recommendation: {
      proceed:
        durationVerdict(finalDelta) !== "fail"
          ? "conditional_yes_if_frame_counter_continuous_at_join"
          : "no_until_duration_fixed",
    },
  };

  const reportPath = path.join(OUTPUT_DIR, "phase01-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\nDone.");
  console.log(`Final: ${finalPath}`);
  console.log(`Report: ${reportPath}`);
  console.log(
    `Duration delta: ${finalDelta >= 0 ? "+" : ""}${finalDelta.toFixed(3)}s (${report.concat.durationVerdict})`,
  );
  console.log(`Inspect frames: ${INSPECTION_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
