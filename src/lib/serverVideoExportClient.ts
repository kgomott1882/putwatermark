import { VideoExportCancelledError, VideoExportFailedError } from "./watermarkVideoExport";

export type ServerVideoExportStage =
  | "downloading"
  | "preparing"
  | "processing"
  | "uploading";

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
  onProgress,
  uploadUrl,
}: {
  abortSignal?: AbortSignal;
  blob: Blob;
  onProgress: (progress: number) => void;
  uploadUrl: string;
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", blob.type || "application/octet-stream");

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
          "Video upload failed. Please try again with a smaller clip.",
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

  await uploadBlobWithProgress({
    abortSignal,
    blob: videoBlob,
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
