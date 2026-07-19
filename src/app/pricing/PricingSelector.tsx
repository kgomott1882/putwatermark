"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LandingHighlight,
  LandingSectionHeader,
  LandingSubSeparator,
} from "../../../components/landing/LandingPrimitives";
import { pageContainerClass } from "../../../components/pageContainer";
import { PricingCheckoutModal } from "../../../components/pricing/PricingCheckoutModal";
import type { PurchaseTierId } from "@/lib/purchasePricing";

type PricingTier = {
  credits: number;
  label: string;
  popular?: boolean;
  price: number;
  tagline: string;
  tierId: PurchaseTierId;
  videoLine: string;
};

type PricingSelectorProps = {
  isLoggedIn: boolean;
  paypalClientId: string;
};

const pricingTiers: PricingTier[] = [
  {
    credits: 3_000,
    label: "Grow",
    price: 8.99,
    tagline: "Personal projects & occasional exports",
    tierId: "grow",
    videoLine: "Covered by your credit balance",
  },
  {
    credits: 9_000,
    label: "Premium",
    popular: true,
    price: 19.99,
    tagline: "Regular creative work",
    tierId: "premium",
    videoLine: "Covered by your credit balance",
  },
];

const PRICE_PER_THOUSAND_CREDITS = 2;
const STANDALONE_PRICE_PER_CREDIT = PRICE_PER_THOUSAND_CREDITS / 1_000;

const STANDALONE_CREDITS_MIN = 3_000;
const STANDALONE_CREDITS_MAX = 50_000;
const STANDALONE_CREDITS_STEP = 500;
const STANDALONE_CREDITS_DEFAULT = 3_000;

const PHOTOS_PDFS_LINE = "Covered by your credit balance";
const SIGNATURE_LINE = "Unlimited — always free";
const CREDITS_EXPIRY_LINE = "Credits don't expire for 60 days";
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
    value: "50 credits (e.g. a 20-page document = 1,000 credits)",
  },
  {
    label: "Video up to 60 seconds (in-browser)",
    value: "Included — no credits used",
  },
  {
    label: "Longer videos (server processing)",
    value: "Additional credits apply, based on length",
  },
  {
    label: "Signatures",
    value: "Always free — never uses credits",
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

function getTierFeatures(tier: PricingTier) {
  return [
    `Photos & PDFs: ${PHOTOS_PDFS_LINE}`,
    `Video: ${tier.videoLine}`,
    `Signatures: ${SIGNATURE_LINE}`,
    CREDITS_EXPIRY_LINE,
  ] as const;
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
          detail: `${formatCredits(selectedTier.credits)} credits · Video: ${selectedTier.videoLine} · Signatures: ${SIGNATURE_LINE}`,
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
          title="Simple pay-as-you-go pricing"
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

        <div className="mx-auto mt-8 grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:gap-5">
          {pricingTiers.map((tier, index) => {
            const isSelected = selectionMode === "tier" && selectedTierIndex === index;
            const features = getTierFeatures(tier);

            return (
              <article
                className={`flex h-full flex-col rounded-2xl border bg-night-card transition ${
                  tier.popular
                    ? "border-signal/35 shadow-[0_0_0_1px_rgba(217,119,87,0.12)]"
                    : "landing-border"
                } ${isSelected ? "ring-2 ring-signal/80 ring-offset-2 ring-offset-night" : ""}`}
                key={tier.label}
              >
                <div className="px-6 pb-5 pt-6">
                  <h3 className="text-2xl font-bold tracking-[-0.04em] text-beige sm:text-[1.65rem]">
                    {tier.label}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-beige-dim">{tier.tagline}</p>
                </div>

                <div className="border-t border-beige/10" />

                <div className="px-6 py-5">
                  <p className="text-3xl font-bold tracking-[-0.05em] text-beige lg:text-4xl">
                    {formatPrice(tier.price)}
                  </p>
                  <p className="mt-1 text-sm text-beige-dim">one-time pack</p>
                  <div className="mt-4 rounded-xl border border-beige/15 bg-night-elevated/60 px-4 py-3">
                    <p className="text-sm font-semibold text-beige">
                      {formatCredits(tier.credits)} credits
                    </p>
                  </div>
                </div>

                <div className="border-t border-beige/10" />

                <ul className="flex flex-1 flex-col gap-3 px-6 py-5">
                  {features.map((feature) => (
                    <li className="flex items-start gap-3 text-sm leading-6 text-beige-dim" key={feature}>
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-signal/15 text-signal">
                        <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <p className="px-6 pb-2 text-[11px] leading-5 text-beige-dim/80">
                  {VIDEO_FOOTNOTE}
                </p>

                <div className="px-6 pb-6 pt-2">
                  <button
                    aria-pressed={isSelected}
                    className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
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

        <div className="landing-surface mt-8 rounded-[1.75rem] p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sand">
                Custom pack
              </p>
              <p className="mt-2 max-w-xl text-sm leading-7 text-beige-dim">
                Buy exactly the credits you need —{" "}
                {formatPrice(PRICE_PER_THOUSAND_CREDITS)} per 1,000 credits, no base
                tier required.
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

          <button
            className={`mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
              selectionMode === "extra" ? "text-signal" : "text-beige-dim hover:text-beige"
            }`}
            onClick={openCustomCheckout}
            type="button"
          >
            {selectionMode === "extra" ? "Selected for checkout" : "Use this amount"}
            {selectionMode === "extra" ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : null}
          </button>
        </div>

        <div className="landing-surface mt-8 rounded-[1.75rem] p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sand">
            Reference
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-beige sm:text-2xl">
            How credits work
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-beige-dim">
            Every credit works the same way, no matter what you&apos;re protecting.
          </p>

          <ul className="mt-6 divide-y divide-beige/10 rounded-2xl landing-border border">
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
              JPG, PNG, WebP, PDF, MP4, MOV, and WEBM — same editor, same watermark
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
