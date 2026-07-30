"use client";

import type { ReactNode } from "react";
import { Bold } from "lucide-react";
import type { FontFamilyGroup } from "@/lib/watermarkFonts";
import {
  DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
  TEXT_WATERMARK_COLOR_PALETTE,
  type TextWatermarkFontWeight,
} from "@/lib/watermarkTextStyle";

type FontFamilyOption = {
  label: string;
  value: string;
};

type WatermarkStyleControlsProps = {
  embedded?: boolean;
  fontFamilies?: readonly FontFamilyOption[];
  fontFamilyGroups?: readonly FontFamilyGroup[];
  fontFamily: string;
  fontSizeScale: number;
  fontWeight?: TextWatermarkFontWeight;
  hideSliders?: boolean;
  onFontFamilyChange: (value: string) => void;
  onFontSizeScaleChange: (value: number) => void;
  onFontWeightChange?: (value: TextWatermarkFontWeight) => void;
  onTextColorChange?: (value: string) => void;
  onWatermarkOpacityChange: (value: number) => void;
  textColor?: string;
  watermarkOpacity: number;
  watermarkType: "logo" | "signature" | "text";
  signatureKind?: "full" | "initials" | null;
};

function StyleField({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg">
        {title}
      </p>
      {children}
    </div>
  );
}

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
      <div className="flex items-center justify-between gap-2">
        <label
          className="text-[10px] font-bold uppercase tracking-[0.08em] text-ed-fg"
          htmlFor={id}
        >
          {label}
        </label>
        <span className="text-[11px] font-semibold tabular-nums text-ed-fg">
          {value}%
        </span>
      </div>
      <input
        className="editor-range mt-1.5"
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
  embedded = false,
  fontFamilies,
  fontFamilyGroups,
  fontFamily,
  fontSizeScale,
  fontWeight = DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
  hideSliders = false,
  onFontFamilyChange,
  onFontSizeScaleChange,
  onFontWeightChange,
  onTextColorChange,
  onWatermarkOpacityChange,
  signatureKind = null,
  textColor = "#FFFFFF",
  watermarkOpacity,
  watermarkType,
}: WatermarkStyleControlsProps) {
  const sizeLabel =
    watermarkType === "logo"
      ? "Logo size"
      : watermarkType === "signature"
        ? signatureKind === "initials"
          ? "Initials size"
          : "Signature size"
        : "Text size";

  const sectionSpacing = embedded ? "space-y-3" : "space-y-2";
  const sliderLayout = embedded ? "stack" : "grid";

  return (
    <div className={sectionSpacing}>
      {watermarkType === "text" ? (
        <>
          <StyleField title="Font">
            <div className="flex items-center gap-1.5">
              <select
                className="editor-field-sm min-w-0 flex-1 rounded-md"
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
                className={`editor-secondary-button flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                  fontWeight === 700
                    ? "border-2 border-signal bg-signal/15 text-ed-fg ring-2 ring-signal/30"
                    : "text-ed-fg-muted hover:border-signal/50"
                }`}
                onClick={() =>
                  onFontWeightChange?.(fontWeight === 700 ? 400 : 700)
                }
                type="button"
              >
                <Bold className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </StyleField>

          <StyleField title="Color">
            <div className="flex flex-wrap gap-1.5">
              {TEXT_WATERMARK_COLOR_PALETTE.map(({ label, value }) => {
                const isActive = textColor.toUpperCase() === value.toUpperCase();

                return (
                  <button
                    aria-label={label}
                    aria-pressed={isActive}
                    className={`relative h-6 w-6 rounded-full border transition ${
                      isActive
                        ? "border-2 border-signal ring-2 ring-signal/35"
                        : "border-ed-border hover:border-signal/50"
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
          </StyleField>
        </>
      ) : null}

      {hideSliders ? null : (
      <div
        className={
          sliderLayout === "stack" ? "space-y-3" : "grid grid-cols-2 gap-2"
        }
      >
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
      )}
    </div>
  );
}
