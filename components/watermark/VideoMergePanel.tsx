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
    <div className="space-y-2">
      <EditorPanelSection title="Merge videos">
        <EditorCard className="space-y-3 p-3">
          <p className="text-sm leading-6 text-ed-fg-muted">
            Combine every clip in your batch into one working video. The merged
            result replaces the batch as a single clip.
          </p>

          <ol className="space-y-2 rounded-lg border border-ed-border bg-ed-bg px-3 py-2 text-sm text-ed-fg">
            {entries.map((entry, index) => (
              <li className="flex items-center justify-between gap-3" key={entry.id}>
                <span className="truncate">
                  {index + 1}. {entry.fileName}
                </span>
                <span className="shrink-0 text-xs text-ed-fg-muted">
                  {formatTimelineClock(entry.duration)}
                </span>
              </li>
            ))}
          </ol>

          <div className="flex items-center justify-between text-xs text-ed-fg-muted">
            <span>{entries.length} clips</span>
            <span>Total {formatTimelineClock(totalDuration)}</span>
          </div>

          <button
            className="editor-secondary-button flex w-full items-center justify-center gap-2 rounded-xl border-dashed px-4 py-2.5 text-sm font-semibold text-ed-fg hover:border-signal/50"
            disabled={isProcessing}
            onClick={onAddVideos}
            type="button"
          >
            <Video className="h-4 w-4 text-signal" strokeWidth={2} />
            Add video
          </button>

          <button
            className="editor-secondary-button w-full rounded-lg border-signal/40 bg-signal px-3 py-2.5 text-sm font-semibold text-white hover:border-signal hover:bg-signal/90 disabled:opacity-60"
            disabled={isProcessing || entries.length < 2}
            onClick={onMergeVideos}
            type="button"
          >
            {isProcessing ? "Merging…" : "Merge all clips"}
          </button>
        </EditorCard>
      </EditorPanelSection>
    </div>
  );
}
