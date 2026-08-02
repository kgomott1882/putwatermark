"use client";

import {
  ArrowLeft,
  ArrowRight,
  History,
  Minus,
  Plus,
  Redo2,
  Undo2,
} from "lucide-react";

type EditorBottomBarProps = {
  canRedo: boolean;
  canUndo: boolean;
  exportDisabled?: boolean;
  exportLabel: string;
  exportTitle?: string;
  onExit: () => void;
  onExport: () => void;
  onRedo: () => void;
  onUndo: () => void;
  showHistoryControls?: boolean;
  zoomInDisabled?: boolean;
  zoomLabel?: string;
  zoomOutDisabled?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
};

export function EditorBottomBar({
  canRedo,
  canUndo,
  exportDisabled,
  exportLabel,
  exportTitle,
  onExit,
  onExport,
  onRedo,
  onUndo,
  showHistoryControls = true,
  zoomInDisabled = false,
  zoomLabel = "100%",
  zoomOutDisabled = false,
  onZoomIn,
  onZoomOut,
}: EditorBottomBarProps) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-ed-border bg-ed-panel px-3 py-2">
      <button
        className="editor-secondary-button inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ed-fg hover:text-ed-fg"
        onClick={onExit}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        Exit
      </button>

      <div className="flex flex-1 items-center justify-center gap-1">
        {showHistoryControls ? (
          <>
            <button
              aria-label="Undo"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ed-fg transition hover:bg-ed-fg/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:text-ed-fg-muted sm:px-3"
              disabled={!canUndo}
              onClick={onUndo}
              type="button"
            >
              <Undo2 className="h-4 w-4" />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              aria-label="Redo"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ed-fg transition hover:bg-ed-fg/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:text-ed-fg-muted sm:px-3"
              disabled={!canRedo}
              onClick={onRedo}
              type="button"
            >
              <Redo2 className="h-4 w-4" />
              <span className="hidden sm:inline">Redo</span>
            </button>
            <button
              aria-label="History"
              className="rounded-lg p-2 text-ed-fg-muted transition hover:bg-ed-fg/5 hover:text-ed-fg"
              type="button"
            >
              <History className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <div className="editor-secondary-button hidden items-center gap-1 rounded-lg px-2 py-1 text-ed-fg-muted sm:flex">
          <button
            aria-label="Zoom out"
            className="rounded p-1 transition hover:bg-ed-fg/5 hover:text-ed-fg disabled:cursor-not-allowed disabled:opacity-40"
            disabled={zoomOutDisabled || !onZoomOut}
            onClick={onZoomOut}
            type="button"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[3rem] text-center text-[11px] font-semibold text-ed-fg">
            {zoomLabel}
          </span>
          <button
            aria-label="Zoom in"
            className="rounded p-1 transition hover:bg-ed-fg/5 hover:text-ed-fg disabled:cursor-not-allowed disabled:opacity-40"
            disabled={zoomInDisabled || !onZoomIn}
            onClick={onZoomIn}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          className="inline-flex items-center gap-1.5 rounded-xl bg-signal px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-5 sm:text-xs sm:tracking-[0.12em]"
          disabled={exportDisabled}
          onClick={() => {
            console.log("[real-video-export] STEP 1/15: Export MP4 button clicked", {
              exportDisabled: Boolean(exportDisabled),
              exportLabel,
              timestamp: new Date().toISOString(),
            });
            onExport();
          }}
          title={exportTitle}
          type="button"
        >
          {exportLabel}
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </footer>
  );
}
