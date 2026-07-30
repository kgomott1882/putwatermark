"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { LandingHighlight, LandingSectionHeader } from "./landing/LandingPrimitives";
import { pageContainerClass } from "./pageContainer";

type FaqItem = {
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    question: "What is PutWatermark?",
    answer:
      "PutWatermark is a browser-based tool for watermarking photos, PDFs, and videos — free to try, with no signup required. It helps protect your work from unauthorized use by letting you add text or logo watermarks as a single mark or tiled across the whole file. On PDFs, the Sign & Fill tool also lets you add signatures, initials, and fill-in text fields; exporting those pages uses credits at the same per-page rate as other PDF exports. No software to install and no upfront payment to get started.",
  },
  {
    question: "Do I need to create an account to use PutWatermark?",
    answer:
      "No signup is required to try the editor — upload, watermark, and preview freely. Create a free account when you're ready to export; your draft is saved for 48 hours if you sign up mid-session.",
  },
  {
    question: "What file types are supported?",
    answer:
      "Photos (JPG, PNG, WebP), PDFs, and videos (MP4, MOV, WebM). Upload one PDF or one video at a time, or select multiple images for batch export.",
  },
  {
    question: "Is there a subscription?",
    answer:
      "No subscriptions. PutWatermark uses pay-as-you-go credits only — buy a credit pack when you need it, with no recurring billing.",
  },
  {
    question: "Do you store my files?",
    answer:
      "Photos and PDFs are processed locally in your browser and are never uploaded to our servers. Large videos that exceed in-browser limits are routed to server-side processing; those files are deleted immediately after processing completes.",
  },
  {
    question: "Can I watermark multiple files at once?",
    answer:
      "Yes. Batch processing for images lets you upload several photos, apply the same watermark settings, and export them together as a ZIP file.",
  },
  {
    question: "What can I customize about my watermark?",
    answer:
      "Use text or a logo, position it anywhere (including free-drag), and adjust opacity, font, and styling. You can also tile watermarks with adjustable density, angle, and gap, plus use templates for quick styling.",
  },
  {
    question: "Does watermarking reduce my file's quality?",
    answer:
      "No. Exports are generated at full resolution. PDF exports preserve selectable, searchable text — the watermark is added as an overlay without flattening your document.",
  },
  {
    question: "What happens to large videos?",
    answer:
      "Videos under 60 seconds and 1080p process instantly in your browser. Longer or larger videos (up to 250MB or 10 minutes) upload with resumable transfers and are processed on our servers.",
  },
];

function FaqToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <span className="relative flex h-5 w-6 shrink-0 flex-col items-end justify-center gap-1.5">
      <motion.span
        animate={{ y: isOpen ? 3 : 0 }}
        className="block h-0.5 w-5 rounded-full bg-signal"
        transition={{ duration: 0.22, ease: "easeOut" }}
      />
      <motion.span
        animate={{ opacity: isOpen ? 0 : 1, y: isOpen ? -3 : 0 }}
        className="block h-0.5 w-5 rounded-full bg-signal"
        transition={{ duration: 0.22, ease: "easeOut" }}
      />
    </span>
  );
}

function FaqBadge() {
  return (
    <div className="absolute bottom-6 right-6 h-28 w-28">
      <div className="absolute inset-0 rounded-full bg-signal shadow-[0_0_40px_rgba(217,119,87,0.35)]" />
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full animate-[spin_18s_linear_infinite]"
        viewBox="0 0 100 100"
      >
        <defs>
          <path
            d="M 50,50 m -34,0 a 34,34 0 1,1 68,0 a 34,34 0 1,1 -68,0"
            id="faq-badge-circle"
          />
        </defs>
        <text
          fill="white"
          fontSize="7.5"
          fontWeight="600"
          letterSpacing="2.5"
        >
          <textPath href="#faq-badge-circle" startOffset="0">
            upload · watermark · export · ship faster ·
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="h-3 w-3 rounded-full bg-beige" />
      </div>
    </div>
  );
}

export function FAQ() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="landing-section">
      <div className={pageContainerClass}>
        <LandingSectionHeader
          index="004"
          lead={
            <>
              Simple explanations to help you{" "}
              <LandingHighlight>get started and move faster</LandingHighlight>.
            </>
          }
          title="Questions & answers"
        />

        <div className="mt-16 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="landing-surface overflow-hidden rounded-2xl">
            {faqItems.map(({ question, answer }, index) => {
              const isOpen = openIndex === index;
              const panelId = `${baseId}-panel-${index}`;
              const buttonId = `${baseId}-button-${index}`;

              return (
                <div
                  className="landing-border border-b last:border-b-0"
                  key={question}
                >
                  <button
                    aria-controls={panelId}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-8 px-6 py-5 text-left transition hover:bg-white/[0.03] md:px-8 md:py-6"
                    id={buttonId}
                    onClick={() =>
                      setOpenIndex((current) => (current === index ? null : index))
                    }
                    type="button"
                  >
                    <span className="text-base font-medium leading-7 text-beige md:text-[1.05rem]">
                      {question}
                    </span>
                    <FaqToggleIcon isOpen={isOpen} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        animate={{ height: "auto", opacity: 1 }}
                        aria-labelledby={buttonId}
                        exit={{ height: 0, opacity: 0 }}
                        id={panelId}
                        initial={{ height: 0, opacity: 0 }}
                        role="region"
                        transition={{ duration: 0.28, ease: "easeOut" }}
                      >
                        <div className="overflow-hidden px-6 pb-6 md:px-8 md:pb-7">
                          <p className="landing-muted max-w-2xl text-sm leading-7 md:text-[0.95rem]">
                            {answer}
                          </p>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-4">
            <div className="relative min-h-[18rem] overflow-hidden rounded-2xl landing-border border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Team collaborating around laptops"
                className="absolute inset-0 h-full w-full object-cover object-center grayscale"
                decoding="async"
                src="/people_working_in_office.jpeg"
              />
              <FaqBadge />
            </div>

            <div className="landing-surface flex flex-1 flex-col justify-between rounded-2xl p-6 md:p-8">
              <div>
                <h3 className="text-2xl font-bold tracking-[-0.03em] text-beige md:text-[1.75rem]">
                  You still have questions?
                </h3>
                <p className="landing-muted mt-4 max-w-md text-sm leading-7 md:text-[0.95rem]">
                  Every workflow is different. Start with a{" "}
                  <LandingHighlight>free test export</LandingHighlight>, then buy credits
                  only when you need more volume or paid features.
                </p>
                <p className="landing-muted mt-4 max-w-md text-sm leading-7 md:text-[0.95rem]">
                  Still stuck? Contact us at{" "}
                  <a
                    className="font-medium text-sand transition hover:text-signal"
                    href="mailto:hello@putwatermark.com"
                  >
                    hello@putwatermark.com
                  </a>
                </p>
              </div>

              <Link
                className="group mt-8 inline-flex items-center gap-4 self-start"
                href="/watermark"
              >
                <span className="text-sm font-medium text-sand transition group-hover:text-signal">
                  Try it free
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal text-ink transition group-hover:brightness-110">
                  <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
