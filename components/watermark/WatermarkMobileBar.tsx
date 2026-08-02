"use client";

import { useState, type ReactNode } from "react";
import { Bold, ChevronDown, Plus, Trash2 } from "lucide-react";
import type { FontFamilyGroup } from "@/lib/watermarkFonts";
import type {
  LogoWatermarkLayer,
  TextWatermarkLayer,
} from "@/lib/watermarkLayers";
import {
  DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
  TEXT_WATERMARK_COLOR_PALETTE,
  type TextWatermarkFontWeight,
} from "@/lib/watermarkTextStyle";
import { EditorSegment } from "./EditorToolPanel";

type WatermarkMode = "single" | "tile";
type TileAngle = 0 | 45 | 90 | 180;
type TileDensity = "sparse" | "medium" | "dense";

type SharedProps = {
  activeLayerId: string;
  fontSizeScale: number;
  layerCount: number;
  layerIds: readonly string[];
  mode: WatermarkMode;
  onAddLayer: () => void;
  onFontSizeScaleChange: (value: number) => void;
  onLayerSelect: (id: string) => void;
  onModeChange: (mode: WatermarkMode) => void;
  onRemoveLayer: (id: string) => void;
  onTileAngleChange: (value: TileAngle) => void;
  onTileDensityChange: (value: TileDensity) => void;
  onTileGapChange: (value: number) => void;
  onWatermarkOpacityChange: (value: number) => void;
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  tileQuickTemplates?: ReactNode;
  watermarkOpacity: number;
};

type TextProps = SharedProps & {
  fontFamilyGroups: readonly FontFamilyGroup[];
  layer: TextWatermarkLayer;
  onFontFamilyChange: (value: string) => void;
  onFontWeightChange: (value: TextWatermarkFontWeight) => void;
  onTextChange: (value: string) => void;
  onTextColorChange: (value: string) => void;
  type: "text";
};

type LogoProps = SharedProps & {
  layer: LogoWatermarkLayer;
  logoError?: string;
  onLogoPick?: () => void;
  type: "logo";
};

export type WatermarkMobileBarProps = TextProps | LogoProps;

function LayerTabs({
  activeLayerId,
  canAddLayer,
  layerCount,
  layerIds,
  onAddLayer,
  onLayerSelect,
  onRemoveLayer,
  type,
}: {
  activeLayerId: string;
  canAddLayer: boolean;
  layerCount: number;
  layerIds: readonly string[];
  onAddLayer: () => void;
  onLayerSelect: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  type: "text" | "logo";
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {layerIds.map((id, index) => (
          <button
            className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] transition ${
              id === activeLayerId
                ? "border-2 border-signal bg-ed-bg font-bold text-ed-fg shadow-sm"
                : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:text-ed-fg"
            }`}
            key={id}
            onClick={() => onLayerSelect(id)}
            type="button"
          >
            {type === "text" ? `Text ${index + 1}` : `Logo ${index + 1}`}
          </button>
        ))}
      </div>
      <button
        aria-label={`Add ${type} watermark`}
        className="editor-secondary-button inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ed-fg-muted hover:text-ed-fg disabled:opacity-35"
        disabled={!canAddLayer}
        onClick={onAddLayer}
        type="button"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        aria-label={`Delete ${type} watermark`}
        className="editor-secondary-button inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ed-fg-muted hover:text-signal disabled:opacity-35"
        disabled={layerCount <= 1}
        onClick={() => onRemoveLayer(activeLayerId)}
        type="button"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

function ModeToggle({
  mode,
  onModeChange,
  type,
}: {
  mode: WatermarkMode;
  onModeChange: (mode: WatermarkMode) => void;
  type: "text" | "logo";
}) {
  return (
    <div className="grid grid-cols-2 gap-0.5 editor-segment-track">
      {(
        [
          { label: "Single", value: "single" },
          { label: "Tile", value: "tile" },
        ] as const
      ).map(({ label, value }) => (
        <EditorSegment
          active={mode === value}
          groupId={`mobile-watermark-mode-${type}`}
          key={value}
          onClick={() => onModeChange(value)}
        >
          {label}
        </EditorSegment>
      ))}
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
    <div className="min-w-0 space-y-1">
      <div className="flex items-center justify-between gap-1">
        <label
          className="text-[9px] font-bold uppercase tracking-[0.08em] text-ed-fg"
          htmlFor={id}
        >
          {label}
        </label>
        <span className="text-[10px] font-semibold tabular-nums text-ed-fg-muted">
          {value}%
        </span>
      </div>
      <input
        className="editor-range"
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

export function WatermarkMobileBar(props: WatermarkMobileBarProps) {
  const [showTileOptions, setShowTileOptions] = useState(false);
  const canAddLayer = props.mode === "single";

  return (
    <div className="space-y-2 px-2 pb-2 pt-1">
      <LayerTabs
        activeLayerId={props.activeLayerId}
        canAddLayer={canAddLayer}
        layerCount={props.layerCount}
        layerIds={props.layerIds}
        onAddLayer={props.onAddLayer}
        onLayerSelect={props.onLayerSelect}
        onRemoveLayer={props.onRemoveLayer}
        type={props.type}
      />

      {props.type === "text" ? (
        <input
          className="editor-field w-full py-2 text-sm"
          onChange={(event) => props.onTextChange(event.target.value)}
          placeholder="Add text here"
          type="text"
          value={props.layer.text}
        />
      ) : props.layer.logoImage ? (
        <button
          className="editor-secondary-button w-full rounded-lg px-3 py-2 text-xs font-semibold text-ed-fg"
          onClick={props.onLogoPick}
          type="button"
        >
          Change logo · {props.layer.logoFileName}
        </button>
      ) : (
        <button
          className="editor-secondary-button w-full rounded-xl border-dashed px-3 py-2.5 text-sm font-semibold text-ed-fg hover:border-signal/50"
          onClick={props.onLogoPick}
          type="button"
        >
          Upload a logo
        </button>
      )}

      <ModeToggle
        mode={props.mode}
        onModeChange={props.onModeChange}
        type={props.type}
      />

      {props.mode === "tile" && props.tileQuickTemplates ? (
        <div className="space-y-1">{props.tileQuickTemplates}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <CompactSlider
          id="mobile-watermark-size"
          label={props.type === "logo" ? "Logo size" : "Text size"}
          max={135}
          min={15}
          onChange={props.onFontSizeScaleChange}
          step={5}
          value={props.fontSizeScale}
        />
        <CompactSlider
          id="mobile-watermark-opacity"
          label="Opacity"
          max={100}
          min={10}
          onChange={props.onWatermarkOpacityChange}
          step={5}
          value={props.watermarkOpacity}
        />
      </div>

      {props.mode === "tile" ? (
        <>
          <button
            className="flex w-full items-center justify-center gap-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ed-fg-muted"
            onClick={() => setShowTileOptions((current) => !current)}
            type="button"
          >
            {showTileOptions ? "Hide tile options" : "Tile options"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition ${showTileOptions ? "rotate-180" : ""}`}
            />
          </button>
          {showTileOptions ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-ed-border bg-ed-bg-card p-2">
              <CompactSlider
                id="mobile-tile-density"
                label="Density"
                max={100}
                min={0}
                onChange={(percent) => {
                  const density =
                    percent < 25 ? "sparse" : percent < 75 ? "medium" : "dense";
                  props.onTileDensityChange(density);
                }}
                step={1}
                value={
                  props.tileDensity === "sparse"
                    ? 0
                    : props.tileDensity === "medium"
                      ? 50
                      : 100
                }
              />
              <CompactSlider
                id="mobile-tile-gap"
                label="Gap"
                max={300}
                min={50}
                onChange={props.onTileGapChange}
                step={10}
                value={props.tileGap}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {props.type === "text" ? (
        <div className="flex items-center gap-1.5">
          <select
            className="editor-field-sm min-w-0 flex-1 rounded-md py-2 text-xs"
            onChange={(event) => props.onFontFamilyChange(event.target.value)}
            value={
              props.layer.fontFamily ??
              props.fontFamilyGroups[0]?.fonts[0]?.value ??
              ""
            }
          >
            {props.fontFamilyGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.fonts.map(({ label, value }) => (
                  <option key={`${group.label}-${label}`} value={value}>
                    {label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            aria-label="Bold text"
            aria-pressed={(props.layer.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT) === 700}
            className={`editor-secondary-button flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
              (props.layer.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT) === 700
                ? "border-2 border-signal bg-signal/15 text-ed-fg"
                : "text-ed-fg-muted"
            }`}
            onClick={() =>
              props.onFontWeightChange(
                (props.layer.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT) === 700
                  ? 400
                  : 700,
              )
            }
            type="button"
          >
            <Bold className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      ) : null}

      {props.type === "text" ? (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TEXT_WATERMARK_COLOR_PALETTE.map(({ label, value }) => {
            const textColor = props.layer.textColor ?? "#FFFFFF";
            const isActive = textColor.toUpperCase() === value.toUpperCase();

            return (
              <button
                aria-label={label}
                aria-pressed={isActive}
                className={`relative h-7 w-7 shrink-0 rounded-full border transition ${
                  isActive
                    ? "border-2 border-signal ring-2 ring-signal/35"
                    : "border-ed-border"
                }`}
                key={value}
                onClick={() => props.onTextColorChange(value)}
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
      ) : null}

      {props.type === "logo" && props.logoError ? (
        <p className="text-xs text-signal">{props.logoError}</p>
      ) : null}
    </div>
  );
}
