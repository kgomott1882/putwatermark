import {
  getResumeJobIdForVideoUpload,
  uploadVideoWithTus,
} from "./serverVideoTusUpload";
import {
  VideoExportCancelledError,
  VideoExportFailedError,
  VideoExportTimeoutError,
} from "./watermarkVideoExport";

export type ServerVideoExportStage =
  | "downloading"
  | "preparing"
  | "processing"
  | "uploading";

/** Guard when a long-video step never responds (e.g. dropped connection). */
const LONG_VIDEO_SPLIT_REQUEST_TIMEOUT_MS = 20 * 60 * 1000;
const LONG_VIDEO_CHUNK_REQUEST_TIMEOUT_MS = 10 * 60 * 1000;
const LONG_VIDEO_CONCAT_REQUEST_TIMEOUT_MS = 15 * 60 * 1000;
const SHORT_SERVER_PROCESS_REQUEST_TIMEOUT_MS = 8 * 60 * 1000;

const ALLOWED_VIDEO_UPLOAD_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export function resolveVideoUploadContentType(
  fileName: string,
  blobType = "",
) {
  const normalizedBlobType = blobType.trim().toLowerCase();

  if (ALLOWED_VIDEO_UPLOAD_MIME_TYPES.has(normalizedBlobType)) {
    return normalizedBlobType;
  }

  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "mp4":
    default:
      return "video/mp4";
  }
}

type SharedServerExportInput = {
  abortSignal?: AbortSignal;
  duration: number;
  exportId: string;
  fileSizeBytes: number;
  height: number;
  inputFileName: string;
  onProcessingDetailChange?: (detail: string | null) => void;
  onProgress: (progress: number) => void;
  onStageChange: (stage: ServerVideoExportStage) => void;
  overlayPngBytes: Uint8Array;
  shouldCancel: () => boolean;
  trimEndSeconds?: number;
  trimStartSeconds?: number;
  videoBlob: Blob;
  width: number;
};

type ServerUploadTargetInput = Pick<
  SharedServerExportInput,
  | "abortSignal"
  | "duration"
  | "exportId"
  | "fileSizeBytes"
  | "height"
  | "inputFileName"
  | "onProgress"
  | "onStageChange"
  | "shouldCancel"
  | "videoBlob"
  | "width"
>;

type ExportVideoOnServerInput = SharedServerExportInput;

function assertNotCancelled(shouldCancel: () => boolean) {
  if (shouldCancel()) {
    throw new VideoExportCancelledError();
  }
}

function mergeAbortSignals(
  ...signals: Array<AbortSignal | undefined>
): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (!signal) {
      continue;
    }

    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }

    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return controller.signal;
}

async function fetchServerVideoStep(
  url: string,
  init: RequestInit,
  {
    abortSignal,
    shouldCancel,
    timeoutMessage,
    timeoutMs,
  }: {
    abortSignal?: AbortSignal;
    shouldCancel: () => boolean;
    timeoutMessage: string;
    timeoutMs: number;
  },
) {
  assertNotCancelled(shouldCancel);

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = mergeAbortSignals(abortSignal, timeoutSignal);

  try {
    return await fetch(url, { ...init, signal });
  } catch (error) {
    if (abortSignal?.aborted || shouldCancel()) {
      throw new VideoExportCancelledError();
    }

    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new VideoExportTimeoutError(timeoutMessage);
    }

    throw error;
  }
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function startIndeterminateProgress({
  from,
  onProgress,
  shouldCancel,
  to,
}: {
  from: number;
  onProgress: (progress: number) => void;
  shouldCancel: () => boolean;
  to: number;
}) {
  let current = from;
  onProgress(current);

  const intervalId = window.setInterval(() => {
    if (shouldCancel()) {
      return;
    }

    current = Math.min(to, current + 1);
    onProgress(current);
  }, 1200);

  return () => {
    window.clearInterval(intervalId);
  };
}

async function prepareServerUploadTarget({
  abortSignal,
  duration,
  exportId,
  fileSizeBytes,
  height,
  inputFileName,
  onProgress,
  onStageChange,
  shouldCancel,
  videoBlob,
  width,
}: ServerUploadTargetInput) {
  assertNotCancelled(shouldCancel);
  onStageChange("preparing");
  onProgress(2);

  const resumeJobId = getResumeJobIdForVideoUpload(inputFileName, fileSizeBytes);

  const uploadTargetResponse = await fetch("/api/watermark/video/upload-url", {
    body: JSON.stringify({
      duration,
      exportId,
      fileName: inputFileName,
      fileSizeBytes,
      height,
      resumeJobId,
      width,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: abortSignal,
  });

  if (!uploadTargetResponse.ok) {
    const payload = (await uploadTargetResponse.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new VideoExportFailedError(
      payload?.error ??
        "Server video export is unavailable. Try a shorter clip or use a smaller video.",
    );
  }

  const uploadTarget = (await uploadTargetResponse.json()) as {
    bucketName: string;
    jobId: string;
    tusEndpoint: string;
    uploadPath: string;
    uploadToken: string;
  };

  assertNotCancelled(shouldCancel);
  onStageChange("uploading");
  onProgress(5);

  const uploadContentType = resolveVideoUploadContentType(
    inputFileName,
    videoBlob.type,
  );

  await uploadVideoWithTus({
    abortSignal,
    bucketName: uploadTarget.bucketName,
    fileName: inputFileName,
    fileSizeBytes,
    inputFileName,
    jobId: uploadTarget.jobId,
    onProgress,
    shouldCancel,
    tusEndpoint: uploadTarget.tusEndpoint,
    uploadContentType,
    uploadPath: uploadTarget.uploadPath,
    uploadToken: uploadTarget.uploadToken,
    videoBlob,
  });

  return uploadTarget;
}

async function downloadProcessedVideo({
  abortSignal,
  downloadUrl,
  jobId,
  onProgress,
  onStageChange,
  outputPath,
  shouldCancel,
}: {
  abortSignal?: AbortSignal;
  downloadUrl: string;
  jobId: string;
  onProgress: (progress: number) => void;
  onStageChange: (stage: ServerVideoExportStage) => void;
  outputPath: string;
  shouldCancel: () => boolean;
}) {
  assertNotCancelled(shouldCancel);
  onStageChange("downloading");
  onProgress(92);

  const downloadResponse = await fetch(downloadUrl, {
    signal: abortSignal,
  });

  if (!downloadResponse.ok) {
    throw new VideoExportFailedError(
      "Processed video download failed. Please try exporting again.",
    );
  }

  const exportedBlob = await downloadResponse.blob();

  if (!exportedBlob.size) {
    throw new VideoExportFailedError(
      "Processed video download was empty. Please try again.",
    );
  }

  onProgress(100);

  void fetch("/api/watermark/video/cleanup", {
    body: JSON.stringify({
      jobId,
      outputPath,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    keepalive: true,
    method: "POST",
  });

  return exportedBlob;
}

export async function exportLongVideoOnServer(input: SharedServerExportInput) {
  const uploadTarget = await prepareServerUploadTarget(input);

  assertNotCancelled(input.shouldCancel);
  input.onStageChange("processing");
  input.onProgress(32);
  input.onProcessingDetailChange?.("Splitting video on server…");

  const splitResponse = await fetchServerVideoStep(
    "/api/watermark/video/job",
    {
      body: JSON.stringify({
        durationSeconds: input.duration,
        exportId: input.exportId,
        fileSizeBytes: input.fileSizeBytes,
        height: input.height,
        inputFileName: input.inputFileName,
        jobId: uploadTarget.jobId,
        videoPath: uploadTarget.uploadPath,
        width: input.width,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: input.abortSignal,
    },
    {
      abortSignal: input.abortSignal,
      shouldCancel: input.shouldCancel,
      timeoutMessage:
        "Video split is taking longer than expected and may have failed. Keep this tab open and try again with a shorter clip if the problem persists.",
      timeoutMs: LONG_VIDEO_SPLIT_REQUEST_TIMEOUT_MS,
    },
  );

  if (splitResponse.status === 499) {
    throw new VideoExportCancelledError();
  }

  if (!splitResponse.ok) {
    const payload = (await splitResponse.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new VideoExportFailedError(
      payload?.error ?? "Long video split failed. Please try again.",
    );
  }

  const splitPayload = (await splitResponse.json()) as {
    job: {
      chunkCount: number;
      jobId: string;
    };
  };

  const chunkCount = splitPayload.job.chunkCount;
  const overlayBase64 = uint8ArrayToBase64(input.overlayPngBytes);
  const chunkProgressSpan = Math.max(1, 50 / Math.max(chunkCount, 1));

  input.onProgress(34);

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    assertNotCancelled(input.shouldCancel);

    const chunkProgressStart = 35 + Math.round(chunkIndex * chunkProgressSpan);
    const chunkProgressEnd = 35 + Math.round((chunkIndex + 1) * chunkProgressSpan);
    input.onProgress(chunkProgressStart);
    input.onProcessingDetailChange?.(
      `Processing chunk ${chunkIndex + 1} of ${chunkCount} on server…`,
    );

    const stopIndeterminateProgress = startIndeterminateProgress({
      from: chunkProgressStart,
      onProgress: input.onProgress,
      shouldCancel: input.shouldCancel,
      to: Math.max(chunkProgressStart, chunkProgressEnd - 1),
    });

    let chunkResponse: Response;

    try {
      chunkResponse = await fetchServerVideoStep(
        `/api/watermark/video/job/${uploadTarget.jobId}/chunk/${chunkIndex}`,
        {
          body: JSON.stringify({
            inputFileName: input.inputFileName,
            overlayBase64,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: input.abortSignal,
        },
        {
          abortSignal: input.abortSignal,
          shouldCancel: input.shouldCancel,
          timeoutMessage: `Video chunk ${chunkIndex + 1} of ${chunkCount} is taking longer than expected and may have failed. Try again with a shorter clip, or contact support if this keeps happening.`,
          timeoutMs: LONG_VIDEO_CHUNK_REQUEST_TIMEOUT_MS,
        },
      );
    } finally {
      stopIndeterminateProgress();
    }

    if (chunkResponse.status === 499) {
      throw new VideoExportCancelledError();
    }

    if (!chunkResponse.ok) {
      const payload = (await chunkResponse.json().catch(() => null)) as {
        error?: string;
      } | null;

      throw new VideoExportFailedError(
        payload?.error ??
          `Video chunk ${chunkIndex + 1} failed. Please try again.`,
      );
    }

    input.onProgress(chunkProgressEnd);
  }

  assertNotCancelled(input.shouldCancel);
  input.onProgress(88);
  input.onProcessingDetailChange?.("Joining processed video…");

  const concatResponse = await fetchServerVideoStep(
    `/api/watermark/video/job/${uploadTarget.jobId}/concat`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: input.abortSignal,
    },
    {
      abortSignal: input.abortSignal,
      shouldCancel: input.shouldCancel,
      timeoutMessage:
        "Video join is taking longer than expected and may have failed. Please try exporting again.",
      timeoutMs: LONG_VIDEO_CONCAT_REQUEST_TIMEOUT_MS,
    },
  );

  if (concatResponse.status === 499) {
    throw new VideoExportCancelledError();
  }

  if (!concatResponse.ok) {
    const payload = (await concatResponse.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new VideoExportFailedError(
      payload?.error ?? "Video concatenation failed. Please try again.",
    );
  }

  const concatPayload = (await concatResponse.json()) as {
    downloadUrl: string;
    outputPath: string;
  };

  input.onProcessingDetailChange?.(null);

  return downloadProcessedVideo({
    abortSignal: input.abortSignal,
    downloadUrl: concatPayload.downloadUrl,
    jobId: uploadTarget.jobId,
    onProgress: input.onProgress,
    onStageChange: input.onStageChange,
    outputPath: concatPayload.outputPath,
    shouldCancel: input.shouldCancel,
  });
}

export async function exportVideoOnServer({
  abortSignal,
  duration,
  exportId,
  fileSizeBytes,
  height,
  inputFileName,
  onProgress,
  onStageChange,
  overlayPngBytes,
  shouldCancel,
  trimEndSeconds,
  trimStartSeconds,
  videoBlob,
  width,
}: ExportVideoOnServerInput) {
  const uploadTarget = await prepareServerUploadTarget({
    abortSignal,
    duration,
    exportId,
    fileSizeBytes,
    height,
    inputFileName,
    onProgress,
    onStageChange,
    shouldCancel,
    videoBlob,
    width,
  });

  assertNotCancelled(shouldCancel);
  onStageChange("processing");
  onProgress(42);

  const stopIndeterminateProgress = startIndeterminateProgress({
    from: 42,
    onProgress,
    shouldCancel,
    to: 88,
  });

  let processResponse: Response;

  try {
    processResponse = await fetchServerVideoStep(
      "/api/watermark/video",
      {
        body: JSON.stringify({
          durationSeconds: duration,
          exportId,
          fileSizeBytes,
          height,
          inputFileName,
          jobId: uploadTarget.jobId,
          overlayBase64: uint8ArrayToBase64(overlayPngBytes),
          trimDurationSeconds:
            trimEndSeconds !== undefined
              ? Math.max(0, trimEndSeconds - (trimStartSeconds ?? 0))
              : undefined,
          trimStartSeconds,
          videoPath: uploadTarget.uploadPath,
          width,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: abortSignal,
      },
      {
        abortSignal,
        shouldCancel,
        timeoutMessage:
          "Server video processing is taking longer than expected and may have failed. Try a shorter clip or try again.",
        timeoutMs: SHORT_SERVER_PROCESS_REQUEST_TIMEOUT_MS,
      },
    );
  } finally {
    stopIndeterminateProgress();
  }

  if (processResponse.status === 499) {
    throw new VideoExportCancelledError();
  }

  if (!processResponse.ok) {
    const payload = (await processResponse.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new VideoExportFailedError(
      payload?.error ?? "Server video processing failed. Please try again.",
    );
  }

  const processed = (await processResponse.json()) as {
    downloadUrl: string;
    jobId: string;
    outputPath: string;
  };

  return downloadProcessedVideo({
    abortSignal,
    downloadUrl: processed.downloadUrl,
    jobId: processed.jobId,
    onProgress,
    onStageChange,
    outputPath: processed.outputPath,
    shouldCancel,
  });
}
