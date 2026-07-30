"use client";

import { Plus, Trash2 } from "lucide-react";
import type { BlurBrushSize } from "@/lib/blurBrush";
import {
  getVideoBlurRegionTimingLabel,
  type VideoBlurRegion,
} from "@/lib/videoBlurRegions";
import { EditorCard, EditorPanelSection } from "./EditorToolPanel";

type VideoBlurPanelProps = {
  activeRegionId: string | null;
  brushSize: BlurBrushSize;
  durationSeconds: number;
  onActiveRegionSelect: (regionId: string) => void;
  onAddRegion: () => void;
  onBrushSizeChange: (size: BlurBrushSize) => void;
  onClearRegionStrokes: (regionId: string) => void;
  onRemoveRegion: (regionId: string) => void;
  regions: VideoBlurRegion[];
};

const brushOptions = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
] as const;

export function VideoBlurPanel({
  activeRegionId,
  brushSize,
  durationSeconds,
  onActiveRegionSelect,
  onAddRegion,
  onBrushSizeChange,
  onClearRegionStrokes,
  onRemoveRegion,
  regions,
}: VideoBlurPanelProps) {
  const activeRegion =
    regions.find((region) => region.id === activeRegionId) ?? regions[0];

  return (
    <div className="space-y-2">
      <EditorPanelSection title="Blur">
        <EditorCard className="space-y-3 p-3">
          <p className="text-sm leading-6 text-ed-fg-muted">
            Click and drag on the video to pixelate faces or sensitive areas.
            Set when each blur appears using the timeline below — for example,
            show it only between 3–4 seconds.
          </p>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg">
              Blur regions
            </p>
            <button
              aria-label="Add blur region"
              className="editor-secondary-button flex h-7 w-7 items-center justify-center rounded-md text-ed-fg-muted hover:text-ed-fg"
              onClick={onAddRegion}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          <ul className="space-y-1.5">
            {regions.map((region) => {
              const isActive = region.id === activeRegion?.id;

              return (
                <li
                  className={`rounded-lg border px-2.5 py-2 ${
                    isActive
                      ? "border-[#e8dfd1] bg-[#faf6f0]"
                      : "border-ed-border bg-ed-bg"
                  }`}
                  key={region.id}
                >
                  <div className="flex items-start gap-2">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onActiveRegionSelect(region.id)}
                      type="button"
                    >
                      <p className="truncate text-sm font-medium text-ed-fg">
                        {region.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ed-fg-muted">
                        {getVideoBlurRegionTimingLabel(region, durationSeconds)}
                        {" · "}
                        {region.strokes.length}{" "}
                        {region.strokes.length === 1 ? "stroke" : "strokes"}
                      </p>
                    </button>
                    {regions.length > 1 ? (
                      <button
                        aria-label={`Remove ${region.label}`}
                        className="rounded-md p-1 text-ed-fg-muted transition hover:bg-ed-accent/10 hover:text-ed-accent"
                        onClick={() => onRemoveRegion(region.id)}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </EditorCard>
      </EditorPanelSection>

      <EditorPanelSection title="Brush size">
        <div className="grid grid-cols-3 gap-2">
          {brushOptions.map((option) => (
            <button
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition shadow-sm ${
                brushSize === option.id
                  ? "border-2 border-signal bg-signal/15 text-ed-fg ring-2 ring-signal/30"
                  : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:text-ed-fg"
              }`}
              key={option.id}
              onClick={() => onBrushSizeChange(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </EditorPanelSection>

      {activeRegion && activeRegion.strokes.length > 0 ? (
        <button
          className="editor-secondary-button w-full rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-ed-fg-muted hover:text-ed-fg"
          onClick={() => onClearRegionStrokes(activeRegion.id)}
          type="button"
        >
          Clear active region
        </button>
      ) : null}
    </div>
  );
}
