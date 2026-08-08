import { NextResponse } from "next/server";
import { DEFAULT_POST_AUTH_PATH } from "../../../lib/authRedirect";
import { createClient } from "../../../../utils/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const queryError = requestUrl.searchParams.get("error");
  const hashParams = new URLSearchParams(requestUrl.hash.replace(/^#/, ""));
  const hashError = hashParams.get("error");
  const confirmationFailedUrl = new URL(
    "/login?error=confirmation_failed",
    requestUrl,
  );

  if (queryError || hashError) {
    return NextResponse.redirect(new URL("/login?error=link_expired", requestUrl));
  }

  if (!code) {
    return NextResponse.redirect(confirmationFailedUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(confirmationFailedUrl);
  }

  if (next?.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(new URL(next, requestUrl));
  }

  return NextResponse.redirect(new URL(DEFAULT_POST_AUTH_PATH, requestUrl));
}
