/**
 * Local 15-chunk pipeline mini-test (60-min-equivalent join count).
 * Uses ~90s source, 6s chunk cap → ~15 encode+concat boundaries.
 *
 * Usage: npx tsx scripts/analyze-long-video-chunk-av-drift.ts
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeLongVideoSplitPoints,
  concatVideoFiles,
  listKeyframeTimes,
  probeVideoDurationSeconds,
  processVideoWithOverlayFromFiles,
  splitVideoToChunkFiles,
} from "../src/lib/serverVideoProcessor";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const WORK_DIR = path.join(ROOT, "spike-phase0-1", "e2e", "chunk-drift-test");
const SOURCE = path.join(ROOT, "spike-phase0-1", "e2e", "long-source-1320s.mp4");
const OVERLAY = path.join(ROOT, "spike-phase0-1", "e2e", "overlay-rgba.png");
const TRIM_SECONDS = 120;
const CHUNK_CAP_SECONDS = 8;

async function trimSource(inputPath: string, outputPath: string, seconds: number) {
  const { spawn } = await import("node:child_process");
  const ffmpegStatic = (await import("ffmpeg-static")).default;
  if (!ffmpegStatic) {
    throw new Error("ffmpeg-static not found");
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      ffmpegStatic,
      ["-y", "-i", inputPath, "-t", String(seconds), "-c", "copy", outputPath],
      { stdio: "ignore" },
    );
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`trim failed: ${code}`));
    });
  });
}

async function probeEndAvDelta(filePath: string) {
  const { spawn } = await import("node:child_process");
  const ffmpegStatic = (await import("ffmpeg-static")).default;
  if (!ffmpegStatic) {
    throw new Error("ffmpeg-static not found");
  }

  const run = (args: string[]) =>
    new Promise<string>((resolve, reject) => {
      const child = spawn(ffmpegStatic, args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", () => resolve(stderr));
    });

  const probe = await run(["-hide_banner", "-i", filePath]);
  const durationMatch = probe.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const containerDuration = durationMatch
    ? Number(durationMatch[1]) * 3600 +
      Number(durationMatch[2]) * 60 +
      Number(durationMatch[3])
    : 0;

  const video = await run([
    "-hide_banner",
    "-i",
    filePath,
    "-map",
    "0:v:0",
    "-vf",
    "showinfo",
    "-f",
    "null",
    "-",
  ]);
  const audio = await run([
    "-hide_banner",
    "-i",
    filePath,
    "-map",
    "0:a:0",
    "-af",
    "ashowinfo",
    "-f",
    "null",
    "-",
  ]);

  const videoEnd = Number([...video.matchAll(/pts_time:([0-9.]+)/g)].at(-1)?.[1] ?? "0");
  const audioEnd = Number([...audio.matchAll(/pts_time:([0-9.]+)/g)].at(-1)?.[1] ?? "0");

  return {
    audioEnd,
    avDeltaMs: (videoEnd - audioEnd) * 1000,
    containerDuration,
    durationDrift: containerDuration - TRIM_SECONDS,
    videoEnd,
  };
}

async function main() {
  await rm(WORK_DIR, { recursive: true, force: true });
  await mkdir(WORK_DIR, { recursive: true });

  const trimmedPath = path.join(WORK_DIR, "trimmed.mp4");
  console.log(`Trimming source to ${TRIM_SECONDS}s...`);
  await trimSource(SOURCE, trimmedPath, TRIM_SECONDS);

  const sourceMetrics = await probeEndAvDelta(trimmedPath);
  const durationSeconds = await probeVideoDurationSeconds(trimmedPath);
  const keyframes = await listKeyframeTimes(trimmedPath);
  const splitPoints = computeLongVideoSplitPoints(
    keyframes,
    durationSeconds,
    CHUNK_CAP_SECONDS,
  );
  const chunkCount = splitPoints.length + 1;

  console.log(
    `Splitting into ${chunkCount} chunks (cap ${CHUNK_CAP_SECONDS}s) at ${splitPoints.map((p) => p.toFixed(2)).join(", ")}`,
  );

  const rawDir = path.join(WORK_DIR, "raw");
  const encodedDir = path.join(WORK_DIR, "encoded");
  await mkdir(encodedDir, { recursive: true });

  const rawPaths = await splitVideoToChunkFiles({
    inputPath: trimmedPath,
    outputDirectory: rawDir,
    splitPoints,
  });

  for (let index = 0; index < rawPaths.length; index += 1) {
    const encodedPath = path.join(
      encodedDir,
      `encoded-${String(index).padStart(2, "0")}.mp4`,
    );
    console.log(`Encoding chunk ${index + 1}/${rawPaths.length}...`);
    await processVideoWithOverlayFromFiles({
      inputPath: rawPaths[index]!,
      outputPath: encodedPath,
      overlayPath: OVERLAY,
    });
  }

  const outputPath = path.join(WORK_DIR, "concat-output.mp4");
  console.log("Concatenating...");
  await concatVideoFiles({
    chunkPaths: rawPaths.map((_, index) =>
      path.join(encodedDir, `encoded-${String(index).padStart(2, "0")}.mp4`),
    ),
    outputPath,
  });

  const outputMetrics = await probeEndAvDelta(outputPath);

  console.log("\n=== 15-chunk-equivalent local test ===");
  console.log(`Chunks: ${chunkCount} (60-min pipeline would use ~15 at 4-min cap)`);
  console.log(`Source trimmed duration: ${sourceMetrics.containerDuration.toFixed(2)}s`);
  console.log(
    `Output duration: ${outputMetrics.containerDuration.toFixed(2)}s (drift ${outputMetrics.durationDrift >= 0 ? "+" : ""}${outputMetrics.durationDrift.toFixed(2)}s)`,
  );
  console.log(
    `End A/V delta: source ${sourceMetrics.avDeltaMs.toFixed(1)}ms → output ${outputMetrics.avDeltaMs.toFixed(1)}ms (change ${(outputMetrics.avDeltaMs - sourceMetrics.avDeltaMs).toFixed(1)}ms)`,
  );
  console.log(
    `Per-chunk drift estimate: ${(outputMetrics.durationDrift / Math.max(chunkCount, 1)).toFixed(3)}s/chunk (both tracks, container-level)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
