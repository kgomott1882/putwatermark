"use client";

import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { useRef } from "react";
import {
  CAPTION_EMOJI_OPTIONS,
  CAPTION_STYLE_PRESETS,
  getCaptionLayerSummary,
  getCaptionLayerTimingLabel,
  type CaptionPresetId,
  type VideoCaptionLayer,
} from "@/lib/videoCaptions";
import { TEXT_WATERMARK_COLOR_PALETTE } from "@/lib/watermarkTextStyle";
import { EditorCard, EditorPanelSection } from "./EditorToolPanel";

type VideoCaptionPanelProps = {
  activeLayerId: string;
  captionsEnabled: boolean;
  fontFamilyGroups: ReadonlyArray<{
    fonts: ReadonlyArray<{ label: string; value: string }>;
    label: string;
  }>;
  layers: VideoCaptionLayer[];
  onActiveLayerSelect: (layerId: string) => void;
  onAddLayer: () => void;
  onCaptionsEnabledChange: (enabled: boolean) => void;
  onLayerChange: (
    layerId: string,
    patch: Partial<VideoCaptionLayer>,
  ) => void;
  onPresetSelect: (layerId: string, presetId: CaptionPresetId) => void;
  onRemoveLayer: (layerId: string) => void;
  videoDurationSeconds: number;
};

export function VideoCaptionPanel({
  activeLayerId,
  captionsEnabled,
  fontFamilyGroups,
  layers,
  onActiveLayerSelect,
  onAddLayer,
  onCaptionsEnabledChange,
  onLayerChange,
  onPresetSelect,
  onRemoveLayer,
  videoDurationSeconds,
}: VideoCaptionPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeLayer =
    layers.find((layer) => layer.id === activeLayerId) ?? layers[0];

  function insertEmoji(emoji: string) {
    if (!activeLayer) {
      return;
    }

    const textarea = textareaRef.current;
    const currentText = activeLayer.text;

    if (!textarea) {
      onLayerChange(activeLayer.id, { text: `${currentText}${emoji}` });
      return;
    }

    const start = textarea.selectionStart ?? currentText.length;
    const end = textarea.selectionEnd ?? currentText.length;
    const nextText =
      currentText.slice(0, start) + emoji + currentText.slice(end);

    onLayerChange(activeLayer.id, { text: nextText });

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + emoji.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  if (!activeLayer) {
    return null;
  }

  return (
    <div className="space-y-2">
      <EditorPanelSection title="Style">
        <EditorCard className="space-y-0 p-2.5">
          <label className="flex items-center justify-between gap-3 py-1">
            <span className="text-[11px] font-semibold text-ed-fg">Captions</span>
            <button
              aria-pressed={captionsEnabled}
              className={`relative h-5 w-9 rounded-full border shadow-sm transition-colors ${
                captionsEnabled
                  ? "border-signal bg-signal ring-2 ring-signal/25"
                  : "border-ed-border bg-ed-bg-card"
              }`}
              onClick={() => onCaptionsEnabledChange(!captionsEnabled)}
              type="button"
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition-all ${
                  captionsEnabled
                    ? "left-[1.125rem] bg-white"
                    : "left-0.5 bg-ed-fg"
                }`}
              />
            </button>
          </label>
        </EditorCard>
      </EditorPanelSection>

      <EditorPanelSection title="Caption">
        <div className="grid grid-cols-2 gap-2">
          {CAPTION_STYLE_PRESETS.map((preset) => {
            const isSelected = activeLayer.presetId === preset.id;

            return (
              <motion.button
                aria-pressed={isSelected}
                className={`flex min-h-[2.75rem] items-center justify-center rounded-lg border px-2 py-2.5 text-center transition-colors ${
                  isSelected
                    ? "border-signal bg-ed-bg-card text-ed-fg"
                    : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:border-signal/50 hover:text-ed-fg"
                }`}
                key={preset.id}
                onClick={() => onPresetSelect(activeLayer.id, preset.id)}
                type="button"
                whileTap={{ scale: 0.97 }}
              >
                <span
                  className={`block truncate text-xs font-semibold leading-tight ${preset.previewClassName}`}
                >
                  {preset.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg"
              htmlFor="caption-panel-font-family"
            >
              Font
            </label>
            <select
              className="editor-field-sm mt-1 w-full"
              id="caption-panel-font-family"
              onChange={(event) =>
                onLayerChange(activeLayer.id, { fontFamily: event.target.value })
              }
              value={activeLayer.fontFamily}
            >
              {fontFamilyGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.fonts.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg">
              Font color
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {TEXT_WATERMARK_COLOR_PALETTE.map((color) => (
                <button
                  aria-label={color.label}
                  className={`h-6 w-6 rounded-full border ${
                    activeLayer.textColor === color.value
                      ? "border-signal ring-2 ring-signal/30"
                      : "border-ed-border"
                  }`}
                  key={color.value}
                  onClick={() =>
                    onLayerChange(activeLayer.id, { textColor: color.value })
                  }
                  style={{ backgroundColor: color.value }}
                  type="button"
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg">
              Word background
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <button
                aria-label="Transparent background"
                className={`h-6 w-6 rounded-full border bg-transparent ${
                  activeLayer.backgroundColor === "transparent"
                    ? "border-signal ring-2 ring-signal/30"
                    : "border-ed-border"
                }`}
                onClick={() =>
                  onLayerChange(activeLayer.id, {
                    backgroundColor: "transparent",
                  })
                }
                type="button"
              />
              {TEXT_WATERMARK_COLOR_PALETTE.map((color) => (
                <button
                  aria-label={color.label}
                  className={`h-6 w-6 rounded-full border ${
                    activeLayer.backgroundColor === color.value
                      ? "border-signal ring-2 ring-signal/30"
                      : "border-ed-border"
                  }`}
                  key={`bg-${color.value}`}
                  onClick={() =>
                    onLayerChange(activeLayer.id, {
                      backgroundColor: color.value,
                    })
                  }
                  style={{ backgroundColor: color.value }}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
      </EditorPanelSection>

      <EditorPanelSection title="Caption text">
        <textarea
          className="editor-field min-h-[4rem] resize-y text-sm"
          onChange={(event) =>
            onLayerChange(activeLayer.id, { text: event.target.value })
          }
          placeholder="Type caption headline…"
          ref={textareaRef}
          value={activeLayer.text}
        />
        <p className="mt-1.5 text-[10px] leading-4 text-ed-fg-muted">
          Drag the caption directly on the video preview to move it anywhere.
        </p>

        <div className="mt-2">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ed-fg-muted">
            Emoji
          </p>
          <div className="flex flex-wrap gap-1">
            {CAPTION_EMOJI_OPTIONS.map((emoji) => (
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md border border-ed-border bg-ed-bg text-base transition hover:border-signal/50 hover:bg-ed-bg-card"
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                type="button"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </EditorPanelSection>

      <EditorPanelSection title="Your captions">
        <div className="flex flex-wrap gap-1.5">
          {layers.map((layer, index) => {
            const isActive = layer.id === activeLayer.id;
            const timingLabel = getCaptionLayerTimingLabel(
              layer,
              videoDurationSeconds,
            );

            return (
              <button
                className={`max-w-full rounded-lg border px-2 py-1 text-left transition ${
                  isActive
                    ? "border-signal bg-signal/10 text-ed-fg"
                    : "border-ed-border bg-ed-bg text-ed-fg-muted hover:border-signal/40 hover:text-ed-fg"
                }`}
                key={layer.id}
                onClick={() => onActiveLayerSelect(layer.id)}
                type="button"
              >
                <span className="block truncate text-[10px] font-medium leading-tight">
                  {getCaptionLayerSummary(layer, index)}
                </span>
                <span
                  className={`mt-0.5 block truncate text-[8px] leading-tight ${
                    isActive ? "text-signal/80" : "text-ed-fg-muted/80"
                  }`}
                >
                  {timingLabel}
                </span>
              </button>
            );
          })}
          <button
            aria-label="Add caption"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-ed-border px-2 py-1 text-[10px] font-semibold text-ed-fg-muted transition hover:border-signal/50 hover:text-ed-fg"
            onClick={onAddLayer}
            type="button"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        {layers.length > 1 ? (
          <button
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-ed-fg-muted transition hover:text-ed-accent"
            onClick={() => onRemoveLayer(activeLayer.id)}
            type="button"
          >
            <Trash2 className="h-3 w-3" />
            Remove selected caption
          </button>
        ) : null}

        <p className="mt-1.5 text-[10px] leading-4 text-ed-fg-muted">
          Add multiple captions for different times and positions. Select one
          above, then set timing on the timeline below the video.
        </p>
      </EditorPanelSection>
    </div>
  );
}
