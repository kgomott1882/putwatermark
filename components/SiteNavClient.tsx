"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchUserCreditBalance, formatCreditBalance } from "../src/lib/creditBalance";
import { createClient } from "../utils/supabase/client";
import { pageContainerClass } from "./pageContainer";
import { SiteNavAccountMenu } from "./SiteNavAccountMenu";

type NavAccount = {
  creditBalance: number | null;
  userEmail: string | null;
};

type SiteNavClientProps = {
  editorAccount?: NavAccount;
  initialAccount?: NavAccount;
  isLoggedIn: boolean;
  showInEditor?: boolean;
};

const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
] as const;

const siteIconSrc = "/Icon.png";

export function SiteNavClient({
  editorAccount,
  initialAccount,
  isLoggedIn: serverIsLoggedIn,
  showInEditor = false,
}: SiteNavClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isEditorMode =
    pathname === "/watermark" || pathname.startsWith("/watermark/");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sessionLoggedIn, setSessionLoggedIn] = useState<boolean | null>(null);
  const [clientAccount, setClientAccount] = useState<NavAccount | null>(
    initialAccount ?? null,
  );

  const isLoggedIn = sessionLoggedIn ?? serverIsLoggedIn;
  const resolvedAccountData = showInEditor
    ? editorAccount
    : clientAccount ??
      initialAccount ?? {
        creditBalance: null,
        userEmail: null,
      };
  const showAccountMenu = Boolean(
    isLoggedIn && (showInEditor ? editorAccount : true),
  );

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const syncSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      const loggedIn = Boolean(user);
      setSessionLoggedIn(loggedIn);

      if (!loggedIn || !user) {
        setClientAccount(null);
        return;
      }

      if (showInEditor) {
        return;
      }

      try {
        const balance = await fetchUserCreditBalance(supabase, user.id);

        if (!cancelled) {
          setClientAccount({
            creditBalance: balance,
            userEmail: user.email ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setClientAccount({
            creditBalance: null,
            userEmail: user.email ?? null,
          });
        }
      }
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = Boolean(session?.user);
      setSessionLoggedIn(loggedIn);

      if (!loggedIn) {
        setClientAccount(null);
        return;
      }

      if (showInEditor) {
        return;
      }

      const user = session?.user;

      if (!user) {
        return;
      }

      void (async () => {
        try {
          const balance = await fetchUserCreditBalance(supabase, user.id);

          if (!cancelled) {
            setClientAccount({
              creditBalance: balance,
              userEmail: user.email ?? null,
            });
          }
        } catch {
          if (!cancelled) {
            setClientAccount({
              creditBalance: null,
              userEmail: user.email ?? null,
            });
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [showInEditor]);

  useEffect(() => {
    if (
      sessionLoggedIn !== null &&
      sessionLoggedIn !== serverIsLoggedIn
    ) {
      router.refresh();
    }
  }, [router, serverIsLoggedIn, sessionLoggedIn]);

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;

    document.body.style.overflow = isMenuOpen && !isDesktop ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  if (isEditorMode && !showInEditor) {
    return null;
  }

  const authLinkClass =
    "text-[11px] font-semibold uppercase tracking-[0.2em] transition";
  const logInClass = `${authLinkClass} text-beige-dim hover:text-beige`;
  const signUpClass = `${authLinkClass} text-signal hover:text-sand`;
  const editorCreditBalance =
    showInEditor && resolvedAccountData?.creditBalance != null
      ? resolvedAccountData.creditBalance
      : null;

  const headerClass = showInEditor
    ? "sticky top-0 z-50 overflow-visible border-b border-ed-border bg-ed-panel/95 backdrop-blur-md"
    : "sticky top-0 z-50 overflow-visible bg-night/95 backdrop-blur-md";
  const brandTextClass = showInEditor
    ? "text-base font-bold tracking-[-0.03em] text-ed-fg"
    : "text-base font-bold tracking-[-0.03em] text-beige";
  const navPillShellClass = showInEditor
    ? "inline-flex items-center rounded-full border border-ed-border bg-ed-bg-card px-2 py-2 shadow-[0_8px_24px_rgba(43,43,43,0.14)]"
    : "inline-flex items-center rounded-full border border-beige/10 bg-night-card/75 px-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl";
  const navLinkActiveClass = showInEditor
    ? "border-2 border-signal bg-ed-bg text-ed-fg shadow-sm ring-2 ring-signal/25"
    : "bg-beige/10 text-beige";
  const navLinkInactiveClass = showInEditor
    ? "text-ed-fg-muted hover:bg-ed-bg hover:text-ed-fg"
    : "text-beige/85 hover:bg-beige/5 hover:text-beige";
  const mobileMenuToggleFocusClass = showInEditor
    ? "inline-flex shrink-0 transition hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ed-panel md:hidden"
    : "inline-flex shrink-0 transition hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-sand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-night md:hidden";
  const mobileMenuCloseClass = showInEditor
    ? "inline-flex h-9 w-9 items-center justify-center rounded-md bg-ed-accent text-xl font-light leading-none text-white"
    : "inline-flex h-9 w-9 items-center justify-center rounded-md bg-ink text-xl font-light leading-none text-beige";
  const mobileMenuOpenClass = showInEditor
    ? "inline-flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-md bg-ed-accent px-2 py-2.5"
    : "inline-flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-md bg-ink px-2 py-2.5";
  const mobileMenuLineClass = showInEditor
    ? "h-[2px] w-full rounded-full bg-white"
    : "h-[2px] w-full rounded-full bg-beige";
  const creditBadgeClass = showInEditor
    ? "rounded-full border border-ed-border bg-ed-bg-card px-3 py-1.5 text-[11px] font-semibold text-ed-fg"
    : "rounded-full border border-beige/10 bg-night-elevated px-3 py-1.5 text-[11px] font-semibold text-beige";
  const mobileMenuSectionClass = showInEditor
    ? `${pageContainerClass} border-t border-ed-border bg-ed-panel py-3 md:hidden`
    : `${pageContainerClass} border-t border-beige/10 py-3 md:hidden`;
  const mobileMenuPanelClass = showInEditor
    ? "flex flex-col gap-0.5 rounded-xl border border-ed-border bg-ed-bg-card p-1.5"
    : "flex flex-col gap-0.5 rounded-xl border border-beige/10 bg-night-card/80 p-1.5";
  const mobileNavLinkClass = showInEditor
    ? "rounded-lg px-4 py-3 text-sm font-medium text-ed-fg transition hover:bg-ed-bg focus-visible:ring-2 focus-visible:ring-signal/30"
    : "rounded-lg px-4 py-3 text-sm font-medium text-beige transition hover:bg-beige/5";

  return (
    <header className={headerClass}>
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
          <span className={brandTextClass}>
            PutWatermark
          </span>
        </Link>

        <div className="hidden justify-center md:flex">
          <div className={navPillShellClass}>
            {navLinks.map(({ href, label }) => {
              const isActive =
                pathname === href ||
                (href === "/blog" && pathname.startsWith("/blog/"));

              return (
                <Link
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    isActive ? navLinkActiveClass : navLinkInactiveClass
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

        <div className="relative flex items-center gap-2 justify-self-end">
          {showAccountMenu ? (
            <>
              <button
                aria-controls={
                  showInEditor ? "editor-mobile-nav-menu" : "mobile-nav-menu"
                }
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                className={mobileMenuToggleFocusClass}
                onClick={() => setIsMenuOpen((open) => !open)}
                type="button"
              >
                {isMenuOpen ? (
                  <span
                    aria-hidden
                    className={mobileMenuCloseClass}
                  >
                    ×
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className={mobileMenuOpenClass}
                  >
                    <span className={mobileMenuLineClass} />
                    <span className={mobileMenuLineClass} />
                    <span className={mobileMenuLineClass} />
                  </span>
                )}
              </button>
              {editorCreditBalance !== null ? (
                <span
                  aria-label={`${formatCreditBalance(editorCreditBalance)} credits available`}
                  className={creditBadgeClass}
                >
                  {formatCreditBalance(editorCreditBalance)} credits
                </span>
              ) : null}
              <SiteNavAccountMenu
                creditBalance={resolvedAccountData?.creditBalance ?? null}
                editorLightTheme={showInEditor}
                showBackToEditor={!showInEditor}
                userEmail={resolvedAccountData?.userEmail ?? null}
              />
            </>
          ) : (
            <>
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
                </div>
              ) : null}
            </>
          )}
        </div>
      </nav>

      {isMenuOpen && showAccountMenu ? (
        <div
          className={mobileMenuSectionClass}
          id={showInEditor ? "editor-mobile-nav-menu" : "mobile-nav-menu"}
        >
          <div className={mobileMenuPanelClass}>
            {navLinks.map(({ href, label }) => (
              <Link
                className={mobileNavLinkClass}
                href={href}
                key={href}
                onClick={() => setIsMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {isMenuOpen && !showAccountMenu ? (
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
          </div>
        </div>
      ) : null}
    </header>
  );
}
