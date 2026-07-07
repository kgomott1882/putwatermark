import { createClient } from "../utils/supabase/server";
import { SiteNavClient } from "./SiteNavClient";

export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SiteNavClient isLoggedIn={Boolean(user)} />;
}
