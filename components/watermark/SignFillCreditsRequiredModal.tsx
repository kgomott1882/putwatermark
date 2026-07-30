"use client";

import Link from "next/link";

type SignFillCreditsRequiredModalProps = {
  description?: string;
  onClose: () => void;
  open: boolean;
  title?: string;
};

export function SignFillCreditsRequiredModal({
  description = "Placing signatures or initials uses 50 credits per page. Fill-text adds 5 credits per page on top. Buy credits to continue, or cancel and keep editing your preview.",
  onClose,
  open,
  title = "Sign & Fill requires credits",
}: SignFillCreditsRequiredModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ed-fg/45 backdrop-blur-sm"
      />

      <div
        aria-labelledby="sign-fill-credits-title"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ed-border bg-ed-panel shadow-[0_24px_80px_rgba(43,43,43,0.25)]"
        role="dialog"
      >
        <div className="border-b border-ed-border bg-ed-bg-card px-6 py-5">
          <h2
            className="text-lg font-semibold text-ed-fg"
            id="sign-fill-credits-title"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ed-fg-muted">
            {description}
          </p>
        </div>

        <div className="flex flex-col gap-2 px-6 py-5">
          <Link
            className="inline-flex w-full items-center justify-center rounded-xl bg-signal px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            href="/pricing"
          >
            Buy Credits
          </Link>
          <button
            className="editor-secondary-button inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-ed-fg hover:border-signal/50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
