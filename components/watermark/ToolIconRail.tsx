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
      className={`flex w-full flex-col items-center gap-2 rounded-xl px-1.5 py-3 text-[11px] leading-tight transition disabled:cursor-not-allowed ${
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
        className={`flex h-6 w-6 items-center justify-center ${
          disabled ? "text-ed-fg-muted/50" : "text-signal"
        }`}
      >
        {icon}
      </span>
      <span>{label}</span>
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
      className="flex h-full w-[5rem] shrink-0 flex-col border-r border-ed-border bg-ed-panel py-2"
    >
      <div className="flex flex-1 flex-col gap-0.5 px-1.5">
        <Link
          className="flex flex-col items-center gap-2 rounded-xl px-1.5 py-3 text-[11px] font-medium leading-tight text-ed-fg-muted transition hover:bg-ed-bg-card/70 hover:text-ed-fg"
          href="/"
          title="Home"
        >
          <Home className="h-6 w-6" strokeWidth={1.75} />
          <span>Home</span>
        </Link>

        <div className="mx-1 border-t border-ed-border" />

        <RailItem
          active={isPhotosPanel(activePanel)}
          disabled={!photosEnabled}
          icon={<Images className="h-6 w-6" strokeWidth={1.75} />}
          label="Photos"
          onClick={() => onSelectPanel("photos")}
        />
        <RailItem
          active={isPdfDocsPanel(activePanel)}
          disabled={!pdfDocsEnabled}
          icon={<FileText className="h-6 w-6" strokeWidth={1.75} />}
          label="Pdf Docs"
          onClick={() => onSelectPanel("pdfDocs")}
        />
        <RailItem
          active={activePanel === "video"}
          disabled={!videosEnabled}
          icon={<Video className="h-6 w-6" strokeWidth={1.75} />}
          label="Videos"
          onClick={() => onSelectPanel("video")}
        />
      </div>

      <Link
        className="mx-1.5 mb-3 flex flex-col items-center gap-2 rounded-xl bg-signal px-1.5 py-3 text-[11px] font-bold leading-tight text-white shadow-md transition hover:brightness-110"
        href="/pricing"
      >
        <Crown className="h-5 w-5" strokeWidth={2} />
        <span>Upgrade</span>
      </Link>
    </nav>
  );
}
