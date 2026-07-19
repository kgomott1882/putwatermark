import { fetchUserCreditBalance } from "../src/lib/creditBalance";
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
        userEmail: string | null;
      }
    | undefined;

  if (user) {
    try {
      const balance = await fetchUserCreditBalance(supabase, user.id);
      account = {
        creditBalance: balance,
        userEmail: user.email ?? null,
      };
    } catch {
      account = {
        creditBalance: null,
        userEmail: user.email ?? null,
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
