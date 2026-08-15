import {
  CUSTOM_CREDITS_MIN,
  CUSTOM_PRICE_PER_THOUSAND_USD,
  FIXED_PURCHASE_TIERS,
  computeCustomPurchasePriceUSD,
  type PurchaseTierId,
} from "@/lib/purchasePricing";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const creditsFormatter = new Intl.NumberFormat("en-US");

export const CHECKOUT_CREDITS_EXPIRY_LINE = "Credits don't expire for 60 days";

export const EDITOR_CHECKOUT_TIER_IDS: PurchaseTierId[] = ["grow", "premium"];

export function formatPurchasePrice(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatPurchaseCredits(amount: number) {
  return creditsFormatter.format(amount);
}

export function buildCustomCheckoutSummary(credits: number) {
  const priceUSD = computeCustomPurchasePriceUSD(credits);

  return {
    detail: `${formatPurchaseCredits(credits)} credits · ${formatPurchasePrice(CUSTOM_PRICE_PER_THOUSAND_USD)} per 1,000 · ${CHECKOUT_CREDITS_EXPIRY_LINE}`,
    key: `extra-${credits}`,
    price: formatPurchasePrice(priceUSD),
    title: "Custom credit pack",
  };
}

export function buildCustomCheckoutSelection(credits: number) {
  return {
    credits,
    kind: "custom" as const,
    key: `extra-${credits}`,
  };
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
