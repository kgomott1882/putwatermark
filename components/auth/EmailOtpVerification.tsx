"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../Button";
import {
  formatSignupOtpExpiryMinutes,
  mapSignupOtpError,
  resendSignupOtp,
  SIGNUP_OTP_RESEND_COOLDOWN_SECONDS,
  verifySignupOtp,
} from "../../src/lib/authOtp";
import { createClient } from "../../utils/supabase/client";

type EmailOtpVerificationProps = {
  className?: string;
  dismissLabel?: string;
  email: string;
  onDismiss?: () => void;
  onVerified: () => void;
  variant?: "auth" | "editor";
};

export function EmailOtpVerification({
  className = "",
  dismissLabel = "Cancel",
  email,
  onDismiss,
  onVerified,
  variant = "auth",
}: EmailOtpVerificationProps) {
  const supabase = useMemo(() => createClient(), []);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldownSeconds]);

  const inputClassName =
    variant === "editor"
      ? "editor-field mt-2 px-4 py-3 text-center text-lg tracking-[0.35em]"
      : "auth-input text-center text-lg tracking-[0.35em]";

  const noticeClassName =
    variant === "editor"
      ? "rounded-xl border border-ed-border bg-ed-fg/5 px-4 py-3 text-sm text-ed-fg"
      : "auth-notice";

  const alertClassName =
    variant === "editor"
      ? "rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800"
      : "auth-alert";

  async function handleVerify() {
    const normalizedToken = token.replace(/\D/g, "");

    if (normalizedToken.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setIsVerifying(true);
    setError("");
    setInfoMessage("");

    const { error: verifyError } = await verifySignupOtp(
      supabase,
      email,
      normalizedToken,
    );

    setIsVerifying(false);

    if (verifyError) {
      setError(mapSignupOtpError(verifyError));
      return;
    }

    onVerified();
  }

  async function handleResend() {
    if (resendCooldownSeconds > 0 || isResending) {
      return;
    }

    setIsResending(true);
    setError("");
    setInfoMessage("");

    const { error: resendError } = await resendSignupOtp(supabase, email);

    setIsResending(false);

    if (resendError) {
      setError(mapSignupOtpError(resendError));
      return;
    }

    setToken("");
    setInfoMessage("A new code has been sent. Check your inbox and spam folder.");
    setResendCooldownSeconds(SIGNUP_OTP_RESEND_COOLDOWN_SECONDS);
  }

  return (
    <div className={className}>
      <p
        className={
          variant === "editor"
            ? "text-sm leading-relaxed text-ed-fg"
            : "text-sm leading-6 text-battleship"
        }
      >
        Enter the 6-digit code sent to{" "}
        <span className="font-medium text-ink">{email}</span>. It expires in{" "}
        {formatSignupOtpExpiryMinutes()} minutes.
      </p>

      <label
        className={`block ${variant === "editor" ? "mt-4 text-sm text-ed-fg-muted" : "mt-6"}`}
        htmlFor="signup-otp-code"
      >
        {variant === "editor" ? "Verification code" : (
          <span className="auth-label">Verification code</span>
        )}
        <input
          autoComplete="one-time-code"
          className={inputClassName}
          id="signup-otp-code"
          inputMode="numeric"
          maxLength={6}
          name="otp"
          onChange={(event) => {
            const nextValue = event.target.value.replace(/\D/g, "").slice(0, 6);
            setToken(nextValue);
            setError("");
            setInfoMessage("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleVerify();
            }
          }}
          pattern="[0-9]*"
          placeholder="000000"
          type="text"
          value={token}
        />
      </label>

      {error ? <p className={`${alertClassName} mt-4`}>{error}</p> : null}
      {infoMessage ? <p className={`${noticeClassName} mt-4`}>{infoMessage}</p> : null}

      <Button
        as="button"
        className={`w-full justify-center ${variant === "editor" ? "mt-4" : "mt-5"}`}
        disabled={isVerifying || token.length !== 6}
        onClick={() => void handleVerify()}
        type="button"
      >
        {isVerifying ? "Verifying..." : "Verify"}
      </Button>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          className={
            variant === "editor"
              ? "text-sm font-medium text-ed-fg underline decoration-ed-fg/20 underline-offset-4 transition hover:text-signal disabled:cursor-not-allowed disabled:opacity-50"
              : "text-sm font-medium text-battleship underline decoration-ink/10 underline-offset-4 transition hover:text-signal hover:decoration-signal disabled:cursor-not-allowed disabled:opacity-60"
          }
          disabled={isResending || resendCooldownSeconds > 0}
          onClick={() => void handleResend()}
          type="button"
        >
          {isResending
            ? "Sending..."
            : resendCooldownSeconds > 0
              ? `Resend code (${resendCooldownSeconds}s)`
              : "Resend code"}
        </button>

        {onDismiss ? (
          <button
            className={
              variant === "editor"
                ? "text-sm font-medium text-ed-fg-muted transition hover:text-ed-fg"
                : "text-sm font-medium text-battleship transition hover:text-signal"
            }
            onClick={onDismiss}
            type="button"
          >
            {dismissLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
