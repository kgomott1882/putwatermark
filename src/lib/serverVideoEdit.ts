import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  concatVideoFiles,
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
  trimVideoFile,
} from "./serverVideoProcessor";

export class ServerVideoEditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerVideoEditError";
  }
}

async function withTempJobDirectory<T>(
  callback: (jobDirectory: string) => Promise<T>,
) {
  const jobDirectory = path.join(
    os.tmpdir(),
    `putwatermark-edit-${crypto.randomUUID()}`,
  );

  await mkdir(jobDirectory, { recursive: true });

  try {
    return await callback(jobDirectory);
  } finally {
    await rm(jobDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}

function getInputExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "mov" || extension === "webm" || extension === "mp4") {
    return extension;
  }

  return "mp4";
}

export async function mergeServerVideos({
  signal,
  videos,
}: {
  signal?: AbortSignal;
  videos: Array<{ bytes: Buffer; fileName: string }>;
}) {
  if (signal?.aborted) {
    throw new ServerVideoProcessingCancelledError();
  }

  if (videos.length < 2) {
    throw new ServerVideoEditError("Add at least two videos before merging.");
  }

  return withTempJobDirectory(async (jobDirectory) => {
    const chunkPaths: string[] = [];

    for (let index = 0; index < videos.length; index += 1) {
      const video = videos[index]!;
      const extension = getInputExtension(video.fileName);
      const chunkPath = path.join(
        jobDirectory,
        `part-${String(index).padStart(2, "0")}.${extension}`,
      );
      await writeFile(chunkPath, video.bytes);
      chunkPaths.push(chunkPath);
    }

    const outputPath = path.join(jobDirectory, "merged.mp4");
    await concatVideoFiles({
      chunkPaths,
      outputPath,
      signal,
    });

    return readFile(outputPath);
  });
}

export async function trimServerVideo({
  endSeconds,
  fileName,
  signal,
  startSeconds,
  videoBytes,
}: {
  endSeconds: number;
  fileName: string;
  signal?: AbortSignal;
  startSeconds: number;
  videoBytes: Buffer;
}) {
  if (signal?.aborted) {
    throw new ServerVideoProcessingCancelledError();
  }

  const trimDuration = endSeconds - startSeconds;

  if (trimDuration <= 0) {
    throw new ServerVideoEditError("Choose a valid shorten range.");
  }

  return withTempJobDirectory(async (jobDirectory) => {
    const extension = getInputExtension(fileName);
    const inputPath = path.join(jobDirectory, `input.${extension}`);
    const outputPath = path.join(jobDirectory, `trimmed.${extension}`);
    await writeFile(inputPath, videoBytes);

    await trimVideoFile({
      durationSeconds: trimDuration,
      inputPath,
      outputPath,
      signal,
      startSeconds,
    });

    return readFile(outputPath);
  });
}
