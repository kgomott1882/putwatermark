"use client";

import Link from "next/link";
import { Coins, FileText, Images, Video, X } from "lucide-react";
import type { ReactNode } from "react";

export type EditorPanelId =
  | "photos"
  | "pdfDocs"
  | "watermark"
  | "signFill"
  | "blur"
  | "crop"
  | "resize"
  | "rotate"
  | "effects"
  | "video";

export type EditorMediaKind = "image" | "pdf" | "video";

type ToolIconRailProps = {
  activePanel: EditorPanelId | null;
  mediaKind: EditorMediaKind | null;
  onMobileExit?: () => void;
  onSelectPanel: (panel: EditorPanelId) => void;
  showBuyCredits?: boolean;
};

type RailItemProps = {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
};

function RailItem({ active, disabled, icon, label, onClick }: RailItemProps) {
  return (
    <button
      className={`flex shrink-0 flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-[10px] leading-tight transition disabled:cursor-not-allowed md:gap-2 md:px-1.5 md:py-3 md:text-[11px] ${
        active
          ? "bg-ed-bg-card text-ed-fg font-bold shadow-sm"
          : disabled
            ? "font-medium text-ed-fg-muted opacity-35"
            : "font-bold text-ed-fg hover:bg-ed-bg-card/70"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center md:h-6 md:w-6 ${
          disabled ? "text-ed-fg-muted/50" : "text-signal"
        }`}
      >
        {icon}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function isPhotosPanel(panel: EditorPanelId | null) {
  return (
    panel === "photos" ||
    panel === "watermark" ||
    panel === "effects" ||
    panel === "blur" ||
    panel === "crop" ||
    panel === "resize" ||
    panel === "rotate"
  );
}

function isPdfDocsPanel(panel: EditorPanelId | null) {
  return panel === "pdfDocs" || panel === "signFill";
}

function isEditorTabEnabled(
  tab: "photos" | "pdfDocs" | "video",
  mediaKind: EditorMediaKind | null,
) {
  if (!mediaKind) {
    return true;
  }

  if (tab === "photos") {
    return mediaKind === "image";
  }

  if (tab === "pdfDocs") {
    return mediaKind === "pdf";
  }

  return mediaKind === "video";
}

export function ToolIconRail({
  activePanel,
  mediaKind,
  onMobileExit,
  onSelectPanel,
  showBuyCredits = true,
}: ToolIconRailProps) {
  const photosEnabled = isEditorTabEnabled("photos", mediaKind);
  const pdfDocsEnabled = isEditorTabEnabled("pdfDocs", mediaKind);
  const videosEnabled = isEditorTabEnabled("video", mediaKind);

  return (
    <div className="relative">
      <nav
        aria-label="Editor tools"
        className={`flex min-w-0 flex-1 shrink-0 flex-row items-center justify-center bg-ed-panel px-2 py-1.5 md:h-full md:w-[5rem] md:flex-col md:items-stretch md:justify-start md:overflow-x-visible md:overflow-y-hidden md:border-r md:px-0 md:py-2 ${
          onMobileExit ? "max-md:pr-8" : ""
        }`}
      >
        <div className="flex flex-row items-center justify-center gap-1 md:min-h-0 md:flex-1 md:flex-col md:items-stretch md:justify-start md:gap-0.5 md:overflow-y-auto md:overscroll-y-contain md:px-1.5">
          <RailItem
            active={isPhotosPanel(activePanel)}
            disabled={!photosEnabled}
            icon={<Images className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
            label="Photos"
            onClick={() => onSelectPanel("photos")}
          />
          <RailItem
            active={isPdfDocsPanel(activePanel)}
            disabled={!pdfDocsEnabled}
            icon={<FileText className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
            label="Pdf Docs"
            onClick={() => onSelectPanel("pdfDocs")}
          />
          <RailItem
            active={activePanel === "video"}
            disabled={!videosEnabled}
            icon={<Video className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
            label="Videos"
            onClick={() => onSelectPanel("video")}
          />
          {showBuyCredits ? (
            <Link
              className="hidden flex-col items-center gap-1.5 rounded-xl bg-signal px-1.5 py-2 text-[10px] font-bold leading-tight text-white shadow-md transition hover:brightness-110 md:mx-1.5 md:mb-3 md:mt-auto md:flex md:gap-1.5 md:px-1 md:py-2.5 md:text-[10px]"
              href="/pricing"
              title="Buy Credits"
            >
              <Coins className="h-4 w-4 shrink-0 md:h-4 md:w-4" strokeWidth={2} />
              <span className="max-w-full text-center leading-[1.15]">
                <span className="block">Buy</span>
                <span className="block">Credits</span>
              </span>
            </Link>
          ) : null}
        </div>
      </nav>
      {onMobileExit ? (
        <button
          aria-label="Exit editor"
          className="absolute right-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md border border-ed-border/80 bg-ed-panel/95 text-ed-fg-muted shadow-sm backdrop-blur-[2px] transition hover:bg-ed-bg-card hover:text-ed-fg md:hidden"
          onClick={onMobileExit}
          type="button"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
