"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, Smartphone, Video, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { LandingSectionHeader } from "./landing/LandingPrimitives";
import { pageContainerClass } from "./pageContainer";

type Capability = {
  title: string;
  description: string;
  Icon: LucideIcon;
};

const capabilities: Capability[] = [
  {
    title: "Photos, PDFs, and video",
    description:
      "Watermark JPG, PNG, WebP, PDF, MP4, MOV, and WEBM files directly in your browser.",
    Icon: Video,
  },
  {
    title: "Any device",
    description: "Works on desktop, tablet, or phone. No app to install.",
    Icon: Smartphone,
  },
  {
    title: "Instant, not queued",
    description: "Most files process in seconds, right in your browser.",
    Icon: Zap,
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: "easeOut",
    },
  },
};

export function Capabilities() {
  return (
    <section className="w-full border-t border-white/10 bg-ink py-24 text-paper">
      <div className={pageContainerClass}>
        <LandingSectionHeader
          aside="Future-proof formats that scale from quick edits to heavier workloads."
          index="003"
          lead="Works everywhere you do — desktop, tablet, or phone."
          title="Works everywhere"
        />

        <motion.div
          className="mt-16 grid gap-px border border-white/10 bg-white/10 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {capabilities.map(({ title, description, Icon }, index) => (
            <motion.div
              className={`p-8 ${
                index === 0 ? "bg-signal text-paper" : "bg-charcoal/70 text-paper"
              }`}
              key={title}
              variants={itemVariants}
            >
              <div className="flex items-start justify-between">
                {index === 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-paper/80" strokeWidth={2} />
                ) : (
                  <span className="text-3xl font-bold tracking-[-0.08em] text-paper/25">
                    0{index + 1}
                  </span>
                )}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                    index === 0
                      ? "border-paper/20 bg-paper/10"
                      : "border-white/10 bg-ink/40 text-signal"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </div>
              </div>
              <h3 className="mt-10 text-2xl font-bold">{title}</h3>
              <p
                className={`mt-3 leading-7 ${
                  index === 0 ? "text-paper/85" : "text-battleship"
                }`}
              >
                {description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-8 flex flex-col gap-4 border border-white/10 bg-charcoal/70 p-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-lg font-semibold leading-8 text-paper/80">
            Real-time processing in the browser — no uploads to a queue, no waiting for
            renders.
          </p>
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-paper/70 transition hover:text-signal"
            href="/watermark"
          >
            Try it now
            <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}
