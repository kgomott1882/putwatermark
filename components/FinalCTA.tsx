"use client";

import { motion } from "framer-motion";
import { Button } from "./Button";
import { pageContainerClass } from "./pageContainer";

export function FinalCTA() {
  return (
    <section className="w-full bg-charcoal py-24 text-white">
      <motion.div
        className={`${pageContainerClass} flex flex-col items-center text-center`}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
        <h2 className="text-4xl font-bold tracking-[-0.04em] md:text-6xl">
          Try it. See the result. Then decide.
        </h2>
        <p className="mt-5 text-lg text-white/70">No signup required to start.</p>
        <Button className="mt-8" href="/watermark">
          Get started free
        </Button>
      </motion.div>
    </section>
  );
}
