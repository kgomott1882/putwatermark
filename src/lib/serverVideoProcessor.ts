import { createReadStream, createWriteStream } from "node:fs";
import { openAsBlob } from "node:fs";
import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import ffmpegStatic from "ffmpeg-static";
import {
  createAdminClient,
  WATERMARK_TEMP_BUCKET,
} from "../../utils/supabase/admin";
import { LONG_VIDEO_CHUNK_MAX_DURATION_SECONDS } from "./videoExportLimits";
import {
  buildOverlayFilterComplex,
  buildOverlayImageInputArgs,
  overlayPassesNeedExplicitVideoMap,
  type VideoOverlayPassTiming,
} from "./videoOverlayPasses";

export type ServerOverlayFilePass = VideoOverlayPassTiming & {
  overlayPath: string;
};

const ffmpegBinary = ffmpegStatic;
const SHORT_SCRATCH_BUDGET_BYTES = 500 * 1024 * 1024;
const CHUNK_SCRATCH_BUDGET_BYTES = 1500 * 1024 * 1024;

export class ServerVideoProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerVideoProcessingError";
  }
}

export class ServerVideoProcessingCancelledError extends Error {
  constructor() {
    super("Video export cancelled.");
    this.name = "ServerVideoProcessingCancelledError";
  }
}

function getInputExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "mov" || extension === "webm" || extension === "mp4") {
    return extension;
  }

  return "mp4";
}

function runFfmpeg(args: string[], signal?: AbortSignal) {
  if (!ffmpegBinary) {
    throw new ServerVideoProcessingError(
      "FFmpeg binary is unavailable in this environment.",
    );
  }

  return new Promise<void>((resolve, reject) => {
    const process = spawn(ffmpegBinary, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";

    const handleAbort = () => {
      process.kill("SIGKILL");
      reject(new ServerVideoProcessingCancelledError());
    };

    if (signal) {
      if (signal.aborted) {
        handleAbort();
        return;
      }

      signal.addEventListener("abort", handleAbort, { once: true });
    }

    process.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    process.on("error", (error) => {
      reject(error);
    });

    process.on("close", (code) => {
      if (signal) {
        signal.removeEventListener("abort", handleAbort);
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new ServerVideoProcessingError(
          stderr.trim() ||
            "Video processing failed. Please try a shorter clip.",
        ),
      );
    });
  });
}

async function createJobDirectory() {
  const jobDirectory = path.join(
    os.tmpdir(),
    `putwatermark-${crypto.randomUUID()}`,
  );
  await mkdir(jobDirectory, { recursive: true });
  return jobDirectory;
}

export async function downloadStorageObjectToFile(
  objectPath: string,
  destPath: string,
) {
  const signedUrl = await createStorageSignedUrl(objectPath);
  const response = await fetch(signedUrl);

  if (!response.ok || !response.body) {
    throw new ServerVideoProcessingError(
      "Could not download the uploaded video from storage.",
    );
  }

  await pipeline(
    Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(destPath),
  );
}

export async function createStorageSignedUrl(objectPath: string, expiresIn = 60 * 60) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(WATERMARK_TEMP_BUCKET)
    .createSignedUrl(objectPath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new ServerVideoProcessingError(
      "Could not read the uploaded video from storage.",
    );
  }

  return data.signedUrl;
}

export async function uploadFileToStorage(
  objectPath: string,
  filePath: string,
  contentType: string,
) {
  const supabase = createAdminClient();
  const fileBlob = await openAsBlob(filePath, { type: contentType });
  const { error } = await supabase.storage
    .from(WATERMARK_TEMP_BUCKET)
    .upload(objectPath, fileBlob, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new ServerVideoProcessingError(
      `Could not store processed video file: ${error.message}`,
    );
  }
}

export async function probeVideoDurationSeconds(inputPath: string) {
  const stderr = await new Promise<string>((resolve, reject) => {
    const process = spawn(ffmpegBinary!, ["-hide_banner", "-i", inputPath, "-f", "null", "-"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let output = "";
    process.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    process.on("error", reject);
    process.on("close", () => resolve(output));
  });

  const match = stderr.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new ServerVideoProcessingError("Could not read video duration.");
  }

  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

export async function listKeyframeTimes(inputPath: string) {
  const stderr = await new Promise<string>((resolve, reject) => {
    const process = spawn(
      ffmpegBinary!,
      [
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
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let output = "";
    process.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    process.on("error", reject);
    process.on("close", () => resolve(output));
  });

  const times: number[] = [];
  for (const line of stderr.split("\n")) {
    const match = line.match(/pts_time:([0-9.]+)/);
    if (match) {
      times.push(Number(match[1]));
    }
  }

  if (!times.length) {
    throw new ServerVideoProcessingError("No keyframes found in uploaded video.");
  }

  return times;
}

function pickKeyframeAtOrBefore(keyframes: number[], targetSeconds: number) {
  let best = keyframes[0];

  for (const time of keyframes) {
    if (time <= targetSeconds && time >= best) {
      best = time;
    }
  }

  if (best <= targetSeconds) {
    return best;
  }

  for (const time of keyframes) {
    if (time >= targetSeconds) {
      return time;
    }
  }

  return best;
}

export function computeLongVideoSplitPoints(
  keyframes: number[],
  durationSeconds: number,
  maxChunkDurationSeconds = LONG_VIDEO_CHUNK_MAX_DURATION_SECONDS,
) {
  const splitPoints: number[] = [];
  let segmentStart = 0;

  while (segmentStart + maxChunkDurationSeconds < durationSeconds - 0.05) {
    const target = segmentStart + maxChunkDurationSeconds;
    const candidates = keyframes.filter(
      (time) => time > segmentStart + 0.001 && time <= durationSeconds,
    );

    if (!candidates.length) {
      break;
    }

    const splitPoint = pickKeyframeAtOrBefore(candidates, target);

    if (splitPoint <= segmentStart + 0.001) {
      break;
    }

    splitPoints.push(splitPoint);
    segmentStart = splitPoint;
  }

  return splitPoints;
}

export async function splitVideoToChunkFiles({
  inputPath,
  splitPoints,
  outputDirectory,
  signal,
}: {
  inputPath: string;
  splitPoints: number[];
  outputDirectory: string;
  signal?: AbortSignal;
}) {
  await mkdir(outputDirectory, { recursive: true });

  const boundaries = [0, ...splitPoints];
  const chunkPaths: string[] = [];

  for (let index = 0; index < boundaries.length; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    const chunkPath = path.join(
      outputDirectory,
      `raw-${String(index).padStart(2, "0")}.mp4`,
    );
    const args = ["-y", "-i", inputPath];

    if (start > 0) {
      args.push("-ss", String(start));
    }

    if (end !== undefined) {
      args.push("-to", String(end));
    }

    args.push(
      "-c",
      "copy",
      "-avoid_negative_ts",
      "make_zero",
      "-reset_timestamps",
      "1",
      chunkPath,
    );

    await runFfmpeg(args, signal);

    const chunkStats = await stat(chunkPath);
    if (!chunkStats.size) {
      throw new ServerVideoProcessingError(
        `Split chunk ${index + 1} was empty. Please try again.`,
      );
    }

    chunkPaths.push(chunkPath);
  }

  return chunkPaths;
}

export async function trimVideoFile({
  durationSeconds,
  inputPath,
  outputPath,
  signal,
  startSeconds = 0,
}: {
  durationSeconds: number;
  inputPath: string;
  outputPath: string;
  signal?: AbortSignal;
  startSeconds?: number;
}) {
  if (signal?.aborted) {
    throw new ServerVideoProcessingCancelledError();
  }

  if (durationSeconds <= 0) {
    throw new ServerVideoProcessingError("Choose a valid shorten range.");
  }

  await runFfmpeg(
    buildTrimFfmpegArgs({
      durationSeconds,
      inputSource: inputPath,
      outputPath,
      startSeconds,
    }),
    signal,
  );

  const outputStats = await stat(outputPath);

  if (!outputStats.size) {
    throw new ServerVideoProcessingError(
      "Shortened video was empty. Please try again.",
    );
  }
}

export async function trimVideoFileFromUrl({
  durationSeconds,
  inputUrl,
  outputPath,
  signal,
  startSeconds = 0,
}: {
  durationSeconds: number;
  inputUrl: string;
  outputPath: string;
  signal?: AbortSignal;
  startSeconds?: number;
}) {
  if (signal?.aborted) {
    throw new ServerVideoProcessingCancelledError();
  }

  if (durationSeconds <= 0) {
    throw new ServerVideoProcessingError("Choose a valid shorten range.");
  }

  await runFfmpeg(
    buildTrimFfmpegArgs({
      durationSeconds,
      inputSource: inputUrl,
      outputPath,
      startSeconds,
    }),
    signal,
  );

  const outputStats = await stat(outputPath);

  if (!outputStats.size) {
    throw new ServerVideoProcessingError(
      "Shortened video was empty. Please try again.",
    );
  }
}

function buildTrimFfmpegArgs({
  durationSeconds,
  inputSource,
  outputPath,
  startSeconds,
}: {
  durationSeconds: number;
  inputSource: string;
  outputPath: string;
  startSeconds: number;
}) {
  return [
    "-y",
    "-protocol_whitelist",
    "file,http,https,tcp,tls",
    "-ss",
    startSeconds.toFixed(3),
    "-i",
    inputSource,
    "-t",
    durationSeconds.toFixed(3),
    "-c",
    "copy",
    "-avoid_negative_ts",
    "make_zero",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export async function processVideoWithOverlayFromFiles({
  inputPath,
  overlayPath,
  overlayPasses,
  outputPath,
  scratchBudgetBytes = CHUNK_SCRATCH_BUDGET_BYTES,
  signal,
  trimDurationSeconds,
  trimStartSeconds = 0,
}: {
  inputPath: string;
  overlayPath?: string;
  overlayPasses?: ServerOverlayFilePass[];
  outputPath: string;
  scratchBudgetBytes?: number;
  signal?: AbortSignal;
  trimDurationSeconds?: number;
  trimStartSeconds?: number;
}) {
  if (signal?.aborted) {
    throw new ServerVideoProcessingCancelledError();
  }

  const resolvedPasses: ServerOverlayFilePass[] =
    overlayPasses ??
    (overlayPath
      ? [
          {
            overlayPath,
          },
        ]
      : []);

  if (resolvedPasses.length === 0) {
    throw new ServerVideoProcessingError(
      "Server video export is missing a watermark overlay.",
    );
  }

  const [inputStats, ...overlayStats] = await Promise.all([
    stat(inputPath),
    ...resolvedPasses.map((pass) => stat(pass.overlayPath)),
  ]);
  const overlayBytes = overlayStats.reduce((total, entry) => total + entry.size, 0);
  const estimatedOutputBytes = Math.ceil(inputStats.size * 1.1);

  if (
    inputStats.size + overlayBytes + estimatedOutputBytes >
    scratchBudgetBytes
  ) {
    throw new ServerVideoProcessingError(
      "This video chunk is too large to process safely within server scratch space. Try a smaller file.",
    );
  }

  const ffmpegArgs = [
    "-y",
    ...(trimStartSeconds > 0 ? ["-ss", trimStartSeconds.toFixed(3)] : []),
    "-i",
    inputPath,
    ...buildOverlayImageInputArgs(resolvedPasses.map((pass) => pass.overlayPath)),
    "-filter_complex",
    buildOverlayFilterComplex(resolvedPasses),
  ];

  if (trimDurationSeconds !== undefined && trimDurationSeconds > 0) {
    ffmpegArgs.push("-t", trimDurationSeconds.toFixed(3));
  }

  if (overlayPassesNeedExplicitVideoMap(resolvedPasses)) {
    ffmpegArgs.push("-map", "[vout]", "-map", "0:a?");
  }

  ffmpegArgs.push(
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

  await runFfmpeg(ffmpegArgs, signal);

  const outputStats = await stat(outputPath);
  if (!outputStats.size) {
    throw new ServerVideoProcessingError(
      "Processed video chunk was empty. Please try again.",
    );
  }
}

export async function concatVideoFiles({
  chunkPaths,
  outputPath,
  signal,
}: {
  chunkPaths: string[];
  outputPath: string;
  signal?: AbortSignal;
}) {
  if (chunkPaths.length === 1) {
    await pipeline(createReadStream(chunkPaths[0]!), createWriteStream(outputPath));
    return;
  }

  const listPath = path.join(path.dirname(outputPath), "concat-list.txt");
  await writeFile(
    listPath,
    chunkPaths
      .map((chunkPath) => `file '${chunkPath.replace(/\\/g, "/")}'`)
      .join("\n"),
    "utf8",
  );

  await runFfmpeg(
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      outputPath,
    ],
    signal,
  );

  const outputStats = await stat(outputPath);
  if (!outputStats.size) {
    throw new ServerVideoProcessingError(
      "Concatenated video was empty. Please try again.",
    );
  }
}

export async function processVideoWithOverlayInTmp({
  inputFileName,
  inputVideoBytes,
  overlayPasses,
  overlayPngBytes,
  signal,
  trimDurationSeconds,
  trimStartSeconds = 0,
}: {
  inputFileName: string;
  inputVideoBytes: Buffer;
  overlayPasses?: Array<
    VideoOverlayPassTiming & {
      overlayPngBytes: Buffer;
    }
  >;
  overlayPngBytes?: Buffer;
  signal?: AbortSignal;
  trimDurationSeconds?: number;
  trimStartSeconds?: number;
}) {
  if (signal?.aborted) {
    throw new ServerVideoProcessingCancelledError();
  }

  const resolvedOverlayPasses =
    overlayPasses ??
    (overlayPngBytes
      ? [
          {
            overlayPngBytes,
          },
        ]
      : []);

  if (resolvedOverlayPasses.length === 0) {
    throw new ServerVideoProcessingError(
      "Server video export is missing a watermark overlay.",
    );
  }

  const overlayBytes = resolvedOverlayPasses.reduce(
    (total, pass) => total + pass.overlayPngBytes.byteLength,
    0,
  );
  const estimatedOutputBytes = Math.ceil(inputVideoBytes.byteLength * 1.1);

  if (
    inputVideoBytes.byteLength + overlayBytes + estimatedOutputBytes >
    SHORT_SCRATCH_BUDGET_BYTES
  ) {
    throw new ServerVideoProcessingError(
      "This video is too large to process safely within server scratch space. Try a smaller file.",
    );
  }

  const jobDirectory = await createJobDirectory();
  const inputExtension = getInputExtension(inputFileName);
  const inputPath = path.join(jobDirectory, `input.${inputExtension}`);
  const outputPath = path.join(jobDirectory, "output.mp4");
  const overlayFilePasses: ServerOverlayFilePass[] = resolvedOverlayPasses.map(
    (pass, index) => ({
      overlayPath: path.join(jobDirectory, `overlay-${index}.png`),
      visibleFromSeconds: pass.visibleFromSeconds,
      visibleUntilSeconds: pass.visibleUntilSeconds,
    }),
  );

  try {
    await writeFile(inputPath, inputVideoBytes);

    await Promise.all(
      resolvedOverlayPasses.map((pass, index) =>
        writeFile(overlayFilePasses[index]!.overlayPath, pass.overlayPngBytes),
      ),
    );

    await processVideoWithOverlayFromFiles({
      inputPath,
      overlayPasses: overlayFilePasses,
      outputPath,
      scratchBudgetBytes: SHORT_SCRATCH_BUDGET_BYTES,
      signal,
      trimDurationSeconds,
      trimStartSeconds,
    });
    return await readFile(outputPath);
  } finally {
    await rm(jobDirectory, { recursive: true, force: true });
  }
}

export async function processVideoWithOverlayToFile({
  inputFileName,
  inputPath,
  overlayPasses,
  overlayPngBytes,
  outputPath,
  signal,
}: {
  inputFileName: string;
  inputPath: string;
  overlayPasses?: Array<
    VideoOverlayPassTiming & {
      overlayPngBytes: Buffer;
    }
  >;
  overlayPngBytes?: Buffer;
  outputPath: string;
  signal?: AbortSignal;
}) {
  void inputFileName;
  const resolvedOverlayPasses =
    overlayPasses ??
    (overlayPngBytes
      ? [
          {
            overlayPngBytes,
          },
        ]
      : []);

  if (resolvedOverlayPasses.length === 0) {
    throw new ServerVideoProcessingError(
      "Server video export is missing a watermark overlay.",
    );
  }

  const jobDirectory = await createJobDirectory();
  const overlayFilePasses: ServerOverlayFilePass[] = resolvedOverlayPasses.map(
    (pass, index) => ({
      overlayPath: path.join(jobDirectory, `overlay-${index}.png`),
      visibleFromSeconds: pass.visibleFromSeconds,
      visibleUntilSeconds: pass.visibleUntilSeconds,
    }),
  );

  try {
    await Promise.all(
      resolvedOverlayPasses.map((pass, index) =>
        writeFile(overlayFilePasses[index]!.overlayPath, pass.overlayPngBytes),
      ),
    );

    await processVideoWithOverlayFromFiles({
      inputPath,
      overlayPasses: overlayFilePasses,
      outputPath,
      signal,
    });
  } finally {
    await rm(jobDirectory, { recursive: true, force: true });
  }
}
