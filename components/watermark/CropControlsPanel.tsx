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
    <div className="space-y-0.5 md:space-y-1.5">
      <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-ed-fg md:text-[10px] md:tracking-[0.12em]">
        {label}
      </p>
      <div className="editor-field-sm flex items-center gap-1 px-1.5 py-1 md:gap-1.5 md:px-2 md:py-2">
        <Icon
          aria-hidden
          className="h-3 w-3 shrink-0 text-ed-fg-muted md:h-3.5 md:w-3.5"
          strokeWidth={2}
        />
        <input
          className="min-w-0 flex-1 bg-transparent text-xs font-semibold tabular-nums text-ed-fg outline-none md:text-sm"
          min={min}
          onChange={(event) => onChange(Number(event.target.value))}
          type="number"
          value={value}
        />
        <span className="shrink-0 text-[10px] font-medium text-ed-fg-muted md:text-xs">
          px
        </span>
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
    <EditorCard className="space-y-1 !p-1 md:space-y-3 md:!p-2.5">
      <div className="grid grid-cols-2 gap-1 md:gap-2">
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
        className="max-md:py-0.5"
        label="Aspect ratio"
        onChange={onAspectRatioChange}
      />

      <EditorApplyButton disabled={disabled} onClick={onApply} />
    </EditorCard>
  );
}
