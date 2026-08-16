import type { VideoOverlayPass } from "./videoOverlayPasses";
import {
  clampTimelineSeconds,
  clampVisibilityEndSeconds,
  clampVisibilityStartSeconds,
  MIN_VISIBILITY_RANGE_SECONDS,
} from "./videoTimeline";

export type VideoTrimRange = {
  endSeconds: number;
  startSeconds: number;
};

export function resolveVideoTrimEnd(
  endSeconds: number | undefined,
  durationSeconds: number,
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0;
  }

  if (endSeconds === undefined) {
    return durationSeconds;
  }

  return clampTimelineSeconds(endSeconds, durationSeconds);
}

export function resolveVideoTrimRange(
  startSeconds: number,
  endSeconds: number | undefined,
  durationSeconds: number,
): VideoTrimRange {
  const end = resolveVideoTrimEnd(endSeconds, durationSeconds);
  const start = clampVisibilityStartSeconds(startSeconds, end, durationSeconds);

  return {
    endSeconds: Math.max(start + MIN_VISIBILITY_RANGE_SECONDS, end),
    startSeconds: start,
  };
}

export function getVideoTrimDuration(
  startSeconds: number,
  endSeconds: number | undefined,
  durationSeconds: number,
): number {
  const { endSeconds: end, startSeconds: start } = resolveVideoTrimRange(
    startSeconds,
    endSeconds,
    durationSeconds,
  );

  return Math.max(0, end - start);
}

export function isVideoTrimActive(
  startSeconds: number,
  endSeconds: number | undefined,
  durationSeconds: number,
): boolean {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return false;
  }

  const { endSeconds: end, startSeconds: start } = resolveVideoTrimRange(
    startSeconds,
    endSeconds,
    durationSeconds,
  );

  return start > 0.05 || end < durationSeconds - 0.05;
}

export function clampVideoPreviewTimeToTrim(
  timeSeconds: number,
  startSeconds: number,
  endSeconds: number | undefined,
  durationSeconds: number,
): number {
  const { endSeconds: end, startSeconds: start } = resolveVideoTrimRange(
    startSeconds,
    endSeconds,
    durationSeconds,
  );

  return Math.min(end, Math.max(start, timeSeconds));
}

export function adjustOverlayPassesForTrim(
  passes: VideoOverlayPass[],
  trimStart: number,
  trimEnd: number,
): VideoOverlayPass[] {
  const trimDuration = trimEnd - trimStart;

  if (trimDuration <= 0) {
    return [];
  }

  return passes.flatMap((pass) => {
    const hasTiming =
      pass.visibleFromSeconds !== undefined ||
      pass.visibleUntilSeconds !== undefined;

    if (!hasTiming) {
      return [pass];
    }

    const passStart = pass.visibleFromSeconds ?? 0;
    const passEnd = pass.visibleUntilSeconds ?? trimEnd;

    if (passEnd <= trimStart || passStart >= trimEnd) {
      return [];
    }

    const adjustedStart = Math.max(0, passStart - trimStart);
    const adjustedEnd = Math.min(trimDuration, passEnd - trimStart);

    return [
      {
        ...pass,
        visibleFromSeconds: adjustedStart,
        visibleUntilSeconds: adjustedEnd,
      },
    ];
  });
}

export function createInitialVideoTrimEnd(durationSeconds: number) {
  return resolveVideoTrimEnd(undefined, durationSeconds);
}

export function clampTrimStartSeconds(
  startSeconds: number,
  endSeconds: number,
  durationSeconds: number,
) {
  return clampVisibilityStartSeconds(startSeconds, endSeconds, durationSeconds);
}

export function clampTrimEndSeconds(
  endSeconds: number,
  startSeconds: number,
  durationSeconds: number,
) {
  return clampVisibilityEndSeconds(endSeconds, startSeconds, durationSeconds);
}

export function areVideoTrimRangesEqual(
  firstStartSeconds: number,
  firstEndSeconds: number | undefined,
  secondStartSeconds: number,
  secondEndSeconds: number | undefined,
  durationSeconds: number,
) {
  const first = resolveVideoTrimRange(
    firstStartSeconds,
    firstEndSeconds,
    durationSeconds,
  );
  const second = resolveVideoTrimRange(
    secondStartSeconds,
    secondEndSeconds,
    durationSeconds,
  );

  return (
    Math.abs(first.startSeconds - second.startSeconds) < 0.05 &&
    Math.abs(first.endSeconds - second.endSeconds) < 0.05
  );
}

export function shiftTimedVisibilityAfterTrim<
  T extends {
    visibleFromSeconds?: number;
    visibleUntilSeconds?: number;
  },
>(item: T, trimStart: number, trimEnd: number): T | null {
  const trimDuration = trimEnd - trimStart;

  if (trimDuration <= 0) {
    return null;
  }

  const hasTiming =
    item.visibleFromSeconds !== undefined ||
    item.visibleUntilSeconds !== undefined;

  if (!hasTiming) {
    return item;
  }

  const passStart = item.visibleFromSeconds ?? 0;
  const passEnd = item.visibleUntilSeconds ?? trimEnd;

  if (passEnd <= trimStart || passStart >= trimEnd) {
    return null;
  }

  return {
    ...item,
    visibleFromSeconds: Math.max(0, passStart - trimStart),
    visibleUntilSeconds: Math.min(trimDuration, passEnd - trimStart),
  };
}
