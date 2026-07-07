"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BentoDotGrid, LandingSectionHeader } from "./landing/LandingPrimitives";
import { pageContainerClass } from "./pageContainer";

type Feature = {
  title: string;
  description: string;
  href: string;
  image: string;
};

const features: Feature[] = [
  {
    title: "Text & logo",
    description:
      "Type your text or drop in your logo. Tile it, position it, style it — see it update live.",
    href: "/watermark",
    image: "/Sonos.jpeg",
  },
  {
    title: "Batch export",
    description:
      "Upload a folder, not a file. Apply the same watermark to every photo in one pass.",
    href: "/watermark",
    image: "/Batch%20Pics.jpeg",
  },
  {
    title: "PDF support",
    description:
      "Upload a PDF, preview every page, and export a fully watermarked document in your browser.",
    href: "/watermark",
    image: "/Shoes.jpeg",
  },
];

export function KeyFeatures() {
  return (
    <section className="w-full border-t border-white/10 bg-ink py-24 text-paper">
      <div className={pageContainerClass}>
        <LandingSectionHeader
          aside="Every feature is designed to solve real watermarking problems, not add clutter."
          index="002"
          lead="No bloat. Just the tools that matter."
          title="Everything you need"
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard feature={feature} index={index} key={feature.title} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: Feature;
  index: number;
}) {
  return (
    <motion.article
      className="group flex flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-charcoal/40"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.08 }}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          alt=""
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
          src={feature.image}
        />
      </div>

      <div className="flex flex-col p-8 md:p-9">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-paper md:text-[1.65rem]">
            {feature.title}
          </h3>
          <BentoDotGrid />
        </div>

        <p className="mt-5 max-w-[18rem] text-sm leading-6 text-paper/70 md:text-[0.95rem] md:leading-7">
          {feature.description}
        </p>
        <Link
          aria-label={`Open ${feature.title}`}
          className="mt-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-signal text-ink transition hover:brightness-110"
          href={feature.href}
        >
          <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
        </Link>
      </div>
    </motion.article>
  );
}
