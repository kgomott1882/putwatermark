"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type AuthPageCardProps = {
  children: ReactNode;
  kicker: string;
  lead?: ReactNode;
  title: string;
};

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">{children}</main>
  );
}

export function AuthPageCard({ children, kicker, lead, title }: AuthPageCardProps) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="auth-card"
      initial={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="text-center">
        <p className="auth-kicker">{kicker}</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink">
          {title}
        </h1>
        {lead ? (
          <p className="mt-4 text-sm leading-6 text-battleship">{lead}</p>
        ) : null}
      </div>
      {children}
    </motion.section>
  );
}
