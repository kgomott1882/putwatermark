"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { pageContainerClass } from "./pageContainer";

const navigationLinks = [
  { label: "Home", href: "/" },
  { label: "Watermark Tool", href: "/watermark" },
  { label: "Pricing", href: "/pricing" },
  { label: "Account", href: "/account" },
  { label: "Contact", href: "mailto:hello@putwatermark.com" },
] as const;

const legalLinks = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Disclaimer", href: "#" },
  { label: "404", href: "#" },
] as const;

const socialLinks = [
  { label: "X (Twitter)", href: "#" },
  { label: "Youtube", href: "#" },
  { label: "Linkedin", href: "#" },
  { label: "Instagram", href: "#" },
] as const;

function FooterLinkColumn({
  links,
  title,
}: {
  links: readonly { label: string; href: string }[];
  title: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-battleship">
        {title}
      </p>
      <ul className="mt-5 space-y-3">
        {links.map(({ label, href }) => (
          <li key={label}>
            {href.startsWith("mailto:") || href.startsWith("http") || href === "#" ? (
              <a
                className="text-sm text-paper/75 transition hover:text-paper"
                href={href}
              >
                {label}
              </a>
            ) : (
              <Link
                className="text-sm text-paper/75 transition hover:text-paper"
                href={href}
              >
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <footer className="w-full border-t border-white/10 bg-ink text-paper">
      <div className={`${pageContainerClass} py-12 md:py-16`}>
        <div className="flex flex-col gap-6 border-b border-white/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="text-[clamp(3rem,11vw,7.5rem)] font-bold leading-[0.9] tracking-[-0.05em] text-paper">
            PutWatermark
          </h2>
          <p className="max-w-sm text-[10px] uppercase leading-[1.9] tracking-[0.18em] text-battleship lg:text-right">
            We leave{" "}
            <span className="text-signal">your exports cleaner</span> than the upload
          </p>
        </div>

        <div className="grid gap-12 border-b border-white/10 py-12 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.55fr))] lg:gap-10 xl:gap-14">
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
              <h3 className="shrink-0 text-xl font-bold tracking-[-0.03em] text-paper">
                Newsletter
              </h3>
              <div className="hidden h-12 w-px shrink-0 bg-signal sm:block" />
              <p className="max-w-xs text-sm leading-7 text-battleship">
                Stay informed about our latest news and updates.
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubscribe}>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="sr-only">Your name</span>
                  <input
                    className="w-full border-b border-white/15 bg-transparent py-3 text-sm text-paper outline-none transition placeholder:text-battleship/70 focus:border-signal"
                    name="name"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your Name"
                    type="text"
                    value={name}
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Your email</span>
                  <input
                    className="w-full border-b border-white/15 bg-transparent py-3 text-sm text-paper outline-none transition placeholder:text-battleship/70 focus:border-signal"
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Your Email"
                    type="email"
                    value={email}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <button
                  className="group inline-flex items-center gap-3 text-sm font-semibold text-paper transition hover:text-signal"
                  type="submit"
                >
                  Subscribe
                  <ArrowRight
                    className="h-4 w-4 text-signal transition group-hover:translate-x-0.5"
                    strokeWidth={2.2}
                  />
                </button>
                <p className="max-w-md text-[10px] uppercase leading-[1.8] tracking-[0.16em] text-battleship">
                  One email when it&apos;s worth your time. That&apos;s the deal.
                </p>
              </div>
            </form>
          </div>

          <FooterLinkColumn links={navigationLinks} title="Navigation" />
          <FooterLinkColumn links={legalLinks} title="Legal" />
          <FooterLinkColumn links={socialLinks} title="Social" />
        </div>

        <div className="grid gap-10 pt-10 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <p className="max-w-md text-sm leading-7 text-battleship">
            <span className="font-semibold text-signal">PutWatermark</span> is a
            browser-native watermarking tool for photos, PDFs, and video.
          </p>

          <div className="text-sm leading-7">
            <a
              className="text-paper/80 transition hover:text-paper"
              href="mailto:hello@putwatermark.com"
            >
              hello@putwatermark.com
            </a>
            <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-paper">
              No install required
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 lg:items-end">
            <div
              aria-hidden
              className="relative flex h-10 w-10 items-center justify-center text-signal"
            >
              <Plus className="absolute h-8 w-8 rotate-0" strokeWidth={1.5} />
              <Plus className="absolute h-8 w-8 rotate-90" strokeWidth={1.5} />
            </div>

            <Link
              className="inline-flex max-w-[12rem] flex-col gap-1 rounded-xl border border-white/10 bg-charcoal/80 px-4 py-3 transition hover:border-signal/40"
              href="/watermark"
            >
              <span className="text-sm font-semibold text-paper">Open editor</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-battleship">
                Start watermarking
              </span>
            </Link>
          </div>
        </div>

        <p className="mt-10 text-xs text-battleship">
          © 2026 PutWatermark. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
