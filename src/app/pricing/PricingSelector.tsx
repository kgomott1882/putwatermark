"use client";

import { ArrowRight, Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LandingHighlight,
  LandingSectionHeader,
  LandingSubSeparator,
} from "../../../components/landing/LandingPrimitives";
import { pageContainerClass } from "../../../components/pageContainer";
import { PricingCheckoutModal } from "../../../components/pricing/PricingCheckoutModal";
import {
  CUSTOM_CREDITS_MAX,
  CUSTOM_CREDITS_MIN,
  CUSTOM_CREDITS_STEP,
  CUSTOM_PRICE_PER_THOUSAND_USD,
  FIXED_PURCHASE_TIERS,
  type PurchaseTierId,
} from "@/lib/purchasePricing";

type PricingFormatGroup = {
  features: readonly string[];
  label: string;
};

type PricingTier = {
  credits: number;
  label: string;
  popular?: boolean;
  price: number;
  tagline: string;
  tierId: PurchaseTierId;
};

type PricingSelectorProps = {
  isLoggedIn: boolean;
  paypalClientId: string;
};

const pricingTiers: PricingTier[] = [
  {
    credits: FIXED_PURCHASE_TIERS.grow.credits,
    label: FIXED_PURCHASE_TIERS.grow.label,
    price: FIXED_PURCHASE_TIERS.grow.priceUSD,
    tagline: "Personal projects & occasional exports",
    tierId: "grow",
  },
  {
    credits: FIXED_PURCHASE_TIERS.premium.credits,
    label: FIXED_PURCHASE_TIERS.premium.label,
    popular: true,
    price: FIXED_PURCHASE_TIERS.premium.priceUSD,
    tagline: "Regular creative work",
    tierId: "premium",
  },
];

const CREDIT_COVERAGE_LINE = "Covered by your credit balance";
const CREDITS_EXPIRY_LINE = "Credits don't expire for 60 days";

const pricingFormatGroups: PricingFormatGroup[] = [
  {
    features: ["Watermark", "Filters", "Blur", "Crop", "Resize", "Rotate"],
    label: "Photos",
  },
  {
    features: ["Sign & Fill", "Watermark", "Merge PDF", "Compress PDF"],
    label: "PDF",
  },
  {
    features: [
      "Overview",
      "Add Caption",
      "Watermark",
      "Shorten Video",
      "Blur",
      "Merge Videos",
    ],
    label: "Video",
  },
];

const premiumTierCredits = FIXED_PURCHASE_TIERS.premium.credits;

const PRICE_PER_THOUSAND_CREDITS = CUSTOM_PRICE_PER_THOUSAND_USD;
const STANDALONE_PRICE_PER_CREDIT = PRICE_PER_THOUSAND_CREDITS / 1_000;

const STANDALONE_CREDITS_MIN = CUSTOM_CREDITS_MIN;
const STANDALONE_CREDITS_MAX = CUSTOM_CREDITS_MAX;
const STANDALONE_CREDITS_STEP = CUSTOM_CREDITS_STEP;
const STANDALONE_CREDITS_DEFAULT = CUSTOM_CREDITS_MIN;

const SIGN_AND_FILL_DETAIL_LINE =
  "50 credits/page with signatures, initials, or fill text (+5 fill surcharge per fill page)";
const VIDEO_FOOTNOTE =
  "Videos that can't run in your browser are processed on our servers and may use additional credits";

const pricingHighlights = [
  "No subscription",
  "Photos, PDFs & video",
  "Free editor preview",
  "Pay as you go",
] as const;

const creditUsageGuide = [
  {
    label: "1 photo",
    value: "50 credits",
  },
  {
    label: "1 PDF page",
    value: "50 credits (e.g. a 20 page document = 1,000 credits)",
  },
  {
    label: "Video up to 60 seconds (in browser)",
    value: "Included, no credits used",
  },
  {
    label: "Longer videos (server processing)",
    value: "Additional credits apply, based on length",
  },
  {
    label: "Sign & fill",
    value: SIGN_AND_FILL_DETAIL_LINE,
  },
] as const;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const creditsFormatter = new Intl.NumberFormat("en-US");

type SelectionMode = "extra" | "tier";

function formatPrice(amount: number) {
  return currencyFormatter.format(amount);
}

function formatCredits(amount: number) {
  return creditsFormatter.format(amount);
}

function PricingFormatGroupSection({ group }: { group: PricingFormatGroup }) {
  return (
    <div>
      <p className="text-[12px] leading-5">
        <span className="font-semibold text-beige">{group.label}</span>
        <span className="text-beige-dim"> : {CREDIT_COVERAGE_LINE}</span>
      </p>
      <ul className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
        {group.features.map((feature) => (
          <li
            className="flex items-center gap-1.5 text-[11px] leading-4 text-beige-dim"
            key={feature}
          >
            <Check className="h-2.5 w-2.5 shrink-0 text-signal" strokeWidth={2.5} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingTierCheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-5 text-beige-dim">
      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-signal/15 text-signal">
        <Check className="h-2 w-2" strokeWidth={2.75} />
      </span>
      <span>{children}</span>
    </li>
  );
}

export function PricingSelector({ isLoggedIn, paypalClientId }: PricingSelectorProps) {
  const router = useRouter();
  const [selectedTierIndex, setSelectedTierIndex] = useState(1);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("tier");
  const [standaloneCredits, setStandaloneCredits] = useState(
    STANDALONE_CREDITS_DEFAULT,
  );
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const selectedTier = pricingTiers[selectedTierIndex];
  const standalonePrice = standaloneCredits * STANDALONE_PRICE_PER_CREDIT;

  function redirectToLogin() {
    router.push("/login?next=/pricing");
  }

  function openTierCheckout(index: number) {
    if (!isLoggedIn) {
      redirectToLogin();
      return;
    }

    setSelectionMode("tier");
    setSelectedTierIndex(index);
    setIsCheckoutModalOpen(true);
  }

  function openCustomCheckout() {
    if (!isLoggedIn) {
      redirectToLogin();
      return;
    }

    setSelectionMode("extra");
    setIsCheckoutModalOpen(true);
  }

  function handleStandaloneCreditsChange(value: number) {
    setSelectionMode("extra");
    setStandaloneCredits(value);
  }

  const checkoutSelection =
    selectionMode === "extra"
      ? {
          credits: standaloneCredits,
          kind: "custom" as const,
          key: `extra-${standaloneCredits}`,
        }
      : {
          kind: "tier" as const,
          key: selectedTier.label,
          tierId: selectedTier.tierId,
        };

  const orderSummary =
    selectionMode === "extra"
      ? {
          detail: `${formatCredits(standaloneCredits)} credits · ${formatPrice(PRICE_PER_THOUSAND_CREDITS)} per 1,000`,
          key: `extra-${standaloneCredits}`,
          price: formatPrice(standalonePrice),
          title: "Custom credit pack",
        }
      : {
          detail: `${formatCredits(selectedTier.credits)} credits · Photos, PDF & video · ${CREDITS_EXPIRY_LINE}`,
          key: selectedTier.label,
          price: formatPrice(selectedTier.price),
          title: `${selectedTier.label} pack`,
        };

  return (
    <section className="landing-section border-b">
      <div className={pageContainerClass}>
        <LandingSectionHeader
          index="Pricing"
          lead={
            <>
              No monthly fees.{" "}
              <LandingHighlight>Buy credits when you&apos;re ready</LandingHighlight>{" "}
              and keep watermarking in the browser.
            </>
          }
          title="Simple pay as you go pricing"
        />

        <LandingSubSeparator className="mt-10" />

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
          {pricingHighlights.map((item) => (
            <li className="flex items-center gap-2 text-sm text-beige-dim" key={item}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-signal/15 text-signal">
                <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-8 grid w-full max-w-4xl gap-4 sm:grid-cols-2">
          {pricingTiers.map((tier, index) => {
            const isSelected = selectionMode === "tier" && selectedTierIndex === index;

            return (
              <article
                className={`flex h-full flex-col rounded-2xl border bg-night-card px-5 py-5 transition sm:px-6 ${
                  tier.popular
                    ? "border-signal/35 shadow-[0_0_0_1px_rgba(217,119,87,0.12)]"
                    : "landing-border"
                } ${isSelected ? "ring-2 ring-signal/80 ring-offset-2 ring-offset-night" : ""}`}
                key={tier.label}
              >
                {tier.popular ? (
                  <p className="mb-2 inline-flex w-fit rounded-full bg-signal px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                    Most popular
                  </p>
                ) : null}

                <h3 className="text-xl font-bold tracking-[-0.04em] text-beige">
                  {tier.label}
                </h3>
                <p className="mt-1 text-[13px] leading-5 text-beige-dim">{tier.tagline}</p>

                <div className="mt-3">
                  <p className="text-3xl font-bold tracking-[-0.05em] text-beige">
                    {formatPrice(tier.price)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-beige-dim">
                    one time · {formatCredits(tier.credits)} credits
                  </p>
                </div>

                <div className="mt-4 flex flex-1 flex-col border-t border-beige/10 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sand">
                    Includes
                  </p>
                  <div className="mt-3 space-y-3">
                    {pricingFormatGroups.map((group) => (
                      <PricingFormatGroupSection group={group} key={group.label} />
                    ))}
                  </div>
                  <ul className="mt-3 border-t border-beige/10 pt-3">
                    <PricingTierCheckItem>{CREDITS_EXPIRY_LINE}</PricingTierCheckItem>
                  </ul>
                  <p className="mt-2 text-[10px] leading-4 text-beige-dim/75">
                    {VIDEO_FOOTNOTE}
                  </p>
                </div>

                <div className="mt-4">
                  <button
                    aria-pressed={isSelected}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      tier.popular
                        ? "bg-signal text-white shadow-lg shadow-signal/20 hover:brightness-110"
                        : isSelected
                          ? "border border-signal/50 bg-signal/10 text-beige"
                          : "border border-beige/15 bg-night-elevated text-beige hover:border-beige/25 hover:bg-night-elevated/80"
                    }`}
                    onClick={() => openTierCheckout(index)}
                    type="button"
                  >
                    {isSelected ? `Selected · ${tier.label}` : `Start with ${tier.label}`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <details className="group landing-surface mt-8 rounded-[1.75rem]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 sm:px-8 [&::-webkit-details-marker]:hidden">
            <p className="text-sm font-semibold text-beige">
              Need more than {formatCredits(premiumTierCredits)} credits?
            </p>
            <ChevronDown
              aria-hidden
              className="h-5 w-5 shrink-0 text-beige-dim transition-transform duration-200 group-open:rotate-180"
              strokeWidth={2.2}
            />
          </summary>

          <div className="border-t border-beige/10 px-6 pb-6 pt-2 sm:px-8">
            <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sand">
                  Custom pack
                </p>
                <p className="mt-2 max-w-xl text-sm leading-7 text-beige-dim">
                  High volume option above Premium:{" "}
                  {formatPrice(PRICE_PER_THOUSAND_CREDITS)} per 1,000 credits, from{" "}
                  {formatCredits(STANDALONE_CREDITS_MIN)} to{" "}
                  {formatCredits(STANDALONE_CREDITS_MAX)} credits.
                </p>
              </div>
              <p className="text-2xl font-bold tracking-[-0.04em] text-beige">
                {formatPrice(standalonePrice)}
              </p>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-beige-dim">Credits</span>
                <span className="font-semibold text-beige">
                  {formatCredits(standaloneCredits)}
                </span>
              </div>
              <input
                aria-label="Custom credit pack amount"
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-beige/10 accent-signal"
                max={STANDALONE_CREDITS_MAX}
                min={STANDALONE_CREDITS_MIN}
                onChange={(event) =>
                  handleStandaloneCreditsChange(Number(event.target.value))
                }
                step={STANDALONE_CREDITS_STEP}
                type="range"
                value={standaloneCredits}
              />
              <div className="mt-2 flex justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-beige-dim">
                <span>{formatCredits(STANDALONE_CREDITS_MIN)}</span>
                <span>{formatCredits(STANDALONE_CREDITS_MAX)}</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                aria-pressed={selectionMode === "extra"}
                className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
                  selectionMode === "extra"
                    ? "border border-signal/50 bg-signal/10 text-beige"
                    : "border border-beige/15 bg-night-elevated text-beige hover:border-beige/25 hover:bg-night-elevated/80"
                }`}
                onClick={openCustomCheckout}
                type="button"
              >
                Continue with {formatCredits(standaloneCredits)} credits
              </button>
            </div>
          </div>
        </details>

        <details className="group landing-surface mt-8 rounded-[1.75rem]">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-6 sm:p-8 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sand">
                Reference
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-beige sm:text-2xl">
                How credits work
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-beige-dim">
                Every credit works the same way, no matter what you&apos;re protecting.
              </p>
            </div>
            <ChevronDown
              aria-hidden
              className="mt-1 h-5 w-5 shrink-0 text-beige-dim transition-transform duration-200 group-open:rotate-180"
              strokeWidth={2.2}
            />
          </summary>

          <div className="border-t border-beige/10 px-6 pb-6 pt-2 sm:px-8">
            <ul className="mt-4 divide-y divide-beige/10 rounded-2xl landing-border border">
              {creditUsageGuide.map((row) => (
                <li
                  className="grid gap-2 px-4 py-4 first:rounded-t-2xl last:rounded-b-2xl sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] sm:gap-6 sm:px-5"
                  key={row.label}
                >
                  <span className="text-sm font-medium text-beige">{row.label}</span>
                  <span className="text-sm leading-6 text-beige-dim">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>

        {!isLoggedIn ? (
          <p className="mt-8 text-center text-sm text-beige-dim">
            Log in to buy credits.{" "}
            <Link
              className="inline-flex items-center gap-1.5 font-semibold text-sand transition hover:text-beige"
              href="/login?next=/pricing"
            >
              Log in
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </Link>
            {" · "}
            <Link
              className="font-semibold text-sand transition hover:text-beige"
              href="/signup"
            >
              Sign up free
            </Link>
          </p>
        ) : null}

        <LandingSubSeparator className="mt-10" />

        <div className="mt-8 grid gap-px landing-border border bg-beige/10 md:grid-cols-2">
          <div className="bg-night-card px-6 py-5 sm:px-8">
            <p className="text-sm font-semibold text-beige">Start free in the editor</p>
            <p className="landing-muted mt-2 text-sm leading-7">
              Upload a photo, PDF, or video and preview your watermark without an account.
            </p>
            <Link
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sand transition hover:text-beige"
              href="/watermark"
            >
              Open watermark tool
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </div>

          <div className="bg-night-card px-6 py-5 sm:px-8">
            <p className="text-sm font-semibold text-beige">One workflow, every format</p>
            <p className="landing-muted mt-2 text-sm leading-7">
              JPG, PNG, WebP, PDF, MP4, MOV, and WEBM. Same editor, same watermark
              settings, credits when you export at scale.
            </p>
          </div>
        </div>
      </div>

      <PricingCheckoutModal
        checkoutKey={checkoutSelection.key}
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        orderSummary={orderSummary}
        paypalClientId={paypalClientId}
        selection={checkoutSelection}
      />
    </section>
  );
}
