import { fetchNavAccountData } from "../src/lib/profileDisplayName";
import { createClient } from "../utils/supabase/server";
import { SiteNavClient } from "./SiteNavClient";

export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let account:
    | {
        creditBalance: number | null;
        userDisplayName: string | null;
      }
    | undefined;

  if (user) {
    try {
      const navAccount = await fetchNavAccountData(
        supabase,
        user.id,
        user.email,
      );
      account = {
        creditBalance: navAccount.creditBalance,
        userDisplayName: navAccount.userDisplayName || null,
      };
    } catch {
      account = {
        creditBalance: null,
        userDisplayName: user.email ?? null,
      };
    }
  }

  return (
    <SiteNavClient
      initialAccount={account}
      isLoggedIn={Boolean(user)}
    />
  );
}
