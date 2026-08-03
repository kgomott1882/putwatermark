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
    <div className="space-y-1 md:space-y-2">
      <EditorPanelSection hideTitleOnMobile title="Shorten video">
        <EditorCard className="space-y-1.5 p-1.5 md:space-y-3 md:p-3">
          <VideoShortenHistoryControls
            canRedo={canRedoVideoShorten}
            canRestoreOriginal={canRestoreOriginal}
            canUndo={canUndoVideoShorten}
            disabled={isProcessing}
            onRedo={onRedoVideoShorten}
            onRestoreOriginal={onRestoreOriginal}
            onUndo={onUndoVideoShorten}
          />

          <p className="hidden text-sm leading-6 text-ed-fg-muted md:block">
            Drag the timeline handles to choose what to keep, then apply shorten.
            Undo, redo, or restore the original full-length upload any time.
          </p>

          <div className="flex gap-1 md:grid md:grid-cols-2 md:gap-2">
            <div className="min-w-0 flex-1 rounded-md border border-ed-border bg-ed-bg px-1 py-0.5 md:rounded-lg md:px-2.5 md:py-2">
              <p className="text-[7px] font-bold uppercase tracking-[0.06em] text-ed-fg-muted md:text-[9px] md:tracking-[0.1em]">
                Selection
              </p>
              <p className="text-[10px] font-semibold tabular-nums text-ed-fg md:mt-1 md:text-sm">
                {formatTimelineClock(exportDurationSeconds)}
              </p>
            </div>
            <div className="min-w-0 flex-1 rounded-md border border-ed-border bg-ed-bg px-1 py-0.5 md:rounded-lg md:px-2.5 md:py-2">
              <p className="text-[7px] font-bold uppercase tracking-[0.06em] text-ed-fg-muted md:text-[9px] md:tracking-[0.1em]">
                Clip
              </p>
              <p className="text-[10px] font-semibold tabular-nums text-ed-fg md:mt-1 md:text-sm">
                {formatTimelineClock(savedExportDurationSeconds)}
              </p>
            </div>
            <div className="min-w-0 flex-[1.4] rounded-md border border-ed-border bg-ed-bg px-1 py-0.5 md:col-span-2 md:rounded-lg md:px-2.5 md:py-2">
              <p className="text-[8px] font-bold uppercase tracking-[0.06em] text-ed-fg-muted md:text-[9px] md:tracking-[0.1em]">
                Range
              </p>
              <p className="truncate text-[10px] font-medium tabular-nums text-ed-fg md:mt-1 md:text-sm">
                {formatTimelineClock(trimStartSeconds)} to {formatTimelineClock(trimEndSeconds)}
              </p>
              <p className="hidden text-[9px] text-ed-fg-muted md:mt-1 md:block md:text-[10px]">
                Source {formatTimelineClock(durationSeconds)}
              </p>
            </div>
          </div>

          {showReshortenAction && onReshorten ? (
            <button
              className="editor-secondary-button w-full rounded-lg border-signal/40 bg-signal/10 px-3 py-1.5 text-xs font-semibold text-signal hover:border-signal hover:bg-signal/15 md:rounded-xl md:px-4 md:py-2.5 md:text-sm"
              disabled={isProcessing}
              onClick={onReshorten}
              type="button"
            >
              Reshorten vid
            </button>
          ) : null}

          <button
            className="w-full rounded-lg bg-signal px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 md:rounded-xl md:px-4 md:py-2.5 md:text-sm"
            disabled={!hasUnsavedCrop || isProcessing}
            onClick={onApplyShorten}
            type="button"
          >
            {isProcessing ? "Shortening…" : "Apply shorten"}
          </button>

          {showSavedConfirmation && !hasUnsavedCrop ? (
            <p className="hidden items-center justify-center gap-1 text-[10px] font-semibold text-signal md:flex md:gap-1.5 md:text-[11px]">
              <Check className="h-3 w-3 md:h-3.5 md:w-3.5" strokeWidth={2.5} />
              Clip up to date
            </p>
          ) : hasUnsavedCrop ? (
            <p className="hidden text-center text-[10px] leading-4 text-ed-fg-muted md:block md:text-[11px]">
              Apply to update the working clip.
            </p>
          ) : null}

          {canRestoreOriginal ? (
            <button
              className="editor-secondary-button hidden w-full rounded-md px-2 py-1 text-[10px] font-semibold text-ed-fg md:block md:rounded-lg md:px-3 md:py-2 md:text-xs"
              disabled={isProcessing}
              onClick={onRestoreOriginal}
              type="button"
            >
              Restore original
            </button>
          ) : null}
        </EditorCard>
      </EditorPanelSection>
    </div>
  );
}
