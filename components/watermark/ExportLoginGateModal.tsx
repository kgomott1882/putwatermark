"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "../Button";
import { LoadingIndicator } from "../LoadingIndicator";
import { getAuthCallbackUrl } from "../../src/lib/authRedirect";
import { createClient } from "../../utils/supabase/client";

export type ExportLoginGatePhase = "auth" | "saving" | "verify-email";

type ExportLoginGateModalProps = {
  errorMessage?: string;
  noticeMessage?: string;
  onClose: () => void;
  onAuthenticated: () => void;
  open: boolean;
  phase: ExportLoginGatePhase;
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
}: ExportLoginGateModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [values, setValues] = useState<FormValues>(initialValues);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");

  useEffect(() => {
    if (!open) {
      setMode("login");
      setValues(initialValues);
      setFormError("");
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

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });

      if (error) {
        setFormError(
          error.message.toLowerCase().includes("invalid login credentials")
            ? "Invalid login credentials. Check your email and password, then try again."
            : error.message,
        );
        return;
      }

      if (!data.user?.email_confirmed_at) {
        setPendingVerificationEmail(values.email.trim());
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
            first_name: name,
            last_name: surname,
          },
          emailRedirectTo: `${getAuthCallbackUrl()}?next=${encodeURIComponent("/watermark")}`,
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

  const showVerifyEmail =
    phase === "verify-email" || Boolean(pendingVerificationEmail);

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
                Sign in to export your file
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ed-fg-muted" id={descriptionId}>
                Create a free account or log in to download your watermarked export. Your current
                edits are saved for 48 hours.
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

          {showVerifyEmail ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-ed-fg">
                Confirm your email
                {pendingVerificationEmail ? ` (${pendingVerificationEmail})` : ""}, then click
                Export again. Your draft stays saved for 48 hours.
              </p>
              <Button
                as="button"
                className="w-full border border-ed-border bg-transparent text-ed-fg hover:scale-100 hover:bg-ed-fg/10 hover:brightness-100"
                onClick={onClose}
                type="button"
              >
                Back to editor
              </Button>
            </div>
          ) : phase === "auth" ? (
            <>
              <div className="mb-4 flex editor-segment-track rounded-full p-1">
                <button
                  className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                    mode === "login"
                      ? "border-2 border-signal bg-ed-bg font-semibold text-ed-fg shadow-sm ring-2 ring-signal/25"
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
                      ? "border-2 border-signal bg-ed-bg font-semibold text-ed-fg shadow-sm ring-2 ring-signal/25"
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
