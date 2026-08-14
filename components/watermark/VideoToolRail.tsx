"use client";

import { Combine, Captions, Clapperboard, Droplets, ScanFace, Scissors } from "lucide-react";
import type { ReactNode } from "react";
import {
  EditorSubToolButton,
  EditorSubToolRail,
} from "./EditorSubToolRail";

export type VideoToolId =
  | "overview"
  | "caption"
  | "trim"
  | "merge"
  | "blur"
  | "watermark";

type VideoToolRailProps = {
  activeTool: VideoToolId;
  hasVideo: boolean;
  hideOverviewOnMobile?: boolean;
  mobileTrailingAccessory?: ReactNode;
  onReshortenVideo?: () => void;
  onSelectTool: (tool: VideoToolId) => void;
  showReshortenOnTrim?: boolean;
};

export function VideoToolRail({
  activeTool,
  hasVideo,
  hideOverviewOnMobile = false,
  mobileTrailingAccessory,
  onReshortenVideo,
  onSelectTool,
  showReshortenOnTrim = false,
}: VideoToolRailProps) {
  const toolsDisabled = !hasVideo;

  return (
    <EditorSubToolRail
      ariaLabel="Video tools"
      mobileTrailingAccessory={mobileTrailingAccessory}
    >
      <div className={hideOverviewOnMobile ? "hidden md:contents" : "contents"}>
        <EditorSubToolButton
          active={activeTool === "overview"}
          disabled={toolsDisabled}
          icon={<Clapperboard className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
          label="Overview"
          onClick={() => onSelectTool("overview")}
        />
      </div>
      <EditorSubToolButton
        active={activeTool === "watermark"}
        disabled={toolsDisabled}
        icon={<Droplets className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Watermark"
        onClick={() => onSelectTool("watermark")}
      />
      <EditorSubToolButton
        active={activeTool === "caption"}
        disabled={toolsDisabled}
        icon={<Captions className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Add Caption"
        mobileLabel="Caption"
        onClick={() => onSelectTool("caption")}
      />
      <div className="relative flex flex-col gap-0.5 md:gap-1">
        <EditorSubToolButton
          active={activeTool === "trim"}
          disabled={toolsDisabled}
          icon={<Scissors className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
          label="Shorten Video"
          mobileLabel="Shorten"
          onClick={() => onSelectTool("trim")}
        />
        {activeTool === "trim" && showReshortenOnTrim && onReshortenVideo ? (
          <button
            className="w-full rounded-lg border border-signal/50 bg-signal px-1.5 py-1.5 text-[9px] font-bold leading-tight text-white shadow-sm transition hover:bg-signal/90"
            onClick={onReshortenVideo}
            type="button"
          >
            Reshorten vid
          </button>
        ) : null}
      </div>
      <EditorSubToolButton
        active={activeTool === "blur"}
        disabled={toolsDisabled}
        icon={<ScanFace className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Blur"
        onClick={() => onSelectTool("blur")}
      />
      <EditorSubToolButton
        active={activeTool === "merge"}
        disabled={toolsDisabled}
        icon={<Combine className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Merge Videos"
        mobileLabel="Merge"
        onClick={() => onSelectTool("merge")}
      />
    </EditorSubToolRail>
  );
}
