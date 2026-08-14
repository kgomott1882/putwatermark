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
  compact = false,
  iconOnly = false,
  isSelected,
  variant,
}: {
  compact?: boolean;
  iconOnly?: boolean;
  isSelected: boolean;
  variant: QuickTemplateIcon;
}) {
  const markColor = iconOnly
    ? isSelected
      ? "bg-emerald-700"
      : "bg-signal"
    : isSelected
      ? "bg-signal"
      : "bg-ed-fg-muted";
  const lineColor = iconOnly
    ? isSelected
      ? "bg-emerald-600"
      : "bg-signal/85"
    : isSelected
      ? "bg-signal"
      : "bg-ed-fg-muted/70";

  const frameClassName = iconOnly
    ? `relative block w-full rounded border bg-ed-bg-card ${
        compact ? "h-4 border-ed-border/70" : "h-5 border-ed-border"
      }`
    : `relative block w-full rounded-md border border-ed-border bg-ed-bg-card ${
        compact ? "h-5" : "h-6"
      }`;

  const cornerMarkClass = iconOnly && compact ? "h-1 w-2" : "h-1.5 w-3";
  const centerMarkClass = iconOnly && compact ? "h-1.5 w-3.5" : "h-2 w-5";
  const lineMarkClass = iconOnly && compact ? "h-0.5 w-2" : "h-1 w-3";
  const sparseLineClass = iconOnly && compact ? "h-0.5 w-2.5" : "h-1 w-4";
  const signatureMarkClass = iconOnly && compact ? "h-1 w-4" : "h-1.5 w-6";

  return (
    <span className={frameClassName}>
      {variant === "corner" ? (
        <span
          className={`absolute bottom-0.5 right-0.5 rounded-full ${cornerMarkClass} ${markColor}`}
        />
      ) : null}
      {variant === "center" ? (
        <span
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${centerMarkClass} ${markColor}`}
        />
      ) : null}
      {variant === "dense" ? (
        <>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <span
              className={`absolute rotate-[-35deg] rounded-full ${lineMarkClass} ${lineColor}`}
              key={index}
              style={{
                left: iconOnly && compact
                  ? `${2 + (index % 3) * 7}px`
                  : `${4 + (index % 3) * 11}px`,
                top: iconOnly && compact
                  ? `${3 + Math.floor(index / 3) * 6}px`
                  : `${5 + Math.floor(index / 3) * 9}px`,
              }}
            />
          ))}
        </>
      ) : null}
      {variant === "sparse" ? (
        <>
          {[0, 1, 2].map((index) => (
            <span
              className={`absolute rotate-[-35deg] rounded-full ${sparseLineClass} ${lineColor}`}
              key={index}
              style={{
                left: iconOnly && compact
                  ? `${2 + index * 7}px`
                  : `${4 + index * 11}px`,
                top: iconOnly && compact
                  ? `${3 + index * 3}px`
                  : `${5 + index * 4}px`,
              }}
            />
          ))}
        </>
      ) : null}
      {variant === "signature" ? (
        <span
          className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full ${signatureMarkClass} ${markColor}`}
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
  if (compact) {
    return (
      <div className="flex items-center justify-end gap-0.5">
        {quickTemplates.map((template) => {
          const isSelected = activeTemplate === template.id;

          return (
            <motion.button
              aria-label={template.label}
              aria-pressed={isSelected}
              className={`relative flex h-5 w-6 shrink-0 items-center justify-center rounded border px-0 py-0 shadow-sm transition ${
                isSelected
                  ? "border-emerald-200 bg-emerald-100"
                  : "border-signal/50 bg-signal/5 hover:border-signal/70"
              }`}
              key={template.id}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => onApplyTemplate(template.id)}
              title={template.label}
              type="button"
              whileTap={{ scale: 0.96 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 28,
              }}
            >
              <TemplateIcon
                compact
                iconOnly
                isSelected={isSelected}
                variant={template.icon}
              />
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <EditorPanelSection title="Quick templates">
      <div className="grid grid-cols-3 gap-2">
        {quickTemplates.map((template) => {
          const isSelected = activeTemplate === template.id;

          return (
            <motion.button
              aria-label={template.label}
              aria-pressed={isSelected}
              className={`relative rounded-lg border text-left px-1.5 py-2 transition-colors ${
                isSelected
                  ? "editor-selected-strong"
                  : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:border-signal/50 hover:text-ed-fg"
              }`}
              key={template.id}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => onApplyTemplate(template.id)}
              title={template.label}
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
              <span className="relative z-10 block">
                <TemplateIcon isSelected={isSelected} variant={template.icon} />
                <span className="mt-1 block truncate text-[10px] font-semibold leading-tight">
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
              ? "editor-selected-strong"
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
