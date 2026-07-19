const DEFAULT_AUTH_CALLBACK_PATH = "/auth/callback";

export function getAuthCallbackUrl(origin?: string) {
  const baseOrigin =
    origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

  return new URL(DEFAULT_AUTH_CALLBACK_PATH, baseOrigin).toString();
}

export function getPasswordResetRedirectUrl(origin?: string) {
  const callbackUrl = new URL(getAuthCallbackUrl(origin));
  callbackUrl.searchParams.set("next", "/reset-password");
  return callbackUrl.toString();
}
