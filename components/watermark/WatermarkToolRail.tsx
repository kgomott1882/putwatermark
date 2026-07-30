"use client";

import { ImageIcon, Type, Upload } from "lucide-react";
import type { ReactNode } from "react";

export type WatermarkToolId = "upload" | "text" | "logo";

type WatermarkToolRailProps = {
  activeTool: WatermarkToolId;
  hasMedia: boolean;
  onSelectTool: (tool: WatermarkToolId) => void;
};

type RailToolProps = {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

function RailTool({ active, icon, label, onClick }: RailToolProps) {
  return (
    <button
      className={`flex w-full flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 text-[10px] font-medium leading-none transition ${
        active
          ? "bg-ed-bg-card text-ed-fg shadow-sm"
          : "text-ed-fg-muted hover:bg-ed-bg-card/70 hover:text-ed-fg"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function WatermarkToolRail({
  activeTool,
  hasMedia,
  onSelectTool,
}: WatermarkToolRailProps) {
  return (
    <nav
      aria-label="Watermark tools"
      className="flex w-[4.5rem] shrink-0 flex-col border-r border-ed-border bg-ed-panel py-2"
    >
      <div className="flex flex-col gap-0.5 px-1.5">
        <RailTool
          active={activeTool === "upload"}
          icon={<Upload className="h-5 w-5" strokeWidth={1.75} />}
          label="Upload"
          onClick={() => onSelectTool("upload")}
        />
        <RailTool
          active={activeTool === "text"}
          icon={<Type className="h-5 w-5" strokeWidth={1.75} />}
          label="Text"
          onClick={() => onSelectTool("text")}
        />
        <RailTool
          active={activeTool === "logo"}
          icon={<ImageIcon className="h-5 w-5" strokeWidth={1.75} />}
          label="Logo"
          onClick={() => onSelectTool("logo")}
        />
      </div>
      {!hasMedia ? (
        <p className="mt-auto px-2 pb-1 text-center text-[9px] leading-3 text-ed-fg-muted">
          Upload a file to start
        </p>
      ) : null}
    </nav>
  );
}
