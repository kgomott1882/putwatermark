"use client";

import { FileText, Minimize2 } from "lucide-react";
import { EditorCard, EditorPanelSection } from "./EditorToolPanel";

export type PdfCompressStats = {
  compressedSize: number;
  originalSize: number;
  savedBytes: number;
  savedPercent: number;
};

type PdfCompressPanelProps = {
  fileName: string | null;
  fileSize: number;
  hasLoadedPdf: boolean;
  isProcessing: boolean;
  lastResult: PdfCompressStats | null;
  onCompress: () => void;
  onUploadPdf?: () => void;
  pageCount: number;
};

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "—";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PdfCompressPanel({
  fileName,
  fileSize,
  hasLoadedPdf,
  isProcessing,
  lastResult,
  onCompress,
  onUploadPdf,
  pageCount,
}: PdfCompressPanelProps) {
  return (
    <div className="space-y-2">
      <EditorPanelSection title="Compress PDF">
        <EditorCard className="space-y-3 p-3">
          <p className="text-sm leading-6 text-ed-fg-muted">
            Reduce file size while optimizing for maximal PDF quality.
          </p>

          {!hasLoadedPdf ? (
            <div className="rounded-lg border border-dashed border-ed-border bg-ed-bg px-3 py-4 text-center">
              <FileText
                className="mx-auto h-8 w-8 text-ed-fg-muted/60"
                strokeWidth={1.5}
              />
              <p className="mt-2 text-sm text-ed-fg-muted">
                Upload a PDF to open the editor, then compress it here.
              </p>
              {onUploadPdf ? (
                <button
                  className="editor-secondary-button mt-3 w-full rounded-xl border-dashed px-4 py-2.5 text-sm font-semibold text-ed-fg hover:border-signal/50"
                  onClick={onUploadPdf}
                  type="button"
                >
                  Choose PDF
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-[#e8dfd1] bg-[#faf6f0] px-2.5 py-2">
                <p className="truncate text-sm font-medium text-ed-fg">
                  {fileName ?? "document.pdf"}
                </p>
                <p className="mt-0.5 text-[11px] text-ed-fg-muted">
                  {pageCount} {pageCount === 1 ? "page" : "pages"} ·{" "}
                  {formatFileSize(fileSize)}
                </p>
              </div>

              {lastResult ? (
                <div className="rounded-lg border border-ed-border bg-ed-bg px-2.5 py-2 text-xs leading-5 text-ed-fg-muted">
                  <p>
                    Compressed to{" "}
                    <span className="font-semibold text-ed-fg">
                      {formatFileSize(lastResult.compressedSize)}
                    </span>{" "}
                    from {formatFileSize(lastResult.originalSize)}.
                  </p>
                  {lastResult.savedBytes > 0 ? (
                    <p className="mt-1">
                      Saved {formatFileSize(lastResult.savedBytes)} (
                      {lastResult.savedPercent.toFixed(1)}% smaller).
                    </p>
                  ) : (
                    <p className="mt-1">
                      This PDF was already optimized — no further reduction.
                    </p>
                  )}
                </div>
              ) : null}
            </>
          )}

          <button
            className="editor-secondary-button flex w-full items-center justify-center gap-2 rounded-lg border-signal/40 bg-signal px-3 py-2.5 text-sm font-semibold text-white hover:border-signal hover:bg-signal/90 disabled:opacity-60"
            disabled={isProcessing || !hasLoadedPdf}
            onClick={onCompress}
            type="button"
          >
            <Minimize2 className="h-4 w-4" strokeWidth={2} />
            {isProcessing ? "Compressing…" : "Compress PDF"}
          </button>
        </EditorCard>
      </EditorPanelSection>
    </div>
  );
}
