"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { IconType } from "react-icons";
import { SiTiktok, SiX, SiYoutube } from "react-icons/si";
import { ContactSupportModal } from "./ContactSupportModal";
import { LandingHighlight } from "./landing/LandingPrimitives";
import { pageContainerClass } from "./pageContainer";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FooterLink = {
  href: string;
  label: string;
  opensContactModal?: boolean;
};

const navigationLinks: readonly FooterLink[] = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "About", href: "/about" },
  { label: "Watermark Tool", href: "/watermark" },
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/pricing" },
  { label: "Account", href: "/account" },
  { label: "Contact", href: "#", opensContactModal: true },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Disclaimer", href: "/disclaimer" },
] as const;

const socialLinks: readonly {
  href: string;
  Icon: IconType;
  label: string;
}[] = [
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@putwatermark",
    Icon: SiTiktok,
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/putwatermark",
    Icon: SiX,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@putwatermark",
    Icon: SiYoutube,
  },
];

function FooterLinkColumn({
  links,
  onContactClick,
  title,
}: {
  links: readonly FooterLink[];
  onContactClick?: () => void;
  title: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-beige">
        {title}
      </p>
      <ul className="mt-5 space-y-3">
        {links.map(({ label, href, opensContactModal }) => (
          <li key={label}>
            {opensContactModal ? (
              <button
                className="landing-muted text-left text-sm transition hover:text-beige"
                onClick={onContactClick}
                type="button"
              >
                {label}
              </button>
            ) : href.startsWith("http") ? (
              <a
                className="landing-muted text-sm transition hover:text-beige"
                href={href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {label}
              </a>
            ) : (
              <Link
                className="landing-muted text-sm transition hover:text-beige"
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

function FooterSocialColumn() {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-beige">
        Social
      </p>
      <ul className="mt-5 space-y-3">
        {socialLinks.map(({ label, href, Icon }) => (
          <li key={label}>
            <a
              className="landing-muted inline-flex items-center gap-2.5 text-sm transition hover:text-beige"
              href={href}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon aria-hidden className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  async function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError("");
    setFormError("");
    setSuccessMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("Email is required.");
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        body: JSON.stringify({
          email: trimmedEmail,
          name: name.trim() || undefined,
          source: "footer",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        ok?: boolean;
      };

      if (!response.ok || !payload.ok) {
        setFormError(payload.error ?? "Could not save your subscription. Please try again.");
        return;
      }

      setName("");
      setEmail("");
      setSuccessMessage(
        payload.message ?? "Thanks for subscribing. We'll be in touch when it's worth your time.",
      );
    } catch {
      setFormError("Could not save your subscription. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section aria-label="Press and media" className="landing-light-band py-10 md:py-12">
        <div className={`${pageContainerClass} text-center`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">
            As seen on
          </p>
        </div>
      </section>

      <footer className="landing-footer landing-section border-t-0">
      <div className={`${pageContainerClass} py-12 md:py-16`}>
        <div className="flex flex-col gap-6 landing-border border-b pb-10 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="text-[clamp(3rem,11vw,7.5rem)] font-bold leading-[0.9] tracking-[-0.05em] text-beige">
            PutWatermark
          </h2>
          <p className="landing-soft max-w-sm text-[10px] uppercase leading-[1.9] tracking-[0.18em] lg:text-right">
            We leave{" "}
            <LandingHighlight>your exports cleaner</LandingHighlight> than the upload
          </p>
        </div>

        <div className="grid gap-12 landing-border border-b py-12 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.55fr))] lg:gap-10 xl:gap-14">
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
              <h3 className="shrink-0 text-xl font-bold tracking-[-0.03em] text-beige">
                Newsletter
              </h3>
              <div className="hidden h-12 w-px shrink-0 bg-signal sm:block" />
              <p className="landing-muted max-w-xs text-sm leading-7">
                Stay informed about our latest news and updates.
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubscribe}>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="sr-only">Your name</span>
                  <input
                    autoComplete="name"
                    className="w-full border-b border-beige/15 bg-transparent py-3 text-sm text-beige outline-none transition placeholder:text-beige-dim/70 focus:border-signal disabled:opacity-60"
                    disabled={isSubmitting}
                    name="name"
                    onChange={(event) => {
                      setName((event.target as unknown as { value: string }).value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    placeholder="Your Name"
                    type="text"
                    value={name}
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Your email</span>
                  <input
                    autoComplete="email"
                    className="w-full border-b border-beige/15 bg-transparent py-3 text-sm text-beige outline-none transition placeholder:text-beige-dim/70 focus:border-signal disabled:opacity-60"
                    disabled={isSubmitting}
                    name="email"
                    onChange={(event) => {
                      setEmail((event.target as unknown as { value: string }).value);
                      setEmailError("");
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    placeholder="Your Email"
                    required
                    type="email"
                    value={email}
                  />
                  {emailError ? (
                    <p className="mt-2 text-xs text-signal">{emailError}</p>
                  ) : null}
                </label>
              </div>

              {formError ? (
                <p className="text-sm text-signal" role="alert">
                  {formError}
                </p>
              ) : null}

              {successMessage ? (
                <p className="text-sm text-signal" role="status">
                  {successMessage}
                </p>
              ) : null}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <button
                  className="group inline-flex items-center gap-3 text-sm font-semibold text-beige transition hover:text-signal disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Subscribing…" : "Subscribe"}
                  <ArrowRight
                    className="h-4 w-4 text-signal transition group-hover:translate-x-0.5"
                    strokeWidth={2.2}
                  />
                </button>
                <p className="landing-soft max-w-md text-[10px] uppercase leading-[1.8] tracking-[0.16em]">
                  One email when it&apos;s worth your time. That&apos;s the deal.
                </p>
              </div>
            </form>
          </div>

          <FooterLinkColumn
            links={navigationLinks}
            onContactClick={() => setIsContactModalOpen(true)}
            title="Navigation"
          />
          <FooterLinkColumn links={legalLinks} title="Legal" />
          <FooterSocialColumn />
        </div>

        <div className="grid gap-10 pt-10 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <p className="landing-muted max-w-md text-sm leading-7">
            <span className="font-semibold text-beige">PutWatermark</span> is a
            browser-native watermarking tool for{" "}
            <LandingHighlight>photos, PDFs, and video</LandingHighlight>.
          </p>

          <div className="text-sm leading-7">
            <button
              className="text-beige transition hover:text-signal"
              onClick={() => setIsContactModalOpen(true)}
              type="button"
            >
              Contact support
            </button>
            <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-beige">
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
              className="landing-surface inline-flex max-w-[12rem] flex-col gap-1 rounded-xl px-4 py-3 transition hover:border-signal/40"
              href="/watermark"
            >
              <span className="text-sm font-semibold text-beige">Open editor</span>
              <span className="landing-soft text-[10px] uppercase tracking-[0.16em]">
                Start watermarking
              </span>
            </Link>
          </div>
        </div>

        <p className="landing-soft mt-10 text-xs text-beige-dim/80">
          © 2026 PutWatermark. All rights reserved.
        </p>
      </div>
    </footer>

      <ContactSupportModal
        onClose={() => setIsContactModalOpen(false)}
        open={isContactModalOpen}
      />
    </>
  );
}
