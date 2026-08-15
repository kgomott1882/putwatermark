"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, type MouseEvent as ReactMouseEvent } from "react";
import {
  CUSTOM_CREDITS_MAX,
  CUSTOM_CREDITS_MIN,
  CUSTOM_CREDITS_STEP,
  CUSTOM_PRICE_PER_THOUSAND_USD,
  computeCustomPurchasePriceUSD,
} from "@/lib/purchasePricing";
import {
  formatPurchaseCredits,
  formatPurchasePrice,
} from "@/lib/purchaseCheckoutDisplay";
import type { PurchaseTierId } from "@/lib/purchasePricing";
import {
  PricingPayPalCheckout,
  type CheckoutSelection,
} from "./PricingPayPalCheckout";
import {
  isPayPalCardSheetOpen,
  minimizePayPalCardSheet,
} from "./paypalCardSheet";
import { usePayPalCardOverlayLayout } from "./usePayPalCardOverlayLayout";

export type CheckoutOrderSummary = {
  detail: string;
  key: string;
  price: string;
  title: string;
};

type CheckoutTierOption = {
  credits: number;
  label: string;
  priceUSD: number;
  tierId: PurchaseTierId;
};

type PricingCheckoutModalProps = {
  checkoutKey: string;
  completionMode?: "editor" | "pricing";
  customPlanCredits?: number;
  isCustomPlanActive?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCustomPlanActiveChange?: (active: boolean) => void;
  onCustomPlanCreditsChange?: (credits: number) => void;
  onPurchaseComplete?: (balance: number) => void;
  orderSummary: CheckoutOrderSummary;
  paypalClientId: string;
  selectedTierId?: PurchaseTierId;
  selection: CheckoutSelection;
  tierOptionLabel?: (tier: CheckoutTierOption) => string;
  tierOptions?: readonly CheckoutTierOption[];
  onTierChange?: (tierId: PurchaseTierId) => void;
};

export function PricingCheckoutModal({
  checkoutKey,
  completionMode = "pricing",
  customPlanCredits,
  isCustomPlanActive = false,
  isOpen,
  onClose,
  onCustomPlanActiveChange,
  onCustomPlanCreditsChange,
  onPurchaseComplete,
  orderSummary,
  paypalClientId,
  selectedTierId,
  selection,
  tierOptionLabel,
  tierOptions,
  onTierChange,
}: PricingCheckoutModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalPanelRef = useRef<HTMLDivElement>(null);

  const showCustomPlan =
    customPlanCredits !== undefined &&
    onCustomPlanCreditsChange &&
    onCustomPlanActiveChange;

  const customPlanPrice =
    customPlanCredits !== undefined
      ? computeCustomPurchasePriceUSD(customPlanCredits)
      : 0;

  usePayPalCardOverlayLayout(isOpen);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();
    document.documentElement.classList.add("paypal-checkout-open");

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();

      if (isPayPalCardSheetOpen()) {
        minimizePayPalCardSheet();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.documentElement.classList.remove("paypal-checkout-open");
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleBackdropClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isPayPalCardSheetOpen()) {
      minimizePayPalCardSheet();
    }
  }

  function handleModalPanelPointerDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (!isPayPalCardSheetOpen()) {
      return;
    }

    const paypalSection = modalPanelRef.current?.querySelector(
      '[data-checkout-paypal-section="true"]',
    );

    if (paypalSection?.contains(event.target as Node)) {
      return;
    }

    minimizePayPalCardSheet();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10"
      role="dialog"
    >
      <button
        aria-label="Minimize card form"
        className="absolute inset-0 bg-night/80 backdrop-blur-sm"
        onClick={handleBackdropClick}
        type="button"
      />

      <div
        className="relative flex max-h-[calc(100dvh-4rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-beige/10 bg-night-card shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:max-h-[calc(100dvh-5rem)]"
        onMouseDown={handleModalPanelPointerDown}
        ref={modalPanelRef}
      >
        <div className="shrink-0 border-b border-beige/10 bg-night-elevated/60 px-6 py-5">
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
              aria-label="Close checkout"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-beige/10 bg-night-elevated text-beige-dim transition hover:border-beige/20 hover:text-beige"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {tierOptions && selectedTierId && onTierChange ? (
            <div className="relative mb-4">
              <label
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-sand"
                htmlFor={`${titleId}-tier`}
              >
                Credit pack
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border border-beige/10 bg-night-elevated px-3 py-2.5 pr-9 text-sm font-medium text-beige outline-none transition focus:border-signal/50 focus:ring-2 focus:ring-signal/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCustomPlanActive}
                  id={`${titleId}-tier`}
                  onChange={(event) =>
                    onTierChange(event.target.value as PurchaseTierId)
                  }
                  value={selectedTierId}
                >
                  {tierOptions.map((tier) => (
                    <option key={tier.tierId} value={tier.tierId}>
                      {tierOptionLabel
                        ? tierOptionLabel(tier)
                        : `${tier.label} · $${tier.priceUSD}`}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-beige-dim"
                />
              </div>
            </div>
          ) : null}

          {showCustomPlan ? (
            <details
              className="group mb-4 overflow-hidden rounded-xl border border-beige/10 bg-night-elevated"
              onToggle={(event) => {
                onCustomPlanActiveChange(event.currentTarget.open);
              }}
              open={isCustomPlanActive}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-medium text-beige">Custom plan</span>
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-beige-dim transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <div className="border-t border-beige/10 px-3 pb-3 pt-2">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-xs leading-5 text-beige-dim">
                    High volume option above Premium:{" "}
                    {formatPurchasePrice(CUSTOM_PRICE_PER_THOUSAND_USD)} per 1,000
                    credits.
                  </p>
                  <p className="shrink-0 text-lg font-bold tracking-[-0.04em] text-beige">
                    {formatPurchasePrice(customPlanPrice)}
                  </p>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-beige-dim">Credits</span>
                    <span className="font-semibold text-beige">
                      {formatPurchaseCredits(customPlanCredits)}
                    </span>
                  </div>
                  <input
                    aria-label="Custom credit pack amount"
                    className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-beige/10 accent-signal"
                    max={CUSTOM_CREDITS_MAX}
                    min={CUSTOM_CREDITS_MIN}
                    onChange={(event) =>
                      onCustomPlanCreditsChange(Number(event.target.value))
                    }
                    step={CUSTOM_CREDITS_STEP}
                    type="range"
                    value={customPlanCredits}
                  />
                  <div className="mt-2 flex justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-beige-dim">
                    <span>{formatPurchaseCredits(CUSTOM_CREDITS_MIN)}</span>
                    <span>{formatPurchaseCredits(CUSTOM_CREDITS_MAX)}</span>
                  </div>
                </div>
              </div>
            </details>
          ) : null}

          <p className="text-sm leading-6 text-beige-dim" id={descriptionId}>
            {orderSummary.detail}
          </p>

          <div
            className="mt-6 rounded-xl border border-ink/10 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
            data-checkout-paypal-section="true"
          >
            <PricingPayPalCheckout
              checkoutKey={checkoutKey}
              completionMode={completionMode}
              onPurchaseComplete={onPurchaseComplete}
              paypalClientId={paypalClientId}
              selection={selection}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
