/**
 * Automated join-point QA (VLC frame-step substitute in headless env).
 * Extracts frames + audio metrics around the split timestamp.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPIKE_DIR = path.join(__dirname, "..", "spike-phase0");
const OUTPUT_DIR = path.join(SPIKE_DIR, "output");
const INSPECTION_DIR = path.join(OUTPUT_DIR, "join-inspection");
const FFMPEG = ffmpegStatic;

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (c) => {
      stderr += c.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(stderr));
    });
  });
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
    "-q:v",
    "2",
    outputPath,
  ]);
}

async function extractAudioSlice(videoPath, startSeconds, durationSeconds, outputPath) {
  await run([
    "-y",
    "-ss",
    String(startSeconds),
    "-t",
    String(durationSeconds),
    "-i",
    videoPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "48000",
    "-f",
    "wav",
    outputPath,
  ]);
}

async function measureAudioPeak(wavPath) {
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

async function main() {
  const reportPath = path.join(OUTPUT_DIR, "phase0-report.json");
  const report = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(reportPath, "utf8")));
  const splitTime = report.split.keyframeSeconds;
  const finalPath = report.concat.outputPath;

  await mkdir(INSPECTION_DIR, { recursive: true });

  const offsets = [-0.5, -0.25, -0.083, 0, 0.083, 0.25, 0.5];
  const frameExtractions = [];

  for (const offset of offsets) {
    const ts = splitTime + offset;
    const label = offset === 0 ? "join" : offset < 0 ? `before_${Math.abs(offset)}s` : `after_${offset}s`;
    const framePath = path.join(INSPECTION_DIR, `${label}.jpg`);
    await extractFrame(finalPath, ts, framePath);
    frameExtractions.push({ label, timestampSeconds: ts, framePath });
  }

  const audioWindowSeconds = 0.25;
  const beforeAudio = path.join(INSPECTION_DIR, "audio-before-join.wav");
  const afterAudio = path.join(INSPECTION_DIR, "audio-after-join.wav");
  await extractAudioSlice(finalPath, splitTime - audioWindowSeconds, audioWindowSeconds, beforeAudio);
  await extractAudioSlice(finalPath, splitTime, audioWindowSeconds, afterAudio);

  const frameTimesAroundJoin = await getFrameTimes(finalPath, splitTime - 0.2, 0.4);
  const audioPeakBefore = await measureAudioPeak(beforeAudio);
  const audioPeakAfter = await measureAudioPeak(afterAudio);

  const gaps = [];
  for (let i = 1; i < frameTimesAroundJoin.length; i++) {
    gaps.push(Number((frameTimesAroundJoin[i] - frameTimesAroundJoin[i - 1]).toFixed(6)));
  }

  const inspection = {
    splitTimeSeconds: splitTime,
    frameExtractions,
    frameTimesAroundJoin,
    frameTimeGapsSeconds: gaps,
    audioPeakDb: {
      windowBeforeJoin: audioPeakBefore,
      windowAfterJoin: audioPeakAfter,
    },
    notes: [
      "Frame JPGs saved for visual review at join-inspection/",
      "Normal 24fps gap ~0.041667s; large gap (>0.08) or zero gap suggests duplicate/missing frame",
      "Sudden peak delta >6dB at join may indicate audio click",
    ],
  };

  await writeFile(
    path.join(INSPECTION_DIR, "join-analysis.json"),
    `${JSON.stringify(inspection, null, 2)}\n`,
  );

  console.log(JSON.stringify(inspection, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
