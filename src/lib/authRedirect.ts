import { getSiteUrl } from "./siteUrl";

const DEFAULT_AUTH_CALLBACK_PATH = "/auth/callback";

export const DEFAULT_POST_AUTH_PATH = "/watermark";

export function getSafeRedirectPath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_POST_AUTH_PATH;
  }

  return path;
}

export function getAuthCallbackUrl(origin?: string) {
  const baseOrigin = origin ?? (typeof window !== "undefined" ? window.location.origin : getSiteUrl());

  return new URL(DEFAULT_AUTH_CALLBACK_PATH, baseOrigin).toString();
}

export function getPasswordResetRedirectUrl(origin?: string) {
  const callbackUrl = new URL(getAuthCallbackUrl(origin));
  callbackUrl.searchParams.set("next", "/reset-password");
  return callbackUrl.toString();
}
