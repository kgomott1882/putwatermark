/**
 * Long-video pipeline E2E: upload → split → encode chunks → concat → verify.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/long-video-e2e.ts
 *
 * Optional env:
 *   LONG_VIDEO_E2E_TARGET_SECONDS=1320  (default 22 minutes)
 *   LONG_VIDEO_E2E_USER_ID=<uuid>     (defaults to first auth user)
 */
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import * as tus from "tus-js-client";
import ffmpegStatic from "ffmpeg-static";
import {
  concatLongVideoExportJob,
  processLongVideoExportChunk,
  splitLongVideoExportJob,
  cleanupLongVideoExportJob,
} from "../src/lib/serverVideoExportRoute";
import { getSupabaseSignedTusEndpoint } from "../src/lib/supabaseTus";
import {
  createAdminClient,
  WATERMARK_TEMP_BUCKET,
} from "../utils/supabase/admin";
import { getSupabasePublicKey } from "../utils/supabase/publicServer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const E2E_DIR = path.join(ROOT, "spike-phase0-1", "e2e");
const SOURCE_CANDIDATES = [
  path.join(ROOT, "spike-phase0", "input", "Sintel.2010.1080p.mkv"),
  path.join(
    ROOT,
    "spike-phase0-1",
    "input",
    "phase01-continuous-source.mp4",
  ),
];
const TARGET_SECONDS = Number(process.env.LONG_VIDEO_E2E_TARGET_SECONDS ?? 22 * 60);
const FFMPEG = ffmpegStatic;

if (!FFMPEG) {
  throw new Error("ffmpeg-static binary not found");
}

function runFfmpeg(args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(FFMPEG!, args, { stdio: ["ignore", "pipe", "pipe"] });
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

async function ffprobeDurationSeconds(inputPath: string) {
  const stderr = await runFfmpeg(["-hide_banner", "-i", inputPath, "-f", "null", "-"]);
  const match = stderr.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Could not parse duration for ${inputPath}`);
  }

  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

async function resolveSourceVideo() {
  for (const candidate of SOURCE_CANDIDATES) {
    try {
      await stat(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    "No E2E source video found. Run scripts/phase0-1-spike.mjs or add Sintel to spike-phase0/input.",
  );
}

async function ensureLongSourceVideo() {
  await mkdir(E2E_DIR, { recursive: true });
  const sourcePath = await resolveSourceVideo();
  const inputExtension = path.extname(sourcePath).slice(1) || "mp4";

  const outputPath = path.join(
    E2E_DIR,
    `long-source-${TARGET_SECONDS}s.${inputExtension === "mkv" ? "mp4" : inputExtension}`,
  );
  try {
    const existing = await stat(outputPath);
    if (existing.size > 0) {
      const duration = await ffprobeDurationSeconds(outputPath);
      if (Math.abs(duration - TARGET_SECONDS) <= 2) {
        return outputPath;
      }
    }
  } catch {
    // regenerate below
  }

  const sourceDuration = await ffprobeDurationSeconds(sourcePath);
  if (sourceDuration + 1 < TARGET_SECONDS) {
    const listPath = path.join(E2E_DIR, "concat-list.txt");
    await writeFile(
      listPath,
      `file '${sourcePath.replace(/\\/g, "/")}'\nfile '${sourcePath.replace(/\\/g, "/")}'\n`,
    );
    const doubledPath = path.join(E2E_DIR, "doubled-source.mp4");
    console.log(`Building doubled source (~${sourceDuration * 2}s)...`);
    await runFfmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      doubledPath,
    ]);
    console.log(`Trimming to ${TARGET_SECONDS}s...`);
    await runFfmpeg([
      "-y",
      "-i",
      doubledPath,
      "-t",
      String(TARGET_SECONDS),
      "-c",
      "copy",
      outputPath,
    ]);
  } else {
    console.log(`Trimming source to ${TARGET_SECONDS}s...`);
    await runFfmpeg([
      "-y",
      "-i",
      sourcePath,
      "-t",
      String(TARGET_SECONDS),
      "-c",
      "copy",
      outputPath,
    ]);
  }

  const duration = await ffprobeDurationSeconds(outputPath);
  console.log(`E2E source ready: ${outputPath} (${duration.toFixed(2)}s)`);
  return outputPath;
}

async function createOverlayBase64() {
  const overlayPath = path.join(E2E_DIR, "overlay-rgba.png");
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x00000000:s=1920x1080:d=1,format=rgba",
    "-vf",
    "drawtext=text='PutWatermark E2E':fontsize=42:fontcolor=white@0.55:x=(w-text_w)/2:y=h-96",
    "-frames:v",
    "1",
    "-update",
    "1",
    overlayPath,
  ]);

  return (await readFile(overlayPath)).toString("base64");
}

async function uploadInputFile(jobId: string, localPath: string) {
  const storagePath = `jobs/${jobId}/input.mp4`;
  const supabase = createAdminClient();
  const fileStats = await stat(localPath);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = getSupabasePublicKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase public key.");
  }

  const { data, error } = await supabase.storage
    .from(WATERMARK_TEMP_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true });

  if (error || !data?.token) {
    throw new Error(`Could not create signed upload URL: ${error?.message ?? "unknown"}`);
  }

  const uploadStream = createReadStream(localPath);

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(uploadStream, {
      chunkSize: 6 * 1024 * 1024,
      endpoint: getSupabaseSignedTusEndpoint(supabaseUrl),
      headers: {
        apikey: supabaseAnonKey,
        "x-signature": data.token,
        "x-upsert": "true",
      },
      metadata: {
        bucketName: WATERMARK_TEMP_BUCKET,
        cacheControl: "3600",
        contentType: "video/mp4",
        objectName: storagePath,
      },
      onError: (uploadError) => {
        reject(uploadError);
      },
      onSuccess: () => {
        resolve();
      },
      uploadSize: fileStats.size,
    });

    upload.start();
  });

  return {
    fileSizeBytes: fileStats.size,
    storagePath,
  };
}

async function resolveUserId() {
  const configured = process.env.LONG_VIDEO_E2E_USER_ID?.trim();
  if (configured) {
    return configured;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (error || !data.users[0]?.id) {
    throw new Error(
      "Set LONG_VIDEO_E2E_USER_ID or create at least one Supabase auth user.",
    );
  }

  return data.users[0].id;
}

async function downloadOutput(downloadUrl: string, outputPath: string) {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, bytes);
  return bytes.length;
}

async function main() {
  const startedAt = Date.now();
  const jobId = randomUUID();
  const userId = await resolveUserId();
  const localSourcePath = await ensureLongSourceVideo();
  const overlayBase64 = await createOverlayBase64();
  const inputFileName = path.basename(localSourcePath);

  console.log(`Using job ${jobId} for user ${userId}`);

  const { fileSizeBytes, storagePath } = await uploadInputFile(jobId, localSourcePath);
  console.log(`Uploaded ${(fileSizeBytes / (1024 * 1024)).toFixed(1)}MB to ${storagePath}`);

  const splitJob = await splitLongVideoExportJob({
    exportId: randomUUID(),
    inputFileName,
    jobId,
    userId,
    videoPath: storagePath,
  });

  console.log(
    `Split complete: ${splitJob.chunkCount} chunks at ${splitJob.splitAtSeconds.join(", ")}s`,
  );

  for (let chunkIndex = 0; chunkIndex < splitJob.chunkCount; chunkIndex += 1) {
    const chunkStartedAt = Date.now();
    console.log(`Encoding chunk ${chunkIndex + 1}/${splitJob.chunkCount}...`);
    await processLongVideoExportChunk({
      chunkIndex,
      inputFileName,
      jobId,
      overlayBase64,
      userId,
    });
    console.log(
      `Chunk ${chunkIndex + 1} done in ${((Date.now() - chunkStartedAt) / 1000).toFixed(1)}s`,
    );
  }

  console.log("Concatenating chunks...");
  const result = await concatLongVideoExportJob(jobId, userId);
  const outputPath = path.join(E2E_DIR, `output-${jobId}.mp4`);
  const outputBytes = await downloadOutput(result.downloadUrl, outputPath);
  const outputDuration = await ffprobeDurationSeconds(outputPath);
  const sourceDuration = await ffprobeDurationSeconds(localSourcePath);
  const delta = outputDuration - sourceDuration;

  console.log("\n=== Long video E2E result ===");
  console.log(`Source duration: ${sourceDuration.toFixed(2)}s`);
  console.log(`Output duration: ${outputDuration.toFixed(2)}s (delta ${delta >= 0 ? "+" : ""}${delta.toFixed(2)}s)`);
  console.log(`Output size: ${(outputBytes / (1024 * 1024)).toFixed(1)}MB`);
  console.log(`Output file: ${outputPath}`);
  console.log(`Total elapsed: ${((Date.now() - startedAt) / 1000 / 60).toFixed(1)} min`);

  if (Math.abs(delta) > 1) {
    throw new Error(`Duration drift ${delta.toFixed(2)}s exceeds 1s tolerance`);
  }

  await cleanupLongVideoExportJob(jobId);
  console.log("Cleaned up remote job artifacts.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
