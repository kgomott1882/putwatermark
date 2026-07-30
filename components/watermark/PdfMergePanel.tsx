"use client";

import {
  LOADED_PDF_MERGE_ENTRY_ID,
  type PdfMergeEntry,
} from "@/lib/pdfMergeBatch";
import {
  ChevronDown,
  ChevronUp,
  Combine,
  FileText,
  Trash2,
} from "lucide-react";
import { EditorCard, EditorPanelSection } from "./EditorToolPanel";

type PdfMergePanelProps = {
  entries: PdfMergeEntry[];
  hasLoadedPdf: boolean;
  isProcessing: boolean;
  onAddPdfs: () => void;
  onMergePdfs: () => void;
  onMoveEntry: (id: string, direction: "down" | "up") => void;
  onRemoveEntry: (id: string) => void;
  onUploadPdf?: () => void;
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

export function PdfMergePanel({
  entries,
  hasLoadedPdf,
  isProcessing,
  onAddPdfs,
  onMergePdfs,
  onMoveEntry,
  onRemoveEntry,
  onUploadPdf,
}: PdfMergePanelProps) {
  const totalPages = entries.reduce((sum, entry) => sum + entry.pageCount, 0);
  const canMerge = entries.length >= 2;

  return (
    <div className="space-y-2">
      <EditorPanelSection title="Merge PDF">
        <EditorCard className="space-y-3 p-3">
          <p className="text-sm leading-6 text-ed-fg-muted">
            Combine PDFs in the order you want with the easiest PDF merger
            available. Your open document stays first — add more PDFs to merge
            with it.
          </p>

          {!hasLoadedPdf ? (
            <div className="rounded-lg border border-dashed border-ed-border bg-ed-bg px-3 py-4 text-center">
              <FileText
                className="mx-auto h-8 w-8 text-ed-fg-muted/60"
                strokeWidth={1.5}
              />
              <p className="mt-2 text-sm text-ed-fg-muted">
                Upload the first PDF to open the editor, then add more files to
                merge.
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
          ) : null}

          {entries.length > 0 ? (
            <>
              <ol className="space-y-2">
                {entries.map((entry, index) => {
                  const isLoadedDocument = entry.id === LOADED_PDF_MERGE_ENTRY_ID;

                  return (
                    <li
                      className={`rounded-lg border px-2.5 py-2 ${
                        isLoadedDocument
                          ? "border-[#e8dfd1] bg-[#faf6f0]"
                          : "border-ed-border bg-ed-bg"
                      }`}
                      key={entry.id}
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ed-bg-card text-[10px] font-bold text-ed-fg">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-ed-fg">
                              {entry.fileName}
                            </p>
                            {isLoadedDocument ? (
                              <span className="shrink-0 rounded-full bg-[#f0e9dc] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#7a6651]">
                                Open
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-ed-fg-muted">
                            {entry.pageCount}{" "}
                            {entry.pageCount === 1 ? "page" : "pages"} ·{" "}
                            {formatFileSize(entry.fileSize)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <button
                            aria-label={`Move ${entry.fileName} up`}
                            className="rounded-md p-1 text-ed-fg-muted transition hover:bg-ed-bg-card hover:text-ed-fg disabled:opacity-30"
                            disabled={index === 0 || isProcessing}
                            onClick={() => onMoveEntry(entry.id, "up")}
                            type="button"
                          >
                            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          <button
                            aria-label={`Move ${entry.fileName} down`}
                            className="rounded-md p-1 text-ed-fg-muted transition hover:bg-ed-bg-card hover:text-ed-fg disabled:opacity-30"
                            disabled={
                              index === entries.length - 1 ||
                              isProcessing ||
                              isLoadedDocument
                            }
                            onClick={() => onMoveEntry(entry.id, "down")}
                            type="button"
                          >
                            <ChevronDown
                              className="h-3.5 w-3.5"
                              strokeWidth={2}
                            />
                          </button>
                        </div>
                        {!isLoadedDocument ? (
                          <button
                            aria-label={`Remove ${entry.fileName}`}
                            className="rounded-md p-1 text-ed-fg-muted transition hover:bg-ed-accent/10 hover:text-ed-accent disabled:opacity-30"
                            disabled={isProcessing}
                            onClick={() => onRemoveEntry(entry.id)}
                            type="button"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="flex items-center justify-between text-xs text-ed-fg-muted">
                <span>
                  {entries.length} {entries.length === 1 ? "file" : "files"}
                </span>
                <span>
                  {totalPages} {totalPages === 1 ? "page" : "pages"} total
                </span>
              </div>

              {hasLoadedPdf && !canMerge ? (
                <p className="text-[11px] leading-4 text-ed-fg-muted">
                  Add at least one more PDF to merge with your open document.
                </p>
              ) : null}
            </>
          ) : null}

          <button
            className="editor-secondary-button flex w-full items-center justify-center gap-2 rounded-xl border-dashed px-4 py-2.5 text-sm font-semibold text-ed-fg hover:border-signal/50 disabled:opacity-60"
            disabled={isProcessing || !hasLoadedPdf}
            onClick={onAddPdfs}
            type="button"
          >
            <FileText className="h-4 w-4 text-signal" strokeWidth={2} />
            Add PDF
          </button>

          <button
            className="editor-secondary-button flex w-full items-center justify-center gap-2 rounded-lg border-signal/40 bg-signal px-3 py-2.5 text-sm font-semibold text-white hover:border-signal hover:bg-signal/90 disabled:opacity-60"
            disabled={isProcessing || !canMerge}
            onClick={onMergePdfs}
            type="button"
          >
            <Combine className="h-4 w-4" strokeWidth={2} />
            {isProcessing ? "Merging…" : "Merge PDFs"}
          </button>
        </EditorCard>
      </EditorPanelSection>
    </div>
  );
}
