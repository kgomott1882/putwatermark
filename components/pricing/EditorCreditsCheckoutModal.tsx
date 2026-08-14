"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  buildTierCheckoutSelection,
  buildTierCheckoutSummary,
  formatPurchaseCredits,
  formatPurchasePrice,
  getEditorCheckoutTierOptions,
} from "@/lib/purchaseCheckoutDisplay";
import type { PurchaseTierId } from "@/lib/purchasePricing";
import { PricingCheckoutModal } from "./PricingCheckoutModal";

type EditorCreditsCheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete?: (balance: number) => void;
  paypalClientId: string;
};

export function EditorCreditsCheckoutModal({
  isOpen,
  onClose,
  onPurchaseComplete,
  paypalClientId,
}: EditorCreditsCheckoutModalProps) {
  const [selectedTierId, setSelectedTierId] = useState<PurchaseTierId>("premium");
  const tierOptions = getEditorCheckoutTierOptions();
  const selection = buildTierCheckoutSelection(selectedTierId);
  const orderSummary = buildTierCheckoutSummary(selectedTierId);

  return (
    <PricingCheckoutModal
      checkoutKey={selection.key}
      completionMode="editor"
      isOpen={isOpen}
      onClose={onClose}
      onPurchaseComplete={onPurchaseComplete}
      orderSummary={orderSummary}
      paypalClientId={paypalClientId}
      selectedTierId={selectedTierId}
      selection={selection}
      tierOptions={tierOptions}
      onTierChange={setSelectedTierId}
      tierOptionLabel={(tier) =>
        `${tier.label} · ${formatPurchasePrice(tier.priceUSD)} · ${formatPurchaseCredits(tier.credits)} credits`
      }
    />
  );
}
