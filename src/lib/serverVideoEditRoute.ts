import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createAdminClient, WATERMARK_TEMP_BUCKET } from "../../utils/supabase/admin";
import {
  cleanupCancelledServerVideoJob,
  createServerVideoUploadTarget,
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
} from "./serverVideoExportRoute";
import {
  concatVideoFiles,
  createStorageSignedUrl,
  downloadStorageObjectToFile,
  trimVideoFileFromUrl,
  uploadFileToStorage,
} from "./serverVideoProcessor";

export class ServerVideoEditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerVideoEditError";
  }
}

function getInputExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "mov" || extension === "webm" || extension === "mp4") {
    return extension;
  }

  return "mp4";
}

function sanitizeJobId(jobId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    throw new ServerVideoEditError("Invalid video edit job id.");
  }

  return jobId;
}

async function createSignedDownloadUrl(outputPath: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(WATERMARK_TEMP_BUCKET)
    .createSignedUrl(outputPath, 60 * 30);

  if (error || !data?.signedUrl) {
    throw new ServerVideoEditError(
      "Processed video was created but could not be shared for download.",
    );
  }

  return data.signedUrl;
}

export async function createVideoEditUploadTarget(input: {
  duration: number;
  fileName: string;
  fileSizeBytes: number;
  height: number;
  resumeJobId?: string;
  storageObjectName?: string;
  width: number;
}) {
  return createServerVideoUploadTarget(input);
}

export async function trimServerVideoFromStorage({
  endSeconds,
  fileName,
  jobId: jobIdInput,
  signal,
  startSeconds,
  videoPath,
}: {
  endSeconds: number;
  fileName: string;
  jobId: string;
  signal?: AbortSignal;
  startSeconds: number;
  videoPath: string;
}) {
  if (signal?.aborted) {
    throw new ServerVideoProcessingCancelledError();
  }

  const jobId = sanitizeJobId(jobIdInput);
  const trimDuration = endSeconds - startSeconds;

  if (trimDuration <= 0) {
    throw new ServerVideoEditError("Choose a valid shorten range.");
  }

  const jobDirectory = path.join(os.tmpdir(), `putwatermark-trim-${jobId}`);
  const extension = getInputExtension(fileName);
  const outputPath = path.join(jobDirectory, `trimmed.${extension}`);
  const outputStoragePath = `jobs/${jobId}/trimmed.${extension}`;

  await mkdir(jobDirectory, { recursive: true });

  try {
    const inputSignedUrl = await createStorageSignedUrl(videoPath);

    await trimVideoFileFromUrl({
      durationSeconds: trimDuration,
      inputUrl: inputSignedUrl,
      outputPath,
      signal,
      startSeconds,
    });

    await uploadFileToStorage(outputStoragePath, outputPath, "video/mp4");

    const downloadUrl = await createSignedDownloadUrl(outputStoragePath);

    return {
      downloadUrl,
      fileName: fileName.replace(/(\.[^.]+)?$/, "-shortened.mp4"),
      jobId,
      outputPath: outputStoragePath,
    };
  } catch (error) {
    await cleanupCancelledServerVideoJob({
      jobId,
      videoPath: outputStoragePath,
    }).catch(() => undefined);
    throw error;
  } finally {
    await rm(jobDirectory, { recursive: true, force: true }).catch(() => undefined);
    await cleanupCancelledServerVideoJob({
      jobId,
      videoPath,
    }).catch(() => undefined);
  }
}

export async function mergeServerVideosFromStorage({
  jobId: jobIdInput,
  signal,
  videos,
}: {
  jobId: string;
  signal?: AbortSignal;
  videos: Array<{ fileName: string; videoPath: string }>;
}) {
  if (signal?.aborted) {
    throw new ServerVideoProcessingCancelledError();
  }

  if (videos.length < 2) {
    throw new ServerVideoEditError("Add at least two videos before merging.");
  }

  const jobId = sanitizeJobId(jobIdInput);
  const jobDirectory = path.join(os.tmpdir(), `putwatermark-merge-${jobId}`);
  const outputPath = path.join(jobDirectory, "merged.mp4");
  const outputStoragePath = `jobs/${jobId}/merged.mp4`;
  const localChunkPaths: string[] = [];
  const inputStoragePaths = videos.map((video) => video.videoPath);

  await mkdir(jobDirectory, { recursive: true });

  try {
    for (let index = 0; index < videos.length; index += 1) {
      const video = videos[index]!;
      const extension = getInputExtension(video.fileName);
      const chunkPath = path.join(
        jobDirectory,
        `part-${String(index).padStart(2, "0")}.${extension}`,
      );
      await downloadStorageObjectToFile(video.videoPath, chunkPath);
      localChunkPaths.push(chunkPath);
    }

    await concatVideoFiles({
      chunkPaths: localChunkPaths,
      outputPath,
      signal,
    });

    await uploadFileToStorage(outputStoragePath, outputPath, "video/mp4");

    const downloadUrl = await createSignedDownloadUrl(outputStoragePath);

    return {
      downloadUrl,
      fileName: "merged-video.mp4",
      jobId,
      outputPath: outputStoragePath,
    };
  } catch (error) {
    await cleanupCancelledServerVideoJob({
      jobId,
      videoPath: outputStoragePath,
    }).catch(() => undefined);
    throw error;
  } finally {
    await rm(jobDirectory, { recursive: true, force: true }).catch(() => undefined);

    for (const storagePath of inputStoragePaths) {
      await cleanupCancelledServerVideoJob({
        jobId,
        videoPath: storagePath,
      }).catch(() => undefined);
    }
  }
}

export {
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
} from "./serverVideoProcessor";
