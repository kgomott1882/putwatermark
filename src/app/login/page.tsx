"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useMemo, useState } from "react";
import { AuthMethodChoice } from "../../../components/auth/AuthMethodChoice";
import { AuthPageCard, AuthPageShell } from "../../../components/auth/AuthPageCard";
import { EmailOtpVerification } from "../../../components/auth/EmailOtpVerification";
import { Button } from "../../../components/Button";
import { signInWithGoogle } from "../../lib/authOAuth";
import { getSafeRedirectPath } from "../../lib/authRedirect";
import { createClient } from "../../../utils/supabase/client";

type FormValues = {
  email: string;
  password: string;
};

const initialValues: FormValues = {
  email: "",
  password: "",
};

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
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const hasConfirmationError = searchParams.get("error") === "confirmation_failed";
  const hasExpiredLinkError = searchParams.get("error") === "link_expired";
  const nextPath = getSafeRedirectPath(searchParams.get("next"));
  const skipMethodChoice = hasConfirmationError || hasExpiredLinkError;
  const [authMethod, setAuthMethod] = useState<"choice" | "email">(
    skipMethodChoice ? "email" : "choice",
  );
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  function updateValue(key: keyof FormValues, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
    setFormError("");
  }

  function getLoginErrorMessage(message: string) {
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("email not confirmed")) {
      setPendingVerificationEmail(values.email.trim());
      return "";
    }

    if (normalizedMessage.includes("invalid login credentials")) {
      return "Invalid login credentials. Check your email and password, then try again.";
    }

    return message;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setPendingVerificationEmail("");
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    });

    setIsSubmitting(false);

    if (error) {
      const message = getLoginErrorMessage(error.message);
      if (message) {
        setFormError(message);
      }
      return;
    }

    if (!data.user?.email_confirmed_at) {
      setPendingVerificationEmail(values.email.trim());
      return;
    }

    router.push(nextPath);
  }

  function handleOtpVerified() {
    router.push(nextPath);
  }

  function handleDismissOtpVerification() {
    setPendingVerificationEmail("");
  }

  async function handleContinueWithGoogle() {
    setGoogleError("");
    setIsGoogleLoading(true);

    try {
      const { error } = await signInWithGoogle(supabase, nextPath);

      if (error) {
        setGoogleError(error.message);
      }
    } catch {
      setGoogleError("Could not start Google sign-in. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  }

  const showOtpVerification = Boolean(pendingVerificationEmail);
  const showMethodChoice = !showOtpVerification && authMethod === "choice";
  const showLoginForm = !showOtpVerification && authMethod === "email";

  return (
    <AuthPageShell>
      <AuthPageCard
        kicker={showOtpVerification ? "Almost there" : "Welcome back"}
        lead={
          showOtpVerification
            ? "Enter the verification code we sent to your email."
            : showMethodChoice
              ? "Choose how you want to log in."
              : undefined
        }
        title={showOtpVerification ? "Verify your email" : "Log in"}
      >
        {hasConfirmationError ? (
          <div className="auth-alert mt-8">
            We could not confirm your email automatically. Enter the verification code
            below, or request a new one.
          </div>
        ) : null}

        {hasExpiredLinkError ? (
          <div className="auth-alert mt-8">
            That confirmation link has expired or was already used. Enter a new
            verification code below, or request another one.
          </div>
        ) : null}

        {showOtpVerification ? (
          <div className="mt-8">
            <EmailOtpVerification
              key={pendingVerificationEmail}
              dismissLabel="Back to log in"
              email={pendingVerificationEmail}
              onDismiss={handleDismissOtpVerification}
              onVerified={handleOtpVerified}
            />
          </div>
        ) : showMethodChoice ? (
          <AuthMethodChoice
            footer={
              <>
                Don&apos;t have an account?{" "}
                <a className="auth-link" href="/signup">
                  Sign up
                </a>
              </>
            }
            googleError={googleError}
            isGoogleLoading={isGoogleLoading}
            onContinueWithEmail={() => {
              setGoogleError("");
              setAuthMethod("email");
            }}
            onContinueWithGoogle={handleContinueWithGoogle}
          />
        ) : showLoginForm ? (
          <>
            {formError ? <div className="auth-alert mt-8">{formError}</div> : null}

            {!skipMethodChoice ? (
              <button
                className="auth-link mt-8 text-sm"
                onClick={() => setAuthMethod("choice")}
                type="button"
              >
                ← Other log-in options
              </button>
            ) : null}

            <form
              className={skipMethodChoice ? "mt-8 space-y-5" : "mt-4 space-y-5"}
              onSubmit={handleSubmit}
            >
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
          </>
        ) : null}
      </AuthPageCard>
    </AuthPageShell>
  );
}
