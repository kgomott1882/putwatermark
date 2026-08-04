import { Resend } from "resend";
import {
  buildContactFormNotificationEmail,
  buildContactFormNotificationSubject,
} from "./contactFormEmailTemplate";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxNameLength = 120;
const maxEmailLength = 320;
const maxMessageLength = 5000;
const minMessageLength = 10;

export const CONTACT_TOPICS = [
  { label: "General", value: "general" },
  { label: "Support", value: "support" },
  { label: "Billing", value: "billing" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export type ContactFormInput = {
  email: string;
  message: string;
  name: string;
  topic: string;
};

export type ContactFormResult = {
  message: string;
  ok: true;
};

export class ContactFormError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ContactFormError";
    this.status = status;
  }
}

function normalizeTopic(topic: string): ContactTopic {
  const normalized = topic.trim().toLowerCase();

  if (
    CONTACT_TOPICS.some((entry) => entry.value === normalized)
  ) {
    return normalized as ContactTopic;
  }

  throw new ContactFormError("Choose a valid topic.");
}

export function validateContactFormInput(input: ContactFormInput) {
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const message = input.message?.trim() ?? "";
  const topic = normalizeTopic(input.topic ?? "");

  if (!name) {
    throw new ContactFormError("Name is required.");
  }

  if (name.length > maxNameLength) {
    throw new ContactFormError("Name is too long.");
  }

  if (!email) {
    throw new ContactFormError("Email is required.");
  }

  if (email.length > maxEmailLength || !emailPattern.test(email)) {
    throw new ContactFormError("Enter a valid email address.");
  }

  if (message.length < minMessageLength) {
    throw new ContactFormError("Message must be at least 10 characters.");
  }

  if (message.length > maxMessageLength) {
    throw new ContactFormError("Message is too long.");
  }

  return { email, message, name, topic };
}

export function isContactFormConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      process.env.CONTACT_FROM_EMAIL?.trim() &&
      process.env.CONTACT_TO_EMAIL?.trim(),
  );
}

function getTopicLabel(topic: ContactTopic) {
  return CONTACT_TOPICS.find((entry) => entry.value === topic)?.label ?? topic;
}

export async function sendContactFormEmail(
  input: ReturnType<typeof validateContactFormInput>,
): Promise<ContactFormResult> {
  if (!isContactFormConfigured()) {
    throw new ContactFormError(
      "Contact form is not fully configured yet. Please try again shortly.",
      503,
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY!.trim());
  const from = process.env.CONTACT_FROM_EMAIL!.trim();
  const to = process.env.CONTACT_TO_EMAIL!.trim();
  const topicLabel = getTopicLabel(input.topic);
  const notification = buildContactFormNotificationEmail({
    email: input.email,
    message: input.message,
    name: input.name,
    topicLabel,
  });

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: input.email,
    subject: buildContactFormNotificationSubject({
      name: input.name,
      topicLabel,
    }),
    text: notification.text,
    html: notification.html,
  });

  if (error) {
    throw new ContactFormError(
      "Could not send your message. Please try again in a moment.",
      502,
    );
  }

  return {
    message: "Thanks — we'll get back to you soon.",
    ok: true,
  };
}
