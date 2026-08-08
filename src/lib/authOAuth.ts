import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_POST_AUTH_PATH, getAuthCallbackUrl } from "./authRedirect";

function getOAuthRedirectUrl(nextPath: string) {
  const callbackUrl = new URL(getAuthCallbackUrl());
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}

export async function signInWithGoogle(
  supabase: SupabaseClient,
  nextPath = DEFAULT_POST_AUTH_PATH,
) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getOAuthRedirectUrl(nextPath),
    },
  });
}
