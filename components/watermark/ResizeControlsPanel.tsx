"use client";

import {
  ArrowLeftRight,
  ArrowUpDown,
  Crop,
  MoveDiagonal2,
  Square,
} from "lucide-react";
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
  unit,
  value,
}: ResizeDimensionFieldProps) {
  const Icon = axis === "width" ? ArrowLeftRight : ArrowUpDown;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg">
        {label}
      </p>
      <div className="editor-field-sm flex items-center gap-1.5 px-2 py-2">
        <Icon
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 text-ed-fg-muted"
          strokeWidth={2}
        />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums text-ed-fg outline-none"
          min={1}
          onChange={(event) => onChange(Number(event.target.value))}
          type="number"
          value={value}
        />
        <span className="shrink-0 text-xs font-medium text-ed-fg-muted">
          {unit === "percent" ? "%" : "px"}
        </span>
      </div>
    </div>
  );
}

const scaleModeOptions: {
  icon: typeof Crop;
  id: ResizeScaleMode;
  label: string;
}[] = [
  { icon: Crop, id: "trim", label: "Trim" },
  { icon: MoveDiagonal2, id: "stretch", label: "Stretch" },
  { icon: Square, id: "contain", label: "Contain" },
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
    <EditorCard className="space-y-3 p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <ResizeDimensionField
          axis="width"
          label="Width"
          onChange={onWidthChange}
          unit={unit}
          value={displayWidth}
        />
        <ResizeDimensionField
          axis="height"
          label="Height"
          onChange={onHeightChange}
          unit={unit}
          value={displayHeight}
        />
      </div>

      <EditorPanelSection title="Unit">
        <div className="editor-segment-track grid grid-cols-2 gap-2">
          <EditorSegment
            active={unit === "px"}
            groupId="resize-unit"
            onClick={() => onUnitChange("px")}
          >
            PX
          </EditorSegment>
          <EditorSegment
            active={unit === "percent"}
            groupId="resize-unit"
            onClick={() => onUnitChange("percent")}
          >
            %
          </EditorSegment>
        </div>
      </EditorPanelSection>

      <EditorPanelSection title="Scale mode">
        <div className="grid grid-cols-3 gap-1">
          {scaleModeOptions.map(({ icon: Icon, id, label }) => (
            <button
              aria-label={label}
              aria-pressed={scaleMode === id}
              className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[9px] font-bold uppercase tracking-[0.08em] transition ${
                scaleMode === id
                  ? "border-signal bg-ed-bg text-ed-fg shadow-sm ring-2 ring-signal/20"
                  : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:border-signal/40 hover:text-ed-fg"
              }`}
              key={id}
              onClick={() => onScaleModeChange(id)}
              type="button"
            >
              <Icon aria-hidden className="h-4 w-4" strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </EditorPanelSection>

      <EditorToggleRow
        checked={isAspectRatioLocked}
        label="Aspect ratio"
        onChange={onAspectRatioChange}
      />

      {warning ? (
        <p className="text-xs leading-4 text-signal">{warning}</p>
      ) : null}

      <EditorApplyButton disabled={disabled} onClick={onApply} />
    </EditorCard>
  );
}
