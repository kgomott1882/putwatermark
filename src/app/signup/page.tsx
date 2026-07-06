"use client";

import { motion } from "framer-motion";
import { type FormEvent, useMemo, useState } from "react";
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
  const supabase = useMemo(() => createClient(), []);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setSuccessMessage("");
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
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          name: values.name.trim(),
          surname: values.surname.trim(),
          marketing_consent: values.marketingConsent,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setValues(initialValues);
    setSuccessMessage("Check your email to verify your PutWatermark account.");
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
            Start free
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink">
            Create your account
          </h1>
          <p className="mt-4 text-sm leading-6 text-steel">
            Verify your email before logging in.
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

          <label className="flex items-start gap-3 text-sm leading-6 text-steel">
            <input
              checked={values.marketingConsent}
              className="mt-1 h-4 w-4 rounded border-mist text-signal focus:ring-signal"
              onChange={(event) =>
                updateValue("marketingConsent", event.target.checked)
              }
              type="checkbox"
            />
            <span>
              I&apos;d like to receive occasional emails about PutWatermark
            </span>
          </label>

          <Button
            as="button"
            className="mt-2 w-full justify-center"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>
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
        className="block text-sm font-medium text-steel"
        htmlFor={name}
      >
        {label}
      </label>
      <input
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="mt-2 w-full rounded-2xl border border-mist bg-paper px-4 py-3 text-ink outline-none transition placeholder:text-steel/60 focus:border-signal focus:ring-2 focus:ring-signal/20"
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
