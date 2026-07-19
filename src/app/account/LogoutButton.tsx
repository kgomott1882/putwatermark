"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../../utils/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      className="inline-flex w-full items-center justify-center rounded-full border border-platinum bg-paper px-6 py-3 text-sm font-semibold text-ink shadow-none transition hover:border-battleship/40 hover:bg-platinum/50 focus:outline-none focus:ring-2 focus:ring-signal/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isSigningOut}
      onClick={handleSignOut}
      type="button"
    >
      {isSigningOut ? "Logging out..." : "Log out"}
    </button>
  );
}
