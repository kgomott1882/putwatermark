"use client";

import { motion } from "framer-motion";
import { type FormEvent, useMemo, useState } from "react";
import { Button } from "../../../components/Button";
import { getPasswordResetRedirectUrl } from "../../lib/authRedirect";
import { createClient } from "../../../utils/supabase/client";

const successMessage = "Check your email for a password reset link";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setMessage("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getPasswordResetRedirectUrl(),
    });

    setIsSubmitting(false);

    if (error) {
      setFormError("Something went wrong. Please try again.");
      return;
    }

    setEmail("");
    setMessage(successMessage);
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
            Password reset
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink">
            Forgot your password?
          </h1>
          <p className="mt-4 text-sm leading-6 text-battleship">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        {formError ? (
          <div className="mt-8 rounded-2xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-ink">
            {formError}
          </div>
        ) : null}

        {message ? (
          <div className="mt-8 rounded-2xl border border-platinum bg-platinum/60 px-4 py-3 text-sm text-ink">
            {message}
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
              onChange={(event) => {
                setEmail(event.target.value);
                setFormError("");
                setMessage("");
              }}
              required
              type="email"
              value={email}
            />
          </div>

          <Button
            as="button"
            className="mt-2 w-full justify-center"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>

          <p className="text-center text-sm text-battleship">
            Remember your password?{" "}
            <a className="font-medium text-ink transition hover:text-signal" href="/login">
              Log in
            </a>
          </p>
        </form>
      </motion.section>
    </main>
  );
}
