import Link from "next/link";
import type { ReactNode } from "react";
import type {
  LegalDocumentListBlock,
  LegalDocumentSection,
} from "@/lib/legalDocumentTypes";

const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

function renderInlineText(text: string, keyPrefix: string) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(markdownLinkPattern)) {
    const [fullMatch, label, href] = match;
    const matchStart = match.index ?? 0;

    if (matchStart > lastIndex) {
      parts.push(
        ...renderEmailLinks(text.slice(lastIndex, matchStart), `${keyPrefix}-t-${matchIndex}`),
      );
    }

    parts.push(
      <Link
        className="text-sand underline decoration-sand/40 underline-offset-4 transition hover:text-signal hover:decoration-signal"
        href={href}
        key={`${keyPrefix}-link-${matchIndex}`}
      >
        {label}
      </Link>,
    );

    lastIndex = matchStart + fullMatch.length;
    matchIndex += 1;
  }

  if (lastIndex < text.length) {
    parts.push(...renderEmailLinks(text.slice(lastIndex), `${keyPrefix}-tail`));
  }

  return parts.length > 0 ? parts : renderEmailLinks(text, keyPrefix);
}

function renderEmailLinks(text: string, keyPrefix: string) {
  if (!text.includes("hello@putwatermark.com")) {
    return [text];
  }

  const segments = text.split("hello@putwatermark.com");

  return segments.flatMap((segment, index) => {
    const nodes: ReactNode[] = [];

    if (segment) {
      nodes.push(segment);
    }

    if (index < segments.length - 1) {
      nodes.push(
        <a
          className="text-sand underline decoration-sand/40 underline-offset-4 transition hover:text-signal hover:decoration-signal"
          href="mailto:hello@putwatermark.com"
          key={`${keyPrefix}-email-${index}`}
        >
          hello@putwatermark.com
        </a>,
      );
    }

    return nodes;
  });
}

function LegalDocumentList({ block }: { block: LegalDocumentListBlock }) {
  return (
    <div>
      {block.intro ? (
        <p className="mb-3 font-medium text-beige">{block.intro}</p>
      ) : null}
      <ul className="list-disc space-y-2 pl-5 marker:text-sand">
        {block.items.map((item) => (
          <li className="landing-muted leading-8" key={item}>
            {renderInlineText(item, item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LegalDocumentBody({
  body,
}: {
  body: LegalDocumentSection["body"];
}) {
  return (
    <div className="space-y-5">
      {body.map((block, index) => {
        if (typeof block === "string") {
          return (
            <p className="landing-muted leading-8" key={`${block}-${index}`}>
              {renderInlineText(block, `p-${index}`)}
            </p>
          );
        }

        return <LegalDocumentList block={block} key={`${block.intro ?? "list"}-${index}`} />;
      })}
    </div>
  );
}

export function LegalSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold tracking-[-0.03em] text-beige md:text-2xl">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const legalCrossLinkItems = [
  { href: "/privacy", key: "privacy", label: "Privacy Policy" },
  { href: "/terms", key: "terms", label: "Terms of Service" },
  { href: "/refund-policy", key: "refund-policy", label: "Refund Policy" },
  { href: "/disclaimer", key: "disclaimer", label: "Disclaimer" },
] as const;

export function LegalCrossLinks({
  current,
}: {
  current: (typeof legalCrossLinkItems)[number]["key"];
}) {
  const otherLinks = legalCrossLinkItems.filter((link) => link.key !== current);

  return (
    <p className="landing-muted mt-14 text-sm leading-7">
      See also{" "}
      {otherLinks.map((link, index) => (
        <span key={link.key}>
          {index > 0 ? (index === otherLinks.length - 1 ? ", and " : ", ") : null}
          <Link
            className="text-sand underline decoration-sand/40 underline-offset-4 transition hover:text-signal hover:decoration-signal"
            href={link.href}
          >
            {link.label}
          </Link>
        </span>
      ))}
      . Back to{" "}
      <Link
        className="text-sand underline decoration-sand/40 underline-offset-4 transition hover:text-signal hover:decoration-signal"
        href="/"
      >
        PutWatermark home
      </Link>
      .
    </p>
  );
}
