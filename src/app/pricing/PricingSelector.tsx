"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Button } from "../../../components/Button";

type CreditTier = {
  price: string;
  credits: number;
  photos: string;
};

const creditTiers: CreditTier[] = [
  {
    price: "$3.99",
    credits: 500000,
    photos: "~10 photos",
  },
  {
    price: "$9.99",
    credits: 1350000,
    photos: "~27 photos",
  },
  {
    price: "$19.99",
    credits: 2900000,
    photos: "~58 photos",
  },
  {
    price: "$39.99",
    credits: 6400000,
    photos: "~128 photos",
  },
];

const numberFormatter = new Intl.NumberFormat("en-US");

export function PricingSelector() {
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const selectedTier = creditTiers[selectedTierIndex];

  function handleContinue() {
    console.log("Selected credit tier", selectedTier);
  }

  return (
    <motion.section
      className="w-full max-w-md rounded-[2rem] border border-mist bg-paper p-8 text-center shadow-2xl shadow-mist/60 sm:p-10"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-steel">
        Buy credits
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink">
        Choose your pack
      </h1>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTier.price}
          className="mt-8"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <p className="text-6xl font-bold tracking-[-0.06em] text-ink">
            {selectedTier.price}
          </p>
          <p className="mt-4 text-xl font-semibold text-ink">
            {numberFormatter.format(selectedTier.credits)} credits
          </p>
          <p className="mt-2 text-sm text-steel">{selectedTier.photos}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-10">
        <input
          aria-label="Select credit package"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-mist accent-signal"
          max={creditTiers.length - 1}
          min={0}
          onChange={(event) => setSelectedTierIndex(Number(event.target.value))}
          step={1}
          type="range"
          value={selectedTierIndex}
        />
        <div className="mt-4 flex justify-between text-xs font-semibold text-steel">
          {creditTiers.map((tier, index) => (
            <button
              className={`transition hover:text-ink ${
                selectedTierIndex === index ? "text-ink" : ""
              }`}
              key={tier.price}
              onClick={() => setSelectedTierIndex(index)}
              type="button"
            >
              {tier.price}
            </button>
          ))}
        </div>
      </div>

      <Button
        as="button"
        className="mt-10 w-full justify-center"
        onClick={handleContinue}
        type="button"
      >
        Continue to payment
      </Button>
    </motion.section>
  );
}
