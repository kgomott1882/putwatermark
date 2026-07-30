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
    <div className="flex items-center gap-1 rounded-lg border border-ed-border bg-ed-bg px-1 py-1">
      <button
        aria-label="Undo shorten"
        className="inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ed-fg transition hover:bg-ed-fg/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:text-ed-fg-muted"
        disabled={disabled || !canUndo}
        onClick={onUndo}
        type="button"
      >
        <Undo2 className="h-3.5 w-3.5" />
        Undo
      </button>
      <button
        aria-label="Redo shorten"
        className="inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ed-fg transition hover:bg-ed-fg/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:text-ed-fg-muted"
        disabled={disabled || !canRedo}
        onClick={onRedo}
        type="button"
      >
        <Redo2 className="h-3.5 w-3.5" />
        Redo
      </button>
      <button
        aria-label="Restore original full video"
        className="inline-flex items-center justify-center rounded-md p-1.5 text-ed-fg-muted transition hover:bg-ed-fg/5 hover:text-ed-fg disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled || !canRestoreOriginal}
        onClick={onRestoreOriginal}
        title="Restore original full video"
        type="button"
      >
        <History className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
