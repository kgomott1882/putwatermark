"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatCreditBalance } from "../src/lib/creditBalance";
import { createClient } from "../utils/supabase/client";

type SiteNavAccountMenuProps = {
  creditBalance: number | null;
  editorLightTheme?: boolean;
  onNavigate?: () => void;
  showBackToEditor?: boolean;
  userEmail: string | null;
};

function getEmailInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "?";
}

export function SiteNavAccountMenu({
  creditBalance,
  editorLightTheme = false,
  onNavigate,
  showBackToEditor = false,
  userEmail,
}: SiteNavAccountMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
    onNavigate?.();
  }

  async function handleSignOut() {
    setIsSigningOut(true);

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const avatarButtonClass = editorLightTheme
    ? "editor-secondary-button flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-ed-fg hover:border-signal/50"
    : "flex h-9 w-9 items-center justify-center rounded-full border border-beige/10 bg-night-elevated text-sm font-semibold text-sand transition hover:border-sand/40 hover:text-beige";
  const menuPanelClass = editorLightTheme
    ? "absolute right-0 top-[calc(100%+0.625rem)] z-50 min-w-[12.5rem] overflow-hidden rounded-xl border border-ed-border bg-ed-panel py-1.5 shadow-[0_16px_48px_rgba(43,43,43,0.18)] backdrop-blur-xl"
    : "absolute right-0 top-[calc(100%+0.625rem)] z-50 min-w-[12.5rem] overflow-hidden rounded-xl border border-beige/10 bg-night-card/95 py-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl";
  const menuHeaderClass = editorLightTheme
    ? "border-b border-ed-border px-4 py-2.5"
    : "border-b border-beige/10 px-4 py-2.5";
  const menuEmailClass = editorLightTheme
    ? "truncate text-xs text-ed-fg"
    : "truncate text-xs text-beige";
  const menuCreditsClass = editorLightTheme
    ? "mt-1 text-[11px] text-ed-fg-muted"
    : "mt-1 text-[11px] text-beige-dim";
  const menuItemClass = editorLightTheme
    ? "block px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ed-fg-muted transition hover:bg-ed-bg hover:text-ed-fg focus-visible:ring-2 focus-visible:ring-signal/30"
    : "block px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-beige-dim transition hover:bg-beige/5 hover:text-beige";
  const menuDividerClass = editorLightTheme
    ? "mx-3 border-t border-ed-border"
    : "mx-3 border-t border-beige/10";

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Account menu"
        className={avatarButtonClass}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        {userEmail ? getEmailInitial(userEmail) : "?"}
      </button>

      {isOpen ? (
        <div
          className={menuPanelClass}
          role="menu"
        >
          <div className={menuHeaderClass}>
            <p className={menuEmailClass}>{userEmail}</p>
            {creditBalance !== null ? (
              <p className={menuCreditsClass}>
                Credits: {formatCreditBalance(creditBalance)}
              </p>
            ) : null}
          </div>
          {showBackToEditor ? (
            <Link
              className={menuItemClass}
              href="/watermark"
              onClick={closeMenu}
              role="menuitem"
            >
              Back to Editor
            </Link>
          ) : null}
          <Link
            className={menuItemClass}
            href="/account"
            onClick={closeMenu}
            role="menuitem"
          >
            Account
          </Link>
          <div aria-hidden className={menuDividerClass} />
          <button
            className={`${menuItemClass} w-full text-left disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={isSigningOut}
            onClick={() => void handleSignOut()}
            role="menuitem"
            type="button"
          >
            {isSigningOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
