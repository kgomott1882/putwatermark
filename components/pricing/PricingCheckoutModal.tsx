"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import {
  PricingPayPalCheckout,
  type CheckoutSelection,
} from "./PricingPayPalCheckout";

export type CheckoutOrderSummary = {
  detail: string;
  key: string;
  price: string;
  title: string;
};

type PricingCheckoutModalProps = {
  checkoutKey: string;
  isOpen: boolean;
  onClose: () => void;
  orderSummary: CheckoutOrderSummary;
  paypalClientId: string;
  selection: CheckoutSelection;
};

export function PricingCheckoutModal({
  checkoutKey,
  isOpen,
  onClose,
  orderSummary,
  paypalClientId,
  selection,
}: PricingCheckoutModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
    >
      <button
        aria-label="Close checkout"
        className="absolute inset-0 bg-night/80 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-beige/10 bg-night-card shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-beige/10 bg-night-elevated/60 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sand">
                Checkout
              </p>
              <h2
                className="mt-1 text-lg font-semibold leading-snug text-beige"
                id={titleId}
              >
                {orderSummary.title}
              </h2>
              <p className="mt-1 text-2xl font-bold tracking-[-0.04em] text-beige">
                {orderSummary.price}
              </p>
            </div>

            <button
              aria-label="Close"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-beige/10 bg-night-elevated text-beige-dim transition hover:border-beige/20 hover:text-beige"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-beige-dim" id={descriptionId}>
            {orderSummary.detail}
          </p>

          <div className="mt-6">
            <PricingPayPalCheckout
              checkoutKey={checkoutKey}
              paypalClientId={paypalClientId}
              selection={selection}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
