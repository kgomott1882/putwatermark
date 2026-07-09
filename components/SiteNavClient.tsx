"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { pageContainerClass } from "./pageContainer";

type SiteNavClientProps = {
  isLoggedIn: boolean;
};

const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
] as const;

const siteLogoSrc = "/pw-logo.png";
const siteIconSrc = "/Icon.png";

export function SiteNavClient({ isLoggedIn }: SiteNavClientProps) {
  const pathname = usePathname();
  const isEditorMode =
    pathname === "/watermark" || pathname.startsWith("/watermark/");
  const isLanding =
    pathname === "/" ||
    pathname === "/features" ||
    pathname === "/about" ||
    pathname === "/pricing" ||
    pathname === "/blog" ||
    pathname.startsWith("/blog/");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;

    document.body.style.overflow = isMenuOpen && !isDesktop ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  if (isEditorMode) {
    return null;
  }

  if (isLanding) {
    const authLinkClass =
      "text-[11px] font-semibold uppercase tracking-[0.2em] transition";
    const logInClass = `${authLinkClass} text-beige-dim hover:text-beige`;
    const signUpClass = `${authLinkClass} text-signal hover:text-sand`;

    return (
      <header className="sticky top-0 z-50 overflow-visible bg-night/95 backdrop-blur-md">
        <nav
          aria-label="Main navigation"
          className={`${pageContainerClass} grid h-[4.25rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 overflow-visible md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]`}
        >
          <Link
            className="inline-flex shrink-0 items-center gap-3 transition hover:opacity-85"
            href="/"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              className="h-9 w-9 object-contain"
              decoding="async"
              src={siteIconSrc}
            />
            <span className="text-base font-bold tracking-[-0.03em] text-beige">
              PutWatermark
            </span>
          </Link>

          <div className="hidden justify-center md:flex">
            <div className="inline-flex items-center rounded-full border border-beige/10 bg-night-card/75 px-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              {navLinks.map(({ href, label }) => {
                const isActive =
                  pathname === href ||
                  (href === "/blog" && pathname.startsWith("/blog/"));

                return (
                  <Link
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-beige/10 text-beige"
                        : "text-beige/85 hover:bg-beige/5 hover:text-beige"
                    }`}
                    href={href}
                    key={href}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="relative justify-self-end">
            <button
              aria-controls="mobile-nav-menu"
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              className="inline-flex shrink-0 transition hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-sand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-night"
              onClick={() => setIsMenuOpen((open) => !open)}
              type="button"
            >
              {isMenuOpen ? (
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-ink text-xl font-light leading-none text-beige"
                >
                  ×
                </span>
              ) : (
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-md bg-ink px-2 py-2.5"
                >
                  <span className="h-[2px] w-full rounded-full bg-beige" />
                  <span className="h-[2px] w-full rounded-full bg-beige" />
                  <span className="h-[2px] w-full rounded-full bg-beige" />
                </span>
              )}
            </button>

            {isMenuOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+0.625rem)] z-50 hidden min-w-[10.5rem] overflow-hidden rounded-xl border border-beige/10 bg-night-card/95 py-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl md:block"
                id="desktop-nav-menu"
                role="menu"
              >
                {isLoggedIn ? (
                  <Link
                    className={`block px-4 py-2.5 ${logInClass}`}
                    href="/account"
                    onClick={() => setIsMenuOpen(false)}
                    role="menuitem"
                  >
                    Account
                  </Link>
                ) : (
                  <>
                    <Link
                      className={`block px-4 py-2.5 ${logInClass}`}
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      role="menuitem"
                    >
                      Log in
                    </Link>
                    <div aria-hidden className="mx-3 border-t border-beige/10" />
                    <Link
                      className={`block px-4 py-2.5 ${signUpClass}`}
                      href="/signup"
                      onClick={() => setIsMenuOpen(false)}
                      role="menuitem"
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </nav>

        {isMenuOpen ? (
          <div
            className={`${pageContainerClass} border-t border-beige/10 py-3 md:hidden`}
            id="mobile-nav-menu"
          >
            <div className="flex flex-col gap-0.5 rounded-xl border border-beige/10 bg-night-card/80 p-1.5">
              {navLinks.map(({ href, label }) => (
                <Link
                  className="rounded-lg px-4 py-3 text-sm font-medium text-beige transition hover:bg-beige/5"
                  href={href}
                  key={href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}

              <div aria-hidden className="mx-2 border-t border-beige/10" />

              {isLoggedIn ? (
                <Link
                  className={`rounded-lg px-4 py-3 ${logInClass}`}
                  href="/account"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Account
                </Link>
              ) : (
                <>
                  <Link
                    className={`rounded-lg px-4 py-3 ${logInClass}`}
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    className={`rounded-lg px-4 py-3 ${signUpClass}`}
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
