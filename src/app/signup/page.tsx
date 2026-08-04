"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { AuthPageCard, AuthPageShell } from "../../../components/auth/AuthPageCard";
import { EmailOtpVerification } from "../../../components/auth/EmailOtpVerification";
import { Button } from "../../../components/Button";
import { createClient } from "../../../utils/supabase/client";

type FormValues = {
  name: string;
  surname: string;
  email: string;
  password: string;
  marketingConsent: boolean;
};

type FormErrors = Partial<
  Record<keyof Omit<FormValues, "marketingConsent">, string>
>;

const initialValues: FormValues = {
  name: "",
  surname: "",
  email: "",
  password: "",
  marketingConsent: false,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchEmailStatus(email: string) {
    const response = await fetch("/api/auth/email-exists", {
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      confirmed?: boolean;
      exists?: boolean;
    };

    return {
      confirmed: Boolean(payload.confirmed),
      exists: Boolean(payload.exists),
    };
  }

  function showVerificationPending(email: string) {
    setPendingEmail(email);
    setAccountExists(false);
    setValues(initialValues);
  }

  async function resolveExistingEmail(email: string) {
    const status = await fetchEmailStatus(email);

    if (!status?.exists) {
      return false;
    }

    if (status.confirmed) {
      setAccountExists(true);
      return true;
    }

    showVerificationPending(email);
    return true;
  }

  function updateValue<Key extends keyof FormValues>(
    key: Key,
    value: FormValues[Key],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [key]: undefined,
    }));
    setFormError("");
    setAccountExists(false);
  }

  function validateForm() {
    const nextErrors: FormErrors = {};
    const name = values.name.trim();
    const surname = values.surname.trim();
    const email = values.email.trim();

    if (!name) {
      nextErrors.name = "Name is required.";
    }

    if (!surname) {
      nextErrors.surname = "Surname is required.";
    }

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    } else if (values.password.length < minimumPasswordLength) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setAccountExists(false);
    setPendingEmail("");

    if (!validateForm()) {
      return;
    }

    const email = values.email.trim();
    setIsSubmitting(true);

    try {
      if (await resolveExistingEmail(email)) {
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: {
            name: values.name.trim(),
            surname: values.surname.trim(),
            marketing_consent: values.marketingConsent,
          },
        },
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data.session?.user?.email_confirmed_at) {
        router.push("/account");
        return;
      }

      const identities = data.user?.identities ?? [];

      if (data.user && identities.length === 0) {
        if (await resolveExistingEmail(email)) {
          return;
        }

        setAccountExists(true);
        return;
      }

      showVerificationPending(email);
    } catch {
      setFormError("Could not create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOtpVerified() {
    router.push("/account");
  }

  function handleDismissOtpVerification() {
    setPendingEmail("");
  }

  const isVerificationPending = Boolean(pendingEmail) && !accountExists;
  const showSignupForm = !isVerificationPending && !accountExists;

  return (
    <AuthPageShell>
      <AuthPageCard
        kicker={isVerificationPending ? "Almost there" : "Start free"}
        lead={
          isVerificationPending
            ? "We sent a verification code to your email."
            : "Verify your email before logging in."
        }
        title={isVerificationPending ? "Verify your email" : "Create your account"}
      >
        {accountExists ? (
          <div className="auth-alert mt-8 px-4 py-4">
            <p className="font-semibold">An account with this email already exists.</p>
            <p className="mt-2 leading-6">
              Log in with your email and password to continue.
            </p>
            <Link
              className="mt-4 inline-flex rounded-full bg-signal px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:brightness-95"
              href="/login"
            >
              Go to log in
            </Link>
          </div>
        ) : null}

        {isVerificationPending ? (
          <div className="mt-8">
            <EmailOtpVerification
              key={pendingEmail}
              dismissLabel="Back to signup"
              email={pendingEmail}
              onDismiss={handleDismissOtpVerification}
              onVerified={handleOtpVerified}
            />
            <p className="mt-6 text-center text-sm text-battleship">
              Already verified?{" "}
              <Link className="auth-link" href="/login">
                Log in
              </Link>
            </p>
          </div>
        ) : showSignupForm ? (
          <>
            {formError ? <div className="auth-alert mt-8">{formError}</div> : null}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
              <Field
                error={errors.name}
                label="Name"
                name="name"
                onChange={(value) => updateValue("name", value)}
                value={values.name}
              />
              <Field
                error={errors.surname}
                label="Surname"
                name="surname"
                onChange={(value) => updateValue("surname", value)}
                value={values.surname}
              />
              <Field
                error={errors.email}
                label="Email"
                name="email"
                onChange={(value) => updateValue("email", value)}
                type="email"
                value={values.email}
              />
              <Field
                error={errors.password}
                label="Password"
                name="password"
                onChange={(value) => updateValue("password", value)}
                type="password"
                value={values.password}
              />

              <label className="flex items-start gap-3 text-sm leading-6 text-battleship">
                <input
                  checked={values.marketingConsent}
                  className="mt-1 h-4 w-4 rounded border-ink/10 text-signal focus:ring-signal"
                  onChange={(event) =>
                    updateValue("marketingConsent", event.target.checked)
                  }
                  type="checkbox"
                />
                <span>
                  I&apos;d like to receive occasional emails about PutWatermark
                </span>
              </label>

              <p className="text-sm leading-6 text-battleship">
                By creating an account, you agree to our{" "}
                <Link
                  className="auth-link underline decoration-ink/10 underline-offset-4 hover:decoration-signal"
                  href="/terms"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  className="auth-link underline decoration-ink/10 underline-offset-4 hover:decoration-signal"
                  href="/privacy"
                >
                  Privacy Policy
                </Link>
                .
              </p>

              <Button
                as="button"
                className="mt-2 w-full justify-center"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-battleship">
              Already have an account?{" "}
              <Link className="auth-link" href="/login">
                Log in
              </Link>
            </p>
          </>
        ) : null}
      </AuthPageCard>
    </AuthPageShell>
  );
}

type FieldProps = {
  error?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  type?: "email" | "password" | "text";
  value: string;
};

function Field({
  error,
  label,
  name,
  onChange,
  type = "text",
  value,
}: FieldProps) {
  return (
    <div>
      <label className="auth-label" htmlFor={name}>
        {label}
      </label>
      <input
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="auth-input"
        id={name}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error ? (
        <p className="mt-2 text-sm text-signal" id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
