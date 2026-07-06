"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { Button } from "../../../components/Button";
import { createClient } from "../../../utils/supabase/client";

const minimumPasswordLength = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateForm() {
    if (newPassword.length < minimumPasswordLength) {
      setFormError("Password must be at least 8 characters.");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setSuccessMessage("Password updated.");
    window.setTimeout(() => {
      router.push("/account?password_updated=true");
    }, 900);
  }

  function clearMessages() {
    setFormError("");
    setSuccessMessage("");
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-paper px-6 py-16 text-ink sm:px-12 lg:px-20">
      <motion.section
        className="w-full max-w-md rounded-[2rem] border border-mist bg-paper p-8 shadow-2xl shadow-mist/60 sm:p-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-steel">
            New password
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink">
            Reset your password
          </h1>
          <p className="mt-4 text-sm leading-6 text-steel">
            Choose a new password for your account.
          </p>
        </div>

        {formError ? (
          <div className="mt-8 rounded-2xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-ink">
            {formError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-8 rounded-2xl border border-mist bg-mist/60 px-4 py-3 text-sm text-ink">
            {successMessage}
          </div>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="block text-sm font-medium text-steel"
              htmlFor="new-password"
            >
              New password
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-mist bg-paper px-4 py-3 text-ink outline-none transition placeholder:text-steel/60 focus:border-signal focus:ring-2 focus:ring-signal/20"
              id="new-password"
              minLength={minimumPasswordLength}
              name="new-password"
              onChange={(event) => {
                setNewPassword(event.target.value);
                clearMessages();
              }}
              required
              type="password"
              value={newPassword}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-steel"
              htmlFor="confirm-password"
            >
              Confirm password
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-mist bg-paper px-4 py-3 text-ink outline-none transition placeholder:text-steel/60 focus:border-signal focus:ring-2 focus:ring-signal/20"
              id="confirm-password"
              minLength={minimumPasswordLength}
              name="confirm-password"
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearMessages();
              }}
              required
              type="password"
              value={confirmPassword}
            />
          </div>

          <Button
            as="button"
            className="mt-2 w-full justify-center"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </Button>
        </form>
      </motion.section>
    </main>
  );
}
