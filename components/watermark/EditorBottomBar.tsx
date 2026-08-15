"use client";

import type { ReactNode, Ref } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Loader2,
  Minus,
  Plus,
  Redo2,
  Undo2,
} from "lucide-react";
import {
  editorFooterMobileCaptionClassName,
  editorFooterMobileColumnClassName,
  previewControlButtonClassName,
} from "./PreviewZoomControls";

type EditorBottomBarProps = {
  canRedo: boolean;
  canUndo: boolean;
  className?: string;
  exportDisabled?: boolean;
  exportLabel: string;
  footerRef?: Ref<HTMLElement>;
  isExporting?: boolean;
  exportTitle?: string;
  mediaActions?: ReactNode;
  onBuyCredits?: () => void;
  onExit: () => void;
  onExport: () => void;
  onRedo: () => void;
  onUndo: () => void;
  showHistoryControls?: boolean;
  zoomInDisabled?: boolean;
  zoomLabel?: string;
  zoomOutDisabled?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
};

type FooterMobileActionVariant = "neutral" | "signal" | "danger";

type EditorFooterMobileActionProps = {
  ariaLabel: string;
  caption: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  variant?: FooterMobileActionVariant;
};

function footerMobileIconClassName(variant: FooterMobileActionVariant) {
  const base =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-45 md:h-7 md:w-7";

  switch (variant) {
    case "signal":
      return `${base} bg-signal text-white shadow-sm hover:brightness-110`;
    case "danger":
      return previewControlButtonClassName;
    default:
      return `${base} border border-ed-border bg-ed-bg text-ed-fg shadow-sm hover:border-signal/50`;
  }
}

export function EditorFooterMobileAction({
  ariaLabel,
  caption,
  children,
  className = "",
  disabled = false,
  onClick,
  variant = "neutral",
}: EditorFooterMobileActionProps) {
  return (
    <div className={`${editorFooterMobileColumnClassName} ${className}`}>
      <button
        aria-label={ariaLabel}
        className={footerMobileIconClassName(variant)}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
      <span className={editorFooterMobileCaptionClassName}>{caption}</span>
    </div>
  );
}

function handleExportClick(
  exportDisabled: boolean | undefined,
  exportLabel: string,
  onExport: () => void,
) {
  console.log("[real-video-export] STEP 1/15: Export MP4 button clicked", {
    exportDisabled: Boolean(exportDisabled),
    exportLabel,
    timestamp: new Date().toISOString(),
  });
  onExport();
}

export function EditorBottomBar({
  canRedo,
  canUndo,
  className = "",
  exportDisabled,
  exportLabel,
  footerRef,
  isExporting = false,
  exportTitle,
  mediaActions,
  onBuyCredits,
  onExit,
  onExport,
  onRedo,
  onUndo,
  showHistoryControls = true,
  zoomInDisabled = false,
  zoomLabel = "100%",
  zoomOutDisabled = false,
  onZoomIn,
  onZoomOut,
}: EditorBottomBarProps) {
  return (
    <footer
      className={`flex shrink-0 items-center justify-between gap-1.5 border-t border-ed-border bg-ed-panel px-1.5 py-1.5 sm:gap-3 sm:px-3 sm:py-2 max-md:grid max-md:grid-cols-[auto_minmax(0,1fr)_auto] max-md:items-center max-md:gap-x-1.5 max-md:px-2 max-md:py-1.5 ${className}`}
      ref={footerRef}
    >
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <EditorFooterMobileAction
          ariaLabel="Exit editor"
          caption="Exit"
          className="md:hidden"
          onClick={onExit}
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2.35} />
        </EditorFooterMobileAction>
        <button
          className="editor-secondary-button hidden shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ed-fg hover:text-ed-fg sm:gap-1.5 sm:rounded-xl sm:px-2.5 sm:py-2 sm:text-[10px] sm:tracking-[0.1em] md:inline-flex md:px-4 md:text-xs md:tracking-[0.12em]"
          onClick={onExit}
          type="button"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
          Exit
        </button>
        {onBuyCredits ? (
          <EditorFooterMobileAction
            ariaLabel="Buy credits"
            caption="Buy"
            className="md:hidden"
            onClick={onBuyCredits}
            variant="signal"
          >
            <Coins className="h-3 w-3" strokeWidth={2.35} />
          </EditorFooterMobileAction>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center justify-center gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] md:flex-1 [&::-webkit-scrollbar]:hidden">
        {mediaActions ? (
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            {mediaActions}
          </div>
        ) : null}
        {showHistoryControls ? (
          <>
            <div className="flex shrink-0 items-center gap-1 md:hidden">
              <EditorFooterMobileAction
                ariaLabel="Undo"
                caption="Undo"
                disabled={!canUndo}
                onClick={onUndo}
              >
                <Undo2 className="h-3 w-3" strokeWidth={2.35} />
              </EditorFooterMobileAction>
              <EditorFooterMobileAction
                ariaLabel="Redo"
                caption="Redo"
                disabled={!canRedo}
                onClick={onRedo}
              >
                <Redo2 className="h-3 w-3" strokeWidth={2.35} />
              </EditorFooterMobileAction>
            </div>
            <button
              aria-label="Undo"
              className="hidden items-center gap-1 rounded-lg px-1.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ed-fg transition hover:bg-ed-fg/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:text-ed-fg-muted sm:inline-flex sm:gap-1.5 sm:px-2 sm:py-2 sm:text-[11px] sm:tracking-[0.1em] md:px-3"
              disabled={!canUndo}
              onClick={onUndo}
              type="button"
            >
              <Undo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              aria-label="Redo"
              className="hidden items-center gap-1 rounded-lg px-1.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ed-fg transition hover:bg-ed-fg/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:text-ed-fg-muted sm:inline-flex sm:gap-1.5 sm:px-2 sm:py-2 sm:text-[11px] sm:tracking-[0.1em] md:px-3"
              disabled={!canRedo}
              onClick={onRedo}
              type="button"
            >
              <Redo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Redo</span>
            </button>
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="editor-secondary-button hidden items-center gap-1 rounded-lg px-2 py-1 text-ed-fg-muted sm:flex">
          <button
            aria-label="Zoom out"
            className="rounded p-1 transition hover:bg-ed-fg/5 hover:text-ed-fg disabled:cursor-not-allowed disabled:opacity-40"
            disabled={zoomOutDisabled || !onZoomOut}
            onClick={onZoomOut}
            type="button"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[3rem] text-center text-[11px] font-semibold text-ed-fg">
            {zoomLabel}
          </span>
          <button
            aria-label="Zoom in"
            className="rounded p-1 transition hover:bg-ed-fg/5 hover:text-ed-fg disabled:cursor-not-allowed disabled:opacity-40"
            disabled={zoomInDisabled || !onZoomIn}
            onClick={onZoomIn}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          aria-label={exportLabel}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-signal px-3 text-[9px] font-bold uppercase tracking-[0.08em] text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
          disabled={exportDisabled}
          onClick={() => handleExportClick(exportDisabled, exportLabel, onExport)}
          title={exportTitle}
          type="button"
        >
          Export
          {isExporting ? (
            <Loader2
              aria-hidden
              className="h-3 w-3 animate-spin"
              strokeWidth={2.35}
            />
          ) : (
            <ArrowRight className="h-3 w-3" strokeWidth={2.35} />
          )}
        </button>
        <button
          className="hidden items-center gap-1 rounded-lg bg-signal px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-2 sm:text-[10px] sm:tracking-[0.1em] md:gap-2 md:px-5 md:text-xs md:tracking-[0.12em]"
          disabled={exportDisabled}
          onClick={() => handleExportClick(exportDisabled, exportLabel, onExport)}
          title={exportTitle}
          type="button"
        >
          {exportLabel}
          {isExporting ? (
            <Loader2
              aria-hidden
              className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4"
              strokeWidth={2.5}
            />
          ) : (
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </footer>
  );
}
