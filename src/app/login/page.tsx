"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useMemo, useState } from "react";
import { Button } from "../../../components/Button";
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
    <main className="flex min-h-screen w-full items-center justify-center bg-paper px-6 py-16 text-ink sm:px-12 lg:px-20">
      <section className="w-full max-w-md rounded-[2rem] border border-platinum bg-paper p-8 shadow-2xl shadow-platinum/60 sm:p-10">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-battleship">
            Welcome back
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink">
            Log in
          </h1>
        </div>
      </section>
    </main>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  }

  function getLoginErrorMessage(message: string) {
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("email not confirmed")) {
      return "Email not confirmed. Please click the confirmation link we sent before logging in.";
    }

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
    <main className="flex min-h-screen w-full items-center justify-center bg-paper px-6 py-16 text-ink sm:px-12 lg:px-20">
      <motion.section
        className="w-full max-w-md rounded-[2rem] border border-platinum bg-paper p-8 shadow-2xl shadow-platinum/60 sm:p-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-battleship">
            Welcome back
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink">
            Log in
          </h1>
        </div>

        {isConfirmed ? (
          <div className="mt-8 rounded-2xl border border-platinum bg-platinum/60 px-4 py-3 text-sm text-ink">
            Email confirmed! You can now log in.
          </div>
        ) : null}

        {hasConfirmationError ? (
          <div className="mt-8 rounded-2xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-ink">
            We could not confirm your email. Please try the confirmation link
            again.
          </div>
        ) : null}

        {hasExpiredLinkError ? (
          <div className="mt-8 rounded-2xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-ink">
            That link has expired or was already used. Please sign up again or
            request a new confirmation email.
          </div>
        ) : null}

        {formError ? (
          <div className="mt-8 rounded-2xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-ink">
            {formError}
          </div>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-battleship" htmlFor="email">
              Email
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-platinum bg-paper px-4 py-3 text-ink outline-none transition placeholder:text-battleship/60 focus:border-signal focus:ring-2 focus:ring-signal/20"
              id="email"
              name="email"
              onChange={(event) => updateValue("email", event.target.value)}
              required
              type="email"
              value={values.email}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-battleship"
              htmlFor="password"
            >
              Password
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-platinum bg-paper px-4 py-3 text-ink outline-none transition placeholder:text-battleship/60 focus:border-signal focus:ring-2 focus:ring-signal/20"
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
              className="text-sm font-medium text-battleship transition hover:text-ink"
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
            <a className="font-medium text-ink transition hover:text-signal" href="/signup">
              Sign up
            </a>
          </p>
        </form>
      </motion.section>
    </main>
  );
}
