"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { CONTACT_TOPICS, type ContactTopic } from "../src/lib/contactForm";

type ContactSupportModalProps = {
  onClose: () => void;
  open: boolean;
};

type FormValues = {
  email: string;
  message: string;
  name: string;
  topic: ContactTopic;
};

const initialValues: FormValues = {
  email: "",
  message: "",
  name: "",
  topic: "general",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactSupportModal({ onClose, open }: ContactSupportModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose, open]);

  if (!open) {
    return null;
  }

  function updateValue<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFormError("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const name = values.name.trim();
    const email = values.email.trim();
    const message = values.message.trim();

    if (!name) {
      setFormError("Name is required.");
      return;
    }

    if (!email || !emailPattern.test(email)) {
      setFormError("Enter a valid email address.");
      return;
    }

    if (message.length < 10) {
      setFormError("Message must be at least 10 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        body: JSON.stringify({
          email,
          message,
          name,
          topic: values.topic,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        ok?: boolean;
      };

      if (!response.ok || !payload.ok) {
        setFormError(payload.error ?? "Could not send your message. Please try again.");
        return;
      }

      setValues(initialValues);
      setSuccessMessage(payload.message ?? "Thanks — we'll get back to you soon.");
    } catch {
      setFormError("Could not send your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
        onClick={isSubmitting ? undefined : onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ed-border bg-ed-panel shadow-[0_24px_80px_rgba(43,43,43,0.25)]">
        <div className="border-b border-ed-border bg-ed-bg-card px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ed-fg">
                Support
              </p>
              <h2 className="mt-1 text-lg font-semibold leading-snug text-ed-fg" id={titleId}>
                Contact us
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ed-fg-muted" id={descriptionId}>
                Send us a message and we&apos;ll reply to your email as soon as we can.
              </p>
            </div>

            <button
              aria-label="Close"
              className="rounded-full p-2 text-ed-fg-muted transition hover:bg-ed-fg/10 hover:text-ed-fg disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {successMessage ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-ed-border bg-ed-fg/5 px-4 py-3 text-sm text-ed-fg">
                {successMessage}
              </p>
              <Button as="button" className="w-full" onClick={onClose} type="button">
                Close
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {formError ? (
                <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800">
                  {formError}
                </p>
              ) : null}

              <label className="block text-sm text-ed-fg-muted">
                Name
                <input
                  autoComplete="name"
                  className="editor-field mt-2 px-4 py-3"
                  disabled={isSubmitting}
                  onChange={(event) => updateValue("name", event.target.value)}
                  required
                  value={values.name}
                />
              </label>

              <label className="block text-sm text-ed-fg-muted">
                Email
                <input
                  autoComplete="email"
                  className="editor-field mt-2 px-4 py-3"
                  disabled={isSubmitting}
                  onChange={(event) => updateValue("email", event.target.value)}
                  required
                  type="email"
                  value={values.email}
                />
              </label>

              <label className="block text-sm text-ed-fg-muted">
                Topic
                <select
                  className="editor-field mt-2 px-4 py-3"
                  disabled={isSubmitting}
                  onChange={(event) =>
                    updateValue("topic", event.target.value as ContactTopic)
                  }
                  value={values.topic}
                >
                  {CONTACT_TOPICS.map((topic) => (
                    <option key={topic.value} value={topic.value}>
                      {topic.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-ed-fg-muted">
                Message
                <textarea
                  className="editor-field mt-2 min-h-[120px] resize-y px-4 py-3"
                  disabled={isSubmitting}
                  onChange={(event) => updateValue("message", event.target.value)}
                  placeholder="How can we help?"
                  required
                  value={values.message}
                />
              </label>

              <Button as="button" className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Sending…" : "Send message"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
