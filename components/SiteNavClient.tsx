"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { pageContainerClass } from "./pageContainer";

type SiteNavClientProps = {
  isLoggedIn: boolean;
};

const navLinks = [
  { href: "/watermark", label: "Watermark Tool" },
  { href: "/pricing", label: "Pricing" },
] as const;

const siteLogoSrc = "/pw-logo.png";

export function SiteNavClient({ isLoggedIn }: SiteNavClientProps) {
  const pathname = usePathname();
  const isEditorMode =
    pathname === "/watermark" || pathname.startsWith("/watermark/");
  const isLanding = pathname === "/";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  if (isEditorMode) {
    return null;
  }

  if (isLanding) {
    return (
      <header className="sticky top-0 z-50 bg-ink/95 backdrop-blur-sm">
        <nav
          aria-label="Main navigation"
          className={`${pageContainerClass} grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]`}
        >
          <Link
            className="inline-flex shrink-0 items-center transition hover:opacity-80"
            href="/"
          >
            <span className="text-sm font-bold uppercase tracking-[0.18em] text-paper">
              PutWatermark
            </span>
          </Link>

          <div className="hidden items-center justify-center gap-8 md:flex">
            {navLinks.map(({ href, label }) => (
              <Link
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/70 transition hover:text-paper"
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center justify-end gap-6 md:flex">
            {isLoggedIn ? (
              <Link
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/70 transition hover:text-paper"
                href="/account"
              >
                Account
              </Link>
            ) : (
              <>
                <Link
                  className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/70 transition hover:text-paper"
                  href="/login"
                >
                  Log in
                </Link>
                <Link
                  className="text-[11px] font-semibold uppercase tracking-[0.2em] text-signal transition hover:text-paper"
                  href="/signup"
                >
                  Sign up
                </Link>
              </>
            )}
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-battleship">
              ©2026
            </span>
          </div>

          <button
            aria-controls="mobile-nav-menu"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="inline-flex min-h-11 min-w-11 items-center justify-center justify-self-end md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            type="button"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper">
              {isMenuOpen ? "Close" : "Menu"}
            </span>
          </button>
        </nav>

        {isMenuOpen ? (
          <div
            className={`${pageContainerClass} border-t border-white/10 py-4 md:hidden`}
            id="mobile-nav-menu"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  className="rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-paper transition hover:bg-white/5"
                  href={href}
                  key={href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}

              {isLoggedIn ? (
                <Link
                  className="rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-paper transition hover:bg-white/5"
                  href="/account"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Account
                </Link>
              ) : (
                <>
                  <Link
                    className="rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-paper transition hover:bg-white/5"
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    className="mt-2 inline-flex justify-center rounded-full bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                    href="/signup"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-platinum bg-paper/95 backdrop-blur-sm">
      <nav
        aria-label="Main navigation"
        className={`${pageContainerClass} flex h-16 items-center justify-between gap-6`}
      >
        <Link
          className="inline-flex shrink-0 items-center transition hover:opacity-80"
          href="/"
        >
          {logoFailed ? (
            <span className="text-lg font-bold tracking-[-0.04em] text-ink">
              PutWatermark
            </span>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              alt="PutWatermark"
              className="block h-9 w-auto max-h-9 object-contain object-left"
              decoding="async"
              height={36}
              onError={() => setLogoFailed(true)}
              src={siteLogoSrc}
              width={196}
            />
          )}
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              className="text-sm font-medium text-battleship transition hover:text-ink"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}

          <div className="flex items-center gap-5">
            {isLoggedIn ? (
              <Link
                className="text-sm font-medium text-battleship transition hover:text-ink"
                href="/account"
              >
                Account
              </Link>
            ) : (
              <>
                <Link
                  className="text-sm font-medium text-battleship transition hover:text-ink"
                  href="/login"
                >
                  Log in
                </Link>
                <Link
                  className="rounded-full bg-signal px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-signal focus:ring-offset-2"
                  href="/signup"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        <button
          aria-controls="mobile-nav-menu"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-platinum text-ink transition hover:border-signal hover:text-signal md:hidden"
          onClick={() => setIsMenuOpen((open) => !open)}
          type="button"
        >
          <span className="text-xl leading-none">{isMenuOpen ? "×" : "☰"}</span>
        </button>
      </nav>

      {isMenuOpen ? (
        <div
          className={`${pageContainerClass} border-t border-platinum bg-paper py-4 md:hidden`}
          id="mobile-nav-menu"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                className="rounded-lg px-3 py-3 text-base font-medium text-ink transition hover:bg-platinum/60"
                href={href}
                key={href}
                onClick={() => setIsMenuOpen(false)}
              >
                {label}
              </Link>
            ))}

            {isLoggedIn ? (
              <Link
                className="rounded-lg px-3 py-3 text-base font-medium text-ink transition hover:bg-platinum/60"
                href="/account"
                onClick={() => setIsMenuOpen(false)}
              >
                Account
              </Link>
            ) : (
              <>
                <Link
                  className="rounded-lg px-3 py-3 text-base font-medium text-ink transition hover:bg-platinum/60"
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  className="mt-2 inline-flex justify-center rounded-full bg-signal px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110"
                  href="/signup"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
