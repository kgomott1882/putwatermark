"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

type Feature = {
  title: string;
  description: string;
  Mockup: () => ReactNode;
};

const features: Feature[] = [
  {
    title: "Text & logo watermarks",
    description:
      "Type your text or drop in your logo. Tile it, position it, style it — see it update live.",
    Mockup: WatermarkMockup,
  },
  {
    title: "Batch, not one at a time",
    description: "Upload a folder, not a file. Watermark everything in one pass.",
    Mockup: BatchMockup,
  },
  {
    title: "Background removal",
    description:
      "Strip the background from any photo in seconds. No editing skills required.",
    Mockup: BackgroundRemovalMockup,
  },
];

export function KeyFeatures() {
  return (
    <section className="w-full bg-paper px-6 py-24 text-ink sm:px-12 lg:px-20">
      <div className="w-full">
        <div className="w-full text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-battleship">
            No bloat. Just the tools that matter.
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink md:text-6xl">
            Everything you need
          </h2>
        </div>

        <div className="mt-20 space-y-24">
          {features.map(({ title, description, Mockup }, index) => {
            const imageFirst = index !== 1;

            return (
              <motion.div
                key={title}
                className="grid w-full items-center gap-10 md:grid-cols-2 md:gap-16 lg:gap-24"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
              >
                <div className={imageFirst ? "md:order-1" : "md:order-2"}>
                  <BrowserFrame>
                    <Mockup />
                  </BrowserFrame>
                </div>
                <div className={imageFirst ? "md:order-2" : "md:order-1"}>
                  <h3 className="text-3xl font-bold tracking-[-0.03em] text-ink">
                    {title}
                  </h3>
                  <p className="mt-4 text-lg leading-8 text-battleship">
                    {description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-platinum bg-paper p-3 shadow-2xl shadow-platinum/60">
      <div className="overflow-hidden rounded-[1.5rem] border border-platinum bg-white">
        <div className="flex h-11 items-center gap-2 border-b border-platinum px-4">
          <span className="h-3 w-3 rounded-full bg-signal" />
          <span className="h-3 w-3 rounded-full bg-platinum" />
          <span className="h-3 w-3 rounded-full bg-battleship/60" />
        </div>
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#f6f6f6] via-platinum to-[#c9d1d6]">
          {children}
        </div>
      </div>
    </div>
  );
}

function WatermarkMockup() {
  return (
    <>
      <div className="absolute inset-8 rounded-3xl bg-white/25 ring-1 ring-white/70" />
      <div className="absolute left-10 top-10 h-16 w-16 rounded-2xl border border-white/70 bg-paper/70" />
      <div className="absolute inset-0 grid rotate-[-24deg] grid-cols-3 content-center gap-6 px-6 text-center text-xs font-bold uppercase tracking-[0.24em] text-ink/25 sm:text-sm">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index}>Watermark</span>
        ))}
      </div>
    </>
  );
}

function BatchMockup() {
  return (
    <div className="grid h-full grid-cols-3 gap-4 p-8">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-white/70 bg-paper/55 shadow-sm"
        >
          <div className="m-3 h-2 rounded-full bg-battleship/25" />
          <div className="mx-3 h-14 rounded-xl bg-platinum/70" />
        </div>
      ))}
    </div>
  );
}

function BackgroundRemovalMockup() {
  return (
    <>
      <div className="absolute inset-8 rounded-3xl bg-[linear-gradient(45deg,rgba(255,255,255,0.45)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.45)_75%),linear-gradient(45deg,rgba(255,255,255,0.45)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.45)_75%)] bg-[length:32px_32px] bg-[position:0_0,16px_16px] ring-1 ring-white/70" />
      <div className="absolute left-1/2 top-1/2 h-44 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-signal/70 bg-paper/50" />
      <div className="absolute bottom-16 left-1/2 h-20 w-56 -translate-x-1/2 rounded-[50%] border-2 border-dashed border-signal/70 bg-paper/45" />
      <div className="absolute right-8 top-8 rounded-full bg-paper/85 px-4 py-2 text-xs font-semibold text-ink shadow-sm ring-1 ring-platinum">
        Background removed
      </div>
    </>
  );
}
