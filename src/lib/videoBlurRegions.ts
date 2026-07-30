import {
  applyBlurStrokes,
  type BlurStroke,
} from "./blurBrush";
import type { VideoOverlayPass } from "./watermarkVideoExport";
import {
  getVideoElementFrameInCanvas,
  getVideoNaturalDimensions,
  mapClientPointToVideoNatural,
} from "./videoDisplayFrame";
import {
  clampVisibilityEndSeconds,
  clampVisibilityStartSeconds,
  formatTimelineClock,
} from "./videoTimeline";

export type VideoBlurRegion = {
  id: string;
  label: string;
  strokes: BlurStroke[];
  visibleFromSeconds: number;
  visibleUntilSeconds: number;
};

export function createVideoBlurRegionId() {
  return `vblur-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultVideoBlurRegion(
  durationSeconds: number,
  index: number,
): VideoBlurRegion {
  return {
    id: createVideoBlurRegionId(),
    label: `Blur ${index + 1}`,
    strokes: [],
    visibleFromSeconds: 0,
    visibleUntilSeconds: durationSeconds > 0 ? durationSeconds : 1,
  };
}

export function isVideoBlurRegionActive(region: VideoBlurRegion) {
  return region.strokes.length > 0;
}

export function isVideoBlurRegionVisibleAtTime(
  region: VideoBlurRegion,
  timeSeconds: number,
) {
  return (
    timeSeconds >= region.visibleFromSeconds &&
    timeSeconds < region.visibleUntilSeconds
  );
}

export function getVideoBlurRegionsVisibleAtTime(
  regions: readonly VideoBlurRegion[],
  timeSeconds: number,
) {
  return regions.filter(
    (region) =>
      region.strokes.length > 0 &&
      isVideoBlurRegionVisibleAtTime(region, timeSeconds),
  );
}

export function getVideoBlurRegionTimingLabel(
  region: VideoBlurRegion,
  durationSeconds: number,
) {
  const end = region.visibleUntilSeconds ?? durationSeconds;

  return `${formatTimelineClock(region.visibleFromSeconds)} – ${formatTimelineClock(end)}`;
}

export function updateVideoBlurRegionTiming(
  region: VideoBlurRegion,
  patch: {
    visibleFromSeconds?: number;
    visibleUntilSeconds?: number;
  },
  durationSeconds: number,
): VideoBlurRegion {
  const nextStart =
    patch.visibleFromSeconds !== undefined
      ? clampVisibilityStartSeconds(
          patch.visibleFromSeconds,
          patch.visibleUntilSeconds ?? region.visibleUntilSeconds,
          durationSeconds,
        )
      : region.visibleFromSeconds;
  const nextEnd =
    patch.visibleUntilSeconds !== undefined
      ? clampVisibilityEndSeconds(
          patch.visibleUntilSeconds,
          nextStart,
          durationSeconds,
        )
      : region.visibleUntilSeconds;

  return {
    ...region,
    visibleFromSeconds: nextStart,
    visibleUntilSeconds: nextEnd,
  };
}

export function seekVideoElement(
  video: HTMLVideoElement,
  seconds: number,
): Promise<void> {
  return new Promise((resolve) => {
    if (video.readyState < 2) {
      const onLoaded = () => {
        video.removeEventListener("loadeddata", onLoaded);
        void seekVideoElement(video, seconds).then(resolve);
      };

      video.addEventListener("loadeddata", onLoaded);
      return;
    }

    if (Math.abs(video.currentTime - seconds) < 0.04) {
      resolve();
      return;
    }

    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };

    video.addEventListener("seeked", onSeeked);
    video.currentTime = seconds;
    window.setTimeout(() => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    }, 4000);
  });
}

export function renderVideoBlurRegionOverlayCanvas(
  video: HTMLVideoElement,
  region: VideoBlurRegion,
  fallbackWidth: number,
  fallbackHeight: number,
  captureTimeSeconds: number,
) {
  const { height, width } = getVideoNaturalDimensions(
    video,
    fallbackWidth,
    fallbackHeight,
  );
  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.width = Math.max(1, width);
  overlayCanvas.height = Math.max(1, height);
  const context = overlayCanvas.getContext("2d");

  if (!context || region.strokes.length === 0) {
    return overlayCanvas;
  }

  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = Math.max(1, width);
  frameCanvas.height = Math.max(1, height);
  const frameContext = frameCanvas.getContext("2d");

  if (!frameContext) {
    return overlayCanvas;
  }

  frameContext.drawImage(video, 0, 0, width, height);
  context.clearRect(0, 0, width, height);
  applyBlurStrokes(context, {
    destHeight: height,
    destWidth: width,
    destX: 0,
    destY: 0,
    source: frameCanvas,
    sourceHeight: height,
    sourceWidth: width,
    strokes: region.strokes,
  });

  void captureTimeSeconds;

  return overlayCanvas;
}

export async function buildVideoBlurOverlayPass(
  video: HTMLVideoElement,
  region: VideoBlurRegion,
  width: number,
  height: number,
  canvasToPngBytes: (canvas: HTMLCanvasElement) => Promise<Uint8Array>,
) {
  const captureTime =
    region.visibleFromSeconds +
    (region.visibleUntilSeconds - region.visibleFromSeconds) / 2;

  await seekVideoElement(video, captureTime);

  const overlayCanvas = renderVideoBlurRegionOverlayCanvas(
    video,
    region,
    width,
    height,
    captureTime,
  );

  return {
    overlayPngBytes: await canvasToPngBytes(overlayCanvas),
    visibleFromSeconds: region.visibleFromSeconds,
    visibleUntilSeconds: region.visibleUntilSeconds,
  };
}

export async function appendVideoBlurRegionPasses(
  passes: VideoOverlayPass[],
  regions: readonly VideoBlurRegion[],
  video: HTMLVideoElement,
  width: number,
  height: number,
  canvasToPngBytes: (canvas: HTMLCanvasElement) => Promise<Uint8Array>,
) {
  const exportableRegions = regions.filter((region) => region.strokes.length > 0);

  if (exportableRegions.length === 0) {
    return passes;
  }

  const savedTime = video.currentTime;
  const wasPaused = video.paused;
  video.pause();

  for (const region of exportableRegions) {
    passes.push(
      await buildVideoBlurOverlayPass(
        video,
        region,
        width,
        height,
        canvasToPngBytes,
      ),
    );
  }

  video.currentTime = savedTime;

  if (!wasPaused) {
    void video.play();
  }

  return passes;
}

export function getVideoBlurRegionsForPreview(
  regions: readonly VideoBlurRegion[],
  timeSeconds: number,
  editing = false,
) {
  if (editing) {
    return regions.filter((region) => region.strokes.length > 0);
  }

  return getVideoBlurRegionsVisibleAtTime(regions, timeSeconds);
}

export function drawVideoBlurPreview(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  regions: readonly VideoBlurRegion[],
  timeSeconds: number,
  fallbackWidth: number,
  fallbackHeight: number,
  editing = false,
) {
  const visibleRegions = getVideoBlurRegionsForPreview(
    regions,
    timeSeconds,
    editing,
  );

  if (visibleRegions.length === 0 || video.readyState < 2) {
    return;
  }

  const { height: naturalHeight, width: naturalWidth } = getVideoNaturalDimensions(
    video,
    fallbackWidth,
    fallbackHeight,
  );
  const frame = getVideoElementFrameInCanvas(canvas, video);

  if (frame.width <= 0 || frame.height <= 0) {
    return;
  }

  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = Math.max(1, naturalWidth);
  frameCanvas.height = Math.max(1, naturalHeight);
  const frameContext = frameCanvas.getContext("2d");

  if (!frameContext) {
    return;
  }

  frameContext.drawImage(video, 0, 0, naturalWidth, naturalHeight);

  for (const region of visibleRegions) {
    applyBlurStrokes(context, {
      destHeight: frame.height,
      destWidth: frame.width,
      destX: frame.x,
      destY: frame.y,
      source: frameCanvas,
      sourceHeight: naturalHeight,
      sourceWidth: naturalWidth,
      strokes: region.strokes,
    });
  }
}
