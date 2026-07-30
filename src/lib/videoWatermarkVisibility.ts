export type VideoVisibilityFields = {
  visibleFromSeconds?: number;
  visibleUntilSeconds?: number;
};

export function hasVideoVisibilityRange(layer: VideoVisibilityFields) {
  return (
    layer.visibleFromSeconds !== undefined ||
    layer.visibleUntilSeconds !== undefined
  );
}

export function resolveVideoVisibilityRange(
  layer: VideoVisibilityFields,
  videoDurationSeconds: number,
) {
  if (!hasVideoVisibilityRange(layer)) {
    return null;
  }

  const start = layer.visibleFromSeconds ?? 0;
  const end = layer.visibleUntilSeconds ?? videoDurationSeconds;

  return {
    end: Math.min(videoDurationSeconds, end),
    start: Math.max(0, start),
  };
}

export function isElementVisibleAt(
  layer: VideoVisibilityFields,
  timeSeconds: number,
  videoDurationSeconds: number,
) {
  const range = resolveVideoVisibilityRange(layer, videoDurationSeconds);

  if (!range) {
    return true;
  }

  if (range.start >= range.end) {
    return false;
  }

  return timeSeconds >= range.start && timeSeconds <= range.end;
}

export function parseVideoTimeInput(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  }

  const parts = trimmed.split(":").map((part) => Number(part.trim()));

  if (parts.some((part) => !Number.isFinite(part) || part < 0)) {
    return null;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

export function formatVideoTimeInput(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function buildFfmpegOverlayEnableExpression(
  visibleFromSeconds: number,
  visibleUntilSeconds: number,
) {
  return `between(t,${visibleFromSeconds},${visibleUntilSeconds})`;
}

export function countVideoVisibilityRanges(
  layers: readonly VideoVisibilityFields[],
) {
  return layers.reduce(
    (count, layer) => count + (hasVideoVisibilityRange(layer) ? 1 : 0),
    0,
  );
}
