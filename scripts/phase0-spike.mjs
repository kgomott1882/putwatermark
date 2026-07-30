/**
 * Phase 0 spike: split → production overlay encode per chunk → concat (stream copy).
 * Uses ffmpeg-static (same binary as serverVideoProcessor.ts).
 */
import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SPIKE_DIR = path.join(ROOT, "spike-phase0");
const INPUT_DIR = path.join(SPIKE_DIR, "input");
const CHUNKS_DIR = path.join(SPIKE_DIR, "chunks");
const ENCODED_DIR = path.join(SPIKE_DIR, "encoded");
const OUTPUT_DIR = path.join(SPIKE_DIR, "output");

const FFMPEG = ffmpegStatic;
if (!FFMPEG) {
  throw new Error("ffmpeg-static binary not found");
}

function run(cmd, args, { collectStderr = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${path.basename(cmd)} exited ${code}\n${stderr}`));
    });
  });
}

async function ffprobeDurationSeconds(inputPath) {
  const { stderr } = await run(FFMPEG, [
    "-hide_banner",
    "-i",
    inputPath,
    "-f",
    "null",
    "-",
  ]);
  const match = stderr.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Could not parse duration from ffmpeg output for ${inputPath}`);
  }
  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

async function listKeyframeTimes(inputPath) {
  const { stderr } = await run(FFMPEG, [
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
    if (match) {
      times.push(Number(match[1]));
    }
  }

  if (times.length === 0) {
    throw new Error("No keyframes found in source video");
  }

  return times;
}

function pickSplitKeyframe(keyframes, durationSeconds) {
  const target = durationSeconds / 2;
  let best = keyframes[0];

  for (const time of keyframes) {
    if (time <= target && time > best) {
      best = time;
    }
  }

  if (best === keyframes[0] && keyframes.length > 1) {
    for (const time of keyframes) {
      if (time >= target) {
        return time;
      }
    }
  }

  return best;
}

async function createOverlayPng(overlayPath, width, height) {
  await run(FFMPEG, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=0x00000000:s=${width}x${height}:d=1,format=rgba`,
    "-vf",
    "drawtext=text='PutWatermark Phase 0':fontsize=42:fontcolor=white@0.55:x=(w-text_w)/2:y=h-96,drawtext=text='CONFIDENTIAL':fontsize=28:fontcolor=white@0.35:x=48:y=48",
    "-frames:v",
    "1",
    "-update",
    "1",
    overlayPath,
  ]);
}

async function productionOverlayEncode(inputPath, overlayPath, outputPath) {
  await run(FFMPEG, [
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

async function inspectJoinPoint(encodedChunkPaths, splitTimeSeconds) {
  const reports = [];

  for (const chunkPath of encodedChunkPaths) {
    const { stderr } = await run(FFMPEG, [
      "-hide_banner",
      "-i",
      chunkPath,
      "-f",
      "null",
      "-",
    ]);
    reports.push({ chunkPath, probe: stderr });
  }

  const chunk1EndFrames = await extractFrameTimesNearEnd(encodedChunkPaths[0], 2);
  const chunk2StartFrames = await extractFrameTimesNearStart(encodedChunkPaths[1], 2);

  return {
    splitTimeSeconds,
    chunk1EndFrames,
    chunk2StartFrames,
    probes: reports,
  };
}

async function extractFrameTimesNearEnd(inputPath, secondsWindow) {
  const duration = await ffprobeDurationSeconds(inputPath);
  const start = Math.max(0, duration - secondsWindow);
  const { stderr } = await run(FFMPEG, [
    "-hide_banner",
    "-ss",
    String(start),
    "-i",
    inputPath,
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
    if (match) {
      times.push(Number(match[1]));
    }
  }

  return { duration, start, frameTimes: times.slice(-30) };
}

async function extractFrameTimesNearStart(inputPath, secondsWindow) {
  const { stderr } = await run(FFMPEG, [
    "-hide_banner",
    "-t",
    String(secondsWindow),
    "-i",
    inputPath,
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
    if (match) {
      times.push(Number(match[1]));
    }
  }

  return { windowSeconds: secondsWindow, frameTimes: times.slice(0, 30) };
}

async function findInputVideo() {
  const entries = await readdir(INPUT_DIR);
  const video = entries.find((name) => /\.(mp4|mov|webm|mkv)$/i.test(name));
  if (!video) {
    throw new Error(
      `Place a 15-20 minute 1080p source video in ${INPUT_DIR} before running the spike.`,
    );
  }
  return path.join(INPUT_DIR, video);
}

async function formatBytes(filePath) {
  const { size } = await stat(filePath);
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function main() {
  await mkdir(INPUT_DIR, { recursive: true });
  await mkdir(CHUNKS_DIR, { recursive: true });
  await mkdir(ENCODED_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const inputPath = await findInputVideo();
  const duration = await ffprobeDurationSeconds(inputPath);
  const keyframes = await listKeyframeTimes(inputPath);
  const splitTime = pickSplitKeyframe(keyframes, duration);

  console.log(`Source: ${inputPath}`);
  console.log(`Duration: ${duration.toFixed(2)}s (${(duration / 60).toFixed(1)} min)`);
  console.log(`Split at keyframe: ${splitTime.toFixed(3)}s`);

  const chunk1Path = path.join(CHUNKS_DIR, "chunk-01.mp4");
  const chunk2Path = path.join(CHUNKS_DIR, "chunk-02.mp4");

  console.log("\n[1/4] Stream-copy split at keyframe...");
  await run(FFMPEG, [
    "-y",
    "-i",
    inputPath,
    "-t",
    String(splitTime),
    "-c",
    "copy",
    "-avoid_negative_ts",
    "make_zero",
    chunk1Path,
  ]);

  await run(FFMPEG, [
    "-y",
    "-ss",
    String(splitTime),
    "-i",
    inputPath,
    "-c",
    "copy",
    "-avoid_negative_ts",
    "make_zero",
    chunk2Path,
  ]);

  const chunk1Duration = await ffprobeDurationSeconds(chunk1Path);
  const chunk2Duration = await ffprobeDurationSeconds(chunk2Path);
  console.log(
    `Chunks: ${chunk1Duration.toFixed(2)}s + ${chunk2Duration.toFixed(2)}s = ${(chunk1Duration + chunk2Duration).toFixed(2)}s`,
  );

  const { stderr: probeStderr } = await run(FFMPEG, [
    "-hide_banner",
    "-i",
    inputPath,
    "-f",
    "null",
    "-",
  ]);
  const resolutionMatch = probeStderr.match(/,\s(\d{3,4}x\d{3,4})/);
  const resolution = resolutionMatch?.[1] ?? "1920x1080";
  const [width, height] = resolution.split("x").map(Number);

  const overlayPath = path.join(SPIKE_DIR, "overlay.png");
  console.log(`\n[2/4] Creating ${resolution} overlay PNG...`);
  await createOverlayPng(overlayPath, width, height);

  const encoded1Path = path.join(ENCODED_DIR, "chunk-01-watermarked.mp4");
  const encoded2Path = path.join(ENCODED_DIR, "chunk-02-watermarked.mp4");

  console.log("\n[3/4] Production overlay encode on chunk 1 (this may take a while)...");
  const encode1Started = Date.now();
  await productionOverlayEncode(chunk1Path, overlayPath, encoded1Path);
  console.log(
    `Chunk 1 encoded in ${((Date.now() - encode1Started) / 1000 / 60).toFixed(1)} min (${await formatBytes(encoded1Path)})`,
  );

  console.log("\n[3/4] Production overlay encode on chunk 2...");
  const encode2Started = Date.now();
  await productionOverlayEncode(chunk2Path, overlayPath, encoded2Path);
  console.log(
    `Chunk 2 encoded in ${((Date.now() - encode2Started) / 1000 / 60).toFixed(1)} min (${await formatBytes(encoded2Path)})`,
  );

  const concatListPath = path.join(SPIKE_DIR, "concat-list.txt");
  await writeFile(
    concatListPath,
    [`file '${encoded1Path.replace(/\\/g, "/")}'`, `file '${encoded2Path.replace(/\\/g, "/")}'`].join("\n"),
    "utf8",
  );

  const finalPath = path.join(OUTPUT_DIR, "phase0-concat-copy.mp4");
  console.log("\n[4/4] Concat with stream copy...");
  await run(FFMPEG, [
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
  const joinInspection = await inspectJoinPoint(
    [encoded1Path, encoded2Path],
    splitTime,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    input: {
      path: inputPath,
      durationSeconds: duration,
      durationMinutes: duration / 60,
      resolution,
      sizeMb: await formatBytes(inputPath),
    },
    split: {
      keyframeSeconds: splitTime,
      chunk1Seconds: chunk1Duration,
      chunk2Seconds: chunk2Duration,
      sumSeconds: chunk1Duration + chunk2Duration,
      durationDeltaSeconds: chunk1Duration + chunk2Duration - duration,
    },
    encode: {
      settings: "libx264 preset fast crf 22 yuv420p + aac 128k + overlay=0:0 + faststart",
      chunk1Path: encoded1Path,
      chunk2Path: encoded2Path,
      chunk1SizeMb: await formatBytes(encoded1Path),
      chunk2SizeMb: await formatBytes(encoded2Path),
    },
    concat: {
      method: "concat demuxer + stream copy",
      outputPath: finalPath,
      outputDurationSeconds: finalDuration,
      outputSizeMb: await formatBytes(finalPath),
      durationDeltaSeconds: finalDuration - duration,
    },
    joinInspection,
    vlcChecklist: {
      splitTimeSeconds: splitTime,
      inspectAroundSeconds: [splitTime - 1, splitTime, splitTime + 1],
      instructions:
        "Open final output in VLC, jump to splitTimeSeconds, use E/frame-step and Shift+E/back-step. Check for duplicate/missing frame, flash, audio click, A/V desync.",
    },
  };

  const reportPath = path.join(OUTPUT_DIR, "phase0-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\nDone.");
  console.log(`Final output: ${finalPath}`);
  console.log(`Report: ${reportPath}`);
  console.log(`Inspect join near ${splitTime.toFixed(3)}s in VLC.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
