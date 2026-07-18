"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Clock, ImageIcon, PenLine, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LandingHighlight,
  LandingSectionHeader,
  LandingSubSeparator,
} from "../../../components/landing/LandingPrimitives";
import { pageContainerClass } from "../../../components/pageContainer";

type PricingTier = {
  credits: number;
  label: string;
  popular?: boolean;
  price: number;
  videoLine: string;
};

type PricingSelectorProps = {
  isLoggedIn: boolean;
};

const pricingTiers: PricingTier[] = [
  {
    credits: 2_500,
    label: "Grow",
    price: 7.99,
    videoLine: "Covered by your credit balance",
  },
  {
    credits: 7_500,
    label: "Premium",
    popular: true,
    price: 19.99,
    videoLine: "Covered by your credit balance",
  },
  {
    credits: 20_000,
    label: "Elite",
    price: 39.99,
    videoLine: "Unlimited videos, credits only apply over 60 sec",
  },
];

const ELITE_CREDITS = 20_000;
const ELITE_PRICE = 39.99;
const ELITE_PRICE_PER_CREDIT = ELITE_PRICE / ELITE_CREDITS;
const PRICE_PER_THOUSAND_CREDITS = (ELITE_PRICE / ELITE_CREDITS) * 1_000;

const EXTRA_CREDITS_MIN = 1_000;
const EXTRA_CREDITS_MAX = 25_000;
const EXTRA_CREDITS_STEP = 500;
const EXTRA_CREDITS_DEFAULT = 2_500;

const PHOTOS_PDFS_LINE = "Covered by your credit balance";
const SIGNATURE_LINE = "Unlimited — always free";
const CREDITS_EXPIRY_LINE = "Credits don't expire for 90 days";
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
    label: "Video, within your tier's included allowance",
    value: "Included — no credits used",
  },
  {
    label: "Video beyond your tier's allowance or over 60 seconds",
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

export function PricingSelector({ isLoggedIn }: PricingSelectorProps) {
  const router = useRouter();
  const [selectedTierIndex, setSelectedTierIndex] = useState(1);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("tier");
  const [extraCredits, setExtraCredits] = useState(EXTRA_CREDITS_DEFAULT);

  const selectedTier = pricingTiers[selectedTierIndex];
  const extraPrice = extraCredits * ELITE_PRICE_PER_CREDIT;

  function handleTierSelect(index: number) {
    setSelectionMode("tier");
    setSelectedTierIndex(index);
  }

  function handleExtraCreditsChange(value: number) {
    setSelectionMode("extra");
    setExtraCredits(value);
  }

  function handleContinue() {
    if (!isLoggedIn) {
      router.push("/login?next=/pricing");
      return;
    }

    if (selectionMode === "extra") {
      console.log("Selected additional credit pack", {
        additionalCredits: extraCredits,
        price: extraPrice,
        totalCredits: ELITE_CREDITS + extraCredits,
      });
      return;
    }

    console.log("Selected pricing tier", selectedTier);
  }

  const actionSummary =
    selectionMode === "extra"
      ? {
          detail: `${formatCredits(extraCredits)} additional credits beyond Elite`,
          key: `extra-${extraCredits}`,
          price: formatPrice(extraPrice),
          title: "Additional credits",
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
          aside="Credits power exports when you need more volume than the free tier."
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

        <div className="mt-8 grid gap-px landing-border border bg-beige/10 sm:grid-cols-2 lg:grid-cols-3">
          {pricingTiers.map((tier, index) => {
            const isSelected = selectionMode === "tier" && selectedTierIndex === index;

            return (
              <button
                aria-pressed={isSelected}
                className={`relative flex h-full flex-col bg-night-card p-5 text-left transition sm:p-6 ${
                  isSelected
                    ? "ring-2 ring-inset ring-signal"
                    : "hover:bg-night-elevated/80"
                }`}
                key={tier.label}
                onClick={() => handleTierSelect(index)}
                type="button"
              >
                {tier.popular ? (
                  <span className="absolute right-4 top-4 rounded-full bg-signal px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                    Popular
                  </span>
                ) : null}

                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sand">
                  {tier.label}
                </p>
                <p className="mt-3 text-3xl font-bold tracking-[-0.05em] text-beige lg:text-4xl">
                  {formatPrice(tier.price)}
                </p>
                <p className="mt-4 text-xl font-bold tracking-[-0.03em] text-beige lg:text-2xl">
                  {formatCredits(tier.credits)} credits
                </p>

                <ul className="mt-5 space-y-2.5">
                  <li className="flex items-start gap-2.5 text-sm text-beige-dim">
                    <ImageIcon
                      aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 text-sand"
                      strokeWidth={2}
                    />
                    <span>
                      <span className="font-medium text-beige">Photos & PDFs:</span>{" "}
                      {PHOTOS_PDFS_LINE}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-beige">
                    <Video
                      aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 text-sand"
                      strokeWidth={2}
                    />
                    <span>
                      <span className="font-semibold text-beige">Video:</span>{" "}
                      <span className="font-medium text-beige">{tier.videoLine}</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-beige-dim">
                    <PenLine
                      aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 text-sand"
                      strokeWidth={2}
                    />
                    <span>
                      <span className="font-medium text-beige">Signatures:</span>{" "}
                      {SIGNATURE_LINE}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-beige-dim">
                    <Clock
                      aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 text-sand"
                      strokeWidth={2}
                    />
                    <span>{CREDITS_EXPIRY_LINE}</span>
                  </li>
                </ul>

                <p className="mt-3 text-[11px] leading-5 text-beige-dim/80">
                  {VIDEO_FOOTNOTE}
                </p>

                <span
                  className={`mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
                    isSelected ? "text-signal" : "text-beige-dim"
                  }`}
                >
                  {isSelected ? "Selected" : "Select pack"}
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="landing-surface mt-8 rounded-[1.75rem] p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sand">
                Need more?
              </p>
              <p className="mt-2 max-w-xl text-sm leading-7 text-beige-dim">
                Add credits beyond Elite at the same per-credit rate (
                {formatPrice(PRICE_PER_THOUSAND_CREDITS)} per 1,000 credits).
              </p>
            </div>
            <p className="text-2xl font-bold tracking-[-0.04em] text-beige">
              {formatPrice(extraPrice)}
            </p>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-beige-dim">Additional credits</span>
              <span className="font-semibold text-beige">
                {formatCredits(extraCredits)}
              </span>
            </div>
            <input
              aria-label="Additional credits beyond Elite"
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-beige/10 accent-signal"
              max={EXTRA_CREDITS_MAX}
              min={EXTRA_CREDITS_MIN}
              onChange={(event) => handleExtraCreditsChange(Number(event.target.value))}
              step={EXTRA_CREDITS_STEP}
              type="range"
              value={extraCredits}
            />
            <div className="mt-2 flex justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-beige-dim">
              <span>{formatCredits(EXTRA_CREDITS_MIN)}</span>
              <span>{formatCredits(EXTRA_CREDITS_MAX)}</span>
            </div>
          </div>

          <p className="mt-4 text-sm text-beige-dim">
            <span className="font-medium text-beige">
              {formatCredits(ELITE_CREDITS + extraCredits)} credits total
            </span>{" "}
            if combined with Elite ({formatCredits(ELITE_CREDITS)}) +{" "}
            {formatCredits(extraCredits)} additional
          </p>

          <button
            className={`mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
              selectionMode === "extra" ? "text-signal" : "text-beige-dim hover:text-beige"
            }`}
            onClick={() => setSelectionMode("extra")}
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

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 grid gap-px landing-border border bg-beige/10 md:grid-cols-[minmax(0,1fr)_auto]"
          initial={{ opacity: 0, y: 12 }}
          key={actionSummary.key}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="flex flex-col justify-center gap-1 bg-night-card px-6 py-5 sm:px-8">
            <p className="text-sm font-semibold text-beige">
              {actionSummary.title} · {actionSummary.price}
            </p>
            <p className="text-sm text-beige-dim">{actionSummary.detail}</p>
            <p className="landing-soft mt-2 max-w-xl text-xs leading-6">
              Preview and watermark for free in the editor.{" "}
              <LandingHighlight>Credits apply on export</LandingHighlight> when you need
              more volume. {VIDEO_FOOTNOTE}.
            </p>
          </div>

          <div className="flex flex-col items-stretch justify-center gap-3 bg-night-card px-6 py-5 sm:min-w-[16rem] sm:px-8">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-signal px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-signal/25 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-signal focus:ring-offset-2 focus:ring-offset-night-card"
              onClick={handleContinue}
              type="button"
            >
              {isLoggedIn ? "Continue to payment" : "Log in to continue"}
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>

            {!isLoggedIn ? (
              <p className="text-center text-xs text-beige-dim">
                New here?{" "}
                <Link
                  className="font-semibold text-sand transition hover:text-beige"
                  href="/signup"
                >
                  Sign up free
                </Link>
              </p>
            ) : null}
          </div>
        </motion.div>

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
    </section>
  );
}
