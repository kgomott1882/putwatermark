"use client";

import { ImageIcon, Type } from "lucide-react";
import type { ReactNode } from "react";

export type WatermarkToolId = "text" | "logo";

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
      className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] font-medium leading-none transition max-md:flex-row md:w-full md:flex-col md:gap-1.5 md:rounded-xl md:px-1.5 md:py-2.5 md:text-[10px] ${className} ${
        active
          ? "bg-signal font-bold text-white shadow-sm hover:brightness-110"
          : "editor-secondary-button border-ed-border text-ed-fg-muted hover:text-ed-fg"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex h-3 w-3 items-center justify-center md:h-5 md:w-5">{icon}</span>
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
      className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto overscroll-x-contain border-t border-ed-border bg-ed-panel px-1 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] max-md:gap-1 md:w-[4.5rem] md:flex-col md:gap-1 md:overflow-x-visible md:overflow-y-auto md:border-t-0 md:border-r md:px-1.5 md:py-2 [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex flex-row gap-0.5 md:flex-col">
        <RailTool
          active={activeTool === "text"}
          icon={<Type className="h-3 w-3 md:h-5 md:w-5" strokeWidth={1.75} />}
          label="Text"
          onClick={() => onSelectTool("text")}
        />
        <RailTool
          active={activeTool === "logo"}
          icon={<ImageIcon className="h-3 w-3 md:h-5 md:w-5" strokeWidth={1.75} />}
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
