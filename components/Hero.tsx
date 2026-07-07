"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { pageContainerClass } from "./pageContainer";

const features = [
  "Text & logo marks",
  "Batch image export",
  "PDF page preview",
  "Video watermarking",
] as const;

const formats = ["JPG / PNG / WebP", "PDF documents", "MP4 / MOV / WebM"] as const;

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

export function Hero() {
  return (
    <section className="relative w-full bg-ink text-paper">
      <div className="grid min-h-[calc(100svh-4rem)] lg:min-h-screen lg:grid-cols-2">
        <div
          className={`${pageContainerClass} flex flex-col justify-between py-10 lg:py-14 lg:pl-[max(1.5rem,10vw)] lg:pr-10 xl:pl-[12.5vw]`}
        >
          <motion.div
            animate="visible"
            className="flex flex-1 flex-col"
            initial="hidden"
            variants={containerVariants}
          >
            <motion.h1
              className="max-w-xl text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.05em] text-paper"
              variants={itemVariants}
            >
              Watermark any photo, PDF, or video in seconds.
            </motion.h1>

            <motion.p
              className="mt-10 max-w-md text-[10px] uppercase leading-[1.9] tracking-[0.18em] text-battleship md:text-[11px]"
              variants={itemVariants}
            >
              Upload, add your watermark, and download. No software, no signup,
              no subscription.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col items-start gap-6"
              variants={itemVariants}
            >
              <Link
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/70 transition hover:text-signal"
                href="/pricing"
              >
                View pricing
              </Link>

              <Link
                className="group inline-flex items-center gap-3 rounded-full bg-signal px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-signal/25 transition hover:brightness-110"
                href="/watermark"
              >
                Upload now
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
                </span>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            animate="visible"
            className="mt-16 grid grid-cols-2 gap-10 border-t border-white/10 pt-10 lg:mt-0"
            initial="hidden"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-battleship">
                Features
              </p>
              <ul className="mt-4 space-y-2.5">
                {features.map((item) => (
                  <li
                    className="text-[11px] font-medium uppercase tracking-[0.12em] text-paper/85"
                    key={item}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div variants={itemVariants}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-battleship">
                Formats
              </p>
              <ul className="mt-4 space-y-2.5">
                {formats.map((item) => (
                  <li
                    className="text-[11px] font-medium uppercase tracking-[0.12em] text-paper/85"
                    key={item}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>

        <div className="relative min-h-[24rem] lg:min-h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Hero"
            className="absolute inset-0 h-full w-full object-cover object-top"
            decoding="async"
            src="/Hero%20Lady.png"
          />
        </div>
      </div>
    </section>
  );
}
