"use client";

import { Combine, Droplets, Minimize2, PenLine } from "lucide-react";
import {
  EditorSubToolButton,
  EditorSubToolRail,
} from "./EditorSubToolRail";
import type { PdfDocToolId } from "./pdfDocTools";

type PdfDocsToolRailProps = {
  activeTool: PdfDocToolId;
  onSelectTool: (tool: PdfDocToolId) => void;
};

export function PdfDocsToolRail({
  activeTool,
  onSelectTool,
}: PdfDocsToolRailProps) {
  return (
    <EditorSubToolRail ariaLabel="PDF document tools">
      <EditorSubToolButton
        active={activeTool === "signFill"}
        icon={<PenLine className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Sign & Fill"
        onClick={() => onSelectTool("signFill")}
      />
      <EditorSubToolButton
        active={activeTool === "watermark"}
        icon={<Droplets className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Watermark"
        onClick={() => onSelectTool("watermark")}
      />
      <EditorSubToolButton
        active={activeTool === "merge"}
        icon={<Combine className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Merge PDF"
        onClick={() => onSelectTool("merge")}
      />
      <EditorSubToolButton
        active={activeTool === "compress"}
        icon={<Minimize2 className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />}
        label="Compress PDF"
        onClick={() => onSelectTool("compress")}
      />
    </EditorSubToolRail>
  );
}
