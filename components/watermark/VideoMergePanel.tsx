"use client";

import type { BatchVideoEntry } from "@/lib/videoBatch";
import { formatTimelineClock } from "@/lib/videoTimeline";
import { Video } from "lucide-react";
import { EditorCard, EditorPanelSection } from "./EditorToolPanel";

type VideoMergePanelProps = {
  entries: BatchVideoEntry[];
  isProcessing: boolean;
  onAddVideos: () => void;
  onMergeVideos: () => void;
};

export function VideoMergePanel({
  entries,
  isProcessing,
  onAddVideos,
  onMergeVideos,
}: VideoMergePanelProps) {
  const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);

  return (
    <div className="space-y-1 md:space-y-2">
      <EditorPanelSection hideTitleOnMobile title="Merge videos">
        <EditorCard className="space-y-1.5 p-1.5 md:space-y-3 md:p-3">
          <p className="hidden text-sm leading-6 text-ed-fg-muted md:block">
            Combine every clip in your batch into one working video. The merged
            result replaces the batch as a single clip.
          </p>

          <ol className="max-h-16 space-y-0.5 overflow-y-auto rounded-md border border-ed-border bg-ed-bg px-1.5 py-1 text-[10px] text-ed-fg md:max-h-none md:space-y-2 md:rounded-lg md:px-3 md:py-2 md:text-sm">
            {entries.map((entry, index) => (
              <li className="flex items-center justify-between gap-2 md:gap-3" key={entry.id}>
                <span className="truncate">
                  {index + 1}. {entry.fileName}
                </span>
                <span className="shrink-0 text-[10px] text-ed-fg-muted md:text-xs">
                  {formatTimelineClock(entry.duration)}
                </span>
              </li>
            ))}
          </ol>

          <div className="flex items-center justify-between text-[10px] text-ed-fg-muted md:text-xs">
            <span>{entries.length} clips</span>
            <span>Total {formatTimelineClock(totalDuration)}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1 md:gap-2">
            <button
              className="editor-secondary-button flex items-center justify-center gap-1 rounded-lg border-dashed px-2 py-1.5 text-[10px] font-semibold text-ed-fg hover:border-signal/50 md:gap-2 md:rounded-xl md:px-4 md:py-2.5 md:text-sm"
              disabled={isProcessing}
              onClick={onAddVideos}
              type="button"
            >
              <Video className="h-3.5 w-3.5 text-signal md:h-4 md:w-4" strokeWidth={2} />
              Add video
            </button>

            <button
              className="editor-secondary-button rounded-lg border-signal/40 bg-signal px-2 py-1.5 text-[10px] font-semibold text-white hover:border-signal hover:bg-signal/90 disabled:opacity-60 md:rounded-lg md:px-3 md:py-2.5 md:text-sm"
              disabled={isProcessing || entries.length < 2}
              onClick={onMergeVideos}
              type="button"
            >
              {isProcessing ? "Merging…" : "Merge all"}
            </button>
          </div>
        </EditorCard>
      </EditorPanelSection>
    </div>
  );
}
