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
  className?: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

function RailTool({ active, className = "", icon, label, onClick }: RailToolProps) {
  return (
    <button
      className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[9px] font-medium leading-none transition md:w-full md:gap-1.5 md:rounded-xl md:px-1.5 md:py-2.5 md:text-[10px] ${className} ${
        active
          ? "bg-ed-bg-card text-ed-fg shadow-sm"
          : "text-ed-fg-muted hover:bg-ed-bg-card/70 hover:text-ed-fg"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex h-4 w-4 items-center justify-center md:h-5 md:w-5">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
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
      className="flex w-full shrink-0 flex-row gap-0.5 overflow-x-auto overscroll-x-contain border-t border-ed-border bg-ed-panel px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] md:w-[4.5rem] md:flex-col md:gap-1 md:overflow-x-visible md:overflow-y-auto md:border-t-0 md:border-r md:px-1.5 md:py-2 [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex flex-row gap-0.5 md:flex-col">
        <RailTool
          active={activeTool === "upload"}
          className="hidden md:flex"
          icon={<Upload className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.75} />}
          label="Upload"
          onClick={() => onSelectTool("upload")}
        />
        <RailTool
          active={activeTool === "text"}
          icon={<Type className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.75} />}
          label="Text"
          onClick={() => onSelectTool("text")}
        />
        <RailTool
          active={activeTool === "logo"}
          icon={<ImageIcon className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.75} />}
          label="Logo"
          onClick={() => onSelectTool("logo")}
        />
      </div>
      {!hasMedia ? (
        <p className="hidden px-2 pb-1 text-center text-[9px] leading-3 text-ed-fg-muted md:mt-auto md:block">
          Upload a file to start
        </p>
      ) : null}
    </nav>
  );
}
