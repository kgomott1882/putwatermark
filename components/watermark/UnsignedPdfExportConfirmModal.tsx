"use client";

type UnsignedPdfExportConfirmModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
  pageCount: number;
};

export function UnsignedPdfExportConfirmModal({
  onCancel,
  onConfirm,
  pageCount,
}: UnsignedPdfExportConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ed-fg/45 px-4 backdrop-blur-[2px]">
      <div
        aria-labelledby="unsigned-pdf-export-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-ed-border bg-ed-bg-card p-6 shadow-xl"
        role="dialog"
      >
        <h2
          className="text-lg font-semibold text-ed-fg"
          id="unsigned-pdf-export-title"
        >
          Export without signatures?
        </h2>
        <p className="mt-3 text-sm leading-6 text-ed-fg-muted">
          None of the {pageCount} pages in this PDF have a signature placed. You
          can still export the document, but no signature will appear on any page.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="editor-secondary-button rounded-xl px-4 py-2.5 text-sm font-semibold text-ed-fg hover:border-signal/50"
            onClick={onCancel}
            type="button"
          >
            Go back
          </button>
          <button
            className="rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            onClick={onConfirm}
            type="button"
          >
            Export anyway
          </button>
        </div>
      </div>
    </div>
  );
}
