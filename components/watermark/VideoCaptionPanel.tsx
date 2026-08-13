"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, type ReactNode } from "react";
import {
  CAPTION_EMOJI_OPTIONS,
  getCaptionLayerSummary,
  getCaptionLayerTimingLabel,
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
  headlineControls?: ReactNode;
  layers: VideoCaptionLayer[];
  onActiveLayerSelect: (layerId: string) => void;
  onAddLayer: () => void;
  onCaptionsEnabledChange: (enabled: boolean) => void;
  onLayerChange: (
    layerId: string,
    patch: Partial<VideoCaptionLayer>,
  ) => void;
  onRemoveLayer: (layerId: string) => void;
  videoDurationSeconds: number;
};

export function VideoCaptionPanel({
  activeLayerId,
  captionsEnabled,
  fontFamilyGroups,
  headlineControls,
  layers,
  onActiveLayerSelect,
  onAddLayer,
  onCaptionsEnabledChange,
  onLayerChange,
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
    <div className="flex flex-col gap-2 max-md:gap-1.5">
      <EditorPanelSection className="max-md:order-1" title="Style">
        <EditorCard className="space-y-0 p-2 max-md:p-1.5 md:p-2.5">
          <label className="flex items-center justify-between gap-3 py-0.5 md:py-1">
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

      <EditorPanelSection
        className="max-md:order-2 md:order-4"
        hideTitleOnMobile
        title="Caption text"
      >
        <textarea
          className="editor-field min-h-[3rem] resize-y text-sm max-md:min-h-[2.75rem] max-md:py-2 md:min-h-[4rem]"
          onChange={(event) =>
            onLayerChange(activeLayer.id, { text: event.target.value })
          }
          placeholder="Type caption headline…"
          ref={textareaRef}
          value={activeLayer.text}
        />
        <p className="mt-1 hidden text-[10px] leading-4 text-ed-fg-muted md:block">
          Drag the caption directly on the video preview to move it anywhere.
        </p>
        <p className="mt-1 text-[9px] leading-3.5 text-ed-fg-muted md:hidden">
          Drag on preview to reposition.
        </p>

        <div className="mt-2 hidden md:block">
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

      {headlineControls ? (
        <div className="max-md:order-3 md:hidden">{headlineControls}</div>
      ) : null}

      <EditorPanelSection
        className="max-md:order-4 md:order-2"
        hideTitleOnMobile
        title="Caption"
      >
        <div className="space-y-2 max-md:space-y-1.5">
          <select
            aria-label="Font"
            className="editor-field-sm w-full max-md:py-1.5"
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

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.08em] text-ed-fg-muted">
              Text
            </span>
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TEXT_WATERMARK_COLOR_PALETTE.map((color) => (
                <button
                  aria-label={color.label}
                  className={`h-5 w-5 shrink-0 rounded-full border md:h-6 md:w-6 ${
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

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.08em] text-ed-fg-muted">
              Bg
            </span>
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                aria-label="Transparent background"
                className={`h-5 w-5 shrink-0 rounded-full border bg-transparent md:h-6 md:w-6 ${
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
                  className={`h-5 w-5 shrink-0 rounded-full border md:h-6 md:w-6 ${
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

      <EditorPanelSection
        className="max-md:order-5 md:order-5"
        hideTitleOnMobile
        title="Your captions"
      >
        <div className="flex flex-wrap gap-1 max-md:gap-0.5 md:gap-1.5">
          {layers.map((layer, index) => {
            const isActive = layer.id === activeLayer.id;
            const timingLabel = getCaptionLayerTimingLabel(
              layer,
              videoDurationSeconds,
            );

            return (
              <button
                className={`max-w-full rounded-lg border px-2 py-1 text-left transition max-md:px-1.5 max-md:py-0.5 ${
                  isActive
                    ? "border-signal bg-signal/10 text-ed-fg"
                    : "border-ed-border bg-ed-bg text-ed-fg-muted hover:border-signal/40 hover:text-ed-fg"
                }`}
                key={layer.id}
                onClick={() => onActiveLayerSelect(layer.id)}
                type="button"
              >
                <span className="block truncate text-[10px] font-medium leading-tight max-md:text-[9px]">
                  {getCaptionLayerSummary(layer, index)}
                </span>
                <span
                  className={`mt-0.5 block truncate text-[8px] leading-tight max-md:text-[7px] ${
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
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-ed-border px-2 py-1 text-[10px] font-semibold text-ed-fg-muted transition hover:border-signal/50 hover:text-ed-fg max-md:px-1.5 max-md:py-0.5 max-md:text-[9px]"
            onClick={onAddLayer}
            type="button"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        {layers.length > 1 ? (
          <button
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-ed-fg-muted transition hover:text-ed-accent max-md:mt-1 max-md:text-[9px]"
            onClick={() => onRemoveLayer(activeLayer.id)}
            type="button"
          >
            <Trash2 className="h-3 w-3" />
            Remove selected caption
          </button>
        ) : null}

        <p className="mt-1.5 hidden text-[10px] leading-4 text-ed-fg-muted md:block">
          Add multiple captions for different times and positions. Select one
          above, then set timing on the timeline below the video.
        </p>
      </EditorPanelSection>
    </div>
  );
}
