import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import { getAuthCallbackUrl } from "./authRedirect";

/** Must match Supabase Auth → Email → Email OTP expiration (seconds). */
export const SIGNUP_OTP_EXPIRY_SECONDS = 900;

/** Client resend cooldown; Supabase also enforces ~60s server-side. */
export const SIGNUP_OTP_RESEND_COOLDOWN_SECONDS = 60;

export function formatSignupOtpExpiryMinutes() {
  return Math.round(SIGNUP_OTP_EXPIRY_SECONDS / 60);
}

export function mapSignupOtpError(error: AuthError | null | undefined) {
  if (!error) {
    return "Something went wrong. Please try again.";
  }

  const message = error.message.toLowerCase();
  const code = (error as AuthError & { code?: string }).code?.toLowerCase() ?? "";

  if (
    code.includes("otp_expired") ||
    message.includes("expired") ||
    message.includes("invalid or has expired")
  ) {
    return "That code has expired. Request a new one below.";
  }

  if (
    code.includes("too_many") ||
    message.includes("too many") ||
    message.includes("rate limit") ||
    message.includes("after")
  ) {
    return "Too many attempts. Wait a minute, then try again or request a new code.";
  }

  if (
    message.includes("invalid") ||
    message.includes("token") ||
    message.includes("otp") ||
    code.includes("validation")
  ) {
    return "That code is incorrect. Check the email and try again.";
  }

  return error.message;
}

export async function verifySignupOtp(
  supabase: SupabaseClient,
  email: string,
  token: string,
) {
  return supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "signup",
  });
}

export async function resendSignupOtp(supabase: SupabaseClient, email: string) {
  return supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: {
      emailRedirectTo: getAuthCallbackUrl(),
    },
  });
}
