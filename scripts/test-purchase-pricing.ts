import assert from "node:assert/strict";
import {
  assertCustomPackMinimumPriceAbovePremium,
  assertGrowPerThousandRateAbovePremium,
  assertPurchasePricingInvariants,
  computeCustomPurchasePriceUSD,
  computePricePerThousandCredits,
  CUSTOM_CREDITS_MIN,
  CUSTOM_PRICE_PER_THOUSAND_USD,
  FIXED_PURCHASE_TIERS,
} from "../src/lib/purchasePricing";

const growRate = computePricePerThousandCredits(
  FIXED_PURCHASE_TIERS.grow.credits,
  FIXED_PURCHASE_TIERS.grow.priceUSD,
);
const premiumRate = computePricePerThousandCredits(
  FIXED_PURCHASE_TIERS.premium.credits,
  FIXED_PURCHASE_TIERS.premium.priceUSD,
);
const customRate = CUSTOM_PRICE_PER_THOUSAND_USD;
const customMinPrice = computeCustomPurchasePriceUSD(CUSTOM_CREDITS_MIN);

assert.equal(FIXED_PURCHASE_TIERS.grow.credits, 4_000);
assert.equal(FIXED_PURCHASE_TIERS.premium.credits, 11_000);
assert.equal(customMinPrice, 24);

console.log("Per-1,000-credit rates:");
console.log(`  Grow:    $${growRate.toFixed(2)} (${FIXED_PURCHASE_TIERS.grow.credits.toLocaleString("en-US")} credits @ $${FIXED_PURCHASE_TIERS.grow.priceUSD.toFixed(2)})`);
console.log(`  Premium: $${premiumRate.toFixed(2)} (${FIXED_PURCHASE_TIERS.premium.credits.toLocaleString("en-US")} credits @ $${FIXED_PURCHASE_TIERS.premium.priceUSD.toFixed(2)})`);
console.log(`  Custom:  $${customRate.toFixed(2)} (from ${CUSTOM_CREDITS_MIN.toLocaleString("en-US")} credits, floor $${customMinPrice.toFixed(2)})`);

assert.ok(growRate > premiumRate, "Grow should cost more per 1,000 than Premium");
assert.ok(premiumRate > customRate, "Premium should cost more per 1,000 than Custom");
assert.ok(growRate > premiumRate * 1.15, "Grow should clear the 15% margin above Premium");

assert.doesNotThrow(() => assertGrowPerThousandRateAbovePremium());
assert.doesNotThrow(() => assertCustomPackMinimumPriceAbovePremium());
assert.doesNotThrow(() => assertPurchasePricingInvariants());

console.log("Purchase pricing safeguards passed.");
