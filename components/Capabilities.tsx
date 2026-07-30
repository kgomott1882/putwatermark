"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Smartphone, Video, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LandingHighlight, LandingSectionHeader } from "./landing/LandingPrimitives";
import { pageContainerClass } from "./pageContainer";

type Capability = {
  title: string;
  description: ReactNode;
  Icon: LucideIcon;
};

const capabilities: Capability[] = [
  {
    title: "Photos, PDFs, and video",
    description: (
      <>
        Watermark <LandingHighlight>JPG, PNG, WebP, PDF, MP4, MOV, and WEBM</LandingHighlight>{" "}
        files directly in your browser.
      </>
    ),
    Icon: Video,
  },
  {
    title: "Any device",
    description: (
      <>
        Works on <LandingHighlight>desktop, tablet, or phone</LandingHighlight>. No app to
        install.
      </>
    ),
    Icon: Smartphone,
  },
  {
    title: "Instant, not queued",
    description: (
      <>
        Most files process in seconds,{" "}
        <LandingHighlight>right in your browser</LandingHighlight>.
      </>
    ),
    Icon: Zap,
  },
];

const containerVariants = {
  hidden: {},
  visible: {},
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export function Capabilities() {
  return (
    <section className="landing-section">
      <div className={pageContainerClass}>
        <LandingSectionHeader
          index="003"
          lead={
            <>
              Works everywhere you do —{" "}
              <LandingHighlight>desktop, tablet, or phone</LandingHighlight>.
            </>
          }
          title="Works everywhere"
        />

        <motion.div
          className="mt-16 grid gap-px landing-border border bg-beige/10 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ staggerChildren: 0.15 }}
        >
          {capabilities.map(({ title, description, Icon }, index) => (
            <motion.div
              className={`p-8 ${
                index === 0 ? "bg-signal text-white" : "bg-night-card text-beige"
              }`}
              key={title}
              variants={itemVariants}
              transition={{ duration: 0.65, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between">
                {index === 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-white/80" strokeWidth={2} />
                ) : (
                  <span className="landing-soft text-3xl font-bold tracking-[-0.08em]">
                    0{index + 1}
                  </span>
                )}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                    index === 0
                      ? "border-white/20 bg-white/10"
                      : "landing-border border bg-night-elevated text-sand"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </div>
              </div>
              <h3
                className={`mt-10 text-2xl font-bold ${
                  index === 0 ? "text-white" : "text-beige"
                }`}
              >
                {title}
              </h3>
              <p
                className={`mt-3 leading-7 ${
                  index === 0 ? "text-white/85" : "landing-muted"
                }`}
              >
                {description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <div className="landing-surface mt-8 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-lg font-semibold leading-8 text-beige">
            <LandingHighlight>Real-time processing</LandingHighlight> in the browser — no
            uploads to a queue, no waiting for renders.
          </p>
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-sand transition hover:text-signal"
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
