"use client";

import {
  formatVideoExportCostNotice,
  type VideoServerCostEstimate,
} from "../../src/lib/exportCost";
import { EditorCard } from "./EditorToolPanel";

type VideoServerProcessingPanelProps = {
  estimate: VideoServerCostEstimate;
};

export function VideoServerProcessingPanel({
  estimate,
}: VideoServerProcessingPanelProps) {
  const costSummary = formatVideoExportCostNotice({
    cost: estimate.cost,
    durationBase: estimate.durationBase,
    durationSeconds: estimate.durationSeconds,
    fileSizeBytes: estimate.fileSizeBytes,
    longVideoChunkSurcharge: estimate.estimatedLongVideoChunkSurcharge,
    longVideoExtraChunks: estimate.estimatedExtraChunks,
    longVideoSurchargeEstimated: estimate.longServerRoute,
    sizeSurcharge: estimate.sizeSurcharge,
  });

  return (
    <EditorCard>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg">
        Server processing
      </p>

      <div className="mt-3 rounded-xl border border-ed-border bg-ed-bg-card/70 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ed-fg-muted">
          Current estimate
        </p>
        <p className="mt-1 text-sm text-ed-fg">{costSummary}</p>
        {estimate.longServerRoute ? (
          <p className="mt-2 text-xs leading-5 text-ed-fg-muted">
            Long-video processing uses an estimated chunk count before export.
            Final billing uses the actual server split and is usually the same
            or lower.
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-6 text-ed-fg-muted">
        If you&apos;d like to reduce this cost, compress your video before
        uploading using a tool like HandBrake (free) or your phone or
        computer&apos;s built in video export settings, then re-upload.
      </p>
    </EditorCard>
  );
}
