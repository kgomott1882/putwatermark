import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const ffmpegCoreVersion = "0.12.6";
const ffmpegCoreBaseUrl = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${ffmpegCoreVersion}/dist/umd`;
const progressStallTimeoutMs = 45_000;
const progressPollIntervalMs = 1_000;

export class VideoExportCancelledError extends Error {
  constructor() {
    super("Video export cancelled.");
    this.name = "VideoExportCancelledError";
  }
}

export class VideoExportTimeoutError extends Error {
  constructor() {
    super(
      "This is taking longer than expected. Try a shorter clip or lower resolution.",
    );
    this.name = "VideoExportTimeoutError";
  }
}

export class VideoExportFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoExportFailedError";
  }
}

type ExportVideoWithOverlayInput = {
  inputFileName: string;
  onProgress: (progress: number) => void;
  overlayPngBytes: Uint8Array;
  shouldCancel: () => boolean;
  videoSource: Blob | string;
};

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

function assertNotCancelled(shouldCancel: () => boolean) {
  if (shouldCancel()) {
    throw new VideoExportCancelledError();
  }
}

async function loadFfmpeg(onProgress: (progress: number) => void) {
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance;
  }

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const ffmpeg = new FFmpeg();

      ffmpeg.on("log", ({ message }) => {
        if (message.toLowerCase().includes("error")) {
          console.warn("[ffmpeg.wasm]", message);
        }
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${ffmpegCoreBaseUrl}/ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${ffmpegCoreBaseUrl}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });

      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })().catch((error) => {
      ffmpegLoadPromise = null;
      ffmpegInstance = null;
      throw error;
    });
  }

  onProgress(2);
  const ffmpeg = await ffmpegLoadPromise;
  onProgress(5);
  return ffmpeg;
}

function getInputExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "mov" || extension === "webm" || extension === "mp4") {
    return extension;
  }

  return "mp4";
}

function createProgressWatcher({
  ffmpeg,
  onProgress,
  shouldCancel,
  timeoutMessageProgressFloor,
}: {
  ffmpeg: FFmpeg;
  onProgress: (progress: number) => void;
  shouldCancel: () => boolean;
  timeoutMessageProgressFloor: number;
}) {
  let lastReportedProgress = timeoutMessageProgressFloor;
  let lastMeaningfulProgressAt = Date.now();
  let rejectWait: ((error: Error) => void) | null = null;

  const waitPromise = new Promise<never>((_, reject) => {
    rejectWait = reject;
  });

  const handleProgress = ({ progress }: { progress: number }) => {
    const normalizedProgress = Number.isFinite(progress)
      ? Math.max(0, Math.min(1, progress))
      : 0;

    if (normalizedProgress > lastReportedProgress + 0.005) {
      lastReportedProgress = normalizedProgress;
      lastMeaningfulProgressAt = Date.now();
    }

    onProgress(Math.min(99, Math.round(5 + normalizedProgress * 94)));
  };

  ffmpeg.on("progress", handleProgress);

  const intervalId = window.setInterval(() => {
    if (shouldCancel()) {
      rejectWait?.(new VideoExportCancelledError());
      return;
    }

    if (Date.now() - lastMeaningfulProgressAt >= progressStallTimeoutMs) {
      rejectWait?.(new VideoExportTimeoutError());
    }
  }, progressPollIntervalMs);

  return {
    waitPromise,
    cleanup: () => {
      window.clearInterval(intervalId);
      ffmpeg.off("progress", handleProgress);
    },
  };
}

export async function exportVideoWithOverlay({
  inputFileName,
  onProgress,
  overlayPngBytes,
  shouldCancel,
  videoSource,
}: ExportVideoWithOverlayInput) {
  assertNotCancelled(shouldCancel);

  const ffmpeg = await loadFfmpeg(onProgress);
  assertNotCancelled(shouldCancel);

  const inputExtension = getInputExtension(inputFileName);
  const inputFile = `input.${inputExtension}`;
  const overlayFile = "overlay.png";
  const outputFile = "output.mp4";

  onProgress(8);

  await ffmpeg.writeFile(inputFile, await fetchFile(videoSource));
  assertNotCancelled(shouldCancel);

  onProgress(12);
  await ffmpeg.writeFile(overlayFile, overlayPngBytes);
  assertNotCancelled(shouldCancel);

  onProgress(15);

  const progressWatcher = createProgressWatcher({
    ffmpeg,
    onProgress,
    shouldCancel,
    timeoutMessageProgressFloor: 0.15,
  });

  try {
    const exitCode = await Promise.race([
      ffmpeg.exec([
        "-i",
        inputFile,
        "-i",
        overlayFile,
        "-filter_complex",
        "[0:v][1:v]overlay=0:0",
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
        outputFile,
      ]),
      progressWatcher.waitPromise,
    ]);

    assertNotCancelled(shouldCancel);

    if (exitCode !== 0) {
      throw new VideoExportFailedError(
        "Video export failed. Please try again with a shorter clip.",
      );
    }

    const outputData = await ffmpeg.readFile(outputFile);

    if (!(outputData instanceof Uint8Array) || outputData.byteLength === 0) {
      throw new VideoExportFailedError(
        "The exported video was empty. Please try again.",
      );
    }

    onProgress(100);

    return new Blob([new Uint8Array(outputData)], { type: "video/mp4" });
  } catch (error) {
    if (
      error instanceof VideoExportCancelledError ||
      error instanceof VideoExportTimeoutError ||
      error instanceof VideoExportFailedError
    ) {
      throw error;
    }

    throw new VideoExportFailedError(
      "Video export failed. Please try again with a shorter clip.",
    );
  } finally {
    progressWatcher.cleanup();

    await Promise.allSettled([
      ffmpeg.deleteFile(inputFile),
      ffmpeg.deleteFile(overlayFile),
      ffmpeg.deleteFile(outputFile),
    ]);
  }
}

export function cancelVideoExportWorker() {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
  }

  ffmpegLoadPromise = null;
}

export function getVideoExportFileName(fileName: string) {
  const fallbackName = "watermarked-video";
  const baseName = fileName.trim()
    ? fileName.replace(/\.[^/.]+$/, "")
    : fallbackName;

  return `${baseName || fallbackName}-watermarked.mp4`;
}

export {
  getVideoExportRejectionMessage,
  getVideoExportRoute,
  isAnyVideoExportEligible,
  isClientVideoExportEligible,
  isServerVideoExportEligible,
} from "./videoExportLimits";

import { isClientVideoExportEligible } from "./videoExportLimits";

/** @deprecated Use isClientVideoExportEligible from videoExportLimits */
export function isVideoExportEligible(
  duration: number,
  width: number,
  height: number,
) {
  return isClientVideoExportEligible(duration, width, height);
}
