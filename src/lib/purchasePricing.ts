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
    credits: 4_000,
    label: "Grow",
    priceUSD: 9.99,
    tierId: "grow",
  },
  premium: {
    credits: 11_000,
    label: "Premium",
    priceUSD: 19.99,
    tierId: "premium",
  },
};

export const CUSTOM_CREDITS_MIN = 15_000;
export const CUSTOM_CREDITS_MAX = 50_000;
export const CUSTOM_CREDITS_STEP = 500;
export const CUSTOM_PRICE_PER_THOUSAND_USD = 1.6;

/** Tier rate floors must stay meaningfully above the next tier — not penny-match it. */
export const PURCHASE_TIER_MIN_RATE_MARGIN = 0.15;

/** @deprecated Use PURCHASE_TIER_MIN_RATE_MARGIN */
export const CUSTOM_PACK_MIN_PREMIUM_PRICE_MARGIN = PURCHASE_TIER_MIN_RATE_MARGIN;

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

  // Integer credits on a 500-step grid with $1.60/1,000 always produce exact cents.
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

function computeCustomMinimumPriceUSD() {
  return (CUSTOM_CREDITS_MIN * CUSTOM_PRICE_PER_THOUSAND_USD) / 1_000;
}

export function computePricePerThousandCredits(
  credits: number,
  priceUSD: number,
) {
  return (priceUSD * 1_000) / credits;
}

function logPurchasePricingMisconfiguration(message: string) {
  console.error(`[purchasePricing] ${message}`);

  if (process.env.NODE_ENV !== "production") {
    throw new Error(message);
  }
}

/**
 * Guards against custom-pack pricing that overlaps or undercuts Premium.
 * Logs in all environments; throws during non-production startup so misconfiguration
 * is caught before deploy rather than by eyeballing the pricing page.
 */
export function assertCustomPackMinimumPriceAbovePremium() {
  const premiumPriceUSD = FIXED_PURCHASE_TIERS.premium.priceUSD;
  const customMinPriceUSD = computeCustomMinimumPriceUSD();
  const requiredMinimumPriceUSD =
    premiumPriceUSD * (1 + PURCHASE_TIER_MIN_RATE_MARGIN);

  if (customMinPriceUSD >= requiredMinimumPriceUSD) {
    return;
  }

  const marginPercent = (PURCHASE_TIER_MIN_RATE_MARGIN * 100).toFixed(0);
  const message =
    `Custom pack minimum price ($${customMinPriceUSD.toFixed(2)} for ${CUSTOM_CREDITS_MIN.toLocaleString("en-US")} credits) ` +
    `must be at least ${marginPercent}% above Premium ($${premiumPriceUSD.toFixed(2)}). ` +
    `Required floor: $${requiredMinimumPriceUSD.toFixed(2)}.`;

  logPurchasePricingMisconfiguration(message);
}

/**
 * Grow's per-1,000-credit rate must stay meaningfully above Premium's so entry
 * tiers cannot accidentally invert when one pack is edited without the other.
 */
export function assertGrowPerThousandRateAbovePremium() {
  const grow = FIXED_PURCHASE_TIERS.grow;
  const premium = FIXED_PURCHASE_TIERS.premium;
  const growRatePerThousand = computePricePerThousandCredits(
    grow.credits,
    grow.priceUSD,
  );
  const premiumRatePerThousand = computePricePerThousandCredits(
    premium.credits,
    premium.priceUSD,
  );
  const requiredGrowRatePerThousand =
    premiumRatePerThousand * (1 + PURCHASE_TIER_MIN_RATE_MARGIN);

  if (growRatePerThousand >= requiredGrowRatePerThousand) {
    return;
  }

  const marginPercent = (PURCHASE_TIER_MIN_RATE_MARGIN * 100).toFixed(0);
  const message =
    `Grow per-1,000-credit rate ($${growRatePerThousand.toFixed(2)}) ` +
    `must be at least ${marginPercent}% above Premium ($${premiumRatePerThousand.toFixed(2)} per 1,000). ` +
    `Required Grow rate: $${requiredGrowRatePerThousand.toFixed(2)} per 1,000.`;

  logPurchasePricingMisconfiguration(message);
}

export function assertPurchasePricingInvariants() {
  assertGrowPerThousandRateAbovePremium();
  assertCustomPackMinimumPriceAbovePremium();
}

assertPurchasePricingInvariants();
