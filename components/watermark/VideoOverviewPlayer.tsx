"use client";

import {
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
} from "lucide-react";
import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  clampTimelineSeconds,
  secondsFromTimelinePointer,
  timelinePercent,
} from "@/lib/videoTimeline";

export type VideoOverviewPlayerProps = {
  children: ReactNode;
  currentTimeSeconds: number;
  durationSeconds: number;
  isPlaying: boolean;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onTogglePlay: () => void;
};

const SKIP_SECONDS = 5;

export function formatVideoClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function VideoOverviewPlayer({
  children,
  currentTimeSeconds,
  durationSeconds,
  isPlaying,
  onPause,
  onSeek,
  onTogglePlay,
}: VideoOverviewPlayerProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const progressPercent = timelinePercent(currentTimeSeconds, durationSeconds);

  const readPointerSeconds = useCallback(
    (clientX: number) => {
      const rect = progressRef.current?.getBoundingClientRect();

      if (!rect) {
        return clampTimelineSeconds(currentTimeSeconds, durationSeconds);
      }

      return secondsFromTimelinePointer(clientX, rect, durationSeconds);
    },
    [currentTimeSeconds, durationSeconds],
  );

  const handleProgressPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (durationSeconds <= 0) {
      return;
    }

    isDraggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    onPause();
    onSeek(readPointerSeconds(event.clientX));
  };

  const handleProgressPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || durationSeconds <= 0) {
      return;
    }

    onSeek(readPointerSeconds(event.clientX));
  };

  const handleProgressPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const skipBy = (deltaSeconds: number) => {
    onPause();
    onSeek(currentTimeSeconds + deltaSeconds);
  };

  return (
    <div className="flex max-h-full max-w-full flex-col overflow-hidden border-2 border-signal shadow-lg">
      <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center bg-[#1a1a1a]">
        {children}

        {!isPlaying ? (
          <button
            aria-label="Play video"
            className="absolute inset-0 z-10 flex items-center justify-center"
            onClick={onTogglePlay}
            type="button"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30">
              <Play className="ml-1 h-8 w-8 fill-white text-white" />
            </span>
          </button>
        ) : null}
      </div>

      <div className="relative shrink-0 bg-white">
        <div
          className="absolute inset-x-0 top-0 h-1 cursor-pointer bg-ed-border"
          onPointerCancel={handleProgressPointerUp}
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={handleProgressPointerUp}
          ref={progressRef}
        >
          <div
            className="absolute inset-y-0 left-0 bg-signal"
            style={{ width: `${progressPercent}%` }}
          />
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-signal shadow-sm"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center gap-1 px-2 pb-2 pt-3">
          <button
            aria-label="Skip back 5 seconds"
            className="rounded-md p-1.5 text-ed-fg transition hover:bg-ed-bg"
            onClick={() => skipBy(-SKIP_SECONDS)}
            type="button"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            aria-label={isPlaying ? "Pause video" : "Play video"}
            className="rounded-md p-1.5 text-ed-fg transition hover:bg-ed-bg"
            onClick={onTogglePlay}
            type="button"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" strokeWidth={2} />
            ) : (
              <Play className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
          <button
            aria-label="Skip forward 5 seconds"
            className="rounded-md p-1.5 text-ed-fg transition hover:bg-ed-bg"
            onClick={() => skipBy(SKIP_SECONDS)}
            type="button"
          >
            <RotateCw className="h-4 w-4" strokeWidth={2} />
          </button>
          <span className="rounded-md p-1.5 text-ed-fg-muted">
            <Volume2 className="h-4 w-4" strokeWidth={2} />
          </span>
          <p className="ml-auto text-[11px] font-medium tabular-nums text-ed-fg">
            {formatVideoClock(currentTimeSeconds)} /{" "}
            {formatVideoClock(durationSeconds)}
          </p>
        </div>
      </div>
    </div>
  );
}
