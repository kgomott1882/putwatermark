"use client";

import { ArrowLeftRight, ArrowUpDown } from "lucide-react";
import {
  EditorApplyButton,
  EditorCard,
  EditorPanelSection,
  EditorSegment,
  EditorToggleRow,
} from "./EditorToolPanel";

export type ResizeScaleMode = "contain" | "stretch" | "trim";
export type ResizeUnit = "percent" | "px";

type ResizeDimensionFieldProps = {
  axis: "height" | "width";
  label: string;
  onChange: (value: number) => void;
  unit: ResizeUnit;
  value: number;
};

function ResizeDimensionField({
  axis,
  label,
  onChange,
  value,
}: Omit<ResizeDimensionFieldProps, "unit">) {
  const Icon = axis === "width" ? ArrowLeftRight : ArrowUpDown;

  return (
    <div className="space-y-0 md:space-y-1.5">
      <p className="hidden text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg md:block">
        {label}
      </p>
      <div className="editor-field-sm flex min-h-[26px] items-center gap-1 px-1.5 py-1 md:min-h-0 md:gap-1.5 md:px-2 md:py-2">
        <span className="shrink-0 text-[8px] font-bold uppercase text-ed-fg-muted md:hidden">
          {axis === "width" ? "W" : "H"}
        </span>
        <Icon
          aria-hidden
          className="hidden h-3.5 w-3.5 shrink-0 text-ed-fg-muted md:block"
          strokeWidth={2}
        />
        <input
          className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold tabular-nums text-ed-fg outline-none md:text-sm"
          min={1}
          onChange={(event) => onChange(Number(event.target.value))}
          type="number"
          value={value}
        />
      </div>
    </div>
  );
}

function ResizeUnitToggle({
  onUnitChange,
  unit,
}: {
  onUnitChange: (unit: ResizeUnit) => void;
  unit: ResizeUnit;
}) {
  return (
    <div className="flex min-w-[2rem] flex-col justify-end md:min-w-0">
      <p className="mb-0 hidden text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg md:mb-1.5 md:block">
        Unit
      </p>
      <div className="editor-segment-track flex shrink-0 flex-col gap-0 self-stretch md:flex-row md:gap-2">
        <EditorSegment
          active={unit === "px"}
          className="max-md:flex-1 max-md:rounded-sm max-md:px-1.5 max-md:py-0.5 max-md:text-[8px]"
          groupId="resize-unit"
          onClick={() => onUnitChange("px")}
          ultraCompact
        >
          PX
        </EditorSegment>
        <EditorSegment
          active={unit === "percent"}
          className="max-md:flex-1 max-md:rounded-sm max-md:px-1.5 max-md:py-0.5 max-md:text-[8px]"
          groupId="resize-unit"
          onClick={() => onUnitChange("percent")}
          ultraCompact
        >
          %
        </EditorSegment>
      </div>
    </div>
  );
}

const scaleModeOptions: {
  id: ResizeScaleMode;
  label: string;
}[] = [
  { id: "trim", label: "Trim" },
  { id: "stretch", label: "Stretch" },
  { id: "contain", label: "Contain" },
];

type ResizeControlsPanelProps = {
  disabled?: boolean;
  displayHeight: number;
  displayWidth: number;
  isAspectRatioLocked: boolean;
  onApply: () => void;
  onAspectRatioChange: () => void;
  onHeightChange: (value: number) => void;
  onScaleModeChange: (mode: ResizeScaleMode) => void;
  onUnitChange: (unit: ResizeUnit) => void;
  onWidthChange: (value: number) => void;
  scaleMode: ResizeScaleMode;
  unit: ResizeUnit;
  warning?: string;
};

export function ResizeControlsPanel({
  disabled,
  displayHeight,
  displayWidth,
  isAspectRatioLocked,
  onApply,
  onAspectRatioChange,
  onHeightChange,
  onScaleModeChange,
  onUnitChange,
  onWidthChange,
  scaleMode,
  unit,
  warning,
}: ResizeControlsPanelProps) {
  return (
    <EditorCard className="space-y-0.5 !p-0.5 md:space-y-3 md:!p-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-0.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5.5rem] md:gap-2">
        <ResizeDimensionField
          axis="width"
          label="Width"
          onChange={onWidthChange}
          value={displayWidth}
        />
        <ResizeDimensionField
          axis="height"
          label="Height"
          onChange={onHeightChange}
          value={displayHeight}
        />
        <ResizeUnitToggle onUnitChange={onUnitChange} unit={unit} />
      </div>

      <EditorPanelSection className="max-md:space-y-0" hideTitleOnMobile title="Scale mode">
        <div className="grid grid-cols-3 gap-0 md:gap-1">
          {scaleModeOptions.map(({ id, label }) => (
            <button
              aria-label={label}
              aria-pressed={scaleMode === id}
              className={`flex items-center justify-center rounded-sm border px-0.5 py-0.5 text-[6px] font-bold uppercase tracking-[0.04em] transition md:rounded-lg md:px-1 md:py-2 md:text-[9px] md:tracking-[0.08em] ${
                scaleMode === id
                  ? "editor-selected-strong"
                  : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:border-signal/40 hover:text-ed-fg"
              }`}
              key={id}
              onClick={() => onScaleModeChange(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </EditorPanelSection>

      <EditorToggleRow
        checked={isAspectRatioLocked}
        className="max-md:gap-1 max-md:py-0 max-md:text-[7px]"
        compact
        label="Aspect ratio"
        onChange={onAspectRatioChange}
      />

      {warning ? (
        <p className="text-[10px] leading-3.5 text-signal md:text-xs md:leading-4">
          {warning}
        </p>
      ) : null}

      <EditorApplyButton disabled={disabled} onClick={onApply} />
    </EditorCard>
  );
}
