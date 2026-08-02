"use client";

import { FileText, Images, Video, X } from "lucide-react";

export type EditorFormatUploadKind = "photos" | "pdfDocs" | "video";

type EditorFormatUploadModalProps = {
  kind: EditorFormatUploadKind;
  onClose: () => void;
  onUploadClick: () => void;
};

const formatCopy: Record<
  EditorFormatUploadKind,
  {
    buttonLabel: string;
    description: string;
    features: readonly string[];
    formats: string;
    icon: typeof Images;
    title: string;
  }
> = {
  photos: {
    buttonLabel: "Choose photos",
    description:
      "Upload one or more photos to watermark, edit, and export as images.",
    features: [
      "Watermark",
      "Filters",
      "Blur",
      "Crop",
      "Resize",
      "Rotate",
    ],
    formats: "JPG, PNG, WebP",
    icon: Images,
    title: "Upload photos",
  },
  pdfDocs: {
    buttonLabel: "Choose PDF",
    description:
      "Upload a PDF document to use every PDF tool in the editor.",
    features: [
      "Sign & Fill",
      "Watermark",
      "Merge PDF",
      "Compress PDF",
    ],
    formats: "PDF",
    icon: FileText,
    title: "Upload a PDF document",
  },
  video: {
    buttonLabel: "Choose video",
    description:
      "Upload a video clip to preview, edit, and export from the editor.",
    features: [
      "Overview",
      "Add Caption",
      "Watermark",
      "Shorten Video",
      "Blur",
      "Merge Videos",
    ],
    formats: "MP4, MOV, WebM",
    icon: Video,
    title: "Upload a video",
  },
};

export function EditorFormatUploadModal({
  kind,
  onClose,
  onUploadClick,
}: EditorFormatUploadModalProps) {
  const copy = formatCopy[kind];
  const Icon = copy.icon;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ed-fg/45 px-4 max-md:bg-ed-fg/50 md:backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        aria-labelledby="editor-format-upload-title"
        aria-modal="true"
        className="max-h-[min(90dvh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-[#e8dfd1] bg-[#faf6f0] p-5 shadow-xl md:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e8dfd1] bg-[#f0e9dc] text-signal">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h2
              className="text-lg font-semibold text-ed-fg"
              id="editor-format-upload-title"
            >
              {copy.title}
            </h2>
          </div>
          <button
            aria-label="Close upload dialog"
            className="editor-secondary-button flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-[#e8dfd1] bg-[#f0e9dc]/60 text-ed-fg-muted hover:text-ed-fg"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-ed-fg-muted">
          {copy.description}
        </p>

        <div className="mt-4 rounded-xl border border-[#e8dfd1] bg-[#f0e9dc]/45 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a6651]">
            Available features
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {copy.features.map((feature) => (
              <li
                className="flex items-center gap-2 text-sm text-ed-fg"
                key={feature}
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal"
                />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6651]">
          Supported formats: {copy.formats}
        </p>

        <div className="mt-6 flex justify-stretch sm:justify-end">
          <button
            className="w-full rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:brightness-95 sm:w-auto"
            onClick={onUploadClick}
            type="button"
          >
            {copy.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
