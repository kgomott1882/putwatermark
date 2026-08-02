"use client";

import {
  Crop,
  Droplets,
  Maximize2,
  RotateCw,
  ScanFace,
  Sparkles,
} from "lucide-react";
import {
  EditorSubToolButton,
  EditorSubToolRail,
} from "./EditorSubToolRail";

export type PhotoToolId =
  | "watermark"
  | "filters"
  | "blur"
  | "crop"
  | "resize"
  | "rotate";

type PhotosToolRailProps = {
  activeTool: PhotoToolId;
  imageToolsEnabled?: boolean;
  onMobileExit?: () => void;
  onSelectTool: (tool: PhotoToolId) => void;
};

export function PhotosToolRail({
  activeTool,
  imageToolsEnabled = true,
  onMobileExit,
  onSelectTool,
}: PhotosToolRailProps) {
  const imageToolDisabled = !imageToolsEnabled;

  return (
    <EditorSubToolRail ariaLabel="Photo tools" onMobileExit={onMobileExit}>
      <EditorSubToolButton
        active={activeTool === "watermark"}
        icon={<Droplets className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Watermark"
        onClick={() => onSelectTool("watermark")}
      />
      <EditorSubToolButton
        active={activeTool === "blur"}
        disabled={imageToolDisabled}
        icon={<ScanFace className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Blur"
        onClick={() => onSelectTool("blur")}
      />
      <EditorSubToolButton
        active={activeTool === "crop"}
        disabled={imageToolDisabled}
        icon={<Crop className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Crop"
        onClick={() => onSelectTool("crop")}
      />
      <EditorSubToolButton
        active={activeTool === "resize"}
        disabled={imageToolDisabled}
        icon={<Maximize2 className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Resize"
        onClick={() => onSelectTool("resize")}
      />
      <EditorSubToolButton
        active={activeTool === "rotate"}
        disabled={imageToolDisabled}
        icon={<RotateCw className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Rotate"
        onClick={() => onSelectTool("rotate")}
      />
      <EditorSubToolButton
        active={activeTool === "filters"}
        disabled={imageToolDisabled}
        icon={<Sparkles className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Filters"
        onClick={() => onSelectTool("filters")}
      />
    </EditorSubToolRail>
  );
}
