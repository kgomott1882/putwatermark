"use client";

import { ArrowLeftRight, ArrowUpDown } from "lucide-react";
import {
  EditorApplyButton,
  EditorCard,
  EditorToggleRow,
} from "./EditorToolPanel";

type CropDimensionFieldProps = {
  axis: "height" | "width";
  label: string;
  min?: number;
  onChange: (value: number) => void;
  value: number;
};

function CropDimensionField({
  axis,
  label,
  min = 1,
  onChange,
  value,
}: CropDimensionFieldProps) {
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
          min={min}
          onChange={(event) => onChange(Number(event.target.value))}
          type="number"
          value={value}
        />
        <span className="shrink-0 text-xs font-medium text-ed-fg-muted">px</span>
      </div>
    </div>
  );
}

type CropControlsPanelProps = {
  cropHeight: number;
  cropWidth: number;
  disabled?: boolean;
  isAspectRatioLocked: boolean;
  onApply: () => void;
  onAspectRatioChange: () => void;
  onHeightChange: (value: number) => void;
  onWidthChange: (value: number) => void;
};

export function CropControlsPanel({
  cropHeight,
  cropWidth,
  disabled,
  isAspectRatioLocked,
  onApply,
  onAspectRatioChange,
  onHeightChange,
  onWidthChange,
}: CropControlsPanelProps) {
  return (
    <EditorCard className="space-y-3 p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <CropDimensionField
          axis="width"
          label="Width"
          onChange={onWidthChange}
          value={cropWidth}
        />
        <CropDimensionField
          axis="height"
          label="Height"
          onChange={onHeightChange}
          value={cropHeight}
        />
      </div>

      <EditorToggleRow
        checked={isAspectRatioLocked}
        label="Aspect ratio"
        onChange={onAspectRatioChange}
      />

      <EditorApplyButton disabled={disabled} onClick={onApply} />
    </EditorCard>
  );
}
