import {
  createPublicServerClient,
  isSupabasePublicConfigured,
} from "../../utils/supabase/publicServer";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxNameLength = 120;
const maxEmailLength = 320;

export type NewsletterSubscribeInput = {
  email: string;
  name?: string;
  source?: string;
};

export type NewsletterSubscribeResult = {
  message: string;
  ok: true;
  status: "subscribed" | "reactivated" | "already_subscribed";
};

export class NewsletterSubscribeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "NewsletterSubscribeError";
    this.status = status;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeName(name: string | undefined) {
  const trimmed = name?.trim() ?? "";
  return trimmed.length > 0 ? trimmed.slice(0, maxNameLength) : null;
}

export function validateNewsletterSubscribeInput(input: NewsletterSubscribeInput) {
  const email = normalizeEmail(input.email ?? "");

  if (!email) {
    throw new NewsletterSubscribeError("Email is required.");
  }

  if (email.length > maxEmailLength || !emailPattern.test(email)) {
    throw new NewsletterSubscribeError("Enter a valid email address.");
  }

  const name = normalizeName(input.name);
  const source = (input.source?.trim() || "footer").slice(0, 64);

  return { email, name, source };
}

export function isNewsletterSubscribeConfigured() {
  return isSupabasePublicConfigured();
}

function mapRpcErrorMessage(message: string) {
  if (message.includes("Email is required.")) {
    return "Email is required.";
  }

  if (message.includes("Enter a valid email address.")) {
    return "Enter a valid email address.";
  }

  if (
    message.includes("Could not find the function") ||
    message.includes("schema cache")
  ) {
    return "Newsletter signup is not fully configured yet. Please try again shortly.";
  }

  return "Could not save your subscription. Please try again.";
}

export async function subscribeToNewsletter(
  input: NewsletterSubscribeInput,
): Promise<NewsletterSubscribeResult> {
  if (!isNewsletterSubscribeConfigured()) {
    throw new NewsletterSubscribeError(
      "Newsletter signup is temporarily unavailable.",
      503,
    );
  }

  const { email, name, source } = validateNewsletterSubscribeInput(input);
  const supabase = createPublicServerClient();

  const { data, error } = await supabase.rpc("subscribe_to_newsletter", {
    p_email: email,
    p_name: name,
    p_source: source,
  });

  if (error) {
    const mappedMessage = mapRpcErrorMessage(error.message);
    const status =
      mappedMessage === "Email is required." ||
      mappedMessage === "Enter a valid email address."
        ? 400
        : 500;

    throw new NewsletterSubscribeError(mappedMessage, status);
  }

  if (!data || typeof data !== "object" || !("ok" in data) || data.ok !== true) {
    throw new NewsletterSubscribeError(
      "Could not save your subscription. Please try again.",
      500,
    );
  }

  return data as NewsletterSubscribeResult;
}
