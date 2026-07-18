"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";

type WatermarkedExportUpsellModalProps = {
  onContinue: () => void;
  open: boolean;
};

export function WatermarkedExportUpsellModal({
  onContinue,
  open,
}: WatermarkedExportUpsellModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    continueButtonRef.current?.focus();
  }, [open]);

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
        className="absolute inset-0 bg-night/80 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-beige/10 bg-night-card shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-beige/10 bg-night-elevated/60 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-beige/10 bg-beige/5">
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
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-beige-dim">
                Free export
              </p>
              <h2
                className="mt-1 text-lg font-semibold leading-snug text-beige"
                id={titleId}
              >
                This export will include the PutWatermark logo
              </h2>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <p
            className="text-sm leading-6 text-beige-dim"
            id={descriptionId}
          >
            Free exports are tiled with our watermark. Buy credits to export clean,
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
              className="inline-flex w-full items-center justify-center rounded-xl border border-beige/15 bg-night-elevated px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-beige transition hover:border-sand/40 hover:text-sand"
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
