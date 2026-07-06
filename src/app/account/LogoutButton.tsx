"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../../../components/Button";
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
    <Button
      as="button"
      disabled={isSigningOut}
      onClick={handleSignOut}
      type="button"
    >
      {isSigningOut ? "Logging out..." : "Log out"}
    </Button>
  );
}
