"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function LandingStarfield() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(217,119,87,0.14),transparent_42%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.06),transparent_35%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.55)_0.6px,transparent_0.6px)] [background-size:24px_24px]" />
    </div>
  );
}

export function LandingSectionHeader({
  aside,
  index,
  lead,
  title,
}: {
  aside?: string;
  index: string;
  lead?: string;
  title: string;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,14rem)] lg:items-end">
      <div className="flex items-start gap-4">
        <div className="h-20 w-px bg-signal" />
        <div>
          <p className="text-sm font-medium text-paper/50">{index}</p>
          <p className="mt-1 text-sm font-semibold tracking-[0.08em] text-signal">
            PutWatermark
          </p>
        </div>
      </div>
      <div>
        <h2 className="text-4xl font-bold tracking-[-0.05em] text-paper/90 md:text-6xl">
          {title}
        </h2>
        {lead ? (
          <p className="mt-4 max-w-2xl text-lg leading-8 text-paper/55">{lead}</p>
        ) : null}
      </div>
      {aside ? (
        <p className="text-sm leading-6 text-battleship lg:text-right">{aside}</p>
      ) : null}
    </div>
  );
}

export function BentoCard({
  children,
  className = "",
  highlighted = false,
}: {
  children: ReactNode;
  className?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`border border-white/10 p-6 md:p-8 ${
        highlighted ? "bg-signal text-paper" : "bg-charcoal/70 text-paper"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function LandingCta({
  children,
  className = "",
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <Link
      className={`group inline-flex items-center gap-3 ${className}`}
      href={href}
    >
      <span className="rounded-xl bg-signal px-6 py-3 text-sm font-semibold text-white transition group-hover:brightness-110">
        {children}
      </span>
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-signal text-white transition group-hover:brightness-110">
        <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
      </span>
    </Link>
  );
}

export function LandingGhostCta({
  children,
  className = "",
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <Link
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-charcoal/80 px-4 py-2 text-sm font-medium text-paper/80 transition hover:border-signal/40 hover:text-paper ${className}`}
      href={href}
    >
      {children}
      <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
    </Link>
  );
}

export function HeroOrbs() {
  return (
    <div aria-hidden className="relative mx-auto h-[22rem] w-full max-w-md lg:mx-0 lg:h-[28rem] lg:max-w-none">
      <div className="absolute left-[18%] top-[18%] h-28 w-28 rotate-12 rounded-[2rem] border border-signal/30 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),transparent_55%),linear-gradient(145deg,rgba(217,119,87,0.55),rgba(217,119,87,0.15))] shadow-[0_0_80px_rgba(217,119,87,0.25)]" />
      <div className="absolute right-[8%] top-[8%] h-36 w-36 -rotate-6 rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.12),transparent_60%),linear-gradient(160deg,rgba(76,92,104,0.9),rgba(54,69,79,0.55))]" />
      <div className="absolute bottom-[10%] left-[34%] h-32 w-32 rotate-[18deg] rounded-[2rem] border border-signal/20 bg-[radial-gradient(circle_at_40%_40%,rgba(255,255,255,0.14),transparent_58%),linear-gradient(145deg,rgba(217,119,87,0.35),rgba(54,69,79,0.75))]" />
      <div className="absolute bottom-[22%] right-[18%] h-20 w-20 rounded-2xl border border-white/10 bg-payne/80" />
    </div>
  );
}

export function DotGrid({ active = 0 }: { active?: number }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 15 }).map((_, index) => (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            index === active ? "bg-signal" : "bg-white/15"
          }`}
          key={index}
        />
      ))}
    </div>
  );
}

export function BentoDotGrid() {
  return (
    <div aria-hidden className="grid shrink-0 grid-cols-3 gap-1.5">
      {Array.from({ length: 9 }).map((_, index) => (
        <span className="h-1.5 w-1.5 rounded-full bg-paper/70" key={index} />
      ))}
    </div>
  );
}
