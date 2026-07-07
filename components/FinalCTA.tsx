"use client";

import { motion } from "framer-motion";
import { LandingCta, LandingSectionHeader } from "./landing/LandingPrimitives";
import { pageContainerClass } from "./pageContainer";

export function FinalCTA() {
  return (
    <section className="w-full border-t border-white/10 bg-ink py-24 text-paper">
      <motion.div
        className={pageContainerClass}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
        <LandingSectionHeader
          aside="No signup required to start."
          index="005"
          lead="Try it. See the result. Then decide."
          title="Ready when you are"
        />

        <div className="mt-12 grid gap-px border border-white/10 bg-white/10 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="bg-charcoal/70 p-8">
            <p className="text-sm leading-7 text-battleship">
              Upload a file, add your watermark, and export in minutes. Upgrade only if
              you need more volume or advanced options.
            </p>
          </div>
          <div className="flex items-center justify-center bg-charcoal/70 p-8">
            <LandingCta href="/watermark">Get started free</LandingCta>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
