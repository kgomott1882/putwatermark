"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useMemo, useState } from "react";
import { AuthPageCard, AuthPageShell } from "../../../components/auth/AuthPageCard";
import { Button } from "../../../components/Button";
import { getAuthCallbackUrl } from "../../lib/authRedirect";
import { createClient } from "../../../utils/supabase/client";

type FormValues = {
  email: string;
  password: string;
};

const initialValues: FormValues = {
  email: "",
  password: "",
};

function getSafeRedirectPath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/account";
  }

  return path;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <AuthPageShell>
      <AuthPageCard kicker="Welcome back" title="Log in" />
    </AuthPageShell>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const isConfirmed = searchParams.get("confirmed") === "true";
  const hasConfirmationError = searchParams.get("error") === "confirmation_failed";
  const hasExpiredLinkError = searchParams.get("error") === "link_expired";
  const nextPath = getSafeRedirectPath(searchParams.get("next"));

  function updateValue(key: keyof FormValues, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
    setFormError("");
    setResendMessage("");
    setShowResendConfirmation(false);
  }

  async function handleResendConfirmation() {
    const email = values.email.trim();

    if (!email) {
      setResendMessage("Enter your email address above, then resend confirmation.");
      return;
    }

    setIsResending(true);
    setResendMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });

    setIsResending(false);

    if (error) {
      setResendMessage(
        "Could not resend the confirmation email. Wait a minute and try again.",
      );
      return;
    }

    setResendMessage("Confirmation email sent. Check your inbox and spam folder.");
  }

  function getLoginErrorMessage(message: string) {
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("email not confirmed")) {
      setShowResendConfirmation(true);
      return "Email not confirmed. Click the confirmation link we sent, or resend it below.";
    }

    setShowResendConfirmation(false);

    if (normalizedMessage.includes("invalid login credentials")) {
      return "Invalid login credentials. Check your email and password, then try again.";
    }

    return message;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    });

    setIsSubmitting(false);

    if (error) {
      setFormError(getLoginErrorMessage(error.message));
      return;
    }

    router.push(nextPath);
  }

  return (
    <AuthPageShell>
      <AuthPageCard kicker="Welcome back" title="Log in">
        {isConfirmed ? (
          <div className="auth-notice mt-8">
            Email confirmed! You can now log in.
          </div>
        ) : null}

        {hasConfirmationError ? (
          <div className="auth-alert mt-8">
            We could not confirm your email. Please try the confirmation link
            again.
          </div>
        ) : null}

        {hasExpiredLinkError ? (
          <div className="auth-alert mt-8">
            That link has expired or was already used. Please sign up again or
            request a new confirmation email.
          </div>
        ) : null}

        {formError ? <div className="auth-alert mt-8">{formError}</div> : null}

        {resendMessage ? (
          <div className="auth-notice mt-4">{resendMessage}</div>
        ) : null}

        {showResendConfirmation || hasExpiredLinkError ? (
          <div className="mt-4 text-center">
            <button
              className="text-sm font-medium text-battleship underline decoration-ink/10 underline-offset-4 transition hover:text-signal hover:decoration-signal disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isResending}
              onClick={handleResendConfirmation}
              type="button"
            >
              {isResending ? "Sending..." : "Resend confirmation email"}
            </button>
          </div>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <input
              className="auth-input"
              id="email"
              name="email"
              onChange={(event) => updateValue("email", event.target.value)}
              required
              type="email"
              value={values.email}
            />
          </div>

          <div>
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <input
              className="auth-input"
              id="password"
              name="password"
              onChange={(event) => updateValue("password", event.target.value)}
              required
              type="password"
              value={values.password}
            />
          </div>

          <div className="flex justify-end">
            <a
              className="text-sm font-medium text-battleship transition hover:text-signal"
              href="/forgot-password"
            >
              Forgot your password?
            </a>
          </div>

          <Button
            as="button"
            className="mt-2 w-full justify-center"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>

          <p className="text-center text-sm text-battleship">
            Don&apos;t have an account?{" "}
            <a className="auth-link" href="/signup">
              Sign up
            </a>
          </p>
        </form>
      </AuthPageCard>
    </AuthPageShell>
  );
}
