import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { FFMPEG_ASSET_CACHE_BUST } from "./ffmpegCrossOriginIsolation";
import { adjustOverlayPassesForTrim } from "./videoTrim";
import {
  buildOverlayFilterComplex,
  buildOverlayImageInputArgs,
  overlayPassesNeedExplicitVideoMap,
  type VideoOverlayPass,
} from "./videoOverlayPasses";

export type { VideoOverlayPass } from "./videoOverlayPasses";

const ffmpegCoreVersion = "0.12.6";
const selfHostedFfmpegBasePath = "/ffmpeg";
const progressPollIntervalMs = 1_000;
const exportEncodingStallTimeoutMs = 45_000;
const ffmpegCoreLoadStepTimeoutMs = 60_000;

export type FfmpegLoadMode = "multi-threaded" | "single-threaded";

export type FfmpegProgressPhase =
  | "loading-core"
  | "writing-input"
  | "encoding"
  | "reading-output";

export class VideoExportCancelledError extends Error {
  constructor() {
    super("Video export cancelled.");
    this.name = "VideoExportCancelledError";
  }
}

export class VideoExportTimeoutError extends Error {
  constructor(message?: string) {
    super(
      message ??
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

export class FfmpegCoreLoadError extends Error {
  step: string;

  constructor(step: string, message: string, options?: { cause?: unknown }) {
    super(`Failed to load ffmpeg core (${step}): ${message}`);
    this.name = "FfmpegCoreLoadError";
    this.step = step;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

type ExportVideoWithOverlayInput = {
  inputFileName: string;
  onProgress: (progress: number) => void;
  overlayPasses?: VideoOverlayPass[];
  overlayPngBytes?: Uint8Array;
  shouldCancel: () => boolean;
  trimEndSeconds?: number;
  trimStartSeconds?: number;
  videoSource: Blob | string;
};

type LoadFfmpegOptions = {
  logLabel?: string;
  onProgress?: (progress: number) => void;
  preferMultiThreaded?: boolean;
};

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;
let ffmpegLoadMode: FfmpegLoadMode | null = null;

function assertNotCancelled(shouldCancel: () => boolean) {
  if (shouldCancel()) {
    throw new VideoExportCancelledError();
  }
}

export function canUseMultiThreadedFfmpegCore() {
  return typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
}

export function getFfmpegLoadMode() {
  return ffmpegLoadMode;
}

export function getFfmpegThreadCount() {
  const cores =
    typeof navigator !== "undefined" ? navigator.hardwareConcurrency : undefined;

  return Math.max(1, Math.min(4, cores || 4));
}

export function mapFfmpegProgress(phase: FfmpegProgressPhase, ratio: number) {
  const normalizedRatio = Math.max(0, Math.min(1, ratio));
  const ranges: Record<FfmpegProgressPhase, [number, number]> = {
    "loading-core": [0, 10],
    "writing-input": [10, 25],
    encoding: [25, 95],
    "reading-output": [95, 99],
  };
  const [start, end] = ranges[phase];

  return Math.round(start + normalizedRatio * (end - start));
}

function attachFfmpegLogging(ffmpeg: FFmpeg, logLabel: string) {
  ffmpeg.on("log", ({ type, message }) => {
    const normalizedMessage = message.trim();

    if (!normalizedMessage) {
      return;
    }

    if (
      type === "fferr" ||
      normalizedMessage.toLowerCase().includes("error")
    ) {
      console.error(`[${logLabel}]`, normalizedMessage);
      return;
    }

    console.log(`[${logLabel}]`, normalizedMessage);
  });
}

function getSelfHostedCoreBasePath(useMultiThreaded: boolean) {
  const variant = useMultiThreaded ? "core-mt" : "core";
  return `${selfHostedFfmpegBasePath}/${variant}/${ffmpegCoreVersion}`;
}

function getCoreAssetUrls(useMultiThreaded: boolean) {
  const basePath = getSelfHostedCoreBasePath(useMultiThreaded);

  return {
    coreURL: `${basePath}/ffmpeg-core.js`,
    wasmURL: `${basePath}/ffmpeg-core.wasm`,
    workerURL: useMultiThreaded ? `${basePath}/ffmpeg-core.worker.js` : undefined,
  };
}

function resolveBrowserSameOriginUrl(relativePath: string) {
  if (typeof window === "undefined") {
    throw new FfmpegCoreLoadError(
      "resolve asset url",
      "ffmpeg can only be loaded in the browser",
    );
  }

  // @ffmpeg/ffmpeg builds the orchestration worker as:
  //   new Worker(new URL(classWorkerURL, import.meta.url), { type: "module" })
  // Bundled import.meta.url can be file://, so a path-only classWorkerURL like
  // "/ffmpeg/worker/worker.js" becomes file:///ffmpeg/worker/worker.js.
  // A full http(s) URL is used as-is and stays same-origin in the browser.
  const url = new URL(relativePath, window.location.origin);
  url.searchParams.set("pw", FFMPEG_ASSET_CACHE_BUST);
  return url.href;
}

async function withCoreLoadStepTimeout<T>(
  step: string,
  logLabel: string,
  promise: Promise<T>,
  timeoutMs = ffmpegCoreLoadStepTimeoutMs,
) {
  const startedAt = Date.now();
  console.info(`[${logLabel}] core load step started: ${step}`);

  let timeoutId: number | undefined;

  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(
            new FfmpegCoreLoadError(
              step,
              `Timed out after ${Math.round(timeoutMs / 1000)}s`,
            ),
          );
        }, timeoutMs);
      }),
    ]);

    console.info(`[${logLabel}] core load step finished: ${step}`, {
      elapsedMs: Date.now() - startedAt,
    });

    return result;
  } catch (error) {
    console.error(`[${logLabel}] core load step failed: ${step}`, {
      elapsedMs: Date.now() - startedAt,
      error,
    });

    if (error instanceof FfmpegCoreLoadError) {
      throw error;
    }

    throw new FfmpegCoreLoadError(
      step,
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function verifySelfHostedCoreAsset(
  step: string,
  logLabel: string,
  url: string,
) {
  await withCoreLoadStepTimeout(
    step,
    logLabel,
    (async () => {
      const response = await fetch(url, { method: "HEAD" });

      if (!response.ok) {
        throw new FfmpegCoreLoadError(
          step,
          `Asset not reachable (${response.status} ${response.statusText}) at ${url}`,
        );
      }

      const contentLength = response.headers.get("content-length");
      console.info(`[${logLabel}] core asset reachable`, {
        step,
        url,
        contentLength: contentLength ? Number(contentLength) : null,
      });
    })(),
    15_000,
  );
}

async function loadFfmpegCore(
  ffmpeg: FFmpeg,
  useMultiThreaded: boolean,
  logLabel: string,
  reportProgress?: (ratio: number) => void,
) {
  const assetUrls = getCoreAssetUrls(useMultiThreaded);
  const loadConfig: {
    classWorkerURL: string;
    coreURL: string;
    wasmURL: string;
    workerURL?: string;
  } = {
    classWorkerURL: resolveBrowserSameOriginUrl(
      `${selfHostedFfmpegBasePath}/worker/worker.js`,
    ),
    coreURL: resolveBrowserSameOriginUrl(assetUrls.coreURL),
    wasmURL: resolveBrowserSameOriginUrl(assetUrls.wasmURL),
  };

  if (assetUrls.workerURL) {
    loadConfig.workerURL = resolveBrowserSameOriginUrl(assetUrls.workerURL);
  }

  console.info(`[${logLabel}] loading ffmpeg core`, {
    assetSource: "self-hosted",
    classWorkerURL: loadConfig.classWorkerURL,
    coreURL: loadConfig.coreURL,
    crossOriginIsolated:
      typeof crossOriginIsolated !== "undefined" ? crossOriginIsolated : null,
    mode: useMultiThreaded ? "multi-threaded" : "single-threaded",
    version: ffmpegCoreVersion,
    wasmURL: loadConfig.wasmURL,
    workerURL: loadConfig.workerURL ?? null,
  });

  reportProgress?.(0.1);
  await verifySelfHostedCoreAsset("verify ffmpeg-core.js", logLabel, loadConfig.coreURL);

  reportProgress?.(0.25);
  await verifySelfHostedCoreAsset("verify ffmpeg-core.wasm", logLabel, loadConfig.wasmURL);

  if (loadConfig.workerURL) {
    reportProgress?.(0.4);
    await verifySelfHostedCoreAsset(
      "verify ffmpeg-core.worker.js",
      logLabel,
      loadConfig.workerURL,
    );
  }

  reportProgress?.(0.55);
  await verifySelfHostedCoreAsset(
    "verify ffmpeg class worker",
    logLabel,
    loadConfig.classWorkerURL,
  );

  reportProgress?.(0.7);
  await withCoreLoadStepTimeout(
    "initialize ffmpeg worker and compile wasm",
    logLabel,
    ffmpeg.load(loadConfig),
  );

  ffmpegLoadMode = useMultiThreaded ? "multi-threaded" : "single-threaded";
  reportProgress?.(1);
  console.info(`[${logLabel}] ffmpeg core ready`, {
    assetSource: "self-hosted",
    mode: ffmpegLoadMode,
    threads: getFfmpegThreadCount(),
  });
}

export async function loadFfmpeg(
  onProgress: (progress: number) => void,
  options: LoadFfmpegOptions = {},
) {
  const logLabel = options.logLabel ?? "ffmpeg.wasm";
  const reportProgress = options.onProgress ?? onProgress;
  const preferMultiThreaded =
    options.preferMultiThreaded !== false && canUseMultiThreadedFfmpegCore();

  if (ffmpegInstance?.loaded) {
    reportProgress(mapFfmpegProgress("loading-core", 1));
    return ffmpegInstance;
  }

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      let ffmpeg = new FFmpeg();
      attachFfmpegLogging(ffmpeg, logLabel);

      const reportCoreProgress = (ratio: number) => {
        reportProgress(mapFfmpegProgress("loading-core", ratio));
      };

      if (preferMultiThreaded) {
        try {
          await loadFfmpegCore(ffmpeg, true, logLabel, reportCoreProgress);
        } catch (error) {
          console.warn(
            `[${logLabel}] multi-threaded core failed, falling back`,
            error,
          );
          ffmpeg.terminate();
          ffmpeg = new FFmpeg();
          attachFfmpegLogging(ffmpeg, logLabel);
          await loadFfmpegCore(ffmpeg, false, logLabel, reportCoreProgress);
        }
      } else {
        if (options.preferMultiThreaded !== false) {
          console.info(
            `[${logLabel}] crossOriginIsolated is false; using single-threaded core`,
          );
        }

        await loadFfmpegCore(ffmpeg, false, logLabel, reportCoreProgress);
      }

      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })().catch((error) => {
      ffmpegLoadPromise = null;
      ffmpegInstance = null;
      ffmpegLoadMode = null;

      if (error instanceof FfmpegCoreLoadError) {
        console.error(`[${logLabel}] ffmpeg core load failed at ${error.step}`, error);
      } else {
        console.error(`[${logLabel}] ffmpeg core load failed`, error);
      }

      throw error;
    });
  }

  reportProgress(mapFfmpegProgress("loading-core", 0.05));
  const ffmpeg = await ffmpegLoadPromise;
  reportProgress(mapFfmpegProgress("loading-core", 1));
  return ffmpeg;
}

export function createFfmpegOperationTimeout({
  hardTimeoutMs,
  onTimeout,
  shouldCancel,
}: {
  hardTimeoutMs: number;
  onTimeout: () => Error;
  shouldCancel: () => boolean;
}) {
  const startedAt = Date.now();
  let rejectWait: ((error: Error) => void) | null = null;

  const waitPromise = new Promise<never>((_, reject) => {
    rejectWait = reject;
  });

  const intervalId = window.setInterval(() => {
    if (shouldCancel()) {
      rejectWait?.(new VideoExportCancelledError());
      return;
    }

    if (Date.now() - startedAt >= hardTimeoutMs) {
      rejectWait?.(onTimeout());
    }
  }, progressPollIntervalMs);

  return {
    elapsedMs: () => Date.now() - startedAt,
    waitPromise,
    cleanup: () => {
      window.clearInterval(intervalId);
    },
  };
}

export function createFfmpegEncodingProgressTracker({
  ffmpeg,
  logLabel,
  onProgress,
  shouldCancel,
  stallTimeoutMs,
  timeoutMessage,
}: {
  ffmpeg: FFmpeg;
  logLabel: string;
  onProgress: (progress: number) => void;
  shouldCancel: () => boolean;
  stallTimeoutMs: number;
  timeoutMessage?: string;
}) {
  let lastEncodingRatio = 0;
  let lastMeaningfulProgressAt = Date.now();
  let rejectWait: ((error: Error) => void) | null = null;

  const waitPromise = new Promise<never>((_, reject) => {
    rejectWait = reject;
  });

  const handleProgress = ({
    progress,
    time,
  }: {
    progress: number;
    time?: number;
  }) => {
    const normalizedProgress = Number.isFinite(progress)
      ? Math.max(0, Math.min(1, progress))
      : 0;

    if (normalizedProgress > lastEncodingRatio + 0.002) {
      lastEncodingRatio = normalizedProgress;
      lastMeaningfulProgressAt = Date.now();
    }

    const uiProgress = mapFfmpegProgress("encoding", normalizedProgress);
    console.log(`[${logLabel}] encoding progress`, {
      ratio: normalizedProgress,
      time,
      uiProgress,
    });
    onProgress(uiProgress);
  };

  ffmpeg.on("progress", handleProgress);

  const intervalId = window.setInterval(() => {
    if (shouldCancel()) {
      rejectWait?.(new VideoExportCancelledError());
      return;
    }

    const stalledForMs = Date.now() - lastMeaningfulProgressAt;

    if (stalledForMs >= stallTimeoutMs) {
      console.warn(`[${logLabel}] encoding progress stalled`, {
        lastEncodingRatio,
        stalledForMs,
      });
      rejectWait?.(
        new VideoExportTimeoutError(
          timeoutMessage ??
            "This is taking longer than expected. Try a shorter clip or lower resolution.",
        ),
      );
    }
  }, progressPollIntervalMs);

  return {
    waitPromise,
    resetStallClock: () => {
      lastMeaningfulProgressAt = Date.now();
    },
    cleanup: () => {
      window.clearInterval(intervalId);
      ffmpeg.off("progress", handleProgress);
    },
  };
}

/** @deprecated Use createFfmpegEncodingProgressTracker */
export function createProgressWatcher({
  ffmpeg,
  onProgress,
  shouldCancel,
}: {
  ffmpeg: FFmpeg;
  onProgress: (progress: number) => void;
  shouldCancel: () => boolean;
  timeoutMessageProgressFloor?: number;
}) {
  return createFfmpegEncodingProgressTracker({
    ffmpeg,
    logLabel: "ffmpeg.wasm export",
    onProgress,
    shouldCancel,
    stallTimeoutMs: exportEncodingStallTimeoutMs,
  });
}

function getInputExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "mov" || extension === "webm" || extension === "mp4") {
    return extension;
  }

  return "mp4";
}

function getFfmpegExecThreadArgs() {
  if (ffmpegLoadMode !== "multi-threaded") {
    return [];
  }

  return ["-threads", String(getFfmpegThreadCount())];
}

export async function exportVideoWithOverlay({
  inputFileName,
  onProgress,
  overlayPasses,
  overlayPngBytes,
  shouldCancel,
  trimEndSeconds,
  trimStartSeconds = 0,
  videoSource,
}: ExportVideoWithOverlayInput) {
  assertNotCancelled(shouldCancel);

  const rawPasses =
    overlayPasses ??
    (overlayPngBytes
      ? [
          {
            overlayPngBytes,
          },
        ]
      : null);

  console.log("[real-video-export] STEP 14a/15: exportVideoWithOverlay() entered", {
    inputFileName,
    overlayPassCount: rawPasses?.length ?? 0,
    overlayPassSummaries: rawPasses?.map((pass, index) => ({
      index,
      overlayPngByteLength: pass.overlayPngBytes.byteLength,
      visibleFromSeconds: pass.visibleFromSeconds ?? null,
      visibleUntilSeconds: pass.visibleUntilSeconds ?? null,
    })),
    trimEndSeconds: trimEndSeconds ?? null,
    trimStartSeconds,
  });

  if (!rawPasses?.length) {
    throw new VideoExportFailedError(
      "Video export is missing a watermark overlay.",
    );
  }

  const trimStart = Math.max(0, trimStartSeconds);
  const trimEnd = trimEndSeconds;
  const trimDuration =
    trimEnd !== undefined ? Math.max(0, trimEnd - trimStart) : undefined;
  const passes =
    trimEnd !== undefined
      ? adjustOverlayPassesForTrim(rawPasses, trimStart, trimEnd)
      : rawPasses;

  if (!passes.length) {
    throw new VideoExportFailedError(
      "Nothing is visible in the selected export range. Adjust trim or layer timing.",
    );
  }

  onProgress(mapFfmpegProgress("loading-core", 0));
  const ffmpeg = await loadFfmpeg(onProgress, { logLabel: "ffmpeg export" });
  assertNotCancelled(shouldCancel);

  const inputExtension = getInputExtension(inputFileName);
  const inputFile = `input.${inputExtension}`;
  const outputFile = "output.mp4";
  const overlayFiles = passes.map((_, index) => `overlay-${index}.png`);

  onProgress(mapFfmpegProgress("writing-input", 0));
  await ffmpeg.writeFile(inputFile, await fetchFile(videoSource));
  assertNotCancelled(shouldCancel);

  for (let index = 0; index < passes.length; index += 1) {
    onProgress(
      mapFfmpegProgress(
        "writing-input",
        (index + 0.5) / Math.max(passes.length, 1),
      ),
    );
    console.log("[real-video-export] STEP 14b/15: ffmpeg writing overlay PNG", {
      index,
      overlayFile: overlayFiles[index],
      overlayPngByteLength: passes[index]!.overlayPngBytes.byteLength,
      totalPasses: passes.length,
    });
    await ffmpeg.writeFile(overlayFiles[index]!, passes[index]!.overlayPngBytes);
    assertNotCancelled(shouldCancel);
  }

  onProgress(mapFfmpegProgress("writing-input", 1));

  const progressWatcher = createFfmpegEncodingProgressTracker({
    ffmpeg,
    logLabel: "ffmpeg export",
    onProgress,
    shouldCancel,
    stallTimeoutMs: exportEncodingStallTimeoutMs,
  });

  const filterComplex = buildOverlayFilterComplex(passes);
  const ffmpegArgs = [
    ...getFfmpegExecThreadArgs(),
    ...(trimStart > 0 ? ["-ss", trimStart.toFixed(3)] : []),
    "-i",
    inputFile,
    ...passes.flatMap((_, index) => buildOverlayImageInputArgs([overlayFiles[index]!])),
    "-filter_complex",
    filterComplex,
  ];

  if (trimDuration !== undefined && trimDuration > 0) {
    ffmpegArgs.push("-t", trimDuration.toFixed(3));
  }

  if (overlayPassesNeedExplicitVideoMap(passes)) {
    ffmpegArgs.push("-map", "[vout]", "-map", "0:a?");
  }

  ffmpegArgs.push(
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
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
  );

  try {
    const exitCode = await Promise.race([
      ffmpeg.exec(ffmpegArgs),
      progressWatcher.waitPromise,
    ]);

    assertNotCancelled(shouldCancel);

    if (exitCode !== 0) {
      throw new VideoExportFailedError(
        "Video export failed. Please try again with a shorter clip.",
      );
    }

    onProgress(mapFfmpegProgress("reading-output", 0));
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

    console.error("[ffmpeg export] unexpected failure", error);
    throw new VideoExportFailedError(
      "Video export failed. Please try again with a shorter clip.",
    );
  } finally {
    progressWatcher.cleanup();

    await Promise.allSettled([
      ffmpeg.deleteFile(inputFile),
      ...overlayFiles.map((file) => ffmpeg.deleteFile(file)),
      ffmpeg.deleteFile(outputFile),
    ]);
  }
}

export function cancelVideoExportWorker() {
  if (ffmpegInstance) {
    console.warn("[ffmpeg.wasm] terminating worker");
    ffmpegInstance.terminate();
    ffmpegInstance = null;
  }

  ffmpegLoadPromise = null;
  ffmpegLoadMode = null;
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
  isMobileVideoExportDevice,
  isServerSideVideoExportRoute,
  isServerVideoExportEligible,
  resolveVideoExportRoute,
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
