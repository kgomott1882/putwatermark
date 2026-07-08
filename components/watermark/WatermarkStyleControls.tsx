"use client";

import { EditorPanelSection } from "./EditorToolPanel";

type FontFamilyOption = {
  label: string;
  value: string;
};

type WatermarkStyleControlsProps = {
  fontFamilies: readonly FontFamilyOption[];
  fontFamily: string;
  fontSizeScale: number;
  onFontFamilyChange: (value: string) => void;
  onFontSizeScaleChange: (value: number) => void;
  onWatermarkOpacityChange: (value: number) => void;
  watermarkOpacity: number;
  watermarkType: "logo" | "signature" | "text";
};

export function WatermarkStyleControls({
  fontFamilies,
  fontFamily,
  fontSizeScale,
  onFontFamilyChange,
  onFontSizeScaleChange,
  onWatermarkOpacityChange,
  watermarkOpacity,
  watermarkType,
}: WatermarkStyleControlsProps) {
  return (
    <div className="space-y-2">
      <EditorPanelSection title="Opacity">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-ink">{watermarkOpacity}%</span>
        </div>
        <input
          className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-editor-panel-header accent-signal"
          id="watermark-opacity"
          max={100}
          min={10}
          onChange={(event) => onWatermarkOpacityChange(Number(event.target.value))}
          step={5}
          type="range"
          value={watermarkOpacity}
        />
      </EditorPanelSection>

      <EditorPanelSection
        title={
          watermarkType === "logo"
            ? "Logo size"
            : watermarkType === "signature"
              ? "Signature size"
              : "Font size"
        }
      >
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-ink">{fontSizeScale}%</span>
        </div>
        <input
          className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-editor-panel-header accent-signal"
          id="font-size"
          max={135}
          min={15}
          onChange={(event) => onFontSizeScaleChange(Number(event.target.value))}
          step={5}
          type="range"
          value={fontSizeScale}
        />
      </EditorPanelSection>

      {watermarkType === "text" ? (
        <EditorPanelSection title="Font family">
          <select
            className="w-full rounded-xl border border-editor-panel-border bg-white px-2.5 py-2 text-sm text-editor-ink outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
            id="font-family"
            onChange={(event) => onFontFamilyChange(event.target.value)}
            value={fontFamily}
          >
            {fontFamilies.map(({ label, value }) => (
              <option key={label} value={value}>
                {label}
              </option>
            ))}
          </select>
        </EditorPanelSection>
      ) : null}
    </div>
  );
}
