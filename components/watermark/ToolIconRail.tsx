"use client";

import Link from "next/link";
import {
  Crop,
  Crown,
  Droplets,
  Home,
  Maximize2,
  RotateCw,
  Sparkles,
  Star,
} from "lucide-react";
import type { ReactNode } from "react";

export type EditorPanelId =
  | "templates"
  | "watermark"
  | "crop"
  | "resize"
  | "rotate"
  | "effects";

type ToolIconRailProps = {
  activePanel: EditorPanelId | null;
  imageToolsEnabled: boolean;
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
      className={`group relative flex w-full flex-col items-center gap-1 px-1 py-2.5 text-[9px] font-semibold uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "bg-beige/10 text-beige"
          : "text-beige-dim hover:bg-beige/5 hover:text-beige"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {active ? (
        <span
          aria-hidden
          className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r bg-signal"
        />
      ) : null}
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

export function ToolIconRail({
  activePanel,
  imageToolsEnabled,
  onSelectPanel,
}: ToolIconRailProps) {
  const imageTool = (panel: "crop" | "resize" | "rotate", icon: ReactNode) => (
    <RailItem
      active={activePanel === panel}
      disabled={!imageToolsEnabled}
      icon={icon}
      label={panel}
      onClick={() => onSelectPanel(panel)}
    />
  );

  return (
    <nav
      aria-label="Editor tools"
      className="flex h-full w-[4.5rem] shrink-0 flex-col border-r border-beige/10 bg-editor-rail"
    >
      <div className="flex flex-1 flex-col">
        <Link
          className="flex flex-col items-center gap-1 px-1 py-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-beige-dim transition hover:bg-beige/5 hover:text-beige"
          href="/"
          title="Home"
        >
          <Home className="h-5 w-5" strokeWidth={1.75} />
          <span className="leading-none">Home</span>
        </Link>

        <div className="mx-2 border-t border-beige/10" />

        <RailItem
          active={activePanel === "templates"}
          icon={<Star className="h-5 w-5" strokeWidth={1.75} />}
          label="Templates"
          onClick={() => onSelectPanel("templates")}
        />
        <RailItem
          active={activePanel === "watermark"}
          icon={<Droplets className="h-5 w-5" strokeWidth={1.75} />}
          label="Watermark"
          onClick={() => onSelectPanel("watermark")}
        />
        {imageTool("crop", <Crop className="h-5 w-5" strokeWidth={1.75} />)}
        {imageTool(
          "resize",
          <Maximize2 className="h-5 w-5" strokeWidth={1.75} />,
        )}
        {imageTool(
          "rotate",
          <RotateCw className="h-5 w-5" strokeWidth={1.75} />,
        )}
        <RailItem
          active={activePanel === "effects"}
          disabled={!imageToolsEnabled}
          icon={<Sparkles className="h-5 w-5" strokeWidth={1.75} />}
          label="Effects"
          onClick={() => onSelectPanel("effects")}
        />
      </div>

      <Link
        className="mx-2 mb-3 flex flex-col items-center gap-1 rounded-xl bg-signal px-1 py-2.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white shadow-md transition hover:brightness-110"
        href="/pricing"
      >
        <Crown className="h-4 w-4" strokeWidth={2} />
        <span className="leading-none">Upgrade</span>
      </Link>
    </nav>
  );
}
