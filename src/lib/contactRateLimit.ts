const CONTACT_RATE_LIMIT_MS = 60_000;
const contactSubmissionTimestamps = new Map<string, number>();

export function getContactRateLimitMs() {
  return CONTACT_RATE_LIMIT_MS;
}

export function checkContactRateLimit(clientKey: string) {
  const now = Date.now();
  const lastSubmittedAt = contactSubmissionTimestamps.get(clientKey);

  if (lastSubmittedAt && now - lastSubmittedAt < CONTACT_RATE_LIMIT_MS) {
    const retryAfterSeconds = Math.ceil(
      (CONTACT_RATE_LIMIT_MS - (now - lastSubmittedAt)) / 1000,
    );

    return {
      allowed: false,
      retryAfterSeconds,
    } as const;
  }

  return { allowed: true } as const;
}

export function recordContactSubmission(clientKey: string) {
  contactSubmissionTimestamps.set(clientKey, Date.now());

  if (contactSubmissionTimestamps.size > 5000) {
    const cutoff = Date.now() - CONTACT_RATE_LIMIT_MS * 2;

    for (const [key, timestamp] of contactSubmissionTimestamps) {
      if (timestamp < cutoff) {
        contactSubmissionTimestamps.delete(key);
      }
    }
  }
}

export function getRequestClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}
