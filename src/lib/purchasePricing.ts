export const PURCHASE_TIER_IDS = ["grow", "premium"] as const;

export type PurchaseTierId = (typeof PURCHASE_TIER_IDS)[number];

export type FixedPurchaseTier = {
  credits: number;
  label: string;
  priceUSD: number;
  tierId: PurchaseTierId;
};

export const FIXED_PURCHASE_TIERS: Record<PurchaseTierId, FixedPurchaseTier> = {
  grow: {
    credits: 3_000,
    label: "Grow",
    priceUSD: 8.99,
    tierId: "grow",
  },
  premium: {
    credits: 9_000,
    label: "Premium",
    priceUSD: 19.99,
    tierId: "premium",
  },
};

export const CUSTOM_CREDITS_MIN = 3_000;
export const CUSTOM_CREDITS_MAX = 50_000;
export const CUSTOM_CREDITS_STEP = 500;
export const CUSTOM_PRICE_PER_THOUSAND_USD = 2;

export type PurchaseSelectionKind = "tier" | "custom";

export type ResolvedPurchaseQuote = {
  credits: number;
  kind: PurchaseSelectionKind;
  label: string;
  priceUSD: number;
  tierId?: PurchaseTierId;
};

export class PurchasePricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchasePricingError";
  }
}

export function isPurchaseTierId(value: string): value is PurchaseTierId {
  return (PURCHASE_TIER_IDS as readonly string[]).includes(value);
}

function assertWholeNumberCredits(credits: number) {
  if (!Number.isFinite(credits) || !Number.isInteger(credits)) {
    throw new PurchasePricingError("Credits must be a whole number.");
  }
}

export function validateCustomCreditAmount(credits: number) {
  assertWholeNumberCredits(credits);

  if (credits < CUSTOM_CREDITS_MIN || credits > CUSTOM_CREDITS_MAX) {
    throw new PurchasePricingError(
      `Custom credit packs must be between ${CUSTOM_CREDITS_MIN.toLocaleString("en-US")} and ${CUSTOM_CREDITS_MAX.toLocaleString("en-US")} credits.`,
    );
  }

  if (credits % CUSTOM_CREDITS_STEP !== 0) {
    throw new PurchasePricingError(
      `Custom credit packs must be in increments of ${CUSTOM_CREDITS_STEP.toLocaleString("en-US")} credits.`,
    );
  }
}

export function computeCustomPurchasePriceUSD(credits: number) {
  validateCustomCreditAmount(credits);

  // Integer credits on a 500-step grid with $2/1,000 always produce exact cents.
  const priceCents = (credits * CUSTOM_PRICE_PER_THOUSAND_USD * 100) / 1_000;

  return priceCents / 100;
}

export function resolveTierPurchase(tierId: string): ResolvedPurchaseQuote {
  if (!isPurchaseTierId(tierId)) {
    throw new PurchasePricingError("Invalid purchase tier.");
  }

  const tier = FIXED_PURCHASE_TIERS[tierId];

  return {
    credits: tier.credits,
    kind: "tier",
    label: `${tier.label} pack`,
    priceUSD: tier.priceUSD,
    tierId: tier.tierId,
  };
}

export function resolveCustomPurchase(credits: number): ResolvedPurchaseQuote {
  const priceUSD = computeCustomPurchasePriceUSD(credits);

  return {
    credits,
    kind: "custom",
    label: "Custom credit pack",
    priceUSD,
  };
}

export type PurchaseSelectionInput =
  | {
      kind: "tier";
      tierId: string;
    }
  | {
      kind: "custom";
      credits: number;
    };

export function resolvePurchaseSelection(
  input: PurchaseSelectionInput,
): ResolvedPurchaseQuote {
  if (input.kind === "tier") {
    return resolveTierPurchase(input.tierId);
  }

  return resolveCustomPurchase(input.credits);
}
