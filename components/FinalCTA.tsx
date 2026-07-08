"use client";

import { motion } from "framer-motion";
import { LandingCta, LandingHighlight, LandingSectionHeader } from "./landing/LandingPrimitives";
import { pageContainerClass } from "./pageContainer";

export function FinalCTA() {
  return (
    <section className="landing-section">
      <motion.div
        className={pageContainerClass}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
        <LandingSectionHeader
          index="005"
          lead={
            <>
              Try it. See the result. <LandingHighlight>Then decide.</LandingHighlight>
            </>
          }
          title="Ready when you are"
        />

        <div className="mt-12 grid gap-px landing-border border bg-beige/10 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="bg-night-card p-8">
            <p className="landing-muted text-sm leading-7">
              Upload a file, add your watermark, and export in minutes.{" "}
              <LandingHighlight>Upgrade only if you need more volume</LandingHighlight> or
              advanced options.
            </p>
          </div>
          <div className="flex items-center justify-center bg-night-card p-8">
            <LandingCta href="/watermark">Get started free</LandingCta>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
