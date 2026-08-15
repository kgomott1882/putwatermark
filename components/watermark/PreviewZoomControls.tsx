"use client";

import { type ReactNode } from "react";
import { RefreshCw, RotateCcw, Trash2, Video, ZoomIn, ZoomOut } from "lucide-react";

type PreviewMediaKind = "image" | "video" | "pdf" | null;

type PreviewZoomControlsProps = {
  className?: string;
  mediaKind?: PreviewMediaKind;
  onAddMoreVideos?: () => void;
  onRemove?: () => void;
  onReplace?: () => void;
  onReset: () => void;
  resetDisabled?: boolean;
};

type PreviewControlButtonProps = {
  ariaLabel: string;
  disabled?: boolean;
  label: string;
  mobileCaption?: string;
  mobileCaptionClassName?: string;
  onClick: () => void;
  tooltipPlacement?: "above" | "below";
  children: ReactNode;
};

export const previewControlButtonClassName =
  "flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-b from-[#ef6b6b] to-[#c41e3a] text-white shadow-[0_2px_8px_rgba(196,30,58,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45";

export const editorFooterMobileColumnClassName =
  "flex w-9 shrink-0 flex-col items-center justify-center gap-0.5";

export const editorFooterMobileCaptionClassName =
  "w-full max-w-[2.25rem] truncate text-center text-[7px] font-normal uppercase tracking-[0.06em] leading-none text-ed-fg-muted";

export function PreviewControlButton({
  ariaLabel,
  children,
  disabled = false,
  label,
  mobileCaption,
  mobileCaptionClassName = "text-ed-fg-muted",
  onClick,
  tooltipPlacement = "above",
}: PreviewControlButtonProps) {
  const tooltipClassName =
    tooltipPlacement === "below"
      ? "pointer-events-none absolute top-[calc(100%+5px)] left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ed-fg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em] text-ed-bg opacity-0 shadow-md transition-opacity duration-150 group-hover/btn:opacity-100 group-focus-within/btn:opacity-100 md:block"
      : "pointer-events-none absolute bottom-[calc(100%+5px)] left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ed-fg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em] text-ed-bg opacity-0 shadow-md transition-opacity duration-150 group-hover/btn:opacity-100 group-focus-within/btn:opacity-100 md:block";

  const button = (
    <div className="group/btn relative">
      <button
        aria-label={ariaLabel}
        className={previewControlButtonClassName}
        disabled={disabled}
        onClick={onClick}
        title={label}
        type="button"
      >
        {children}
      </button>
      <span aria-hidden="true" className={tooltipClassName}>
        {label}
      </span>
    </div>
  );

  if (!mobileCaption) {
    return button;
  }

  return (
    <div className={editorFooterMobileColumnClassName}>
      {button}
      <span
        className={`md:hidden ${editorFooterMobileCaptionClassName} ${mobileCaptionClassName}`}
      >
        {mobileCaption}
      </span>
    </div>
  );
}

type PreviewCanvasZoomControlsProps = {
  className?: string;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  resetDisabled?: boolean;
  zoomInDisabled?: boolean;
  zoomOutDisabled?: boolean;
};

export function PreviewCanvasZoomControls({
  className = "",
  onReset,
  onZoomIn,
  onZoomOut,
  resetDisabled = false,
  zoomInDisabled = false,
  zoomOutDisabled = false,
}: PreviewCanvasZoomControlsProps) {
  return (
    <div
      aria-label="Canvas zoom controls"
      className={`pointer-events-auto flex items-start gap-1 ${className}`}
      role="toolbar"
    >
      <PreviewControlButton
        ariaLabel="Zoom in"
        disabled={zoomInDisabled}
        label="Zoom In"
        mobileCaption="In"
        mobileCaptionClassName="text-ed-fg-muted"
        onClick={onZoomIn}
        tooltipPlacement="below"
      >
        <ZoomIn className="h-3 w-3" strokeWidth={2.35} />
      </PreviewControlButton>
      <PreviewControlButton
        ariaLabel="Zoom out"
        disabled={zoomOutDisabled}
        label="Zoom Out"
        mobileCaption="Out"
        mobileCaptionClassName="text-ed-fg-muted"
        onClick={onZoomOut}
        tooltipPlacement="below"
      >
        <ZoomOut className="h-3 w-3" strokeWidth={2.35} />
      </PreviewControlButton>
      <PreviewControlButton
        ariaLabel="Reset zoom"
        disabled={resetDisabled}
        label="Reset Zoom"
        mobileCaption="Reset"
        mobileCaptionClassName="text-ed-fg-muted"
        onClick={onReset}
        tooltipPlacement="below"
      >
        <RotateCcw className="h-3 w-3" strokeWidth={2.35} />
      </PreviewControlButton>
    </div>
  );
}

type PreviewCanvasMediaControlsProps = {
  className?: string;
  mediaKind?: PreviewMediaKind;
  onAddMoreVideos?: () => void;
  onRemove?: () => void;
  onReplace?: () => void;
};

export function PreviewCanvasMediaControls({
  className = "",
  mediaKind = null,
  onAddMoreVideos,
  onRemove,
  onReplace,
}: PreviewCanvasMediaControlsProps) {
  const showMediaActions = Boolean(onReplace && onRemove);

  if (!showMediaActions) {
    return null;
  }

  return (
    <div
      aria-label="Canvas media controls"
      className={`pointer-events-auto flex items-center gap-1 ${className}`}
      role="toolbar"
    >
      <PreviewControlButton
        ariaLabel="Change file"
        label="Change File"
        onClick={onReplace!}
        tooltipPlacement="above"
      >
        <RefreshCw className="h-3 w-3" strokeWidth={2.35} />
      </PreviewControlButton>

      {mediaKind === "video" && onAddMoreVideos ? (
        <PreviewControlButton
          ariaLabel="Add more videos"
          label="Add Videos"
          onClick={onAddMoreVideos}
          tooltipPlacement="above"
        >
          <Video className="h-3 w-3" strokeWidth={2.35} />
        </PreviewControlButton>
      ) : null}

      <PreviewControlButton
        ariaLabel="Delete file"
        label="Delete File"
        onClick={onRemove!}
        tooltipPlacement="above"
      >
        <Trash2 className="h-3 w-3" strokeWidth={2.35} />
      </PreviewControlButton>
    </div>
  );
}

export function PreviewZoomControls({
  className = "",
  mediaKind = null,
  onAddMoreVideos,
  onRemove,
  onReplace,
  onReset,
  resetDisabled = false,
}: PreviewZoomControlsProps) {
  const showMediaActions = Boolean(onReplace && onRemove);

  return (
    <div
      aria-label="Preview controls"
      className={`pointer-events-auto flex items-center gap-1 ${className}`}
      role="toolbar"
    >
      {showMediaActions ? (
        <>
          <PreviewControlButton
            ariaLabel="Change file"
            label="Change File"
            onClick={onReplace!}
          >
            <RefreshCw className="h-3 w-3" strokeWidth={2.35} />
          </PreviewControlButton>

          {mediaKind === "video" && onAddMoreVideos ? (
            <PreviewControlButton
              ariaLabel="Add more videos"
              label="Add Videos"
              onClick={onAddMoreVideos}
            >
              <Video className="h-3 w-3" strokeWidth={2.35} />
            </PreviewControlButton>
          ) : null}

          <PreviewControlButton
            ariaLabel="Delete file"
            label="Delete File"
            onClick={onRemove!}
          >
            <Trash2 className="h-3 w-3" strokeWidth={2.35} />
          </PreviewControlButton>

          <div
            aria-hidden="true"
            className="mx-0.5 h-5 w-px shrink-0 bg-white/35"
          />
        </>
      ) : null}

      <PreviewControlButton
        ariaLabel="Reset zoom"
        disabled={resetDisabled}
        label="Reset Zoom"
        onClick={onReset}
      >
        <RotateCcw className="h-3 w-3" strokeWidth={2.35} />
      </PreviewControlButton>
    </div>
  );
}

export const PREVIEW_ZOOM_MIN = 50;
export const PREVIEW_ZOOM_MAX = 400;
export const PREVIEW_ZOOM_STEP = 25;
export const PREVIEW_ZOOM_DEFAULT = 100;

export function clampPreviewZoom(percent: number) {
  return Math.min(
    PREVIEW_ZOOM_MAX,
    Math.max(PREVIEW_ZOOM_MIN, Math.round(percent)),
  );
}

export function formatPreviewZoomLabel(percent: number) {
  return `${clampPreviewZoom(percent)}%`;
}
