"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { type FormEvent, useMemo, useState } from "react";
import { Button } from "../../../components/Button";
import { getAuthCallbackUrl } from "../../lib/authRedirect";
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

const verificationPendingMessage =
  "Check your email to verify your PutWatermark account. If nothing arrives in a few minutes, check spam or resend below.";

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

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
    setResendMessage("");
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

  async function handleResendConfirmation(email: string) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setResendMessage("");
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
          emailRedirectTo: getAuthCallbackUrl(),
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

      setPendingEmail(email);

      if (data.session) {
        router.push("/account");
        return;
      }

      const identities = data.user?.identities ?? [];

      if (data.user && identities.length === 0) {
        setPendingEmail("");

        if (await resolveExistingEmail(email)) {
          return;
        }

        setAccountExists(true);
        return;
      }

      setValues(initialValues);
    } catch {
      setFormError("Could not create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isVerificationPending = Boolean(pendingEmail) && !accountExists;
  const showSignupForm = !isVerificationPending && !accountExists;

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-paper px-6 py-16 text-ink sm:px-12 lg:px-20">
      <motion.section
        className="w-full max-w-md rounded-[2rem] border border-platinum bg-paper p-8 shadow-2xl shadow-platinum/60 sm:p-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-battleship">
            {isVerificationPending ? "Almost there" : "Start free"}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink">
            {isVerificationPending ? "Check your email" : "Create your account"}
          </h1>
          <p className="mt-4 text-sm leading-6 text-battleship">
            {isVerificationPending
              ? `We sent a confirmation link to ${pendingEmail}.`
              : "Verify your email before logging in."}
          </p>
        </div>

        {accountExists ? (
          <div className="mt-8 rounded-2xl border border-signal/30 bg-signal/10 px-4 py-4 text-sm text-ink">
            <p className="font-semibold">An account with this email already exists.</p>
            <p className="mt-2 leading-6">
              Log in with your email and password to continue.
            </p>
            <Link
              className="mt-4 inline-flex rounded-full bg-signal px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-night transition hover:bg-signal/90"
              href="/login"
            >
              Go to log in
            </Link>
          </div>
        ) : null}

        {isVerificationPending ? (
          <div className="mt-8 rounded-2xl border border-platinum bg-platinum/60 px-5 py-5 text-sm leading-6 text-ink">
            <p>{verificationPendingMessage}</p>
            {resendMessage ? (
              <p className="mt-4 rounded-xl border border-platinum bg-paper px-4 py-3 text-sm text-ink">
                {resendMessage}
              </p>
            ) : null}
            <button
              className="mt-5 text-sm font-medium text-ink underline decoration-platinum underline-offset-4 transition hover:text-signal hover:decoration-signal disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isResending}
              onClick={() => handleResendConfirmation(pendingEmail)}
              type="button"
            >
              {isResending ? "Sending..." : "Resend confirmation email"}
            </button>
            <p className="mt-6 text-center text-sm text-battleship">
              Already confirmed?{" "}
              <Link
                className="font-medium text-ink transition hover:text-signal"
                href="/login"
              >
                Log in
              </Link>
            </p>
          </div>
        ) : showSignupForm ? (
          <>
            {formError ? (
              <div className="mt-8 rounded-2xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-ink">
                {formError}
              </div>
            ) : null}

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
                  className="mt-1 h-4 w-4 rounded border-platinum text-signal focus:ring-signal"
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
                  className="font-medium text-ink underline decoration-platinum underline-offset-4 transition hover:text-signal hover:decoration-signal"
                  href="/terms"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  className="font-medium text-ink underline decoration-platinum underline-offset-4 transition hover:text-signal hover:decoration-signal"
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
              <Link
                className="font-medium text-ink transition hover:text-signal"
                href="/login"
              >
                Log in
              </Link>
            </p>
          </>
        ) : null}
      </motion.section>
    </main>
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
      <label
        className="block text-sm font-medium text-battleship"
        htmlFor={name}
      >
        {label}
      </label>
      <input
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="mt-2 w-full rounded-2xl border border-platinum bg-paper px-4 py-3 text-ink outline-none transition placeholder:text-battleship/60 focus:border-signal focus:ring-2 focus:ring-signal/20"
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
