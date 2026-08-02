"use client";

import { History, Redo2, Undo2 } from "lucide-react";

type VideoShortenHistoryControlsProps = {
  canRedo: boolean;
  canRestoreOriginal: boolean;
  canUndo: boolean;
  disabled?: boolean;
  onRedo: () => void;
  onRestoreOriginal: () => void;
  onUndo: () => void;
};

export function VideoShortenHistoryControls({
  canRedo,
  canRestoreOriginal,
  canUndo,
  disabled = false,
  onRedo,
  onRestoreOriginal,
  onUndo,
}: VideoShortenHistoryControlsProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-ed-border bg-ed-bg px-0.5 py-0.5 md:gap-1 md:rounded-lg md:px-1 md:py-1">
      <button
        aria-label="Undo shorten"
        className="inline-flex flex-1 items-center justify-center gap-0.5 rounded-md px-1.5 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-ed-fg transition hover:bg-ed-fg/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:text-ed-fg-muted md:gap-1 md:px-2 md:py-1.5 md:text-[10px] md:tracking-[0.08em]"
        disabled={disabled || !canUndo}
        onClick={onUndo}
        type="button"
      >
        <Undo2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
        <span className="hidden sm:inline">Undo</span>
      </button>
      <button
        aria-label="Redo shorten"
        className="inline-flex flex-1 items-center justify-center gap-0.5 rounded-md px-1.5 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-ed-fg transition hover:bg-ed-fg/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:text-ed-fg-muted md:gap-1 md:px-2 md:py-1.5 md:text-[10px] md:tracking-[0.08em]"
        disabled={disabled || !canRedo}
        onClick={onRedo}
        type="button"
      >
        <Redo2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
        <span className="hidden sm:inline">Redo</span>
      </button>
      <button
        aria-label="Restore original full video"
        className="inline-flex items-center justify-center rounded-md p-1 text-ed-fg-muted transition hover:bg-ed-fg/5 hover:text-ed-fg disabled:cursor-not-allowed disabled:opacity-40 md:p-1.5"
        disabled={disabled || !canRestoreOriginal}
        onClick={onRestoreOriginal}
        title="Restore original full video"
        type="button"
      >
        <History className="h-3 w-3 md:h-3.5 md:w-3.5" />
      </button>
    </div>
  );
}
