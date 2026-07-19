import { VideoExportCancelledError, VideoExportFailedError } from "./watermarkVideoExport";

export type ServerVideoExportStage =
  | "downloading"
  | "preparing"
  | "processing"
  | "uploading";

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

function getVideoUploadErrorMessage(responseText: string, status: number) {
  let payload: {
    error?: string;
    message?: string;
    statusCode?: number | string;
  } | null = null;

  if (responseText.trim()) {
    try {
      payload = JSON.parse(responseText) as {
        error?: string;
        message?: string;
        statusCode?: number | string;
      };
    } catch {
      payload = null;
    }
  }

  const statusCode = Number(payload?.statusCode ?? status);
  const errorCode = payload?.error?.toLowerCase() ?? "";

  if (statusCode === 413 || errorCode === "payload too large") {
    return "Video too large — video uploads are currently limited to ~50MB. Larger video support is coming soon.";
  }

  if (payload?.message) {
    return `Video upload failed: ${payload.message}`;
  }

  if (payload?.error) {
    return `Video upload failed: ${payload.error}`;
  }

  return `Video upload failed (HTTP ${status}). Please try again.`;
}

type ExportVideoOnServerInput = {
  abortSignal?: AbortSignal;
  duration: number;
  fileSizeBytes: number;
  height: number;
  inputFileName: string;
  onProgress: (progress: number) => void;
  onStageChange: (stage: ServerVideoExportStage) => void;
  overlayPngBytes: Uint8Array;
  shouldCancel: () => boolean;
  videoBlob: Blob;
  width: number;
};

function assertNotCancelled(shouldCancel: () => boolean) {
  if (shouldCancel()) {
    throw new VideoExportCancelledError();
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

function uploadBlobWithProgress({
  abortSignal,
  blob,
  contentType,
  onProgress,
  uploadUrl,
}: {
  abortSignal?: AbortSignal;
  blob: Blob;
  contentType: string;
  onProgress: (progress: number) => void;
  uploadUrl: string;
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 40));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(
        new VideoExportFailedError(
          getVideoUploadErrorMessage(xhr.responseText, xhr.status),
        ),
      );
    };

    xhr.onerror = () => {
      reject(
        new VideoExportFailedError(
          "Video upload failed. Please check your connection and try again.",
        ),
      );
    };

    xhr.onabort = () => {
      reject(new VideoExportCancelledError());
    };

    abortSignal?.addEventListener(
      "abort",
      () => {
        xhr.abort();
      },
      { once: true },
    );

    xhr.send(blob);
  });
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

export async function exportVideoOnServer({
  abortSignal,
  duration,
  fileSizeBytes,
  height,
  inputFileName,
  onProgress,
  onStageChange,
  overlayPngBytes,
  shouldCancel,
  videoBlob,
  width,
}: ExportVideoOnServerInput) {
  assertNotCancelled(shouldCancel);
  onStageChange("preparing");
  onProgress(2);

  const uploadTargetResponse = await fetch("/api/watermark/video/upload-url", {
    body: JSON.stringify({
      duration,
      fileName: inputFileName,
      fileSizeBytes,
      height,
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
    jobId: string;
    uploadPath: string;
    uploadUrl: string;
  };

  assertNotCancelled(shouldCancel);
  onStageChange("uploading");
  onProgress(5);

  const uploadContentType = resolveVideoUploadContentType(
    inputFileName,
    videoBlob.type,
  );
  const uploadBlob =
    videoBlob.type === uploadContentType
      ? videoBlob
      : new Blob([videoBlob], { type: uploadContentType });

  await uploadBlobWithProgress({
    abortSignal,
    blob: uploadBlob,
    contentType: uploadContentType,
    onProgress,
    uploadUrl: uploadTarget.uploadUrl,
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
    processResponse = await fetch("/api/watermark/video", {
      body: JSON.stringify({
        inputFileName,
        jobId: uploadTarget.jobId,
        overlayBase64: uint8ArrayToBase64(overlayPngBytes),
        videoPath: uploadTarget.uploadPath,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: abortSignal,
    });
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

  assertNotCancelled(shouldCancel);
  onStageChange("downloading");
  onProgress(92);

  const downloadResponse = await fetch(processed.downloadUrl, {
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
      jobId: processed.jobId,
      outputPath: processed.outputPath,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    keepalive: true,
    method: "POST",
  });

  return exportedBlob;
}
