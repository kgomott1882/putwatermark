"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { EmailOtpVerification } from "../auth/EmailOtpVerification";
import { Button } from "../Button";
import { LoadingIndicator } from "../LoadingIndicator";
import { createClient } from "../../utils/supabase/client";
import { signInWithGoogle } from "@/lib/authOAuth";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/authRedirect";

export type ExportLoginGatePhase = "auth" | "saving" | "verify-email";

type ExportLoginGateModalProps = {
  errorMessage?: string;
  noticeMessage?: string;
  onClose: () => void;
  onAuthenticated: () => void;
  open: boolean;
  phase: ExportLoginGatePhase;
  verificationEmail?: string;
};

type AuthMode = "login" | "signup";

type FormValues = {
  email: string;
  name: string;
  password: string;
  surname: string;
};

const initialValues: FormValues = {
  email: "",
  name: "",
  password: "",
  surname: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;

export function ExportLoginGateModal({
  errorMessage = "",
  noticeMessage = "",
  onClose,
  onAuthenticated,
  open,
  phase,
  verificationEmail = "",
}: ExportLoginGateModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [values, setValues] = useState<FormValues>(initialValues);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");

  useEffect(() => {
    if (!open) {
      setMode("login");
      setValues(initialValues);
      setFormError("");
      setGoogleError("");
      setPendingVerificationEmail("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && phase !== "saving") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, phase]);

  if (!open) {
    return null;
  }

  function updateValue<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFormError("");
  }

  async function handleContinueWithGoogle() {
    setGoogleError("");
    setIsGoogleLoading(true);

    try {
      const { error } = await signInWithGoogle(supabase, DEFAULT_POST_AUTH_PATH);

      if (error) {
        setGoogleError(error.message);
      }
    } catch {
      setGoogleError("Could not start Google sign-in. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const email = values.email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      });

      if (error) {
        const normalizedMessage = error.message.toLowerCase();

        if (normalizedMessage.includes("email not confirmed")) {
          setPendingVerificationEmail(email);
          setFormError("");
          return;
        }

        setFormError(
          normalizedMessage.includes("invalid login credentials")
            ? "Invalid login credentials. Check your email and password, then try again."
            : error.message,
        );
        return;
      }

      if (!data.user?.email_confirmed_at) {
        setPendingVerificationEmail(email);
        setFormError("");
        return;
      }

      onAuthenticated();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const email = values.email.trim();
    const name = values.name.trim();
    const surname = values.surname.trim();

    if (!name || !surname || !email || !emailPattern.test(email)) {
      setFormError("Enter your name, surname, and a valid email address.");
      return;
    }

    if (values.password.length < minimumPasswordLength) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: {
            name,
            surname,
            marketing_consent: false,
          },
        },
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data.session?.user?.email_confirmed_at) {
        onAuthenticated();
        return;
      }

      setPendingVerificationEmail(email);
      setValues(initialValues);
    } finally {
      setIsSubmitting(false);
    }
  }

  const otpEmail = pendingVerificationEmail || verificationEmail;
  const showVerifyEmail = phase === "verify-email" || Boolean(otpEmail);

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ed-fg/45 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ed-border bg-ed-panel shadow-[0_24px_80px_rgba(43,43,43,0.25)]">
        <div className="border-b border-ed-border bg-ed-bg-card px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ed-fg">
                Export
              </p>
              <h2 className="mt-1 text-lg font-semibold leading-snug text-ed-fg" id={titleId}>
                {showVerifyEmail ? "Verify your email" : "Sign in to export your file"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ed-fg-muted" id={descriptionId}>
                {showVerifyEmail
                  ? "Enter the code we sent to your email to finish verifying your account. Your current edits stay saved for 48 hours."
                  : "Create a free account or log in to download your watermarked export. Your current edits are saved for 48 hours."}
              </p>
            </div>

            {phase !== "saving" ? (
              <button
                aria-label="Close"
                className="rounded-full p-2 text-ed-fg-muted transition hover:bg-ed-fg/10 hover:text-ed-fg"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="px-6 py-5">
          {phase === "saving" ? (
            <LoadingIndicator label="Saving your work before sign-in…" mutedClassName="text-ed-fg-muted" size="sm" />
          ) : null}

          {noticeMessage ? (
            <p className="mb-4 rounded-xl border border-ed-border bg-ed-fg/5 px-4 py-3 text-sm text-ed-fg">
              {noticeMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800">
              {errorMessage}
            </p>
          ) : null}

          {showVerifyEmail && otpEmail ? (
            <EmailOtpVerification
              key={otpEmail}
              dismissLabel="Back to editor"
              email={otpEmail}
              onDismiss={onClose}
              onVerified={onAuthenticated}
              variant="editor"
            />
          ) : phase === "auth" ? (
            <>
              {googleError ? (
                <p className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800">
                  {googleError}
                </p>
              ) : null}

              <button
                className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-ed-border bg-ed-bg px-4 py-3 text-sm font-semibold text-ed-fg transition hover:border-signal/40 hover:bg-ed-bg-card disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isGoogleLoading || isSubmitting}
                onClick={() => {
                  void handleContinueWithGoogle();
                }}
                type="button"
              >
                <GoogleIcon />
                {isGoogleLoading ? "Redirecting…" : "Continue with Google"}
              </button>

              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-ed-border" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ed-fg-muted">
                  or
                </span>
                <div className="h-px flex-1 bg-ed-border" />
              </div>

              <div className="mb-4 flex editor-segment-track rounded-full p-1">
                <button
                  className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                    mode === "login"
                      ? "editor-selected-pill"
                      : "text-ed-fg-muted hover:text-ed-fg"
                  }`}
                  onClick={() => setMode("login")}
                  type="button"
                >
                  Log in
                </button>
                <button
                  className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                    mode === "signup"
                      ? "editor-selected-pill"
                      : "text-ed-fg-muted hover:text-ed-fg"
                  }`}
                  onClick={() => setMode("signup")}
                  type="button"
                >
                  Sign up
                </button>
              </div>

              {formError ? (
                <p className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800">
                  {formError}
                </p>
              ) : null}

              {mode === "login" ? (
                <form className="space-y-4" onSubmit={handleLoginSubmit}>
                  <label className="block text-sm text-ed-fg-muted">
                    Email
                    <input
                      autoComplete="email"
                      className="editor-field mt-2 px-4 py-3"
                      onChange={(event) => updateValue("email", event.target.value)}
                      required
                      type="email"
                      value={values.email}
                    />
                  </label>
                  <label className="block text-sm text-ed-fg-muted">
                    Password
                    <input
                      autoComplete="current-password"
                      className="editor-field mt-2 px-4 py-3"
                      onChange={(event) => updateValue("password", event.target.value)}
                      required
                      type="password"
                      value={values.password}
                    />
                  </label>
                  <Button as="button" className="w-full" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Signing in…" : "Continue to export"}
                  </Button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleSignupSubmit}>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm text-ed-fg-muted">
                      Name
                      <input
                        autoComplete="given-name"
                        className="editor-field mt-2 px-4 py-3"
                        onChange={(event) => updateValue("name", event.target.value)}
                        required
                        value={values.name}
                      />
                    </label>
                    <label className="block text-sm text-ed-fg-muted">
                      Surname
                      <input
                        autoComplete="family-name"
                        className="editor-field mt-2 px-4 py-3"
                        onChange={(event) => updateValue("surname", event.target.value)}
                        required
                        value={values.surname}
                      />
                    </label>
                  </div>
                  <label className="block text-sm text-ed-fg-muted">
                    Email
                    <input
                      autoComplete="email"
                      className="editor-field mt-2 px-4 py-3"
                      onChange={(event) => updateValue("email", event.target.value)}
                      required
                      type="email"
                      value={values.email}
                    />
                  </label>
                  <label className="block text-sm text-ed-fg-muted">
                    Password
                    <input
                      autoComplete="new-password"
                      className="editor-field mt-2 px-4 py-3"
                      onChange={(event) => updateValue("password", event.target.value)}
                      required
                      type="password"
                      value={values.password}
                    />
                  </label>
                  <Button as="button" className="w-full" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Creating account…" : "Create account and export"}
                  </Button>
                </form>
              )}

              <p className="mt-4 text-center text-xs text-ed-fg-muted">
                Prefer the full page?{" "}
                <Link className="text-ed-fg underline-offset-2 hover:underline" href="/login">
                  Log in
                </Link>{" "}
                or{" "}
                <Link className="text-ed-fg underline-offset-2 hover:underline" href="/signup">
                  sign up
                </Link>
                .
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
