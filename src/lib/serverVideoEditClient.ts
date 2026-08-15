import {
  getResumeJobIdForVideoUpload,
  uploadVideoWithTus,
} from "./serverVideoTusUpload";
import {
  VideoExportCancelledError,
  VideoExportFailedError,
  VideoExportTimeoutError,
} from "./watermarkVideoExport";
import { resolveVideoUploadContentType } from "./serverVideoExportClient";

const VIDEO_EDIT_UPLOAD_TIMEOUT_MS = 45 * 60 * 1000;
const VIDEO_EDIT_PROCESS_TIMEOUT_MS = 10 * 60 * 1000;

const VIDEO_EDIT_PROGRESS = {
  downloadEnd: 100,
  downloadStart: 82,
  prepare: 2,
  serverEnd: 82,
  serverStart: 58,
  uploadEnd: 58,
  uploadStart: 5,
} as const;

type SharedVideoEditInput = {
  abortSignal?: AbortSignal;
  duration: number;
  fileName: string;
  fileSizeBytes: number;
  height: number;
  onDetailChange?: (detail: string | null) => void;
  onProgress?: (progress: number) => void;
  shouldCancel?: () => boolean;
  videoBlob: Blob;
  width: number;
};

type VideoEditUploadTarget = {
  bucketName: string;
  jobId: string;
  tusEndpoint: string;
  uploadPath: string;
  uploadToken: string;
};

function assertNotCancelled(shouldCancel?: () => boolean) {
  if (shouldCancel?.()) {
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

function startIndeterminateProgress({
  from,
  onProgress,
  shouldCancel,
  to,
}: {
  from: number;
  onProgress?: (progress: number) => void;
  shouldCancel?: () => boolean;
  to: number;
}) {
  let current = from;
  onProgress?.(current);

  const intervalId = window.setInterval(() => {
    if (shouldCancel?.()) {
      return;
    }

    current = Math.min(to, current + 1);
    onProgress?.(current);
  }, 1200);

  return () => {
    window.clearInterval(intervalId);
  };
}

async function fetchVideoEditStep(
  url: string,
  init: RequestInit,
  {
    abortSignal,
    shouldCancel,
    timeoutMessage,
    timeoutMs,
  }: {
    abortSignal?: AbortSignal;
    shouldCancel?: () => boolean;
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
    if (abortSignal?.aborted || shouldCancel?.()) {
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

async function prepareVideoEditUpload({
  abortSignal,
  duration,
  fileName,
  fileSizeBytes,
  height,
  onDetailChange,
  onProgress,
  progressRange,
  shouldCancel,
  storageObjectName,
  videoBlob,
  width,
}: SharedVideoEditInput & {
  progressRange?: { from: number; to: number };
  storageObjectName?: string;
}) {
  assertNotCancelled(shouldCancel);
  onDetailChange?.("Uploading video…");
  onProgress?.(progressRange?.from ?? VIDEO_EDIT_PROGRESS.uploadStart);

  const resumeJobId = getResumeJobIdForVideoUpload(fileName, fileSizeBytes);
  const uploadTargetResponse = await fetchVideoEditStep(
    "/api/watermark/video/edit/upload-url",
    {
      body: JSON.stringify({
        duration,
        fileName,
        fileSizeBytes,
        height,
        resumeJobId,
        storageObjectName,
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
        "Video upload is taking longer than expected. Keep this tab open and try again.",
      timeoutMs: VIDEO_EDIT_UPLOAD_TIMEOUT_MS,
    },
  );

  if (!uploadTargetResponse.ok) {
    const payload = (await uploadTargetResponse.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new VideoExportFailedError(
      payload?.error ??
        "Server video processing is unavailable. Try a shorter clip or use a smaller video.",
    );
  }

  const uploadTarget = (await uploadTargetResponse.json()) as VideoEditUploadTarget;

  assertNotCancelled(shouldCancel);

  const uploadContentType = resolveVideoUploadContentType(
    fileName,
    videoBlob.type,
  );

  await uploadVideoWithTus({
    abortSignal,
    bucketName: uploadTarget.bucketName,
    fileName,
    fileSizeBytes,
    inputFileName: fileName,
    jobId: uploadTarget.jobId,
    onProgress: (progress) => onProgress?.(progress),
    progressRange: progressRange ?? {
      from: VIDEO_EDIT_PROGRESS.uploadStart,
      to: VIDEO_EDIT_PROGRESS.uploadEnd,
    },
    shouldCancel: shouldCancel ?? (() => false),
    tusEndpoint: uploadTarget.tusEndpoint,
    uploadContentType,
    uploadPath: uploadTarget.uploadPath,
    uploadToken: uploadTarget.uploadToken,
    videoBlob,
  });

  return uploadTarget;
}

async function downloadEditedVideo({
  abortSignal,
  downloadUrl,
  jobId,
  onProgress,
  outputPath,
  shouldCancel,
}: {
  abortSignal?: AbortSignal;
  downloadUrl: string;
  jobId: string;
  onProgress?: (progress: number) => void;
  outputPath: string;
  shouldCancel?: () => boolean;
}) {
  assertNotCancelled(shouldCancel);

  const downloadResponse = await fetch(downloadUrl, {
    signal: abortSignal,
  });

  if (!downloadResponse.ok || !downloadResponse.body) {
    throw new VideoExportFailedError(
      "Processed video download failed. Please try again.",
    );
  }

  const contentLength = Number(downloadResponse.headers.get("Content-Length") ?? 0);
  const reader = downloadResponse.body.getReader();
  const chunks: BlobPart[] = [];
  let receivedBytes = 0;

  while (true) {
    assertNotCancelled(shouldCancel);

    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (value) {
      chunks.push(value);
      receivedBytes += value.length;

      if (contentLength > 0) {
        const ratio = receivedBytes / contentLength;
        onProgress?.(
          Math.round(
            VIDEO_EDIT_PROGRESS.downloadStart +
              ratio * (VIDEO_EDIT_PROGRESS.downloadEnd - VIDEO_EDIT_PROGRESS.downloadStart),
          ),
        );
      }
    }
  }

  const editedBlob = new Blob(chunks, { type: "video/mp4" });

  if (!editedBlob.size) {
    throw new VideoExportFailedError(
      "Processed video download was empty. Please try again.",
    );
  }

  onProgress?.(VIDEO_EDIT_PROGRESS.downloadEnd);

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

  return editedBlob;
}

export async function trimVideoOnServer({
  abortSignal,
  duration,
  endSeconds,
  fileName,
  fileSizeBytes,
  height,
  onDetailChange,
  onProgress,
  shouldCancel,
  startSeconds,
  videoBlob,
  width,
}: SharedVideoEditInput & {
  endSeconds: number;
  startSeconds: number;
}) {
  onProgress?.(VIDEO_EDIT_PROGRESS.prepare);

  const uploadTarget = await prepareVideoEditUpload({
    abortSignal,
    duration,
    fileName,
    fileSizeBytes,
    height,
    onDetailChange,
    onProgress,
    shouldCancel,
    videoBlob,
    width,
  });

  assertNotCancelled(shouldCancel);
  onDetailChange?.("Shortening on server…");
  onProgress?.(VIDEO_EDIT_PROGRESS.serverStart);

  const stopIndeterminateProgress = startIndeterminateProgress({
    from: VIDEO_EDIT_PROGRESS.serverStart,
    onProgress,
    shouldCancel,
    to: VIDEO_EDIT_PROGRESS.serverEnd - 1,
  });

  let trimResponse: Response;

  try {
    trimResponse = await fetchVideoEditStep(
      "/api/watermark/video/edit",
      {
        body: JSON.stringify({
          action: "trim",
          endSeconds,
          fileName,
          jobId: uploadTarget.jobId,
          startSeconds,
          videoPath: uploadTarget.uploadPath,
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
          "Video shorten is taking longer than expected. Keep this tab open and try again.",
        timeoutMs: VIDEO_EDIT_PROCESS_TIMEOUT_MS,
      },
    );
  } finally {
    stopIndeterminateProgress();
  }

  if (trimResponse.status === 499) {
    throw new VideoExportCancelledError();
  }

  if (!trimResponse.ok) {
    const payload = (await trimResponse.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new VideoExportFailedError(
      payload?.error ?? "Video shorten failed. Please try again.",
    );
  }

  const payload = (await trimResponse.json()) as {
    downloadUrl: string;
    jobId: string;
    outputPath: string;
  };

  onProgress?.(VIDEO_EDIT_PROGRESS.downloadStart);
  onDetailChange?.("Downloading shortened video…");

  return downloadEditedVideo({
    abortSignal,
    downloadUrl: payload.downloadUrl,
    jobId: payload.jobId,
    onProgress,
    outputPath: payload.outputPath,
    shouldCancel,
  });
}

export async function mergeVideosOnServer({
  abortSignal,
  onDetailChange,
  onProgress,
  shouldCancel,
  videos,
}: {
  abortSignal?: AbortSignal;
  onDetailChange?: (detail: string | null) => void;
  onProgress?: (progress: number) => void;
  shouldCancel?: () => boolean;
  videos: Array<{
    duration: number;
    file: Blob;
    fileName: string;
    fileSizeBytes: number;
    height: number;
    width: number;
  }>;
}) {
  if (videos.length < 2) {
    throw new VideoExportFailedError("Add at least two videos before merging.");
  }

  const mergeJobId = crypto.randomUUID();
  const uploadedVideos: Array<{ fileName: string; videoPath: string }> = [];
  const uploadSpan = VIDEO_EDIT_PROGRESS.uploadEnd - VIDEO_EDIT_PROGRESS.uploadStart;

  onProgress?.(VIDEO_EDIT_PROGRESS.prepare);

  for (let index = 0; index < videos.length; index += 1) {
    const video = videos[index]!;
    const extension = video.fileName.split(".").pop()?.toLowerCase() ?? "mp4";
    const rangeFrom =
      VIDEO_EDIT_PROGRESS.uploadStart + (uploadSpan / videos.length) * index;
    const rangeTo =
      VIDEO_EDIT_PROGRESS.uploadStart + (uploadSpan / videos.length) * (index + 1);
    const uploadTarget = await prepareVideoEditUpload({
      abortSignal,
      duration: video.duration,
      fileName: video.fileName,
      fileSizeBytes: video.fileSizeBytes,
      height: video.height,
      onDetailChange: (detail) =>
        onDetailChange?.(
          detail ??
            `Uploading video ${index + 1} of ${videos.length}…`,
        ),
      onProgress,
      progressRange: { from: rangeFrom, to: rangeTo },
      shouldCancel,
      storageObjectName: `merge-input-${String(index).padStart(2, "0")}.${extension}`,
      videoBlob: video.file,
      width: video.width,
    });

    uploadedVideos.push({
      fileName: video.fileName,
      videoPath: uploadTarget.uploadPath,
    });
  }

  assertNotCancelled(shouldCancel);
  onDetailChange?.("Merging on server…");
  onProgress?.(VIDEO_EDIT_PROGRESS.serverStart);

  const stopIndeterminateProgress = startIndeterminateProgress({
    from: VIDEO_EDIT_PROGRESS.serverStart,
    onProgress,
    shouldCancel,
    to: VIDEO_EDIT_PROGRESS.serverEnd - 1,
  });

  let mergeResponse: Response;

  try {
    mergeResponse = await fetchVideoEditStep(
      "/api/watermark/video/edit",
      {
        body: JSON.stringify({
          action: "merge",
          jobId: mergeJobId,
          videos: uploadedVideos,
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
          "Video merge is taking longer than expected. Keep this tab open and try again.",
        timeoutMs: VIDEO_EDIT_PROCESS_TIMEOUT_MS,
      },
    );
  } finally {
    stopIndeterminateProgress();
  }

  if (mergeResponse.status === 499) {
    throw new VideoExportCancelledError();
  }

  if (!mergeResponse.ok) {
    const payload = (await mergeResponse.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new VideoExportFailedError(
      payload?.error ?? "Video merge failed. Please try again.",
    );
  }

  const payload = (await mergeResponse.json()) as {
    downloadUrl: string;
    jobId: string;
    outputPath: string;
  };

  onProgress?.(VIDEO_EDIT_PROGRESS.downloadStart);
  onDetailChange?.("Downloading merged video…");

  return downloadEditedVideo({
    abortSignal,
    downloadUrl: payload.downloadUrl,
    jobId: payload.jobId,
    onProgress,
    outputPath: payload.outputPath,
    shouldCancel,
  });
}
