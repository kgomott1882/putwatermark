"use client";

import { motion, type Variants } from "framer-motion";
import { Button } from "./Button";

const introItems = [
  "No signup. No subscription.",
  "Watermark your photos and videos, instantly.",
  "Upload, add your watermark, and download. No software, no signup, no subscription.",
  "Try it free",
  "No install · No account needed · Pay only when you're ready",
] as const;

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

export function Hero() {
  return (
    <section className="min-h-screen w-full overflow-hidden bg-paper px-6 py-10 text-ink sm:px-12 lg:px-20">
      <div className="flex min-h-[calc(100vh-5rem)] w-full flex-col items-center justify-center gap-14 text-center">
        <motion.div
          className="flex w-full flex-col items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            className="text-sm font-semibold uppercase tracking-[0.22em] text-steel"
            variants={itemVariants}
          >
            {introItems[0]}
          </motion.p>
          <motion.div className="mt-5 max-w-5xl" variants={itemVariants}>
            <h1 className="text-6xl font-bold tracking-[-0.06em] text-ink md:text-7xl lg:text-8xl">
              {introItems[1]}
            </h1>
            <p className="mt-5 text-xl font-medium leading-8 text-steel md:text-2xl">
              {introItems[2]}
            </p>
          </motion.div>
          <motion.div className="mt-8" variants={itemVariants}>
            <Button href="/watermark">{introItems[3]}</Button>
          </motion.div>
          <motion.p className="mt-5 text-sm text-steel" variants={itemVariants}>
            {introItems[4]}
          </motion.p>
        </motion.div>

        <DemoCard />
      </div>
    </section>
  );
}

function DemoCard() {
  return (
    <motion.div
      id="demo"
      className="w-full rounded-[2rem] border border-mist bg-paper p-3 shadow-2xl shadow-mist/60"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.52, duration: 0.7, ease: "easeOut" }}
    >
      <div className="overflow-hidden rounded-[1.5rem] border border-mist bg-white">
        <div className="flex h-11 items-center gap-2 border-b border-mist px-4">
          <span className="h-3 w-3 rounded-full bg-signal" />
          <span className="h-3 w-3 rounded-full bg-mist" />
          <span className="h-3 w-3 rounded-full bg-steel/60" />
        </div>

        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#f5f5f5] via-mist to-[#c3cbd0]">
          <div className="absolute inset-8 rounded-3xl border border-white/70 bg-white/20 shadow-inner" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.55),transparent_28%),radial-gradient(circle_at_76%_62%,rgba(255,255,255,0.35),transparent_30%)]" />

          <motion.div
            className="absolute -inset-16 grid rotate-[-24deg] grid-cols-3 content-center gap-8 text-center text-sm font-bold uppercase tracking-[0.28em] text-ink/28 sm:text-base"
            animate={{ opacity: [0, 0.8, 0.8, 0] }}
            transition={{
              duration: 4.2,
              ease: "easeInOut",
              repeat: Infinity,
              times: [0, 0.18, 0.58, 0.76],
              repeatDelay: 1.5,
            }}
          >
            {Array.from({ length: 18 }).map((_, index) => (
              <span key={index}>Sample Watermark</span>
            ))}
          </motion.div>

          <motion.div
            className="absolute bottom-5 right-5 rounded-full bg-paper/90 px-4 py-2 text-xs font-semibold text-ink shadow-sm ring-1 ring-mist"
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            transition={{
              duration: 4.2,
              ease: "easeInOut",
              repeat: Infinity,
              times: [0, 0.58, 0.76, 0.92, 1],
              repeatDelay: 1.5,
            }}
          >
            Clean preview
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
