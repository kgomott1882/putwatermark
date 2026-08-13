"use client";

import { Pause, Play } from "lucide-react";
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { formatVideoTimeInput } from "@/lib/videoWatermarkVisibility";
import {
  clampTimelineSeconds,
  clampVisibilityEndSeconds,
  clampVisibilityStartSeconds,
  formatTimelineClock,
  getTimelineRangeHighlight,
  getTimelineRulerMarks,
  secondsFromTimelinePointer,
  timelinePercent,
} from "@/lib/videoTimeline";
import { useVideoTimelineThumbnails } from "./useVideoTimelineThumbnails";

type DragTarget = "playhead" | "start" | "end";

type TimelineVariant = "trim" | "visibility";

type VideoVisibilityTimelineProps = {
  currentTimeSeconds: number;
  durationSeconds: number;
  isPlaying?: boolean;
  layout?: "compact" | "dock" | "side";
  layerLabel?: string;
  onPauseVideo?: () => void;
  onResetRange?: () => void;
  onSeek: (seconds: number) => void;
  onTogglePlay?: () => void;
  onVisibleFromChange: (value: number | undefined) => void;
  onVisibleUntilChange: (value: number | undefined) => void;
  trimFocusOnSelection?: boolean;
  variant?: TimelineVariant;
  videoUrl?: string;
  visibleFromSeconds?: number;
  visibleUntilSeconds?: number;
};

function TimelineSkeleton({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 flex">
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="h-full flex-1 animate-pulse border-r border-white/10 bg-white/5 last:border-r-0"
          key={index}
        />
      ))}
    </div>
  );
}

export function VideoVisibilityTimeline({
  currentTimeSeconds,
  durationSeconds,
  isPlaying = false,
  layout = "compact",
  layerLabel = "Text",
  onPauseVideo,
  onResetRange,
  onSeek,
  onTogglePlay,
  onVisibleFromChange,
  onVisibleUntilChange,
  trimFocusOnSelection = false,
  variant = "visibility",
  videoUrl,
  visibleFromSeconds,
  visibleUntilSeconds,
}: VideoVisibilityTimelineProps) {
  const isTrim = variant === "trim";
  const isDock = layout === "dock";
  const isSide = layout === "side";
  const isDocked = isDock || isSide;
  const interactionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragTargetRef = useRef<DragTarget | null>(null);

  const trimStartSeconds = isTrim
    ? (visibleFromSeconds ?? 0)
    : visibleFromSeconds;
  const trimEndSeconds = isTrim
    ? (visibleUntilSeconds ?? durationSeconds)
    : visibleUntilSeconds;
  const focusOnTrimSelection =
    isTrim &&
    trimFocusOnSelection &&
    trimEndSeconds !== undefined &&
    trimEndSeconds > (trimStartSeconds ?? 0);
  const timelineOffsetSeconds = focusOnTrimSelection ? (trimStartSeconds ?? 0) : 0;
  const timelineDurationSeconds = focusOnTrimSelection
    ? Math.max(0, (trimEndSeconds ?? durationSeconds) - timelineOffsetSeconds)
    : durationSeconds;
  const displayCurrentTimeSeconds = focusOnTrimSelection
    ? Math.max(
        0,
        Math.min(
          timelineDurationSeconds,
          currentTimeSeconds - timelineOffsetSeconds,
        ),
      )
    : currentTimeSeconds;

  const { status, thumbnails } = useVideoTimelineThumbnails(
    videoUrl,
    durationSeconds,
    focusOnTrimSelection ? timelineOffsetSeconds : 0,
    focusOnTrimSelection ? trimEndSeconds : undefined,
  );

  const rangeHighlight = focusOnTrimSelection
    ? { leftPercent: 0, widthPercent: 100 }
    : getTimelineRangeHighlight(
        trimStartSeconds,
        trimEndSeconds,
        durationSeconds,
      );
  const playheadPercent = timelinePercent(
    displayCurrentTimeSeconds,
    timelineDurationSeconds,
  );
  const startHandlePercent = focusOnTrimSelection
    ? 0
    : trimStartSeconds === undefined
      ? 0
      : timelinePercent(trimStartSeconds, durationSeconds);
  const endHandlePercent = focusOnTrimSelection
    ? 100
    : trimEndSeconds === undefined
      ? 100
      : timelinePercent(trimEndSeconds, durationSeconds);
  const rulerMarks = getTimelineRulerMarks(timelineDurationSeconds);
  const hasRange =
    isTrim ||
    visibleFromSeconds !== undefined ||
    visibleUntilSeconds !== undefined;
  const exportDurationSeconds =
    isTrim && trimEndSeconds !== undefined
      ? Math.max(0, trimEndSeconds - (trimStartSeconds ?? 0))
      : null;
  const showTrimHandles = isTrim && !focusOnTrimSelection;

  const readPointerSeconds = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();

      if (!rect) {
        return clampTimelineSeconds(currentTimeSeconds, durationSeconds);
      }

      const relativeSeconds = secondsFromTimelinePointer(
        clientX,
        rect,
        timelineDurationSeconds,
      );

      return focusOnTrimSelection
        ? clampTimelineSeconds(
            timelineOffsetSeconds + relativeSeconds,
            durationSeconds,
          )
        : relativeSeconds;
    },
    [
      currentTimeSeconds,
      durationSeconds,
      focusOnTrimSelection,
      timelineDurationSeconds,
      timelineOffsetSeconds,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragTarget = dragTargetRef.current;

      if (!dragTarget) {
        return;
      }

      const nextSeconds = readPointerSeconds(event.clientX);

      if (dragTarget === "playhead") {
        onSeek(nextSeconds);
        return;
      }

      if (dragTarget === "start") {
        onVisibleFromChange(
          clampVisibilityStartSeconds(
            nextSeconds,
            trimEndSeconds,
            durationSeconds,
          ),
        );
        return;
      }

      onVisibleUntilChange(
        clampVisibilityEndSeconds(
          nextSeconds,
          trimStartSeconds,
          durationSeconds,
        ),
      );
    },
    [
      durationSeconds,
      onSeek,
      onVisibleFromChange,
      onVisibleUntilChange,
      readPointerSeconds,
      trimEndSeconds,
      trimStartSeconds,
    ],
  );

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragTargetRef.current) {
      return;
    }

    dragTargetRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const beginDrag = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      target: DragTarget,
      initialValue: number | undefined,
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const track = interactionRef.current ?? trackRef.current;

      if (!track) {
        return;
      }

      if (target !== "playhead") {
        onPauseVideo?.();
      }

      dragTargetRef.current = target;
      track.setPointerCapture(event.pointerId);

      const nextSeconds = readPointerSeconds(event.clientX);

      if (target === "playhead") {
        onSeek(nextSeconds);
        return;
      }

      const seededSeconds =
        initialValue === undefined
          ? clampTimelineSeconds(currentTimeSeconds, durationSeconds)
          : nextSeconds;

      if (target === "start") {
        onVisibleFromChange(
          clampVisibilityStartSeconds(
            seededSeconds,
            trimEndSeconds,
            durationSeconds,
          ),
        );
        return;
      }

      onVisibleUntilChange(
        clampVisibilityEndSeconds(
          seededSeconds,
          trimStartSeconds,
          durationSeconds,
        ),
      );
    },
    [
      currentTimeSeconds,
      durationSeconds,
      onPauseVideo,
      onSeek,
      onVisibleFromChange,
      onVisibleUntilChange,
      readPointerSeconds,
      trimEndSeconds,
      trimStartSeconds,
    ],
  );

  const handleTrackPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || dragTargetRef.current) {
        return;
      }

      if (
        event.target instanceof Element &&
        event.target.closest("[data-timeline-handle]")
      ) {
        return;
      }

      onSeek(readPointerSeconds(event.clientX));
    },
    [onSeek, readPointerSeconds],
  );

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return (
      <p className="text-[11px] leading-4 text-ed-fg-muted">
        Load a video to set visibility timing.
      </p>
    );
  }

  const trackShellClass = isDocked
    ? "relative h-10 touch-none select-none overflow-hidden rounded-md border border-white/15 bg-black/40 max-md:h-10 md:h-[4.5rem]"
    : "relative h-16 touch-none select-none overflow-hidden rounded-lg border border-ed-border bg-ed-bg-card shadow-sm";

  const rootClass = isSide
    ? "flex h-full w-[17rem] shrink-0 flex-col border-l border-ed-border bg-ed-fg text-ed-bg shadow-[-8px_0_24px_rgba(0,0,0,0.12)]"
    : isDock
      ? "flex shrink-0 flex-col border-t border-ed-border bg-ed-fg text-ed-bg shadow-[0_-8px_24px_rgba(0,0,0,0.18)] md:min-h-[10.5rem]"
      : "space-y-2";

  const playheadLineClass = isDocked ? "bg-white" : "bg-ed-fg";
  const rangeBorderClass = isDocked
    ? "border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
    : "ring-1 ring-inset ring-signal/40 border border-signal/60";

  return (
    <div className={rootClass}>
      {isDocked ? (
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-white/10 px-3 py-1.5 max-md:py-1.5 md:gap-3 md:px-4 md:py-2.5 ${
            isSide ? "border-b" : "border-b"
          }`}
        >
          <div className="min-w-0">
            <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-white/70 md:text-[11px] md:tracking-[0.14em]">
              {isTrim ? "Trim video" : "Visibility"}
            </p>
            <p className="truncate text-xs font-semibold text-white md:text-sm">
              {isTrim
                ? `${formatTimelineClock(exportDurationSeconds ?? 0)} export`
                : layerLabel}
            </p>
            {isTrim ? (
              <p className="hidden truncate text-[11px] text-white/60 md:block">
                {focusOnTrimSelection
                  ? `Applied shorten · ${formatTimelineClock(timelineDurationSeconds)} total`
                  : `${formatTimelineClock(trimStartSeconds ?? 0)} to ${formatTimelineClock(trimEndSeconds ?? durationSeconds)} of ${formatTimelineClock(durationSeconds)}`}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
            {isTrim && onResetRange ? (
              <button
                className="hidden rounded-md border border-white/15 px-2 py-1 text-[10px] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white md:inline-flex"
                onClick={onResetRange}
                type="button"
              >
                Full video
              </button>
            ) : null}
            <button
              aria-label={isPlaying ? "Pause video" : "Play video"}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 md:h-9 md:w-9"
              onClick={onTogglePlay}
              type="button"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 md:h-4 md:w-4" fill="currentColor" />
              ) : (
                <Play className="h-3.5 w-3.5 md:h-4 md:w-4" fill="currentColor" />
              )}
            </button>
            <span className="text-[11px] font-semibold tabular-nums text-white md:text-sm">
              {formatTimelineClock(displayCurrentTimeSeconds)}{" "}
              <span className="text-white/50">/</span>{" "}
              {formatTimelineClock(
                focusOnTrimSelection
                  ? timelineDurationSeconds
                  : durationSeconds,
              )}
            </span>
          </div>
        </div>
      ) : null}

      <div
        className={
          isSide
            ? "relative flex min-h-0 flex-1 flex-col justify-end px-4 py-3"
            : isDock
              ? "relative min-h-0 flex-1 px-3 py-1.5 max-md:overflow-hidden md:px-4 md:py-3"
              : undefined
        }
        onPointerCancel={endDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        ref={interactionRef}
      >
        {isDocked ? (
          <div className="relative mb-1 h-4 md:mb-2 md:h-6">
            {rulerMarks.map((mark) => (
              <span
                className="absolute top-0 -translate-x-1/2 text-[8px] font-medium tabular-nums text-white/55 md:text-[10px]"
                key={mark}
                style={{ left: `${timelinePercent(mark, timelineDurationSeconds)}%` }}
              >
                {mark}
              </span>
            ))}
          </div>
        ) : null}

        <div
          className={trackShellClass}
          onPointerDown={handleTrackPointerDown}
          ref={trackRef}
        >
          <div className="absolute inset-0 cursor-pointer">
            {status === "loading" ? (
              <TimelineSkeleton count={8} />
            ) : thumbnails.length > 0 ? (
              <div className="absolute inset-0 flex">
                {thumbnails.map((thumbnail, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-full flex-1 bg-black/80 object-contain"
                    draggable={false}
                    key={`${thumbnail.timeSeconds}-${index}`}
                    src={thumbnail.dataUrl}
                  />
                ))}
              </div>
            ) : (
              <div
                className={`absolute inset-0 ${
                  isDocked
                    ? "bg-gradient-to-r from-white/5 via-white/10 to-white/5"
                    : "bg-gradient-to-r from-ed-bg-card via-ed-bg to-ed-bg-card"
                }`}
              />
            )}

            {!isDocked && rangeHighlight ? (
              <>
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 bg-ed-fg/25"
                  style={{ width: `${rangeHighlight.leftPercent}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-y-0 bg-signal/20 ring-1 ring-inset ring-signal/40"
                  style={{
                    left: `${rangeHighlight.leftPercent}%`,
                    width: `${rangeHighlight.widthPercent}%`,
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 bg-ed-fg/25"
                  style={{
                    width: `${Math.max(0, 100 - rangeHighlight.leftPercent - rangeHighlight.widthPercent)}%`,
                  }}
                />
              </>
            ) : null}

            {isDocked ? (
              <>
                {!focusOnTrimSelection ? (
                  <div className="pointer-events-none absolute inset-0 bg-black/35" />
                ) : null}
                {hasRange && rangeHighlight && !focusOnTrimSelection ? (
                  <div
                    className={`pointer-events-none absolute inset-y-1.5 z-10 rounded-sm ${rangeBorderClass}`}
                    style={{
                      left: `${rangeHighlight.leftPercent}%`,
                      width: `${rangeHighlight.widthPercent}%`,
                    }}
                  />
                ) : null}
                {!hasRange ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white/80">
                      {isTrim
                        ? "Drag the handles to set what to keep"
                        : "Drag the handles to set when this layer appears"}
                    </span>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          {!isDocked ? (
            <button
              aria-label={`Playhead at ${formatVideoTimeInput(currentTimeSeconds)}`}
              aria-valuemax={durationSeconds}
              aria-valuemin={0}
              aria-valuenow={Math.round(currentTimeSeconds)}
              className="absolute inset-y-0 z-20 w-3 -translate-x-1/2 cursor-ew-resize"
              data-timeline-handle="playhead"
              onPointerDown={(event) =>
                beginDrag(event, "playhead", currentTimeSeconds)
              }
              style={{ left: `${playheadPercent}%` }}
              type="button"
            >
              <span className="absolute inset-y-1 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-ed-fg shadow-sm" />
              <span className="absolute left-1/2 top-0.5 h-2 w-2 -translate-x-1/2 rotate-45 border border-ed-fg bg-ed-bg shadow-sm" />
            </button>
          ) : null}

          {showTrimHandles ? (
            <>
              <button
                aria-label={
                  visibleFromSeconds === undefined
                    ? "Set trim start"
                    : `Trim starts at ${formatVideoTimeInput(visibleFromSeconds)}`
                }
                aria-valuemax={durationSeconds}
                aria-valuemin={0}
                aria-valuenow={
                  visibleFromSeconds === undefined
                    ? undefined
                    : Math.round(visibleFromSeconds)
                }
                className={`absolute z-30 -translate-x-1/2 cursor-ew-resize ${
                  isDocked
                    ? "inset-y-1.5 w-2 rounded-l-sm bg-white shadow-md"
                    : `inset-y-2 w-3 rounded-sm border-2 bg-ed-bg shadow-md ${
                        visibleFromSeconds === undefined
                          ? "border-ed-fg/35 opacity-80"
                          : "border-signal"
                      }`
                }`}
                data-timeline-handle="start"
                onPointerDown={(event) =>
                  beginDrag(event, "start", visibleFromSeconds)
                }
                role="slider"
                style={{ left: `${startHandlePercent}%` }}
                type="button"
              />

              <button
                aria-label={
                  visibleUntilSeconds === undefined
                    ? "Set trim end"
                    : `Trim ends at ${formatVideoTimeInput(visibleUntilSeconds)}`
                }
                aria-valuemax={durationSeconds}
                aria-valuemin={0}
                aria-valuenow={
                  visibleUntilSeconds === undefined
                    ? undefined
                    : Math.round(visibleUntilSeconds)
                }
                className={`absolute z-30 -translate-x-1/2 cursor-ew-resize ${
                  isDocked
                    ? "inset-y-1.5 w-2 rounded-r-sm bg-white shadow-md"
                    : `inset-y-2 w-3 rounded-sm border-2 bg-ed-bg shadow-md ${
                        visibleUntilSeconds === undefined
                          ? "border-ed-fg/35 opacity-80"
                          : "border-signal"
                      }`
                }`}
                data-timeline-handle="end"
                onPointerDown={(event) =>
                  beginDrag(event, "end", visibleUntilSeconds)
                }
                role="slider"
                style={{ left: `${endHandlePercent}%` }}
                type="button"
              />
            </>
          ) : null}

          {!isTrim ? (
            <>
              <button
                aria-label={
                  visibleFromSeconds === undefined
                    ? "Set visibility start"
                    : `Visibility starts at ${formatVideoTimeInput(visibleFromSeconds)}`
                }
                aria-valuemax={durationSeconds}
                aria-valuemin={0}
                aria-valuenow={
                  visibleFromSeconds === undefined
                    ? undefined
                    : Math.round(visibleFromSeconds)
                }
                className={`absolute z-30 -translate-x-1/2 cursor-ew-resize ${
                  isDocked
                    ? "inset-y-1.5 w-2 rounded-l-sm bg-white shadow-md"
                    : `inset-y-2 w-3 rounded-sm border-2 bg-ed-bg shadow-md ${
                        visibleFromSeconds === undefined
                          ? "border-ed-fg/35 opacity-80"
                          : "border-signal"
                      }`
                }`}
                data-timeline-handle="start"
                onPointerDown={(event) =>
                  beginDrag(event, "start", visibleFromSeconds)
                }
                role="slider"
                style={{ left: `${startHandlePercent}%` }}
                type="button"
              />

              <button
                aria-label={
                  visibleUntilSeconds === undefined
                    ? "Set visibility end"
                    : `Visibility ends at ${formatVideoTimeInput(visibleUntilSeconds)}`
                }
                aria-valuemax={durationSeconds}
                aria-valuemin={0}
                aria-valuenow={
                  visibleUntilSeconds === undefined
                    ? undefined
                    : Math.round(visibleUntilSeconds)
                }
                className={`absolute z-30 -translate-x-1/2 cursor-ew-resize ${
                  isDocked
                    ? "inset-y-1.5 w-2 rounded-r-sm bg-white shadow-md"
                    : `inset-y-2 w-3 rounded-sm border-2 bg-ed-bg shadow-md ${
                        visibleUntilSeconds === undefined
                          ? "border-ed-fg/35 opacity-80"
                          : "border-signal"
                      }`
                }`}
                data-timeline-handle="end"
                onPointerDown={(event) =>
                  beginDrag(event, "end", visibleUntilSeconds)
                }
                role="slider"
                style={{ left: `${endHandlePercent}%` }}
                type="button"
              />
            </>
          ) : null}

          {isDocked && hasRange && rangeHighlight && !focusOnTrimSelection ? (
            <div
              className="pointer-events-none absolute -top-4 z-20 hidden -translate-x-1/2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white md:block"
              style={{
                left: `${rangeHighlight.leftPercent + rangeHighlight.widthPercent / 2}%`,
              }}
            >
              {isTrim
                ? formatTimelineClock(exportDurationSeconds ?? 0)
                : layerLabel}
            </div>
          ) : null}
        </div>

        {isDocked ? (
          <button
            aria-label={`Playhead at ${formatVideoTimeInput(currentTimeSeconds)}`}
            className="absolute bottom-1.5 top-1.5 z-30 w-4 -translate-x-1/2 cursor-ew-resize md:bottom-3 md:top-3"
            data-timeline-handle="playhead"
            onPointerDown={(event) =>
              beginDrag(event, "playhead", currentTimeSeconds)
            }
            style={{ left: `${playheadPercent}%` }}
            type="button"
          >
            <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-ed-fg shadow-md" />
            <span
              className={`absolute bottom-0 left-1/2 top-3 w-px -translate-x-1/2 ${playheadLineClass}`}
            />
          </button>
        ) : null}

        {!isDocked ? (
          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold tabular-nums text-ed-fg-muted">
            <span>0:00</span>
            <span className="text-ed-fg">
              {formatVideoTimeInput(currentTimeSeconds)} /{" "}
              {formatVideoTimeInput(durationSeconds)}
            </span>
            <span>{formatVideoTimeInput(durationSeconds)}</span>
          </div>
        ) : null}

        {status === "error" ? (
          <p
            className={`mt-2 text-[11px] leading-4 ${
              isDocked ? "text-white/60" : "text-ed-fg-muted"
            }`}
          >
            Preview frames could not be generated. Dragging still works on the
            timeline track.
          </p>
        ) : null}
      </div>
    </div>
  );
}
