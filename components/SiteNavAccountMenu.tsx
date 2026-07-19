"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatCreditBalance } from "../src/lib/creditBalance";
import { createClient } from "../utils/supabase/client";

type SiteNavAccountMenuProps = {
  creditBalance: number | null;
  onNavigate?: () => void;
  showBackToEditor?: boolean;
  userEmail: string | null;
};

function getEmailInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "?";
}

export function SiteNavAccountMenu({
  creditBalance,
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-beige/10 bg-night-elevated text-sm font-semibold text-sand transition hover:border-sand/40 hover:text-beige"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        {userEmail ? getEmailInitial(userEmail) : "?"}
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+0.625rem)] z-50 min-w-[12.5rem] overflow-hidden rounded-xl border border-beige/10 bg-night-card/95 py-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          role="menu"
        >
          <div className="border-b border-beige/10 px-4 py-2.5">
            <p className="truncate text-xs text-beige">{userEmail}</p>
            {creditBalance !== null ? (
              <p className="mt-1 text-[11px] text-beige-dim">
                Credits: {formatCreditBalance(creditBalance)}
              </p>
            ) : null}
          </div>
          {showBackToEditor ? (
            <Link
              className="block px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-beige-dim transition hover:bg-beige/5 hover:text-beige"
              href="/watermark"
              onClick={closeMenu}
              role="menuitem"
            >
              Back to Editor
            </Link>
          ) : null}
          <Link
            className="block px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-beige-dim transition hover:bg-beige/5 hover:text-beige"
            href="/account"
            onClick={closeMenu}
            role="menuitem"
          >
            Account
          </Link>
          <div aria-hidden className="mx-3 border-t border-beige/10" />
          <button
            className="block w-full px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-beige-dim transition hover:bg-beige/5 hover:text-beige disabled:cursor-not-allowed disabled:opacity-60"
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
