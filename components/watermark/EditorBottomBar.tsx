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
  zoomLabel?: string;
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
  zoomLabel = "100%",
}: EditorBottomBarProps) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-editor-panel-border bg-editor-panel-header px-3 py-2">
      <button
        className="inline-flex items-center gap-2 rounded-xl bg-editor-exit px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm transition hover:brightness-105"
        onClick={onExit}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        Exit
      </button>

      <div className="flex items-center gap-1">
        <button
          aria-label="Undo"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-editor-muted transition hover:bg-white/60 hover:text-editor-ink disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canUndo}
          onClick={onUndo}
          type="button"
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </button>
        <button
          aria-label="Redo"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-editor-muted transition hover:bg-white/60 hover:text-editor-ink disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canRedo}
          onClick={onRedo}
          type="button"
        >
          <Redo2 className="h-4 w-4" />
          Redo
        </button>
        <button
          aria-label="History"
          className="rounded-lg p-2 text-editor-muted transition hover:bg-white/60 hover:text-editor-ink"
          type="button"
        >
          <History className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-editor-muted sm:flex">
          <button
            aria-label="Zoom out"
            className="rounded p-1 transition hover:bg-white hover:text-editor-ink"
            type="button"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[3rem] text-center text-[11px] font-semibold text-editor-ink">
            {zoomLabel}
          </span>
          <button
            aria-label="Zoom in"
            className="rounded p-1 transition hover:bg-white hover:text-editor-ink"
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          className="inline-flex items-center gap-2 rounded-xl bg-editor-finish px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={exportDisabled}
          onClick={onExport}
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
