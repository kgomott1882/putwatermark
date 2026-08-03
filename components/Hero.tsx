"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { LandingHighlight } from "./landing/LandingPrimitives";
import { pageContainerClass } from "./pageContainer";

const features = [
  "Text & logo marks",
  "Batch export (photos + multi page PDF)",
  "Video editor (trim, blur, merge, captions)",
  "Sign & fill PDFs",
  "Merge & compress PDF",
] as const;

type FormatItem = {
  label: string;
  note?: string;
};

const formats: readonly FormatItem[] = [
  { label: "JPG / PNG / WebP" },
  { label: "PDF documents" },
  {
    label: "MP4 / MOV / WebM",
    note: "Videos up to 60 minutes supported",
  },
];

const containerVariants = {
  hidden: {},
  visible: {},
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export function Hero() {
  return (
    <section className="relative w-full">
      <div className={`${pageContainerClass} py-10 lg:py-14`}>
        <div className="grid gap-y-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-x-8 lg:gap-y-12 xl:gap-x-10">
          <motion.div
            animate="visible"
            className="lg:col-start-1 lg:row-start-1"
            initial="hidden"
            variants={containerVariants}
            transition={{ staggerChildren: 0.07 }}
          >
            <motion.h1
              className="max-w-none text-balance text-[clamp(3rem,6.2vw,5.75rem)] font-bold leading-[0.92] tracking-[-0.05em] text-beige xl:text-[clamp(3.25rem,4.8vw,6rem)]"
              variants={itemVariants}
            >
              Watermark any{" "}
              <LandingHighlight>photo, PDF, or video</LandingHighlight> in seconds.
            </motion.h1>

            <motion.p
              className="landing-muted mt-8 max-w-xl text-xs uppercase leading-[1.85] tracking-[0.16em] md:mt-10 md:text-sm md:leading-8"
              variants={itemVariants}
            >
              Upload, add your watermark, and download.{" "}
              <LandingHighlight>No software, no subscription. Create a free account to export.</LandingHighlight>
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col items-start gap-5 md:mt-10 md:flex-row md:flex-wrap md:items-center md:gap-x-10 md:gap-y-4"
              variants={itemVariants}
            >
              <Link className="landing-cta-label text-xs font-semibold uppercase tracking-[0.16em] md:text-sm" href="/pricing">
                View pricing
              </Link>

              <Link
                className="group inline-flex items-center gap-3 rounded-full bg-signal px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-signal/25 transition hover:brightness-110 md:px-7 md:py-4 md:text-base"
                href="/watermark"
              >
                Upload now
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-night text-beige">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
                </span>
              </Link>
            </motion.div>
          </motion.div>

          <div className="relative min-h-[22rem] overflow-hidden rounded-[1.75rem] landing-border border lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:min-h-0 lg:self-stretch">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Portrait photo for the PutWatermark landing page hero"
              className="absolute inset-0 h-full w-full object-cover object-[50%_24%]"
              decoding="async"
              src="/Lady%20Black.png"
            />
          </div>

          <motion.div
            animate="visible"
            className="grid grid-cols-2 gap-8 landing-border border-t pt-8 md:gap-10 md:pt-10 lg:col-start-1 lg:row-start-2 lg:pt-12"
            initial="hidden"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sand">
                Features
              </p>
              <ul className="mt-4 space-y-3">
                {features.map((item) => (
                  <li
                    className="text-xs font-medium uppercase tracking-[0.12em] text-beige md:text-[13px]"
                    key={item}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div variants={itemVariants}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sand">
                Formats
              </p>
              <ul className="mt-4 space-y-3">
                {formats.map((item) => (
                  <li key={item.label}>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-beige md:text-[13px]">
                      {item.label}
                    </p>
                    {item.note ? (
                      <p className="mt-1 text-[10px] font-medium normal-case tracking-[0.04em] text-beige-dim md:text-[11px]">
                        {item.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
