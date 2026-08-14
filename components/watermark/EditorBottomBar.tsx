"use client";

import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  History,
  Loader2,
  Minus,
  Plus,
  Redo2,
  Undo2,
} from "lucide-react";

type EditorBottomBarProps = {
  canRedo: boolean;
  canUndo: boolean;
  className?: string;
  exportDisabled?: boolean;
  exportLabel: string;
  isExporting?: boolean;
  exportTitle?: string;
  mediaActions?: ReactNode;
  onBuyCredits?: () => void;
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
  className = "",
  exportDisabled,
  exportLabel,
  isExporting = false,
  exportTitle,
  mediaActions,
  onBuyCredits,
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
    <footer
      className={`flex shrink-0 items-center justify-between gap-1.5 border-t border-ed-border bg-ed-panel px-1.5 py-1.5 sm:gap-3 sm:px-3 sm:py-2 ${className}`}
    >
      <div className="relative z-10 flex shrink-0 items-center gap-1 sm:gap-1.5">
        <button
          className="editor-secondary-button inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ed-fg hover:text-ed-fg sm:gap-1.5 sm:rounded-xl sm:px-2.5 sm:py-2 sm:text-[10px] sm:tracking-[0.1em] md:px-4 md:text-xs md:tracking-[0.12em]"
          onClick={onExit}
          type="button"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
          Exit
        </button>
        {onBuyCredits ? (
          <button
            aria-label="Buy credits"
            className="relative z-10 inline-flex shrink-0 items-center rounded-lg bg-signal px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white shadow-sm transition hover:brightness-110 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-[10px] sm:tracking-[0.1em] md:hidden"
            onClick={(event) => {
              event.stopPropagation();
              onBuyCredits();
            }}
            type="button"
          >
            Buy
          </button>
        ) : null}
      </div>

      <div className="pointer-events-none flex min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden">
        {mediaActions ? (
          <div className="pointer-events-auto flex shrink-0 items-center md:hidden">
            {mediaActions}
          </div>
        ) : null}
        {showHistoryControls ? (
          <>
            <button
              aria-label="Undo"
              className="pointer-events-auto inline-flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ed-fg transition hover:bg-ed-fg/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:text-ed-fg-muted sm:gap-1.5 sm:px-2 sm:py-2 sm:text-[11px] sm:tracking-[0.1em] md:px-3"
              disabled={!canUndo}
              onClick={onUndo}
              type="button"
            >
              <Undo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              aria-label="Redo"
              className="pointer-events-auto inline-flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ed-fg transition hover:bg-ed-fg/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:text-ed-fg-muted sm:gap-1.5 sm:px-2 sm:py-2 sm:text-[11px] sm:tracking-[0.1em] md:px-3"
              disabled={!canRedo}
              onClick={onRedo}
              type="button"
            >
              <Redo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Redo</span>
            </button>
            <button
              aria-label="History"
              className="pointer-events-auto rounded-lg p-1.5 text-ed-fg-muted transition hover:bg-ed-fg/5 hover:text-ed-fg sm:p-2"
              type="button"
            >
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </>
        ) : null}
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-2">
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
          className="inline-flex items-center gap-1 rounded-lg bg-signal px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-2 sm:text-[10px] sm:tracking-[0.1em] md:gap-2 md:px-5 md:text-xs md:tracking-[0.12em]"
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
          {isExporting ? (
            <Loader2
              aria-hidden
              className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4"
              strokeWidth={2.5}
            />
          ) : (
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </footer>
  );
}
