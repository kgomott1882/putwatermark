const POST_AUTH_NAV_HIGHLIGHT_KEY = "pw-post-auth-nav-highlight";

export function markPostAuthNavHighlight() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(POST_AUTH_NAV_HIGHLIGHT_KEY, "1");
}

export function isPostAuthNavHighlightActive() {
  if (typeof window === "undefined") {
    return false;
  }

  return sessionStorage.getItem(POST_AUTH_NAV_HIGHLIGHT_KEY) === "1";
}

export function clearPostAuthNavHighlight() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(POST_AUTH_NAV_HIGHLIGHT_KEY);
}

export function shouldShowPostAuthNavHighlight(pathname: string) {
  return isPostAuthNavHighlightActive() && pathname === "/";
}
