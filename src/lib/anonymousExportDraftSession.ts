const SESSION_ID_KEY = "putwatermark.anonymous-session-id";
const SESSION_CREATED_AT_KEY = "putwatermark.anonymous-session-created-at";
const PENDING_EXPORT_KEY = "putwatermark.pending-export-after-login";
const SESSION_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function getOrCreateAnonymousSessionId() {
  if (typeof window === "undefined") {
    throw new Error("Anonymous session id requires a browser environment.");
  }

  const existingId = window.localStorage.getItem(SESSION_ID_KEY);
  const createdAtRaw = window.localStorage.getItem(SESSION_CREATED_AT_KEY);
  const createdAt = createdAtRaw ? Number(createdAtRaw) : 0;

  if (
    existingId &&
    createdAt > 0 &&
    Date.now() - createdAt < SESSION_MAX_AGE_MS
  ) {
    return existingId;
  }

  const sessionId = crypto.randomUUID();
  window.localStorage.setItem(SESSION_ID_KEY, sessionId);
  window.localStorage.setItem(SESSION_CREATED_AT_KEY, String(Date.now()));
  return sessionId;
}

export function markPendingExportAfterLogin() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_EXPORT_KEY, "1");
}

export function hasPendingExportAfterLogin() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(PENDING_EXPORT_KEY) === "1";
}

export function clearPendingExportAfterLogin() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PENDING_EXPORT_KEY);
}

export function clearAnonymousSessionId() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_ID_KEY);
  window.localStorage.removeItem(SESSION_CREATED_AT_KEY);
}
