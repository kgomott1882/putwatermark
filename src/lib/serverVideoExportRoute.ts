import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createAdminClient,
  WATERMARK_TEMP_BUCKET,
} from "../../utils/supabase/admin";
import { getSupabaseSignedTusEndpoint } from "./supabaseTus";
import {
  getVideoExportJob,
  insertVideoExportJob,
  markVideoExportJobFailed,
  serializeVideoExportJob,
  updateVideoExportJob,
  type VideoExportChunkRecord,
} from "./serverVideoExportJob";
import {
  computeLongVideoSplitPoints,
  concatVideoFiles,
  downloadStorageObjectToFile,
  listKeyframeTimes,
  processVideoWithOverlayInTmp,
  processVideoWithOverlayToFile,
  probeVideoDurationSeconds,
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
  splitVideoToChunkFiles,
  uploadFileToStorage,
} from "./serverVideoProcessor";
import {
  getVideoExportRejectionMessage,
  isLongServerVideoExportEligible,
  isServerVideoExportEligible,
} from "./videoExportLimits";

export {
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
} from "./serverVideoProcessor";

type UploadUrlRequest = {
  duration: number;
  fileName: string;
  fileSizeBytes: number;
  height: number;
  resumeJobId?: string;
  storageObjectName?: string;
  width: number;
};

type OverlayPassPayload = {
  overlayBase64: string;
  visibleFromSeconds?: number;
  visibleUntilSeconds?: number;
};

type ProcessVideoRequest = {
  inputFileName: string;
  jobId: string;
  overlayBase64?: string;
  overlayPasses?: OverlayPassPayload[];
  trimDurationSeconds?: number;
  trimStartSeconds?: number;
  videoPath: string;
};

type StartLongVideoJobRequest = {
  exportId?: string;
  inputFileName: string;
  jobId: string;
  userId: string;
  videoPath: string;
};

type ProcessLongVideoChunkRequest = {
  chunkIndex: number;
  inputFileName: string;
  jobId: string;
  overlayBase64?: string;
  overlayPasses?: OverlayPassPayload[];
  userId: string;
};

function getInputExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "mov" || extension === "webm" || extension === "mp4") {
    return extension;
  }

  return "mp4";
}

function sanitizeJobId(jobId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    throw new ServerVideoProcessingError("Invalid export job id.");
  }

  return jobId;
}

function decodeOverlayBase64(overlayBase64: string) {
  try {
    const buffer = Buffer.from(overlayBase64, "base64");

    if (!buffer.byteLength) {
      throw new ServerVideoProcessingError("Watermark overlay PNG was empty.");
    }

    return buffer;
  } catch {
    throw new ServerVideoProcessingError("Invalid watermark overlay PNG.");
  }
}

function decodeOverlayPassesFromRequest(body: {
  overlayBase64?: string;
  overlayPasses?: OverlayPassPayload[];
}) {
  if (Array.isArray(body.overlayPasses) && body.overlayPasses.length > 0) {
    return body.overlayPasses.map((pass) => {
      if (typeof pass.overlayBase64 !== "string") {
        throw new ServerVideoProcessingError("Invalid watermark overlay PNG.");
      }

      return {
        overlayPngBytes: decodeOverlayBase64(pass.overlayBase64),
        visibleFromSeconds:
          typeof pass.visibleFromSeconds === "number"
            ? pass.visibleFromSeconds
            : undefined,
        visibleUntilSeconds:
          typeof pass.visibleUntilSeconds === "number"
            ? pass.visibleUntilSeconds
            : undefined,
      };
    });
  }

  if (typeof body.overlayBase64 === "string") {
    return [
      {
        overlayPngBytes: decodeOverlayBase64(body.overlayBase64),
      },
    ];
  }

  throw new ServerVideoProcessingError(
    "Server video export is missing a watermark overlay.",
  );
}

function isServerOrLongVideoUploadEligible(
  duration: number,
  width: number,
  height: number,
  fileSizeBytes: number,
) {
  return (
    isServerVideoExportEligible(duration, width, height, fileSizeBytes) ||
    isLongServerVideoExportEligible(duration, width, height, fileSizeBytes)
  );
}

export async function createServerVideoUploadTarget({
  duration,
  fileName,
  fileSizeBytes,
  height,
  resumeJobId,
  storageObjectName,
  width,
}: UploadUrlRequest) {
  if (
    !isServerOrLongVideoUploadEligible(
      duration,
      width,
      height,
      fileSizeBytes,
    )
  ) {
    throw new ServerVideoProcessingError(getVideoExportRejectionMessage());
  }

  const extension = getInputExtension(fileName);
  const jobId =
    resumeJobId && /^[0-9a-f-]{36}$/i.test(resumeJobId)
      ? resumeJobId
      : crypto.randomUUID();
  const videoPath = storageObjectName
    ? `jobs/${jobId}/${storageObjectName}`
    : `jobs/${jobId}/input.${extension}`;
  const supabase = createAdminClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new ServerVideoProcessingError(
      "Server video export is missing NEXT_PUBLIC_SUPABASE_URL.",
    );
  }

  const { data, error } = await supabase.storage
    .from(WATERMARK_TEMP_BUCKET)
    .createSignedUploadUrl(videoPath, { upsert: true });

  if (error || !data?.token) {
    throw new ServerVideoProcessingError(
      "Could not prepare server upload. Check Supabase Storage configuration.",
    );
  }

  return {
    bucketName: WATERMARK_TEMP_BUCKET,
    jobId,
    tusEndpoint: getSupabaseSignedTusEndpoint(supabaseUrl),
    uploadPath: videoPath,
    uploadToken: data.token,
  };
}

async function cleanupStoragePaths(paths: string[]) {
  if (!paths.length) {
    return;
  }

  const supabase = createAdminClient();
  await supabase.storage.from(WATERMARK_TEMP_BUCKET).remove(paths);
}

function getLongVideoChunkPaths(jobId: string, chunkCount: number) {
  return Array.from({ length: chunkCount }, (_, index) => ({
    encodedPath: `jobs/${jobId}/chunks/encoded-${String(index).padStart(2, "0")}.mp4`,
    index,
    rawPath: `jobs/${jobId}/chunks/raw-${String(index).padStart(2, "0")}.mp4`,
  }));
}

async function assertJobOwnedByUser(jobId: string, userId: string) {
  const job = await getVideoExportJob(jobId);

  if (!job) {
    throw new ServerVideoProcessingError("Video export job was not found.");
  }

  if (job.user_id !== userId) {
    throw new ServerVideoProcessingError("Video export job was not found.");
  }

  return job;
}

export async function processServerVideoExport(
  body: ProcessVideoRequest,
  signal?: AbortSignal,
) {
  const jobId = sanitizeJobId(body.jobId);
  const overlayPasses = decodeOverlayPassesFromRequest(body);
  const supabase = createAdminClient();
  const outputPath = `jobs/${jobId}/output.mp4`;

  try {
    if (signal?.aborted) {
      throw new ServerVideoProcessingCancelledError();
    }

    const { data: inputBlob, error: downloadError } = await supabase.storage
      .from(WATERMARK_TEMP_BUCKET)
      .download(body.videoPath);

    if (downloadError || !inputBlob) {
      throw new ServerVideoProcessingError(
        "Could not read the uploaded video from storage.",
      );
    }

    await cleanupStoragePaths([body.videoPath]);

    const inputVideoBytes = Buffer.from(await inputBlob.arrayBuffer());
    const outputVideoBytes = await processVideoWithOverlayInTmp({
      inputFileName: body.inputFileName,
      inputVideoBytes,
      overlayPasses,
      signal,
      trimDurationSeconds: body.trimDurationSeconds,
      trimStartSeconds: body.trimStartSeconds ?? 0,
    });

    const { error: uploadError } = await supabase.storage
      .from(WATERMARK_TEMP_BUCKET)
      .upload(outputPath, outputVideoBytes, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new ServerVideoProcessingError(
        "Could not store the processed video.",
      );
    }

    const { data: signedDownload, error: signedDownloadError } =
      await supabase.storage
        .from(WATERMARK_TEMP_BUCKET)
        .createSignedUrl(outputPath, 60 * 30);

    if (signedDownloadError || !signedDownload?.signedUrl) {
      throw new ServerVideoProcessingError(
        "Processed video was created but could not be shared for download.",
      );
    }

    return {
      downloadUrl: signedDownload.signedUrl,
      jobId,
      outputPath,
    };
  } catch (error) {
    await cleanupStoragePaths([body.videoPath, outputPath]);
    throw error;
  }
}

export async function splitLongVideoExportJob(
  body: StartLongVideoJobRequest,
  signal?: AbortSignal,
) {
  const jobId = sanitizeJobId(body.jobId);
  const jobDirectory = path.join(os.tmpdir(), `putwatermark-split-${jobId}`);
  const inputExtension = getInputExtension(body.inputFileName);
  const inputPath = path.join(jobDirectory, `input.${inputExtension}`);
  const chunksDirectory = path.join(jobDirectory, "chunks");

  let job = await insertVideoExportJob({
    exportId: body.exportId,
    inputFileName: body.inputFileName,
    inputPath: body.videoPath,
    jobId,
    userId: body.userId,
  });

  try {
    await updateVideoExportJob(jobId, { status: "splitting" });
    await mkdir(jobDirectory, { recursive: true });
    await downloadStorageObjectToFile(body.videoPath, inputPath);

    const durationSeconds = await probeVideoDurationSeconds(inputPath);
    const keyframes = await listKeyframeTimes(inputPath);
    const splitPoints = computeLongVideoSplitPoints(keyframes, durationSeconds);
    const chunkPaths = await splitVideoToChunkFiles({
      inputPath,
      outputDirectory: chunksDirectory,
      signal,
      splitPoints,
    });
    const chunkRecords = getLongVideoChunkPaths(jobId, chunkPaths.length);

    for (let index = 0; index < chunkPaths.length; index += 1) {
      const localChunkPath = chunkPaths[index]!;
      const chunkRecord = chunkRecords[index]!;
      await uploadFileToStorage(chunkRecord.rawPath, localChunkPath, "video/mp4");
    }

    const chunks: VideoExportChunkRecord[] = chunkRecords.map((chunk) => ({
      encodedPath: chunk.encodedPath,
      index: chunk.index,
      rawPath: chunk.rawPath,
      status: "split",
    }));

    job = await updateVideoExportJob(jobId, {
      chunk_count: chunks.length,
      chunks,
      duration_seconds: durationSeconds,
      split_at_seconds: splitPoints,
      status: "split_complete",
    });

    return serializeVideoExportJob(job);
  } catch (error) {
    const message =
      error instanceof ServerVideoProcessingError ||
      error instanceof ServerVideoProcessingCancelledError
        ? error.message
        : "Long video split failed.";

    await markVideoExportJobFailed(jobId, message).catch(() => undefined);
    await cleanupLongVideoExportJob(jobId).catch(() => undefined);
    throw error;
  } finally {
    await rm(jobDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function processLongVideoExportChunk(
  body: ProcessLongVideoChunkRequest,
  signal?: AbortSignal,
) {
  const jobId = sanitizeJobId(body.jobId);
  const job = await assertJobOwnedByUser(jobId, body.userId);
  const chunk = job.chunks.find((entry) => entry.index === body.chunkIndex);

  if (!chunk) {
    throw new ServerVideoProcessingError("Video chunk was not found.");
  }

  if (chunk.status === "encoded") {
    return serializeVideoExportJob(job);
  }

  const jobDirectory = path.join(
    os.tmpdir(),
    `putwatermark-chunk-${jobId}-${body.chunkIndex}`,
  );
  const rawPath = path.join(jobDirectory, "raw.mp4");
  const encodedPath = path.join(jobDirectory, "encoded.mp4");

  try {
    await updateVideoExportJob(jobId, { status: "processing" });
    await mkdir(jobDirectory, { recursive: true });
    await downloadStorageObjectToFile(chunk.rawPath, rawPath);
    await processVideoWithOverlayToFile({
      inputFileName: body.inputFileName,
      inputPath: rawPath,
      outputPath: encodedPath,
      overlayPasses: decodeOverlayPassesFromRequest(body),
      signal,
    });
    await uploadFileToStorage(chunk.encodedPath, encodedPath, "video/mp4");

    const nextChunks = job.chunks.map((entry) =>
      entry.index === body.chunkIndex
        ? { ...entry, status: "encoded" as const }
        : entry,
    );
    const allEncoded = nextChunks.every((entry) => entry.status === "encoded");
    const updatedJob = await updateVideoExportJob(jobId, {
      chunks: nextChunks,
      status: allEncoded ? "split_complete" : "processing",
    });

    return serializeVideoExportJob(updatedJob);
  } catch (error) {
    const message =
      error instanceof ServerVideoProcessingError ||
      error instanceof ServerVideoProcessingCancelledError
        ? error.message
        : "Video chunk processing failed.";

    await markVideoExportJobFailed(jobId, message).catch(() => undefined);
    throw error;
  } finally {
    await rm(jobDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function concatLongVideoExportJob(
  jobIdInput: string,
  userId: string,
  signal?: AbortSignal,
) {
  const jobId = sanitizeJobId(jobIdInput);
  const job = await assertJobOwnedByUser(jobId, userId);

  if (job.status === "ready" && job.output_path) {
    const supabase = createAdminClient();
    const { data: signedDownload, error } = await supabase.storage
      .from(WATERMARK_TEMP_BUCKET)
      .createSignedUrl(job.output_path, 60 * 30);

    if (error || !signedDownload?.signedUrl) {
      throw new ServerVideoProcessingError(
        "Processed video was created but could not be shared for download.",
      );
    }

    return {
      downloadUrl: signedDownload.signedUrl,
      job: serializeVideoExportJob(job),
      outputPath: job.output_path,
    };
  }

  if (!job.chunks.every((chunk) => chunk.status === "encoded")) {
    throw new ServerVideoProcessingError(
      "All video chunks must finish processing before concatenation.",
    );
  }

  const outputStoragePath = `jobs/${jobId}/output.mp4`;
  const jobDirectory = path.join(os.tmpdir(), `putwatermark-concat-${jobId}`);
  const encodedPaths: string[] = [];
  const concatOutputPath = path.join(jobDirectory, "output.mp4");

  try {
    await updateVideoExportJob(jobId, { status: "concatenating" });
    await mkdir(jobDirectory, { recursive: true });

    for (const chunk of [...job.chunks].sort((a, b) => a.index - b.index)) {
      const localPath = path.join(
        jobDirectory,
        `encoded-${String(chunk.index).padStart(2, "0")}.mp4`,
      );
      await downloadStorageObjectToFile(chunk.encodedPath, localPath);
      encodedPaths.push(localPath);
    }

    await concatVideoFiles({
      chunkPaths: encodedPaths,
      outputPath: concatOutputPath,
      signal,
    });
    await uploadFileToStorage(outputStoragePath, concatOutputPath, "video/mp4");

    const updatedJob = await updateVideoExportJob(jobId, {
      output_path: outputStoragePath,
      status: "ready",
    });

    const supabase = createAdminClient();
    const { data: signedDownload, error } = await supabase.storage
      .from(WATERMARK_TEMP_BUCKET)
      .createSignedUrl(outputStoragePath, 60 * 30);

    if (error || !signedDownload?.signedUrl) {
      throw new ServerVideoProcessingError(
        "Processed video was created but could not be shared for download.",
      );
    }

    return {
      downloadUrl: signedDownload.signedUrl,
      job: serializeVideoExportJob(updatedJob),
      outputPath: outputStoragePath,
    };
  } catch (error) {
    const message =
      error instanceof ServerVideoProcessingError ||
      error instanceof ServerVideoProcessingCancelledError
        ? error.message
        : "Video concatenation failed.";

    await markVideoExportJobFailed(jobId, message).catch(() => undefined);
    throw error;
  } finally {
    await rm(jobDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function getLongVideoExportJobStatus(jobIdInput: string, userId: string) {
  const job = await assertJobOwnedByUser(sanitizeJobId(jobIdInput), userId);
  return serializeVideoExportJob(job);
}

export async function cleanupLongVideoExportJob(jobIdInput: string) {
  const jobId = sanitizeJobId(jobIdInput);
  const job = await getVideoExportJob(jobId);
  const paths = new Set<string>([
    `jobs/${jobId}/output.mp4`,
    ...(job?.input_path ? [job.input_path] : []),
    ...(job?.chunks.flatMap((chunk) => [chunk.rawPath, chunk.encodedPath]) ?? []),
  ]);

  await cleanupStoragePaths([...paths]);
}

export async function cleanupCancelledServerVideoJob({
  jobId,
  videoPath,
}: {
  jobId: string;
  videoPath?: string;
}) {
  const safeJobId = sanitizeJobId(jobId);
  await cleanupLongVideoExportJob(safeJobId).catch(() => undefined);

  const paths = videoPath ? [videoPath] : [];
  await cleanupStoragePaths(paths);
  await cleanupStoragePaths([
    `jobs/${safeJobId}/output.mp4`,
    ...(videoPath ? [] : [`jobs/${safeJobId}`]),
  ]);
}
