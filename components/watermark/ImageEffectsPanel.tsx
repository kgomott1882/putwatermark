"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  createEffectThumbnailDataUrl,
  imageEffectOptions,
  type EffectBorderColor,
  type EffectBorderWidth,
  type ImageEffectId,
  type ImageEffectSettings,
} from "@/lib/imageEffects";
import {
  EditorCard,
  EditorPanelSection,
  EditorPill,
  EditorSegment,
} from "./EditorToolPanel";

type ImageEffectsPanelProps = {
  activeEffect: ImageEffectId;
  borderColor: EffectBorderColor;
  borderWidth: EffectBorderWidth;
  exposure: number;
  image: HTMLImageElement | null;
  onBorderColorChange: (color: EffectBorderColor) => void;
  onBorderWidthChange: (width: EffectBorderWidth) => void;
  onEffectChange: (effect: ImageEffectId) => void;
  onExposureChange: (value: number) => void;
};

export function ImageEffectsPanel({
  activeEffect,
  borderColor,
  borderWidth,
  exposure,
  image,
  onBorderColorChange,
  onBorderWidthChange,
  onEffectChange,
  onExposureChange,
}: ImageEffectsPanelProps) {
  const [thumbnailVersion, setThumbnailVersion] = useState(0);

  useEffect(() => {
    setThumbnailVersion((value) => value + 1);
  }, [image, borderColor, borderWidth, exposure]);

  const previewSettings = useMemo<ImageEffectSettings>(
    () => ({
      activeEffect,
      borderColor,
      borderWidth,
      exposure,
    }),
    [activeEffect, borderColor, borderWidth, exposure],
  );

  const thumbnails = useMemo(() => {
    if (!image) {
      return {} as Partial<Record<ImageEffectId, string>>;
    }

    return Object.fromEntries(
      imageEffectOptions.map(({ id }) => [
        id,
        createEffectThumbnailDataUrl(image, id, previewSettings),
      ]),
    ) as Record<ImageEffectId, string>;
  }, [image, previewSettings, thumbnailVersion]);

  if (!image) {
    return (
      <EditorCard>
        <p className="text-sm text-ed-fg-muted">
          Upload an image to preview effects.
        </p>
      </EditorCard>
    );
  }

  return (
    <div className="space-y-3">
      <EditorPanelSection title="Effects">
        <div className="space-y-2">
          {imageEffectOptions.map(({ id, label }) => {
            const isSelected = activeEffect === id;

            return (
              <motion.button
                aria-pressed={isSelected}
                className={`relative w-full overflow-hidden rounded-xl border text-left transition-colors shadow-sm ${
                  isSelected
                    ? "editor-selected-strong text-ed-fg"
                    : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:border-signal/50 hover:text-ed-fg"
                }`}
                key={id}
                onClick={() => onEffectChange(id)}
                type="button"
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
              >
                {isSelected ? (
                  <motion.span
                    className="absolute inset-0 rounded-xl editor-active-surface"
                    layoutId="image-effect-selection"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
                  />
                ) : null}
                <div className="relative z-10 flex items-stretch gap-0">
                  <div className="h-16 w-20 shrink-0 overflow-hidden bg-ed-bg-card">
                    {thumbnails[id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={`${label} preview`}
                        className="h-full w-full object-cover"
                        src={thumbnails[id]}
                      />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 items-center px-3">
                    <span className="text-xs font-bold uppercase tracking-[0.12em]">
                      {label}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </EditorPanelSection>

      {activeEffect === "border" ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <EditorPanelSection title="Border width">
            <div className="grid grid-cols-3 gap-1">
              {(["thin", "medium", "thick"] as const).map((width) => (
                <EditorPill
                  active={borderWidth === width}
                  groupId="effect-border-width"
                  key={width}
                  onClick={() => onBorderWidthChange(width)}
                >
                  {width}
                </EditorPill>
              ))}
            </div>
          </EditorPanelSection>
          <EditorPanelSection title="Border color">
            <div className="editor-segment-track grid grid-cols-2 gap-2">
              <EditorSegment
                active={borderColor === "ink"}
                groupId="effect-border-color"
                onClick={() => onBorderColorChange("ink")}
              >
                Ink
              </EditorSegment>
              <EditorSegment
                active={borderColor === "paper"}
                groupId="effect-border-color"
                onClick={() => onBorderColorChange("paper")}
              >
                Paper
              </EditorSegment>
            </div>
          </EditorPanelSection>
        </motion.div>
      ) : null}

      {activeEffect === "exposure" ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <EditorPanelSection title="Exposure">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-ed-fg">
                {exposure > 0 ? `+${exposure}%` : `${exposure}%`}
              </span>
            </div>
            <input
              className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-ed-bg-card accent-signal"
              max={50}
              min={-50}
              onChange={(event) => onExposureChange(Number(event.target.value))}
              step={5}
              type="range"
              value={exposure}
            />
          </EditorPanelSection>
        </motion.div>
      ) : null}
    </div>
  );
}
