"use client";

import { Check } from "lucide-react";
import { formatTimelineClock } from "@/lib/videoTimeline";
import { VideoShortenHistoryControls } from "./VideoShortenHistoryControls";
import { EditorCard, EditorPanelSection } from "./EditorToolPanel";

type VideoTrimPanelProps = {
  canRedoVideoShorten: boolean;
  canRestoreOriginal: boolean;
  canUndoVideoShorten: boolean;
  durationSeconds: number;
  exportDurationSeconds: number;
  hasUnsavedCrop: boolean;
  isProcessing: boolean;
  onApplyShorten: () => void;
  onRedoVideoShorten: () => void;
  onReshorten?: () => void;
  onRestoreOriginal: () => void;
  onUndoVideoShorten: () => void;
  savedExportDurationSeconds: number;
  showReshortenAction: boolean;
  showSavedConfirmation: boolean;
  trimEndSeconds: number;
  trimStartSeconds: number;
};

export function VideoTrimPanel({
  canRedoVideoShorten,
  canRestoreOriginal,
  canUndoVideoShorten,
  durationSeconds,
  exportDurationSeconds,
  hasUnsavedCrop,
  isProcessing,
  onApplyShorten,
  onRedoVideoShorten,
  onReshorten,
  onRestoreOriginal,
  onUndoVideoShorten,
  savedExportDurationSeconds,
  showReshortenAction,
  showSavedConfirmation,
  trimEndSeconds,
  trimStartSeconds,
}: VideoTrimPanelProps) {
  return (
    <div className="space-y-2">
      <EditorPanelSection title="Shorten video">
        <EditorCard className="space-y-3 p-3">
          <VideoShortenHistoryControls
            canRedo={canRedoVideoShorten}
            canRestoreOriginal={canRestoreOriginal}
            canUndo={canUndoVideoShorten}
            disabled={isProcessing}
            onRedo={onRedoVideoShorten}
            onRestoreOriginal={onRestoreOriginal}
            onUndo={onUndoVideoShorten}
          />

          <p className="text-sm leading-6 text-ed-fg-muted">
            Drag the timeline handles to choose what to keep, then apply shorten.
            Undo, redo, or restore the original full-length upload any time.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-ed-border bg-ed-bg px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ed-fg-muted">
                Current selection
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-ed-fg">
                {formatTimelineClock(exportDurationSeconds)}
              </p>
            </div>
            <div className="rounded-lg border border-ed-border bg-ed-bg px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ed-fg-muted">
                Working clip length
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-ed-fg">
                {formatTimelineClock(savedExportDurationSeconds)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-ed-border bg-ed-bg px-2.5 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ed-fg-muted">
              Selected range
            </p>
            <p className="mt-1 text-sm font-medium tabular-nums text-ed-fg">
              {formatTimelineClock(trimStartSeconds)} –{" "}
              {formatTimelineClock(trimEndSeconds)}
            </p>
            <p className="mt-1 text-[10px] text-ed-fg-muted">
              Source length {formatTimelineClock(durationSeconds)}
            </p>
          </div>

          {showReshortenAction && onReshorten ? (
            <button
              className="editor-secondary-button w-full rounded-xl border-signal/40 bg-signal/10 px-4 py-2.5 text-sm font-semibold text-signal hover:border-signal hover:bg-signal/15"
              disabled={isProcessing}
              onClick={onReshorten}
              type="button"
            >
              Reshorten vid
            </button>
          ) : null}

          <button
            className="w-full rounded-xl bg-signal px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!hasUnsavedCrop || isProcessing}
            onClick={onApplyShorten}
            type="button"
          >
            {isProcessing ? "Shortening…" : "Apply shorten"}
          </button>

          {showSavedConfirmation && !hasUnsavedCrop ? (
            <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-signal">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Working clip is up to date
            </p>
          ) : hasUnsavedCrop ? (
            <p className="text-center text-[11px] leading-4 text-ed-fg-muted">
              Apply your selection to update the working clip.
            </p>
          ) : (
            <p className="text-center text-[11px] leading-4 text-ed-fg-muted">
              Drag the timeline handles to choose a section, then apply shorten.
            </p>
          )}

          {canRestoreOriginal ? (
            <button
              className="editor-secondary-button w-full rounded-lg px-3 py-2 text-xs font-semibold text-ed-fg"
              disabled={isProcessing}
              onClick={onRestoreOriginal}
              type="button"
            >
              Restore full original video
            </button>
          ) : null}
        </EditorCard>
      </EditorPanelSection>
    </div>
  );
}
