"use client";

import { motion } from "framer-motion";
import { BookmarkPlus } from "lucide-react";
import { EditorCard, EditorPanelSection } from "./EditorToolPanel";

export type QuickTemplateIcon =
  | "center"
  | "corner"
  | "dense"
  | "signature"
  | "sparse";

export type QuickTemplate = {
  icon: QuickTemplateIcon;
  id: string;
  label: string;
};

type SavedPreset = {
  id: string;
  name: string;
};

type PresetControlsProps = {
  isSavingPreset: boolean;
  onApplyPreset: (presetId: string) => void;
  onReset: () => void;
  onSavePreset: () => void;
  presetName: string;
  presetNameInputId?: string;
  presets: readonly SavedPreset[];
  setIsSavingPreset: (value: boolean | ((current: boolean) => boolean)) => void;
  setPresetName: (value: string) => void;
};

type QuickTemplatesProps = {
  activeTemplate: string | null;
  layoutId?: string;
  onApplyTemplate: (templateId: string) => void;
  quickTemplates: readonly QuickTemplate[];
};

function TemplateIcon({
  isSelected,
  variant,
}: {
  isSelected: boolean;
  variant: QuickTemplateIcon;
}) {
  const markColor = isSelected ? "bg-signal" : "bg-ed-fg-muted";
  const lineColor = isSelected ? "bg-signal" : "bg-ed-fg-muted/70";

  return (
    <span className="relative block h-6 rounded-md border border-ed-border bg-ed-bg-card">
      {variant === "corner" ? (
        <span
          className={`absolute bottom-1 right-1 h-1.5 w-3 rounded-full ${markColor}`}
        />
      ) : null}
      {variant === "center" ? (
        <span
          className={`absolute left-1/2 top-1/2 h-2 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full ${markColor}`}
        />
      ) : null}
      {variant === "dense" ? (
        <>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <span
              className={`absolute h-1 w-3 rotate-[-35deg] rounded-full ${lineColor}`}
              key={index}
              style={{
                left: `${4 + (index % 3) * 11}px`,
                top: `${5 + Math.floor(index / 3) * 9}px`,
              }}
            />
          ))}
        </>
      ) : null}
      {variant === "sparse" ? (
        <>
          {[0, 1, 2].map((index) => (
            <span
              className={`absolute h-1 w-4 rotate-[-35deg] rounded-full ${lineColor}`}
              key={index}
              style={{
                left: `${4 + index * 11}px`,
                top: `${5 + index * 4}px`,
              }}
            />
          ))}
        </>
      ) : null}
      {variant === "signature" ? (
        <span
          className={`absolute bottom-1 left-1/2 h-1.5 w-6 -translate-x-1/2 rounded-full ${markColor}`}
        />
      ) : null}
    </span>
  );
}

export function WatermarkQuickTemplates({
  activeTemplate,
  compact = false,
  layoutId = "template-selection",
  onApplyTemplate,
  quickTemplates,
}: QuickTemplatesProps & { compact?: boolean }) {
  return (
    <EditorPanelSection title="Quick templates">
      <div className={`grid grid-cols-3 ${compact ? "gap-1" : "gap-2"}`}>
        {quickTemplates.map((template) => {
          const isSelected = activeTemplate === template.id;

          return (
            <motion.button
              aria-pressed={isSelected}
              className={`relative rounded-lg border text-left transition-colors ${
                compact ? "px-1 py-1" : "rounded-xl px-1.5 py-2"
              } ${
                isSelected
                  ? "border-signal text-ed-fg"
                  : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:border-signal/50 hover:text-ed-fg"
              }`}
              key={template.id}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => onApplyTemplate(template.id)}
              type="button"
              whileTap={{ scale: 0.96 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 28,
              }}
            >
              {isSelected ? (
                <motion.span
                  className="absolute inset-0 rounded-xl editor-active-surface"
                  layoutId={layoutId}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 32,
                  }}
                />
              ) : null}
              <span className="relative z-10">
                <TemplateIcon isSelected={isSelected} variant={template.icon} />
                <span
                  className={`mt-0.5 block truncate font-semibold leading-tight ${
                    compact ? "text-[8px]" : "mt-1 text-[10px]"
                  }`}
                >
                  {template.label}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </EditorPanelSection>
  );
}

export function WatermarkPresetControls({
  isSavingPreset,
  onApplyPreset,
  onReset,
  onSavePreset,
  presetName,
  presetNameInputId = "preset-name",
  presets,
  setIsSavingPreset,
  setPresetName,
}: PresetControlsProps) {
  return (
    <>
      {presets.length ? (
        <EditorPanelSection title="Saved presets">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                className="editor-secondary-button rounded-full px-2.5 py-1 text-[11px] font-semibold text-ed-fg-muted hover:text-ed-fg"
                key={preset.id}
                onClick={() => onApplyPreset(preset.id)}
                type="button"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </EditorPanelSection>
      ) : null}

      <EditorPanelSection title="Save preset">
        <button
          aria-label="Save watermark preset"
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition shadow-sm ${
            isSavingPreset
              ? "border-2 border-signal bg-signal/15 text-ed-fg ring-2 ring-signal/30"
              : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:border-signal/50 hover:text-ed-fg"
          }`}
          onClick={() => setIsSavingPreset((value) => !value)}
          type="button"
        >
          <BookmarkPlus size={15} />
          Save current settings
        </button>

        {isSavingPreset ? (
          <EditorCard className="mt-2">
            <label
              className="text-xs font-medium text-ed-fg-muted"
              htmlFor={presetNameInputId}
            >
              Name this preset
            </label>
            <input
              className="editor-field-sm mt-1"
              id={presetNameInputId}
              onChange={(event) => setPresetName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSavePreset();
                }
              }}
              placeholder="e.g. My brand mark"
              type="text"
              value={presetName}
            />
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                className="rounded-lg bg-signal px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!presetName.trim()}
                onClick={onSavePreset}
                type="button"
              >
                Save
              </button>
              <button
                className="editor-secondary-button rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ed-fg-muted hover:text-ed-fg"
                onClick={() => {
                  setPresetName("");
                  setIsSavingPreset(false);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </EditorCard>
        ) : null}
      </EditorPanelSection>

      <button
        className="block text-xs font-medium text-ed-fg-muted transition hover:text-ed-fg"
        onClick={onReset}
        type="button"
      >
        Reset to defaults
      </button>
    </>
  );
}
