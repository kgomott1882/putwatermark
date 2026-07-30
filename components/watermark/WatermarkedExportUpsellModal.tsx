"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

type WatermarkedExportUpsellModalProps = {
  onClose: () => void;
  onContinue: () => void;
  open: boolean;
};

export function WatermarkedExportUpsellModal({
  onClose,
  onContinue,
  open,
}: WatermarkedExportUpsellModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ed-fg/45 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ed-border bg-ed-panel shadow-[0_24px_80px_rgba(43,43,43,0.25)]">
        <div className="border-b border-ed-border bg-ed-bg-card px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ed-border bg-ed-fg/5">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7"
                  height={28}
                  src="/Put%20Watermark%20-%20Icon.png"
                  width={28}
                />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ed-fg">
                  Free export
                </p>
                <h2
                  className="mt-1 text-lg font-semibold leading-snug text-ed-fg"
                  id={titleId}
                >
                  This export will include the PutWatermark logo
                </h2>
              </div>
            </div>

            <button
              aria-label="Close"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ed-border bg-ed-bg-card text-ed-fg-muted transition hover:border-ed-border hover:text-ed-fg"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <p
            className="text-sm leading-6 text-ed-fg-muted"
            id={descriptionId}
          >
            Free exports include a centered PutWatermark.com watermark. Buy credits to export clean,
            watermark-free files with your own branding instead.
          </p>

          <div className="mt-6 space-y-2.5">
            <Link
              className="inline-flex w-full items-center justify-center rounded-xl bg-signal px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm transition hover:brightness-110"
              href="/pricing"
            >
              Buy Credits
            </Link>
            <button
              className="editor-secondary-button inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-ed-fg hover:border-signal/50"
              onClick={onContinue}
              ref={continueButtonRef}
              type="button"
            >
              Continue Free With Watermark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
