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
  className?: string;
  controlsClassName?: string;
  currentTimeSeconds: number;
  durationSeconds: number;
  frameClassName?: string;
  isPlaying: boolean;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onTogglePlay: () => void;
  playOverlay?: "fullscreen" | "center" | false;
  playOverlayClassName?: string;
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
  className = "",
  controlsClassName = "",
  currentTimeSeconds,
  durationSeconds,
  frameClassName = "",
  isPlaying,
  onPause,
  onSeek,
  onTogglePlay,
  playOverlay = "fullscreen",
  playOverlayClassName = "",
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

  const playButton = (
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30">
      <Play className="ml-1 h-8 w-8 fill-white text-white" />
    </span>
  );

  const progressBar = (
    <div
      className="relative h-0.5 cursor-pointer bg-ed-border md:absolute md:inset-x-0 md:top-0 md:h-1"
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
        className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-signal shadow-sm md:h-3 md:w-3 md:border-2"
        style={{ left: `${progressPercent}%` }}
      />
    </div>
  );

  const controlButtons = (
    <div className="flex items-center gap-0.5 px-1 py-0.5 md:gap-1 md:px-2 md:pb-2 md:pt-3">
      <button
        aria-label="Skip back 5 seconds"
        className="rounded p-0.5 text-ed-fg transition hover:bg-ed-bg md:rounded-md md:p-1.5"
        onClick={() => skipBy(-SKIP_SECONDS)}
        type="button"
      >
        <RotateCcw className="h-3 w-3 md:h-4 md:w-4" strokeWidth={2} />
      </button>
      <button
        aria-label={isPlaying ? "Pause video" : "Play video"}
        className="rounded p-0.5 text-ed-fg transition hover:bg-ed-bg md:rounded-md md:p-1.5"
        onClick={onTogglePlay}
        type="button"
      >
        {isPlaying ? (
          <Pause className="h-3 w-3 md:h-4 md:w-4" strokeWidth={2} />
        ) : (
          <Play className="h-3 w-3 md:h-4 md:w-4" strokeWidth={2} />
        )}
      </button>
      <button
        aria-label="Skip forward 5 seconds"
        className="rounded p-0.5 text-ed-fg transition hover:bg-ed-bg md:rounded-md md:p-1.5"
        onClick={() => skipBy(SKIP_SECONDS)}
        type="button"
      >
        <RotateCw className="h-3 w-3 md:h-4 md:w-4" strokeWidth={2} />
      </button>
      <span className="rounded p-0.5 text-ed-fg-muted md:rounded-md md:p-1.5">
        <Volume2 className="h-3 w-3 md:h-4 md:w-4" strokeWidth={2} />
      </span>
      <p className="ml-auto text-[9px] font-medium tabular-nums text-ed-fg md:text-[11px]">
        {formatVideoClock(currentTimeSeconds)} /{" "}
        {formatVideoClock(durationSeconds)}
      </p>
    </div>
  );

  return (
    <div
      className={`flex max-h-full max-w-full flex-col overflow-hidden border-2 border-signal shadow-lg max-md:flex-col-reverse md:flex-col ${className}`}
    >
      <div
        className={`relative flex min-h-0 min-w-0 flex-1 items-center justify-center bg-[#1a1a1a] ${frameClassName}`}
      >
        {children}

        {!isPlaying && playOverlay !== false ? (
          playOverlay === "center" ? (
            <div
              className={`pointer-events-none absolute inset-0 z-10 flex max-md:hidden items-center justify-center ${playOverlayClassName}`}
            >
              <button
                aria-label="Play video"
                className="pointer-events-auto"
                onClick={onTogglePlay}
                type="button"
              >
                {playButton}
              </button>
            </div>
          ) : (
            <button
              aria-label="Play video"
              className={`absolute inset-0 z-10 flex max-md:hidden items-center justify-center ${playOverlayClassName}`}
              onClick={onTogglePlay}
              type="button"
            >
              {playButton}
            </button>
          )
        ) : null}
      </div>

      <div className={`relative shrink-0 bg-white ${controlsClassName}`}>
        <div className="flex flex-col md:block">
          <div className="hidden md:block">{progressBar}</div>
          {controlButtons}
          <div className="md:hidden">{progressBar}</div>
        </div>
      </div>
    </div>
  );
}
