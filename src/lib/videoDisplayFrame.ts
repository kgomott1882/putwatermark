export type VideoDisplayFrame = {
  height: number;
  width: number;
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getVideoDisplayFrame(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number,
): VideoDisplayFrame {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    videoWidth <= 0 ||
    videoHeight <= 0
  ) {
    return {
      height: Math.max(1, containerHeight),
      width: Math.max(1, containerWidth),
      x: 0,
      y: 0,
    };
  }

  const containerAspect = containerWidth / containerHeight;
  const videoAspect = videoWidth / videoHeight;

  if (videoAspect > containerAspect) {
    const width = containerWidth;
    const height = containerWidth / videoAspect;

    return {
      height,
      width,
      x: 0,
      y: (containerHeight - height) / 2,
    };
  }

  const height = containerHeight;
  const width = containerHeight * videoAspect;

  return {
    height,
    width,
    x: (containerWidth - width) / 2,
    y: 0,
  };
}

export function getMediaFitPreviewSize(
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number,
) {
  const frame = getVideoDisplayFrame(
    containerWidth,
    containerHeight,
    mediaWidth,
    mediaHeight,
  );

  return {
    height: Math.max(240, Math.floor(frame.height)),
    width: Math.max(240, Math.floor(frame.width)),
  };
}

export function getVideoNaturalDimensions(
  video: HTMLVideoElement,
  fallbackWidth: number,
  fallbackHeight: number,
) {
  return {
    height: video.videoHeight > 0 ? video.videoHeight : fallbackHeight,
    width: video.videoWidth > 0 ? video.videoWidth : fallbackWidth,
  };
}

export function getVideoElementFrameInCanvas(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
): VideoDisplayFrame {
  const canvasRect = canvas.getBoundingClientRect();
  const videoRect = video.getBoundingClientRect();
  const displayWidth = canvas.clientWidth || canvasRect.width || 1;
  const displayHeight = canvas.clientHeight || canvasRect.height || 1;
  const scaleX = canvas.width / displayWidth;
  const scaleY = canvas.height / displayHeight;

  return {
    x: (videoRect.left - canvasRect.left) * scaleX,
    y: (videoRect.top - canvasRect.top) * scaleY,
    width: videoRect.width * scaleX,
    height: videoRect.height * scaleY,
  };
}

export function mapClientPointToVideoNatural(
  clientX: number,
  clientY: number,
  video: HTMLVideoElement,
  naturalWidth: number,
  naturalHeight: number,
) {
  const videoRect = video.getBoundingClientRect();

  if (videoRect.width <= 0 || videoRect.height <= 0) {
    return null;
  }

  const localX = clientX - videoRect.left;
  const localY = clientY - videoRect.top;

  return {
    inside:
      localX >= 0 &&
      localX <= videoRect.width &&
      localY >= 0 &&
      localY <= videoRect.height,
    x: clamp((localX / videoRect.width) * naturalWidth, 0, naturalWidth),
    y: clamp((localY / videoRect.height) * naturalHeight, 0, naturalHeight),
  };
}
