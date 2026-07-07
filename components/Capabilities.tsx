"use client";

import { motion, type Variants } from "framer-motion";
import { Smartphone, Video, Zap, type LucideIcon } from "lucide-react";

type Capability = {
  title: string;
  description: string;
  Icon: LucideIcon;
};

const capabilities: Capability[] = [
  {
    title: "Video, not just photos",
    description: "Watermark clips directly in your browser.",
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
    <section className="w-full bg-platinum px-6 py-24 text-ink sm:px-12 lg:px-20">
      <div className="w-full">
        <div className="w-full text-center">
          <h2 className="text-4xl font-bold tracking-[-0.04em] text-ink md:text-6xl">
            Works everywhere
          </h2>
        </div>

        <motion.div
          className="mt-14 grid w-full gap-10 text-center md:grid-cols-3 lg:gap-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {capabilities.map(({ title, description, Icon }) => (
            <motion.div
              key={title}
              className="flex flex-col items-center"
              variants={itemVariants}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-paper text-signal shadow-lg shadow-ink/5">
                <Icon aria-hidden="true" className="h-7 w-7" />
              </div>
              <h3 className="mt-6 text-2xl font-bold text-ink">{title}</h3>
              <p className="mt-3 max-w-xs leading-7 text-battleship">{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
