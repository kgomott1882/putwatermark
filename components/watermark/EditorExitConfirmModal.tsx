"use client";

type EditorExitConfirmModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export function EditorExitConfirmModal({
  onCancel,
  onConfirm,
}: EditorExitConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ed-fg/45 px-4 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        aria-labelledby="editor-exit-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-ed-border bg-ed-bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 className="text-lg font-semibold text-ed-fg" id="editor-exit-title">
          Leave the editor?
        </h2>
        <p className="mt-3 text-sm leading-6 text-ed-fg-muted">
          Your current file and edits in this session will be cleared. You&apos;ll
          return to the homepage.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="editor-secondary-button rounded-xl px-4 py-2.5 text-sm font-semibold text-ed-fg hover:border-signal/50"
            onClick={onCancel}
            type="button"
          >
            Stay in editor
          </button>
          <button
            className="rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            onClick={onConfirm}
            type="button"
          >
            Leave editor
          </button>
        </div>
      </div>
    </div>
  );
}
