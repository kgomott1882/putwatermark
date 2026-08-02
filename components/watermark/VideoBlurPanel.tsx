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
    <div className="space-y-1 md:space-y-2">
      <EditorPanelSection hideTitleOnMobile title="Blur">
        <EditorCard className="space-y-1.5 p-1.5 md:space-y-3 md:p-3">
          <p className="hidden text-sm leading-6 text-ed-fg-muted md:block">
            Click and drag on the video to pixelate faces or sensitive areas.
            Set when each blur appears using the timeline below — for example,
            show it only between 3–4 seconds.
          </p>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ed-fg md:text-[10px] md:tracking-[0.12em]">
              Blur regions
            </p>
            <button
              aria-label="Add blur region"
              className="editor-secondary-button flex h-6 w-6 items-center justify-center rounded-md text-ed-fg-muted hover:text-ed-fg md:h-7 md:w-7"
              onClick={onAddRegion}
              type="button"
            >
              <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" strokeWidth={2} />
            </button>
          </div>

          <ul className="space-y-0.5 md:space-y-1.5">
            {regions.map((region) => {
              const isActive = region.id === activeRegion?.id;

              return (
                <li
                  className={`rounded-md border px-1.5 py-0.5 md:rounded-lg md:px-2.5 md:py-2 ${
                    isActive
                      ? "border-[#e8dfd1] bg-[#faf6f0]"
                      : "border-ed-border bg-ed-bg"
                  }`}
                  key={region.id}
                >
                  <div className="flex items-start gap-1.5 md:gap-2">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onActiveRegionSelect(region.id)}
                      type="button"
                    >
                      <p className="truncate text-[10px] font-medium text-ed-fg md:text-sm">
                        {region.label}
                      </p>
                      <p className="text-[9px] text-ed-fg-muted md:mt-0.5 md:text-[11px]">
                        {getVideoBlurRegionTimingLabel(region, durationSeconds)}
                        {" · "}
                        {region.strokes.length}{" "}
                        {region.strokes.length === 1 ? "stroke" : "strokes"}
                      </p>
                    </button>
                    {regions.length > 1 ? (
                      <button
                        aria-label={`Remove ${region.label}`}
                        className="rounded-md p-0.5 text-ed-fg-muted transition hover:bg-ed-accent/10 hover:text-ed-accent md:p-1"
                        onClick={() => onRemoveRegion(region.id)}
                        type="button"
                      >
                        <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" strokeWidth={2} />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="md:hidden">
            <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-ed-fg-muted">
              Brush
            </p>
            <div className="grid grid-cols-3 gap-0.5">
              {brushOptions.map((option) => (
                <button
                  className={`rounded-md border px-1 py-0.5 text-[9px] font-semibold transition shadow-sm ${
                    brushSize === option.id
                      ? "border-2 border-signal bg-signal/15 text-ed-fg ring-1 ring-signal/30"
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
          </div>
        </EditorCard>
      </EditorPanelSection>

      <EditorPanelSection className="hidden md:block" title="Brush size">
        <div className="grid grid-cols-3 gap-1 md:gap-2">
          {brushOptions.map((option) => (
            <button
              className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition shadow-sm md:rounded-xl md:px-3 md:py-2 md:text-xs ${
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
          className="editor-secondary-button hidden w-full rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ed-fg-muted hover:text-ed-fg md:block md:rounded-xl md:px-4 md:py-2.5 md:text-xs md:tracking-[0.08em]"
          onClick={() => onClearRegionStrokes(activeRegion.id)}
          type="button"
        >
          Clear active region
        </button>
      ) : null}
    </div>
  );
}
