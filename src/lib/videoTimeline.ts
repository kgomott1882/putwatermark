export const MIN_VISIBILITY_RANGE_SECONDS = 1;

export const TIMELINE_THUMBNAIL_MIN_COUNT = 8;
export const TIMELINE_THUMBNAIL_MAX_COUNT = 30;

export function clampTimelineSeconds(
  value: number,
  durationSeconds: number,
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0;
  }

  return Math.min(
    durationSeconds,
    Math.max(0, Math.round(Number.isFinite(value) ? value : 0)),
  );
}

export function getTimelineThumbnailCount(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return TIMELINE_THUMBNAIL_MIN_COUNT;
  }

  return Math.min(
    TIMELINE_THUMBNAIL_MAX_COUNT,
    Math.max(TIMELINE_THUMBNAIL_MIN_COUNT, Math.ceil(durationSeconds / 2)),
  );
}

export function getTimelineThumbnailTimes(
  durationSeconds: number,
  count = getTimelineThumbnailCount(durationSeconds),
): number[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || count <= 0) {
    return [];
  }

  if (count === 1) {
    return [0];
  }

  return Array.from({ length: count }, (_, index) =>
    (index / (count - 1)) * durationSeconds,
  );
}

export function timelinePercent(
  seconds: number,
  durationSeconds: number,
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, (clampTimelineSeconds(seconds, durationSeconds) / durationSeconds) * 100),
  );
}

export function secondsFromTimelinePointer(
  clientX: number,
  rect: Pick<DOMRect, "left" | "width">,
  durationSeconds: number,
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || rect.width <= 0) {
    return 0;
  }

  const ratio = (clientX - rect.left) / rect.width;
  return clampTimelineSeconds(ratio * durationSeconds, durationSeconds);
}

export function clampVisibilityStartSeconds(
  startSeconds: number,
  endSeconds: number | undefined,
  durationSeconds: number,
): number {
  const clamped = clampTimelineSeconds(startSeconds, durationSeconds);
  const maxStart =
    endSeconds === undefined
      ? Math.max(0, durationSeconds - MIN_VISIBILITY_RANGE_SECONDS)
      : Math.max(
          0,
          clampTimelineSeconds(endSeconds, durationSeconds) -
            MIN_VISIBILITY_RANGE_SECONDS,
        );

  return Math.min(clamped, maxStart);
}

export function clampVisibilityEndSeconds(
  endSeconds: number,
  startSeconds: number | undefined,
  durationSeconds: number,
): number {
  const clamped = clampTimelineSeconds(endSeconds, durationSeconds);
  const minEnd =
    startSeconds === undefined
      ? Math.min(durationSeconds, MIN_VISIBILITY_RANGE_SECONDS)
      : Math.min(
          durationSeconds,
          clampTimelineSeconds(startSeconds, durationSeconds) +
            MIN_VISIBILITY_RANGE_SECONDS,
        );

  return Math.max(clamped, minEnd);
}

export function getTimelineRulerInterval(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 1;
  }

  if (durationSeconds <= 15) {
    return 1;
  }

  if (durationSeconds <= 60) {
    return 5;
  }

  if (durationSeconds <= 180) {
    return 10;
  }

  return 30;
}

export function getTimelineRulerMarks(durationSeconds: number): number[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return [0];
  }

  const interval = getTimelineRulerInterval(durationSeconds);
  const marks: number[] = [];

  for (let time = 0; time <= durationSeconds; time += interval) {
    marks.push(time);
  }

  const lastMark = marks[marks.length - 1];

  if (lastMark === undefined || lastMark < Math.floor(durationSeconds)) {
    marks.push(Math.floor(durationSeconds));
  }

  return marks;
}

export function formatTimelineClock(seconds: number) {
  const totalCentiseconds = Math.max(0, Math.round(seconds * 100));
  const mins = Math.floor(totalCentiseconds / 6000);
  const secs = Math.floor((totalCentiseconds % 6000) / 100);
  const cents = totalCentiseconds % 100;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cents).padStart(2, "0")}`;
}

export function getTimelineRangeHighlight(
  visibleFromSeconds: number | undefined,
  visibleUntilSeconds: number | undefined,
  durationSeconds: number,
): { leftPercent: number; widthPercent: number } | null {
  if (
    visibleFromSeconds === undefined &&
    visibleUntilSeconds === undefined
  ) {
    return null;
  }

  const start = clampTimelineSeconds(
    visibleFromSeconds ?? 0,
    durationSeconds,
  );
  const end = clampTimelineSeconds(
    visibleUntilSeconds ?? durationSeconds,
    durationSeconds,
  );

  if (start >= end) {
    return null;
  }

  const leftPercent = timelinePercent(start, durationSeconds);
  const rightPercent = timelinePercent(end, durationSeconds);

  return {
    leftPercent,
    widthPercent: Math.max(0, rightPercent - leftPercent),
  };
}
