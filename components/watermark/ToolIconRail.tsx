"use client";

import Link from "next/link";
import { Crown, FileText, Home, Images, Video } from "lucide-react";
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
  onSelectPanel: (panel: EditorPanelId) => void;
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
  onSelectPanel,
}: ToolIconRailProps) {
  const photosEnabled = isEditorTabEnabled("photos", mediaKind);
  const pdfDocsEnabled = isEditorTabEnabled("pdfDocs", mediaKind);
  const videosEnabled = isEditorTabEnabled("video", mediaKind);

  return (
    <nav
      aria-label="Editor tools"
      className="flex w-full shrink-0 flex-row items-stretch gap-1 overflow-x-auto overscroll-x-contain border-b border-ed-border bg-ed-panel px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] md:h-full md:w-[5rem] md:flex-col md:overflow-x-visible md:overflow-y-hidden md:border-b-0 md:border-r md:px-0 md:py-2 [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex min-h-0 flex-row gap-1 md:min-h-0 md:flex-1 md:flex-col md:gap-0.5 md:overflow-y-auto md:overscroll-y-contain md:px-1.5">
        <Link
          className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-[10px] font-medium leading-tight text-ed-fg-muted transition hover:bg-ed-bg-card/70 hover:text-ed-fg md:gap-2 md:px-1.5 md:py-3 md:text-[11px]"
          href="/"
          title="Home"
        >
          <Home className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />
          <span className="whitespace-nowrap">Home</span>
        </Link>

        <div
          aria-hidden
          className="mx-0.5 w-px shrink-0 self-stretch bg-ed-border md:mx-1 md:h-px md:w-auto"
        />

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
      </div>

      <Link
        className="mx-0 mb-0 flex shrink-0 flex-col items-center gap-1.5 self-center rounded-xl bg-signal px-2 py-2 text-[10px] font-bold leading-tight text-white shadow-md transition hover:brightness-110 md:mx-1.5 md:mb-3 md:gap-2 md:px-1.5 md:py-3 md:text-[11px]"
        href="/pricing"
      >
        <Crown className="h-4 w-4 md:h-5 md:w-5" strokeWidth={2} />
        <span className="whitespace-nowrap">Upgrade</span>
      </Link>
    </nav>
  );
}
