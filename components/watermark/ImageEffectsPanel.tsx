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

const mobileEffectLabels: Record<ImageEffectId, string> = {
  none: "Orig",
  border: "Border",
  exposure: "Exp",
  grayscale: "Gray",
  sepia: "Sepia",
  vintage: "Vint",
};

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
    <div className="space-y-0 md:space-y-3">
      <EditorPanelSection className="max-md:space-y-0" hideTitleOnMobile title="Effects">
        <div className="grid grid-cols-6 gap-0 md:grid-cols-1 md:gap-2">
          {imageEffectOptions.map(({ id, label }) => {
            const isSelected = activeEffect === id;

            return (
              <motion.button
                aria-label={label}
                aria-pressed={isSelected}
                className={`relative w-full overflow-hidden rounded-sm border text-left transition-colors md:rounded-xl md:shadow-sm ${
                  isSelected
                    ? "editor-selected-strong text-ed-fg"
                    : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:border-signal/50 hover:text-ed-fg"
                }`}
                key={id}
                onClick={() => onEffectChange(id)}
                title={label}
                type="button"
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
              >
                {isSelected ? (
                  <motion.span
                    className="absolute inset-0 rounded-sm editor-active-surface md:rounded-xl"
                    layoutId="image-effect-selection"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
                  />
                ) : null}
                <div className="relative z-10 md:flex md:flex-row md:items-stretch">
                  <div className="relative h-7 w-full shrink-0 overflow-hidden bg-ed-bg-card md:h-16 md:w-20">
                    {thumbnails[id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover"
                        src={thumbnails[id]}
                      />
                    ) : null}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-px pb-px pt-1 text-center text-[5px] font-bold uppercase leading-none tracking-normal text-white md:hidden">
                      {mobileEffectLabels[id]}
                    </span>
                  </div>
                  <div className="hidden min-w-0 flex-1 items-center md:flex md:px-3">
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
          className="space-y-0.5 md:space-y-0"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <EditorPanelSection className="max-md:space-y-0" hideTitleOnMobile title="Border">
            <div className="grid grid-cols-3 gap-0 md:gap-1">
              {(["thin", "medium", "thick"] as const).map((width) => (
                <EditorPill
                  active={borderWidth === width}
                  className="max-md:rounded-sm max-md:px-0.5 max-md:py-px max-md:text-[7px] max-md:capitalize"
                  groupId="effect-border-width"
                  key={width}
                  onClick={() => onBorderWidthChange(width)}
                >
                  {width}
                </EditorPill>
              ))}
            </div>
            <div className="editor-segment-track mt-0.5 grid grid-cols-2 gap-0 md:mt-1 md:gap-2">
              <EditorSegment
                active={borderColor === "ink"}
                className="max-md:rounded-sm max-md:px-1 max-md:py-px max-md:text-[7px]"
                groupId="effect-border-color"
                onClick={() => onBorderColorChange("ink")}
                ultraCompact
              >
                Ink
              </EditorSegment>
              <EditorSegment
                active={borderColor === "paper"}
                className="max-md:rounded-sm max-md:px-1 max-md:py-px max-md:text-[7px]"
                groupId="effect-border-color"
                onClick={() => onBorderColorChange("paper")}
                ultraCompact
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
          className="max-md:pt-0.5"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <EditorPanelSection className="max-md:space-y-0" hideTitleOnMobile title="Exposure">
            <div className="flex items-center gap-1 md:block">
              <input
                className="editor-range min-w-0 flex-1 md:mt-1"
                max={50}
                min={-50}
                onChange={(event) => onExposureChange(Number(event.target.value))}
                step={5}
                type="range"
                value={exposure}
              />
              <span className="w-7 shrink-0 text-right text-[7px] font-semibold tabular-nums text-ed-fg md:hidden">
                {exposure > 0 ? `+${exposure}%` : `${exposure}%`}
              </span>
              <span className="hidden text-xs font-semibold text-ed-fg md:inline">
                {exposure > 0 ? `+${exposure}%` : `${exposure}%`}
              </span>
            </div>
          </EditorPanelSection>
        </motion.div>
      ) : null}
    </div>
  );
}
