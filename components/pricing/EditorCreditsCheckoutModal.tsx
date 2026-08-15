"use client";

import { useState } from "react";
import {
  CUSTOM_CREDITS_MIN,
  type PurchaseTierId,
} from "@/lib/purchasePricing";
import {
  buildCustomCheckoutSelection,
  buildCustomCheckoutSummary,
  buildTierCheckoutSelection,
  buildTierCheckoutSummary,
  formatPurchaseCredits,
  formatPurchasePrice,
  getEditorCheckoutTierOptions,
} from "@/lib/purchaseCheckoutDisplay";
import { PricingCheckoutModal } from "./PricingCheckoutModal";

type EditorCreditsCheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete?: (balance: number) => void;
  paypalClientId: string;
};

type CheckoutSelectionMode = "custom" | "tier";

export function EditorCreditsCheckoutModal({
  isOpen,
  onClose,
  onPurchaseComplete,
  paypalClientId,
}: EditorCreditsCheckoutModalProps) {
  const [selectedTierId, setSelectedTierId] = useState<PurchaseTierId>("grow");
  const [selectionMode, setSelectionMode] =
    useState<CheckoutSelectionMode>("tier");
  const [customCredits, setCustomCredits] = useState(CUSTOM_CREDITS_MIN);
  const tierOptions = getEditorCheckoutTierOptions();

  const selection =
    selectionMode === "tier"
      ? buildTierCheckoutSelection(selectedTierId)
      : buildCustomCheckoutSelection(customCredits);
  const orderSummary =
    selectionMode === "tier"
      ? buildTierCheckoutSummary(selectedTierId)
      : buildCustomCheckoutSummary(customCredits);

  return (
    <PricingCheckoutModal
      checkoutKey={selection.key}
      completionMode="editor"
      customPlanCredits={customCredits}
      isCustomPlanActive={selectionMode === "custom"}
      isOpen={isOpen}
      onClose={onClose}
      onCustomPlanActiveChange={(active) => {
        setSelectionMode(active ? "custom" : "tier");
      }}
      onCustomPlanCreditsChange={setCustomCredits}
      onPurchaseComplete={onPurchaseComplete}
      onTierChange={(tierId) => {
        setSelectedTierId(tierId);
        setSelectionMode("tier");
      }}
      orderSummary={orderSummary}
      paypalClientId={paypalClientId}
      selectedTierId={selectedTierId}
      selection={selection}
      tierOptions={tierOptions}
      tierOptionLabel={(tier) =>
        `${tier.label} · ${formatPurchasePrice(tier.priceUSD)} · ${formatPurchaseCredits(tier.credits)} credits`
      }
    />
  );
}
