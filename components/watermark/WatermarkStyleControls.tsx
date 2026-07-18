"use client";

import { Bold } from "lucide-react";
import type { FontFamilyGroup } from "@/lib/watermarkFonts";
import {
  TEXT_WATERMARK_COLOR_PALETTE,
  type TextWatermarkFontWeight,
} from "@/lib/watermarkTextStyle";

type FontFamilyOption = {
  label: string;
  value: string;
};

type WatermarkStyleControlsProps = {
  fontFamilies?: readonly FontFamilyOption[];
  fontFamilyGroups?: readonly FontFamilyGroup[];
  fontFamily: string;
  fontSizeScale: number;
  fontWeight?: TextWatermarkFontWeight;
  onFontFamilyChange: (value: string) => void;
  onFontSizeScaleChange: (value: number) => void;
  onFontWeightChange?: (value: TextWatermarkFontWeight) => void;
  onTextColorChange?: (value: string) => void;
  onWatermarkOpacityChange: (value: number) => void;
  textColor?: string;
  watermarkOpacity: number;
  watermarkType: "logo" | "signature" | "text";
};

function CompactSlider({
  id,
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  id: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-beige-dim">
          {label}
        </span>
        <span className="text-[11px] font-semibold tabular-nums text-beige">{value}%</span>
      </div>
      <input
        className="mt-0.5 h-1 w-full cursor-pointer appearance-none rounded-full bg-editor-panel-header accent-signal"
        id={id}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </div>
  );
}

export function WatermarkStyleControls({
  fontFamilies,
  fontFamilyGroups,
  fontFamily,
  fontSizeScale,
  fontWeight = 700,
  onFontFamilyChange,
  onFontSizeScaleChange,
  onFontWeightChange,
  onTextColorChange,
  onWatermarkOpacityChange,
  textColor = "#FFFFFF",
  watermarkOpacity,
  watermarkType,
}: WatermarkStyleControlsProps) {
  const sizeLabel =
    watermarkType === "logo"
      ? "Logo size"
      : watermarkType === "signature"
        ? "Sig size"
        : "Text size";

  return (
    <div className="space-y-2">
      {watermarkType === "text" ? (
        <>
          <div className="flex items-center gap-1">
            <select
              className="min-w-0 flex-1 rounded-md border border-beige/10 bg-night-card px-2 py-1.5 text-xs text-beige outline-none transition focus:border-signal"
              id="font-family"
              onChange={(event) => onFontFamilyChange(event.target.value)}
              value={fontFamily}
            >
              {fontFamilyGroups
                ? fontFamilyGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.fonts.map(({ label, value }) => (
                        <option key={`${group.label}-${label}`} value={value}>
                          {label}
                        </option>
                      ))}
                    </optgroup>
                  ))
                : fontFamilies?.map(({ label, value }) => (
                    <option key={label} value={value}>
                      {label}
                    </option>
                  ))}
            </select>
            <button
              aria-label="Bold text"
              aria-pressed={fontWeight === 700}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${
                fontWeight === 700
                  ? "border-signal bg-signal text-white"
                  : "border-beige/10 bg-night-elevated text-beige-dim hover:border-sand/40 hover:text-beige"
              }`}
              onClick={() =>
                onFontWeightChange?.(fontWeight === 700 ? 400 : 700)
              }
              type="button"
            >
              <Bold className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="grid grid-cols-[auto_1fr] items-center gap-x-1.5 gap-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-beige-dim">
              Color
            </span>
            <div className="flex flex-wrap gap-1">
              {TEXT_WATERMARK_COLOR_PALETTE.map(({ label, value }) => {
                const isActive = textColor.toUpperCase() === value.toUpperCase();

                return (
                  <button
                    aria-label={label}
                    aria-pressed={isActive}
                    className={`relative h-6 w-6 rounded-full border transition ${
                      isActive
                        ? "border-signal ring-1 ring-signal/40"
                        : "border-beige/15 hover:border-sand/50"
                    }`}
                    key={value}
                    onClick={() => onTextColorChange?.(value)}
                    title={label}
                    type="button"
                  >
                    <span
                      className="absolute inset-px rounded-full"
                      style={{ backgroundColor: value }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <CompactSlider
          id="font-size"
          label={sizeLabel}
          max={135}
          min={15}
          onChange={onFontSizeScaleChange}
          step={5}
          value={fontSizeScale}
        />
        <CompactSlider
          id="watermark-opacity"
          label="Opacity"
          max={100}
          min={10}
          onChange={onWatermarkOpacityChange}
          step={5}
          value={watermarkOpacity}
        />
      </div>
    </div>
  );
}
