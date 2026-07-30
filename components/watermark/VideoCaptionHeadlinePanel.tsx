"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Italic,
  Underline,
} from "lucide-react";
import type { VideoCaptionLayer } from "@/lib/videoCaptions";
import {
  EditorPanelSection,
  EditorSegment,
} from "./EditorToolPanel";

type VideoCaptionHeadlinePanelProps = {
  caption: VideoCaptionLayer;
  onCaptionChange: (patch: Partial<VideoCaptionLayer>) => void;
};

export function VideoCaptionHeadlinePanel({
  caption,
  onCaptionChange,
}: VideoCaptionHeadlinePanelProps) {
  return (
    <div className="space-y-2">
      <EditorPanelSection title="Auto headline">
        <div className="space-y-3 rounded-xl border border-ed-border bg-ed-bg-card p-3 shadow-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
            <div>
              <label
                className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg"
                htmlFor="caption-font-size"
              >
                Size
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  className="editor-field-sm w-full"
                  id="caption-font-size"
                  max={120}
                  min={16}
                  onChange={(event) =>
                    onCaptionChange({
                      fontSizePx: Number(event.target.value) || 16,
                    })
                  }
                  step={1}
                  type="number"
                  value={caption.fontSizePx}
                />
                <span className="text-[11px] text-ed-fg-muted">px</span>
              </div>
            </div>
            <div>
              <label
                className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg"
                htmlFor="caption-font-weight"
              >
                Weight
              </label>
              <select
                className="editor-field-sm mt-1 w-full"
                id="caption-font-weight"
                onChange={(event) =>
                  onCaptionChange({
                    fontWeight: event.target.value as "normal" | "bold",
                  })
                }
                value={caption.fontWeight}
              >
                <option value="normal">Regular</option>
                <option value="bold">Bold</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg">
              Decoration
            </p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <EditorSegment
                active={caption.fontStyle === "italic"}
                groupId="caption-italic"
                onClick={() =>
                  onCaptionChange({
                    fontStyle:
                      caption.fontStyle === "italic" ? "normal" : "italic",
                  })
                }
              >
                <span className="inline-flex items-center gap-1">
                  <Italic className="h-3.5 w-3.5" />
                  Italic
                </span>
              </EditorSegment>
              <EditorSegment
                active={caption.underline}
                groupId="caption-underline"
                onClick={() =>
                  onCaptionChange({ underline: !caption.underline })
                }
              >
                <span className="inline-flex items-center gap-1">
                  <Underline className="h-3.5 w-3.5" />
                  Underline
                </span>
              </EditorSegment>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg">
              Alignment
            </p>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(
                [
                  ["left", AlignLeft],
                  ["center", AlignCenter],
                  ["right", AlignRight],
                ] as const
              ).map(([align, Icon]) => (
                <EditorSegment
                  active={caption.textAlign === align}
                  groupId="caption-align"
                  key={align}
                  onClick={() => onCaptionChange({ textAlign: align })}
                >
                  <Icon className="mx-auto h-3.5 w-3.5" />
                </EditorSegment>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg"
                htmlFor="caption-radius"
              >
                Radius
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  className="editor-field-sm w-full"
                  id="caption-radius"
                  max={40}
                  min={0}
                  onChange={(event) =>
                    onCaptionChange({
                      backgroundRadiusPx: Number(event.target.value) || 0,
                    })
                  }
                  step={1}
                  type="number"
                  value={caption.backgroundRadiusPx}
                />
                <span className="text-[11px] text-ed-fg-muted">px</span>
              </div>
            </div>
            <div>
              <label
                className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg"
                htmlFor="caption-width"
              >
                Width
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  className="editor-field-sm w-full"
                  id="caption-width"
                  max={100}
                  min={40}
                  onChange={(event) =>
                    onCaptionChange({
                      maxWidthPercent: Number(event.target.value) || 80,
                    })
                  }
                  step={5}
                  type="number"
                  value={caption.maxWidthPercent}
                />
                <span className="text-[11px] text-ed-fg-muted">%</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg">
              Position
            </p>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(["top", "center", "bottom"] as const).map((position) => (
                <EditorSegment
                  active={
                    !caption.customPosition &&
                    caption.verticalPosition === position
                  }
                  groupId="caption-position"
                  key={position}
                  onClick={() =>
                    onCaptionChange({
                      customPosition: null,
                      verticalPosition: position,
                    })
                  }
                >
                  {position}
                </EditorSegment>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg">
                Custom placement
              </p>
              {caption.customPosition ? (
                <button
                  className="text-[10px] font-medium text-ed-fg-muted transition hover:text-ed-fg"
                  onClick={() => onCaptionChange({ customPosition: null })}
                  type="button"
                >
                  Reset
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  className="text-[10px] text-ed-fg-muted"
                  htmlFor="caption-x"
                >
                  X
                </label>
                <input
                  className="editor-range mt-1 w-full"
                  id="caption-x"
                  max={100}
                  min={0}
                  onChange={(event) => {
                    const xPercent = Number(event.target.value) / 100;
                    onCaptionChange({
                      customPosition: {
                        xPercent,
                        yPercent:
                          caption.customPosition?.yPercent ??
                          (caption.verticalPosition === "top"
                            ? 0.12
                            : caption.verticalPosition === "center"
                              ? 0.5
                              : 0.88),
                      },
                    });
                  }}
                  step={1}
                  type="range"
                  value={Math.round(
                    (caption.customPosition?.xPercent ?? 0.5) * 100,
                  )}
                />
              </div>
              <div>
                <label
                  className="text-[10px] text-ed-fg-muted"
                  htmlFor="caption-y"
                >
                  Y
                </label>
                <input
                  className="editor-range mt-1 w-full"
                  id="caption-y"
                  max={100}
                  min={0}
                  onChange={(event) => {
                    const yPercent = Number(event.target.value) / 100;
                    onCaptionChange({
                      customPosition: {
                        xPercent: caption.customPosition?.xPercent ?? 0.5,
                        yPercent,
                      },
                    });
                  }}
                  step={1}
                  type="range"
                  value={Math.round(
                    (caption.customPosition?.yPercent ??
                      (caption.verticalPosition === "top"
                        ? 0.12
                        : caption.verticalPosition === "center"
                          ? 0.5
                          : 0.88)) * 100,
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </EditorPanelSection>
    </div>
  );
}
