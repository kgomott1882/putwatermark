import {
  FIXED_PURCHASE_TIERS,
  type PurchaseTierId,
} from "@/lib/purchasePricing";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const creditsFormatter = new Intl.NumberFormat("en-US");

export const CHECKOUT_CREDITS_EXPIRY_LINE = "Credits don't expire for 60 days";

export const EDITOR_CHECKOUT_TIER_IDS: PurchaseTierId[] = ["premium", "grow"];

export function formatPurchasePrice(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatPurchaseCredits(amount: number) {
  return creditsFormatter.format(amount);
}

export function buildTierCheckoutSummary(tierId: PurchaseTierId) {
  const tier = FIXED_PURCHASE_TIERS[tierId];

  return {
    detail: `${formatPurchaseCredits(tier.credits)} credits · Photos, PDF & video · ${CHECKOUT_CREDITS_EXPIRY_LINE}`,
    key: tier.label,
    price: formatPurchasePrice(tier.priceUSD),
    title: `${tier.label} pack`,
  };
}

export function buildTierCheckoutSelection(tierId: PurchaseTierId) {
  const tier = FIXED_PURCHASE_TIERS[tierId];

  return {
    kind: "tier" as const,
    key: tier.label,
    tierId: tier.tierId,
  };
}

export function getEditorCheckoutTierOptions() {
  return EDITOR_CHECKOUT_TIER_IDS.map((tierId) => {
    const tier = FIXED_PURCHASE_TIERS[tierId];

    return {
      credits: tier.credits,
      label: tier.label,
      priceUSD: tier.priceUSD,
      tierId: tier.tierId,
    };
  });
}
