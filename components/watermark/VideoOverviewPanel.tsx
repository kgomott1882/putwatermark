"use client";

import { EditorCard, EditorPanelSection } from "./EditorToolPanel";
import { formatVideoClock } from "./VideoOverviewPlayer";

type VideoOverviewPanelProps = {
  durationSeconds: number;
  fileName: string;
  fileSizeBytes: number;
  height?: number;
  width?: number;
};

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "N/A";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoOverviewPanel({
  durationSeconds,
  fileName,
  fileSizeBytes,
  height,
  width,
}: VideoOverviewPanelProps) {
  return (
    <div className="space-y-2">
      <EditorPanelSection title="Video overview">
        <EditorCard className="space-y-2 p-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ed-fg-muted">
              File name
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-ed-fg" title={fileName}>
              {fileName || "Untitled video"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-ed-border bg-ed-bg px-2 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ed-fg-muted">
                Duration
              </p>
              <p className="mt-0.5 text-xs font-semibold tabular-nums text-ed-fg">
                {formatVideoClock(durationSeconds)}
              </p>
            </div>
            <div className="rounded-lg border border-ed-border bg-ed-bg px-2 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ed-fg-muted">
                Resolution
              </p>
              <p className="mt-0.5 text-xs font-semibold tabular-nums text-ed-fg">
                {width && height ? `${width}×${height}` : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-ed-border bg-ed-bg px-2 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ed-fg-muted">
                File size
              </p>
              <p className="mt-0.5 text-xs font-semibold tabular-nums text-ed-fg">
                {formatFileSize(fileSizeBytes)}
              </p>
            </div>
          </div>
        </EditorCard>
      </EditorPanelSection>
    </div>
  );
}
