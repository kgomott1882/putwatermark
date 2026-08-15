"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bold, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
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
import { MOBILE_INPUT_NO_ZOOM_CLASS } from "@/lib/mobileEditorViewport";
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
  onDoneTyping?: () => void;
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
    <div className="flex shrink-0 items-center gap-px">
      <div className="flex max-w-[4.5rem] items-center gap-px overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {layerIds.map((id, index) => (
          <button
            aria-label={
              type === "text"
                ? `Text watermark ${index + 1}`
                : `Logo watermark ${index + 1}`
            }
            className={`shrink-0 rounded px-0.5 py-px text-[7px] font-semibold uppercase tracking-[0.04em] transition ${
              id === activeLayerId
                ? "editor-selected-pill"
                : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:text-ed-fg"
            }`}
            key={id}
            onClick={() => onLayerSelect(id)}
            type="button"
          >
            {index + 1}
          </button>
        ))}
      </div>
      <button
        aria-label={`Add ${type} watermark`}
        className="editor-secondary-button inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-ed-fg-muted hover:text-ed-fg disabled:opacity-35"
        disabled={!canAddLayer}
        onClick={onAddLayer}
        type="button"
      >
        <Plus className="h-2 w-2" strokeWidth={2} />
      </button>
      <button
        aria-label={`Delete ${type} watermark`}
        className="editor-secondary-button inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-ed-fg-muted hover:text-signal disabled:opacity-35"
        disabled={layerCount <= 1}
        onClick={() => onRemoveLayer(activeLayerId)}
        type="button"
      >
        <Trash2 className="h-2 w-2" strokeWidth={2} />
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
    <div className="editor-segment-track grid min-h-[24px] grid-cols-2 gap-0.5">
      {(
        [
          { label: "Single", value: "single" },
          { label: "Tile", value: "tile" },
        ] as const
      ).map(({ label, value }) => (
        <EditorSegment
          active={mode === value}
          className="max-md:rounded-sm max-md:px-1.5 max-md:py-0.5 max-md:text-[8px]"
          groupId={`mobile-watermark-mode-${type}`}
          key={value}
          onClick={() => onModeChange(value)}
          ultraCompact
        >
          {label}
        </EditorSegment>
      ))}
    </div>
  );
}

function ColorSwatchButton({
  isActive,
  label,
  onClick,
  value,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={isActive}
      className={`relative h-4 w-4 shrink-0 rounded-full border transition ${
        isActive ? "editor-selected-ring" : "border-ed-border"
      }`}
      onClick={onClick}
      title={label}
      type="button"
    >
      <span
        className="absolute inset-px rounded-full"
        style={{ backgroundColor: value }}
      />
    </button>
  );
}

function MobileTextColorPicker({
  onTextColorChange,
  textColor,
}: {
  onTextColorChange: (value: string) => void;
  textColor: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const normalizedColor = (textColor ?? "#FFFFFF").toUpperCase();
  const quickColors = TEXT_WATERMARK_COLOR_PALETTE.slice(0, 2);
  const menuWidth = 120;
  const menuGap = 6;

  const updateMenuPosition = useCallback(() => {
    const anchor = rootRef.current;
    const menu = menuRef.current;

    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const menuHeight = menu?.offsetHeight ?? 96;
    const viewportPadding = 8;
    let top = rect.top - menuHeight - menuGap;
    let left = rect.right - menuWidth;

    if (top < viewportPadding) {
      top = rect.bottom + menuGap;
    }

    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - menuWidth - viewportPadding),
    );

    setMenuPosition({ left, top });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
  }, [menuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleReposition = () => updateMenuPosition();

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [menuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  const colorMenu =
    mounted && menuOpen
      ? createPortal(
          <div
            className="fixed z-[100] grid w-[7.5rem] grid-cols-4 gap-1 rounded-md border border-ed-border bg-ed-panel p-1 shadow-lg"
            ref={menuRef}
            style={{
              left: menuPosition?.left ?? -9999,
              top: menuPosition?.top ?? -9999,
              visibility: menuPosition ? "visible" : "hidden",
            }}
          >
            {TEXT_WATERMARK_COLOR_PALETTE.map(({ label, value }) => {
              const isActive = normalizedColor === value.toUpperCase();

              return (
                <ColorSwatchButton
                  isActive={isActive}
                  key={value}
                  label={label}
                  onClick={() => {
                    onTextColorChange(value);
                    setMenuOpen(false);
                  }}
                  value={value}
                />
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative flex shrink-0 items-center gap-1" ref={rootRef}>
      {quickColors.map(({ label, value }) => (
        <ColorSwatchButton
          isActive={normalizedColor === value.toUpperCase()}
          key={value}
          label={label}
          onClick={() => {
            onTextColorChange(value);
            setMenuOpen(false);
          }}
          value={value}
        />
      ))}
      <button
        aria-expanded={menuOpen}
        aria-label="More colors"
        className={`editor-secondary-button flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
          menuOpen ? "editor-selected" : "border-ed-border text-ed-fg-muted"
        }`}
        onClick={() => setMenuOpen((current) => !current)}
        type="button"
      >
        <ChevronUp
          className={`h-2.5 w-2.5 transition ${menuOpen ? "rotate-180" : ""}`}
          strokeWidth={2.5}
        />
      </button>
      {colorMenu}
    </div>
  );
}

function InlineSlider({
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
    <div className="flex min-h-[22px] min-w-0 items-center gap-1">
      <label
        className="w-8 shrink-0 text-[8px] font-bold uppercase leading-none tracking-[0.04em] text-ed-fg"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        className="editor-range min-w-0 flex-1"
        id={id}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
      <span className="w-7 shrink-0 text-right text-[8px] font-semibold tabular-nums text-ed-fg-muted">
        {value}%
      </span>
    </div>
  );
}

export function WatermarkMobileBar(props: WatermarkMobileBarProps) {
  const [showTileOptions, setShowTileOptions] = useState(false);
  const textInputRef = useRef<HTMLInputElement>(null);
  const canAddLayer = props.mode === "single";
  const hasWatermarkText =
    props.type === "text" ? props.layer.text.trim().length > 0 : false;

  function handleTextDone() {
    textInputRef.current?.blur();

    if (typeof document !== "undefined") {
      const active = document.activeElement;

      if (active instanceof HTMLElement) {
        active.blur();
      }
    }

    props.onDoneTyping?.();
  }

  const mobileFieldClassName = `editor-field-sm ${MOBILE_INPUT_NO_ZOOM_CLASS} h-7 min-w-0 flex-1 rounded-sm px-1.5 py-0 max-md:text-[16px] md:h-[22px] md:px-1 md:text-[9px]`;

  const mediaControl =
    props.type === "text" ? (
      <div className="flex min-w-0 flex-1 items-center gap-0.5">
        <input
          ref={textInputRef}
          className={mobileFieldClassName}
          enterKeyHint="done"
          inputMode="text"
          onChange={(event) => props.onTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleTextDone();
            }
          }}
          placeholder="Watermark text"
          type="text"
          value={props.layer.text}
        />
        {props.onDoneTyping ? (
          <button
            className={`inline-flex h-7 shrink-0 items-center justify-center rounded-sm px-2 text-[10px] font-bold uppercase tracking-[0.06em] shadow-sm transition ${
              hasWatermarkText
                ? "bg-signal text-white hover:brightness-110"
                : "editor-secondary-button text-ed-fg-muted"
            }`}
            onClick={handleTextDone}
            type="button"
          >
            Done
          </button>
        ) : null}
      </div>
    ) : props.layer.logoImage ? (
      <button
        className="editor-secondary-button h-[22px] min-w-0 flex-1 truncate rounded-sm px-1 text-[9px] font-semibold text-ed-fg"
        onClick={props.onLogoPick}
        type="button"
      >
        {props.layer.logoFileName}
      </button>
    ) : (
      <button
        className="editor-secondary-button h-[22px] min-w-0 flex-1 rounded-sm border-dashed px-1 text-[9px] font-semibold text-ed-fg hover:border-signal/50"
        onClick={props.onLogoPick}
        type="button"
      >
        Upload logo
      </button>
    );

  return (
    <div className="space-y-0.5 px-0.5 pb-0.5 pt-0">
      <div className="flex items-center gap-0.5">
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
        {mediaControl}
      </div>

      <div className="grid grid-cols-2 items-center gap-0.5">
        <ModeToggle
          mode={props.mode}
          onModeChange={props.onModeChange}
          type={props.type}
        />
        {props.mode === "tile" && props.tileQuickTemplates ? (
          <div className="flex min-w-0 items-end justify-end overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {props.tileQuickTemplates}
          </div>
        ) : (
          <div aria-hidden className="min-w-0" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-1">
        <InlineSlider
          id="mobile-watermark-size"
          label={props.type === "logo" ? "Logo" : "Size"}
          max={135}
          min={15}
          onChange={props.onFontSizeScaleChange}
          step={5}
          value={props.fontSizeScale}
        />
        <InlineSlider
          id="mobile-watermark-opacity"
          label="Opac"
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
            className="flex w-full items-center justify-center gap-0.5 py-px text-[7px] font-semibold uppercase tracking-[0.04em] text-ed-fg-muted"
            onClick={() => setShowTileOptions((current) => !current)}
            type="button"
          >
            Tile opts
            <ChevronDown
              className={`h-2 w-2 transition ${showTileOptions ? "rotate-180" : ""}`}
            />
          </button>
          {showTileOptions ? (
            <div className="grid grid-cols-2 gap-0.5 rounded-sm border border-ed-border bg-ed-bg-card p-0.5">
              <InlineSlider
                id="mobile-tile-density"
                label="Dens"
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
              <InlineSlider
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
        <div className="flex items-center gap-0.5">
          <select
            className={mobileFieldClassName}
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
            aria-pressed={
              (props.layer.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT) ===
              700
            }
            className={`editor-secondary-button flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-sm ${
              (props.layer.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT) ===
              700
                ? "editor-selected"
                : "text-ed-fg-muted"
            }`}
            onClick={() =>
              props.onFontWeightChange(
                (props.layer.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT) ===
                  700
                  ? 400
                  : 700,
              )
            }
            type="button"
          >
            <Bold className="h-2.5 w-2.5" strokeWidth={2.5} />
          </button>
          <MobileTextColorPicker
            onTextColorChange={props.onTextColorChange}
            textColor={props.layer.textColor ?? "#FFFFFF"}
          />
        </div>
      ) : null}

      {props.type === "logo" && props.logoError ? (
        <p className="text-[9px] leading-3.5 text-signal">{props.logoError}</p>
      ) : null}
    </div>
  );
}
