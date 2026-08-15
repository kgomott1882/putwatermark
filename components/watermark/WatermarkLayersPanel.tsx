"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  formatVideoTimeInput,
  hasVideoVisibilityRange,
  parseVideoTimeInput,
  resolveVideoVisibilityRange,
} from "@/lib/videoWatermarkVisibility";
import type { FontFamilyGroup } from "@/lib/watermarkFonts";
import type {
  LogoWatermarkLayer,
  TextWatermarkLayer,
} from "@/lib/watermarkLayers";
import type { TextWatermarkFontWeight } from "@/lib/watermarkTextStyle";
import {
  EditorCard,
} from "./EditorToolPanel";
import {
  editorFooterMobileCaptionClassName,
  editorFooterMobileColumnClassName,
} from "./PreviewZoomControls";
import { WatermarkStyleControls } from "./WatermarkStyleControls";

type WatermarkMode = "single" | "tile";
type TileAngle = 0 | 45 | 90 | 180;
type TileDensity = "sparse" | "medium" | "dense";

type WatermarkLayersPanelProps = {
  activeLayerId: string;
  fontFamilyGroups: readonly FontFamilyGroup[];
  layer: TextWatermarkLayer | LogoWatermarkLayer;
  layerCount: number;
  layerIds: readonly string[];
  logoBackgroundMessage?: string;
  logoError?: string;
  mode: WatermarkMode;
  onAddLayer: () => void;
  onFontFamilyChange: (value: string) => void;
  onFontSizeScaleChange: (value: number) => void;
  onFontWeightChange?: (value: TextWatermarkFontWeight) => void;
  onLayerSelect: (id: string) => void;
  onLogoBackgroundToggle?: () => void;
  onLogoPick?: () => void;
  onLogoRemove?: () => void;
  onRemoveLayer: (id: string) => void;
  onTextChange: (value: string) => void;
  onTextColorChange?: (value: string) => void;
  onTileAngleChange: (value: TileAngle) => void;
  onTileDensityChange: (value: TileDensity) => void;
  onTileGapChange: (value: number) => void;
  onVisibleFromSecondsChange?: (value: number | undefined) => void;
  onVisibleUntilSecondsChange?: (value: number | undefined) => void;
  onWatermarkOpacityChange: (value: number) => void;
  showVideoVisibilityControls?: boolean;
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  type: "text" | "logo";
  videoDurationSeconds?: number;
};

function LayerField({
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

function VideoVisibilityTimeInput({
  id,
  label,
  onCommit,
  valueSeconds,
}: {
  id: string;
  label: string;
  onCommit: (value: number | undefined) => void;
  valueSeconds?: number;
}) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(
      valueSeconds !== undefined ? formatVideoTimeInput(valueSeconds) : "",
    );
  }, [valueSeconds]);

  return (
    <div className="space-y-1.5">
      <label
        className="text-[9px] font-bold uppercase tracking-[0.1em] text-ed-fg"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        className="editor-field py-2 text-sm tabular-nums"
        id={id}
        inputMode="numeric"
        onBlur={() => {
          const trimmed = draft.trim();

          if (!trimmed) {
            onCommit(undefined);
            setDraft("");
            return;
          }

          const parsed = parseVideoTimeInput(trimmed);

          if (parsed === null) {
            setDraft(
              valueSeconds !== undefined
                ? formatVideoTimeInput(valueSeconds)
                : "",
            );
            return;
          }

          onCommit(parsed);
          setDraft(formatVideoTimeInput(parsed));
        }}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Whole video"
        type="text"
        value={draft}
      />
    </div>
  );
}

function LayerPanelActionButton({
  ariaLabel,
  caption,
  children,
  className = "",
  disabled = false,
  onClick,
  title,
}: {
  ariaLabel: string;
  caption: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <div className={editorFooterMobileColumnClassName}>
      <button
        aria-label={ariaLabel}
        className={`editor-secondary-button inline-flex h-7 w-7 items-center justify-center rounded-md text-ed-fg-muted hover:text-ed-fg disabled:cursor-not-allowed disabled:opacity-35 ${className}`}
        disabled={disabled}
        onClick={onClick}
        title={title}
        type="button"
      >
        {children}
      </button>
      <span className={editorFooterMobileCaptionClassName}>{caption}</span>
    </div>
  );
}

export function WatermarkLayersPanel({
  activeLayerId,
  fontFamilyGroups,
  layer,
  layerCount,
  layerIds,
  logoBackgroundMessage,
  logoError,
  mode,
  onAddLayer,
  onFontFamilyChange,
  onFontSizeScaleChange,
  onFontWeightChange,
  onLayerSelect,
  onLogoBackgroundToggle,
  onLogoPick,
  onLogoRemove,
  onRemoveLayer,
  onTextChange,
  onTextColorChange,
  onTileAngleChange,
  onTileDensityChange,
  onTileGapChange,
  onVisibleFromSecondsChange,
  onVisibleUntilSecondsChange,
  onWatermarkOpacityChange,
  showVideoVisibilityControls = false,
  tileAngle,
  tileDensity,
  tileGap,
  type,
  videoDurationSeconds = 0,
}: WatermarkLayersPanelProps) {
  const [showManualTimeInputs, setShowManualTimeInputs] = useState(false);
  const canAddLayer = mode === "single";
  const activeIndex = Math.max(0, layerIds.indexOf(activeLayerId));
  const logoLayer = type === "logo" ? (layer as LogoWatermarkLayer) : null;
  const textLayer = type === "text" ? (layer as TextWatermarkLayer) : null;
  const panelTitle = type === "text" ? "Text watermarks" : "Logo watermarks";

  return (
    <EditorCard className="space-y-0 p-2.5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg">
            {panelTitle}
          </p>
          <div className="flex shrink-0 items-start gap-1">
            <LayerPanelActionButton
              ariaLabel={`Add ${type} watermark`}
              caption="Add"
              disabled={!canAddLayer}
              onClick={onAddLayer}
              title={
                canAddLayer
                  ? `Add ${type} watermark`
                  : "Switch to Single mode to add multiple watermarks"
              }
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </LayerPanelActionButton>
            <LayerPanelActionButton
              ariaLabel={`Delete ${type} watermark ${activeIndex + 1}`}
              caption="Delete"
              className="hover:border-signal/50 hover:text-signal"
              disabled={layerCount <= 1}
              onClick={() => onRemoveLayer(activeLayerId)}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </LayerPanelActionButton>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1 overflow-x-auto pb-0.5">
          {layerIds.map((id, index) => (
            <button
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                id === activeLayerId
                  ? "editor-selected-pill"
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
      </div>

      <div className="mt-3 space-y-3 border-t border-ed-border/80 pt-3">
        {textLayer ? (
          <LayerField title="Watermark text">
            <input
              className="editor-field py-2.5 text-sm"
              id={`watermark-text-${activeLayerId}`}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder="Add text here"
              type="text"
              value={textLayer.text}
            />
          </LayerField>
        ) : null}

        {textLayer && showVideoVisibilityControls ? (
          <LayerField title="Visible during">
            <p className="text-[11px] leading-4 text-ed-fg-muted">
              Use the timeline below the video to set when this text appears.
              Leave both times empty to show for the whole video.
            </p>

            <button
              className="flex w-full items-center justify-between rounded-lg border border-ed-border bg-ed-bg px-2.5 py-2 text-left text-[11px] font-semibold text-ed-fg-muted transition hover:text-ed-fg"
              aria-expanded={showManualTimeInputs}
              onClick={() => setShowManualTimeInputs((current) => !current)}
              type="button"
            >
              <span>Edit times manually</span>
              <span>{showManualTimeInputs ? "−" : "+"}</span>
            </button>

            {showManualTimeInputs ? (
              <div className="grid grid-cols-2 gap-2">
                <VideoVisibilityTimeInput
                  id={`watermark-visible-from-${activeLayerId}`}
                  label="Start"
                  onCommit={(value) => onVisibleFromSecondsChange?.(value)}
                  valueSeconds={textLayer.visibleFromSeconds}
                />
                <VideoVisibilityTimeInput
                  id={`watermark-visible-until-${activeLayerId}`}
                  label="End"
                  onCommit={(value) => onVisibleUntilSecondsChange?.(value)}
                  valueSeconds={textLayer.visibleUntilSeconds}
                />
              </div>
            ) : null}

            {hasVideoVisibilityRange(textLayer) &&
            videoDurationSeconds > 0 &&
            (() => {
              const range = resolveVideoVisibilityRange(
                textLayer,
                videoDurationSeconds,
              );

              return range !== null && range.start >= range.end;
            })() ? (
              <p className="text-[11px] leading-4 text-signal">
                Start must be before end.
              </p>
            ) : null}
          </LayerField>
        ) : null}

        {logoLayer ? (
          <div className="space-y-3">
            {logoLayer.logoImage ? (
              <>
                <div className="rounded-lg border border-ed-border bg-ed-bg px-2.5 py-2 text-xs text-ed-fg shadow-sm">
                  Loaded:{" "}
                  <span className="font-semibold">{logoLayer.logoFileName}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="editor-secondary-button rounded-lg px-3 py-1.5 text-xs font-medium text-ed-fg-muted hover:text-ed-fg"
                    onClick={onLogoPick}
                    type="button"
                  >
                    Change logo
                  </button>
                  <button
                    className="rounded-lg border border-dashed border-ed-border bg-ed-bg px-3 py-1.5 text-xs font-medium text-signal transition hover:brightness-110"
                    onClick={onLogoRemove}
                    type="button"
                  >
                    Remove logo
                  </button>
                </div>
                <div className="rounded-lg border border-ed-border bg-ed-bg p-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ed-border bg-ed-bg-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Logo preview"
                        className="max-h-9 max-w-9 object-contain"
                        src={logoLayer.logoImage.src}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ed-fg-muted">
                        Remove background
                      </p>
                      <button
                        aria-pressed={logoLayer.isLogoBackgroundRemoved}
                        className={`mt-1 flex w-full items-center justify-between rounded-full border p-0.5 text-xs font-semibold transition ${
                          logoLayer.isLogoBackgroundRemoved
                            ? "editor-selected-strong"
                            : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:border-signal/40 hover:text-ed-fg"
                        }`}
                        onClick={onLogoBackgroundToggle}
                        type="button"
                      >
                        <span className="px-2">
                          {logoLayer.isLogoBackgroundRemoved ? "On" : "Off"}
                        </span>
                        <span className="mr-0.5 h-5 w-5 rounded-full bg-ed-bg-card" />
                      </button>
                    </div>
                  </div>
                  {logoBackgroundMessage ? (
                    <p className="mt-1.5 text-[11px] leading-4 text-ed-fg-muted">
                      {logoBackgroundMessage}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <button
                className="editor-secondary-button w-full rounded-xl border-dashed px-4 py-3 text-center hover:border-signal/50"
                onClick={onLogoPick}
                type="button"
              >
                <span className="block text-sm font-semibold text-ed-fg">
                  Upload a logo
                </span>
                <span className="mt-1 block text-xs text-ed-fg-muted">
                  PNG preferred. JPG and WebP supported.
                </span>
              </button>
            )}
            {logoError ? (
              <div className="rounded-xl border border-signal/30 bg-signal/10 px-3 py-2 text-xs text-ed-fg">
                {logoError}
              </div>
            ) : null}
          </div>
        ) : null}

        {textLayer ? (
          <div className="border-t border-ed-border/80 pt-3">
            <WatermarkStyleControls
              embedded
              fontFamily={
                textLayer.fontFamily ??
                fontFamilyGroups[0]?.fonts[0]?.value ??
                ""
              }
              fontFamilyGroups={fontFamilyGroups}
              fontSizeScale={layer.fontSizeScale}
              fontWeight={textLayer.fontWeight}
              hideSliders
              onFontFamilyChange={onFontFamilyChange}
              onFontSizeScaleChange={onFontSizeScaleChange}
              onFontWeightChange={onFontWeightChange}
              onTextColorChange={onTextColorChange}
              onWatermarkOpacityChange={onWatermarkOpacityChange}
              textColor={textLayer.textColor}
              watermarkOpacity={layer.opacity}
              watermarkType="text"
            />
          </div>
        ) : null}
      </div>
    </EditorCard>
  );
}
