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
    title: "More than a watermark",
    description:
      "Crop, resize, rotate, and apply effects, or use the blur brush to hide sensitive details in any photo before you export.",
    href: "/watermark",
    image: "/Photo%20editor%20tool.png",
  },
  {
    title: "A real video editor, not just a stamp",
    description:
      "Trim clips, blur sensitive footage with a mosaic brush, merge multiple videos into one, add captions, and control exactly when your watermark appears, all in your browser. Long videos up to 60 minutes are supported too.",
    href: "/watermark",
    image: "/Video%20Editor.png",
  },
  {
    title: "Sign & fill documents",
    description:
      "Draw or type a signature, add fill in text on PDFs, and save placements for reuse. Perfect for signing contracts and filling in forms.",
    href: "/watermark",
    image: "/Tablet_signing.jpeg",
  },
  {
    title: "Batch export & PDF",
    description:
      "Upload a folder of photos or a multi page PDF. Apply the same watermark to every image in one pass, preview every page, and export in your browser.",
    href: "/watermark",
    image: "/Batch%20Pics.jpeg",
  },
  {
    title: "Merge & compress PDFs",
    description:
      "Combine multiple PDFs into one file or shrink oversized documents down to size. No separate app needed.",
    href: "/watermark",
    image: "/PDF%20Merge.png",
  },
  {
    title: "Text & logo",
    description:
      "Type your text or drop in your logo to watermark your content in seconds.",
    href: "/watermark",
    image: "/Sonos.jpeg",
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

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              <LandingHighlight>multi page PDF</LandingHighlight>. Apply the same
              watermark to every image in one pass, preview every page, and export in
              your browser.
            </>
          ) : feature.title === "Sign & fill documents" ? (
            <>
              Draw or type a signature, add fill in text on PDFs, and save
              placements for reuse. Perfect for signing contracts and filling in
              forms.
            </>
          ) : feature.title === "A real video editor, not just a stamp" ? (
            <>
              Trim clips, blur sensitive footage, merge multiple videos, add
              captions, and control when your{" "}
              <LandingHighlight>watermark appears</LandingHighlight>, all in your
              browser. Long videos up to 60 minutes are supported too.
            </>
          ) : feature.title === "Merge & compress PDFs" ? (
            <>
              Combine multiple PDFs into one file or{" "}
              <LandingHighlight>shrink oversized documents</LandingHighlight> down
              to size. No separate app needed.
            </>
          ) : feature.title === "More than a watermark" ? (
            <>
              Crop, resize, rotate, and apply effects, or use the{" "}
              <LandingHighlight>blur brush</LandingHighlight> to hide sensitive
              details in any photo before you export.
            </>
          ) : (
            feature.description
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
