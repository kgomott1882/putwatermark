"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BentoDotGrid, LandingHighlight, LandingSectionHeader } from "./landing/LandingPrimitives";
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
      "Type your text or drop in your logo to watermark your content in seconds.",
    href: "/watermark",
    image: "/Sonos.jpeg",
  },
  {
    title: "Batch export & PDF",
    description:
      "Upload a folder of photos or a multi-page PDF. Apply the same watermark to every image in one pass, preview every page, and export in your browser.",
    href: "/watermark",
    image: "/Batch%20Pics.jpeg",
  },
  {
    title: "Sign your documents",
    description:
      "Draw your signature or type it in a handwriting style, save it for reuse, and drag it onto any photo, video, or PDF — perfect for signing contracts and agreements.",
    href: "/watermark",
    image: "/Tablet_signing.jpeg",
  },
];

export function KeyFeatures() {
  return (
    <section className="landing-section">
      <div className={pageContainerClass}>
        <LandingSectionHeader
          index="002"
          lead={
            <>
              No bloat. Just the{" "}
              <LandingHighlight>tools that matter</LandingHighlight>.
            </>
          }
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
      className="group flex flex-col overflow-hidden rounded-[2rem] landing-surface"
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
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-beige md:text-[1.65rem]">
            {feature.title}
          </h3>
          <BentoDotGrid />
        </div>

        <p className="landing-muted mt-5 max-w-[18rem] text-sm leading-6 md:text-[0.95rem] md:leading-7">
          {feature.title === "Text & logo" ? (
            <>
              Type your text or drop in your{" "}
              <LandingHighlight>logo</LandingHighlight> to watermark your content in
              seconds.
            </>
          ) : feature.title === "Batch export & PDF" ? (
            <>
              Upload a folder of photos or a{" "}
              <LandingHighlight>multi-page PDF</LandingHighlight>. Apply the same
              watermark to every image in one pass, preview every page, and export in
              your browser.
            </>
          ) : (
            <>
              Draw your signature or type it in a handwriting style, save it for reuse,
              and drag it onto any{" "}
              <LandingHighlight>photo, video, or PDF</LandingHighlight> — perfect for
              signing contracts and agreements.
            </>
          )}
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
