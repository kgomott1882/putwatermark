"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  LogoWatermarkLayer,
  TextWatermarkLayer,
  WatermarkPosition,
} from "@/lib/watermarkLayers";
import {
  EditorCard,
  EditorGridChoice,
  EditorPanelSection,
  EditorPill,
} from "./EditorToolPanel";
import { WatermarkStyleControls } from "./WatermarkStyleControls";

type WatermarkMode = "single" | "tile";
type TileAngle = 0 | 45 | 90 | 180;
type TileDensity = "sparse" | "medium" | "dense";

type FontFamilyOption = {
  label: string;
  value: string;
};

const watermarkPositions: { label: string; value: WatermarkPosition }[] = [
  { label: "Top left", value: "top-left" },
  { label: "Top center", value: "top-center" },
  { label: "Top right", value: "top-right" },
  { label: "Center left", value: "center-left" },
  { label: "Center", value: "center" },
  { label: "Center right", value: "center-right" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Bottom center", value: "bottom-center" },
  { label: "Bottom right", value: "bottom-right" },
];

const tileDensities: { label: string; value: TileDensity }[] = [
  { label: "Sparse", value: "sparse" },
  { label: "Medium", value: "medium" },
  { label: "Dense", value: "dense" },
];

const tileAngles: { label: string; value: TileAngle }[] = [
  { label: "0°", value: 0 },
  { label: "45°", value: 45 },
  { label: "90°", value: 90 },
  { label: "180°", value: 180 },
];

type WatermarkLayersPanelProps = {
  activeLayerId: string;
  fontFamilies: readonly FontFamilyOption[];
  hasMedia: boolean;
  layer: TextWatermarkLayer | LogoWatermarkLayer;
  layerCount: number;
  layerIds: readonly string[];
  logoBackgroundMessage?: string;
  logoError?: string;
  mode: WatermarkMode;
  onAddLayer: () => void;
  onFontFamilyChange: (value: string) => void;
  onFontSizeScaleChange: (value: number) => void;
  onLayerSelect: (id: string) => void;
  onLogoBackgroundToggle?: () => void;
  onLogoPick?: () => void;
  onLogoRemove?: () => void;
  onPositionChange: (position: WatermarkPosition) => void;
  onRemoveLayer: (id: string) => void;
  onTextChange: (value: string) => void;
  onTileAngleChange: (value: TileAngle) => void;
  onTileDensityChange: (value: TileDensity) => void;
  onTileGapChange: (value: number) => void;
  onWatermarkOpacityChange: (value: number) => void;
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  type: "text" | "logo";
  watermarkPosition: WatermarkPosition;
};

export function WatermarkLayersPanel({
  activeLayerId,
  fontFamilies,
  hasMedia,
  layer,
  layerCount,
  layerIds,
  logoBackgroundMessage,
  logoError,
  mode,
  onAddLayer,
  onFontFamilyChange,
  onFontSizeScaleChange,
  onLayerSelect,
  onLogoBackgroundToggle,
  onLogoPick,
  onLogoRemove,
  onPositionChange,
  onRemoveLayer,
  onTextChange,
  onTileAngleChange,
  onTileDensityChange,
  onTileGapChange,
  onWatermarkOpacityChange,
  tileAngle,
  tileDensity,
  tileGap,
  type,
  watermarkPosition,
}: WatermarkLayersPanelProps) {
  const canAddLayer = mode === "single";
  const activeIndex = Math.max(0, layerIds.indexOf(activeLayerId));
  const logoLayer = type === "logo" ? (layer as LogoWatermarkLayer) : null;
  const textLayer = type === "text" ? (layer as TextWatermarkLayer) : null;

  return (
    <div className="space-y-3">
      <EditorPanelSection
        title={type === "text" ? "Text watermarks" : "Logo watermarks"}
      >
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {layerIds.map((id, index) => (
              <button
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                  id === activeLayerId
                    ? "bg-signal text-white"
                    : "border border-beige/10 bg-night-elevated text-beige-dim hover:border-sand/40 hover:text-beige"
                }`}
                key={id}
                onClick={() => onLayerSelect(id)}
                type="button"
              >
                {type === "text" ? `Text ${index + 1}` : `Logo ${index + 1}`}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label={`Add ${type} watermark`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-beige/10 bg-night-elevated text-beige-dim transition hover:border-sand/40 hover:text-beige disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!canAddLayer}
              onClick={onAddLayer}
              title={
                canAddLayer
                  ? `Add ${type} watermark`
                  : "Switch to Single mode to add multiple watermarks"
              }
              type="button"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              aria-label={`Delete ${type} watermark ${activeIndex + 1}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-beige/10 bg-night-elevated text-beige-dim transition hover:border-signal/40 hover:text-signal disabled:cursor-not-allowed disabled:opacity-35"
              disabled={layerCount <= 1}
              onClick={() => onRemoveLayer(activeLayerId)}
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {textLayer ? (
          <EditorCard className="mt-2">
            <label
              className="block text-[10px] font-bold uppercase tracking-[0.12em] text-beige-dim"
              htmlFor={`watermark-text-${activeLayerId}`}
            >
              Watermark text
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-beige/10 bg-night-card px-3 py-2.5 text-sm text-beige outline-none transition placeholder:text-beige-dim/70 focus:border-signal focus:ring-2 focus:ring-signal/20"
              id={`watermark-text-${activeLayerId}`}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder="Add text here"
              type="text"
              value={textLayer.text}
            />
          </EditorCard>
        ) : null}

        {logoLayer ? (
          <div className="mt-2 space-y-2">
            {logoLayer.logoImage ? (
              <>
                <div className="rounded-lg border border-beige/10 bg-beige/5 px-2.5 py-1.5 text-xs text-beige">
                  Loaded:{" "}
                  <span className="font-semibold">{logoLayer.logoFileName}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-lg border border-beige/10 px-3 py-1.5 text-xs font-medium text-beige-dim transition hover:border-sand hover:text-beige"
                    onClick={onLogoPick}
                    type="button"
                  >
                    Change logo
                  </button>
                  <button
                    className="rounded-lg border border-beige/10 px-3 py-1.5 text-xs font-medium text-signal transition hover:brightness-110"
                    onClick={onLogoRemove}
                    type="button"
                  >
                    Remove logo
                  </button>
                </div>
                <div className="rounded-lg border border-beige/10 bg-night-card p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-beige/10 bg-night-elevated">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Logo preview"
                        className="max-h-9 max-w-9 object-contain"
                        src={logoLayer.logoImage.src}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-beige-dim">
                        Remove background
                      </p>
                      <button
                        aria-pressed={logoLayer.isLogoBackgroundRemoved}
                        className={`mt-1 flex w-full items-center justify-between rounded-full border p-0.5 text-xs font-semibold transition ${
                          logoLayer.isLogoBackgroundRemoved
                            ? "border-signal bg-signal text-white"
                            : "border-beige/10 bg-beige/5 text-beige-dim hover:border-signal hover:text-beige"
                        }`}
                        onClick={onLogoBackgroundToggle}
                        type="button"
                      >
                        <span className="px-2">
                          {logoLayer.isLogoBackgroundRemoved ? "On" : "Off"}
                        </span>
                        <span className="mr-0.5 h-5 w-5 rounded-full bg-night-card" />
                      </button>
                    </div>
                  </div>
                  {logoBackgroundMessage ? (
                    <p className="mt-1.5 text-[11px] leading-4 text-beige-dim">
                      {logoBackgroundMessage}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <button
                className="w-full rounded-xl border border-dashed border-beige/20 bg-beige/5 px-4 py-3 text-center transition hover:border-signal hover:bg-beige/10"
                onClick={onLogoPick}
                type="button"
              >
                <span className="block text-sm font-semibold text-beige">
                  Upload a logo
                </span>
                <span className="mt-1 block text-xs text-beige-dim">
                  PNG preferred. JPG and WebP supported.
                </span>
              </button>
            )}
            {logoError ? (
              <div className="rounded-xl border border-signal/30 bg-signal/10 px-3 py-2 text-xs text-beige">
                {logoError}
              </div>
            ) : null}
          </div>
        ) : null}
      </EditorPanelSection>

      {mode === "single" && hasMedia ? (
        <EditorPanelSection title="Position">
          <div className="grid grid-cols-3 gap-1">
            {watermarkPositions.map(({ label, value }) => (
              <EditorGridChoice
                active={watermarkPosition === value}
                ariaLabel={label}
                groupId={`watermark-position-${activeLayerId}`}
                key={value}
                onClick={() => onPositionChange(value)}
              />
            ))}
          </div>
          <p className="text-[11px] leading-4 text-beige-dim/80">
            Or drag the watermark on the preview to place it freely.
          </p>
        </EditorPanelSection>
      ) : null}

      {mode === "tile" ? (
        <div className="space-y-2">
          <EditorPanelSection title="Density">
            <div className="grid grid-cols-3 gap-1">
              {tileDensities.map(({ label, value }) => (
                <EditorPill
                  active={tileDensity === value}
                  groupId={`tile-density-${activeLayerId}`}
                  key={value}
                  onClick={() => onTileDensityChange(value)}
                >
                  {label}
                </EditorPill>
              ))}
            </div>
          </EditorPanelSection>

          <EditorPanelSection title="Angle">
            <div className="grid grid-cols-4 gap-1">
              {tileAngles.map(({ label, value }) => (
                <EditorPill
                  active={tileAngle === value}
                  groupId={`tile-angle-${activeLayerId}`}
                  key={value}
                  onClick={() => onTileAngleChange(value)}
                >
                  {label}
                </EditorPill>
              ))}
            </div>
          </EditorPanelSection>

          <EditorPanelSection title="Gap">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-beige">{tileGap}%</span>
            </div>
            <input
              className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-editor-panel-header accent-signal"
              max={300}
              min={50}
              onChange={(event) => onTileGapChange(Number(event.target.value))}
              step={10}
              type="range"
              value={tileGap}
            />
          </EditorPanelSection>
        </div>
      ) : null}

      <WatermarkStyleControls
        fontFamilies={fontFamilies}
        fontFamily={textLayer?.fontFamily ?? fontFamilies[0].value}
        fontSizeScale={layer.fontSizeScale}
        onFontFamilyChange={onFontFamilyChange}
        onFontSizeScaleChange={onFontSizeScaleChange}
        onWatermarkOpacityChange={onWatermarkOpacityChange}
        watermarkOpacity={layer.opacity}
        watermarkType={type}
      />
    </div>
  );
}
