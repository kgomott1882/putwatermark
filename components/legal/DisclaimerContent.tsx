import Link from "next/link";
import {
  LegalCrossLinks,
  LegalDocumentBody,
  LegalSection,
} from "./LegalDocumentPrimitives";
import { pageContainerClass } from "../pageContainer";
import {
  DISCLAIMER_LAST_UPDATED,
  disclaimerSections,
} from "@/lib/disclaimerContent";

export function DisclaimerContent() {
  return (
    <article className="landing-section border-b">
      <div className={`${pageContainerClass} pb-16 md:pb-24`}>
        <header className="max-w-3xl pt-10 md:pt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sand">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-beige md:text-5xl">
            Disclaimer
          </h1>
          <p className="landing-muted mt-5 text-sm leading-7">
            Last updated: {DISCLAIMER_LAST_UPDATED}
          </p>
          <p className="mt-8 text-base leading-8 text-beige md:text-lg md:leading-9">
            This page explains the limits of the information provided on
            PutWatermark&apos;s website and blog, and what we don&apos;t guarantee about
            the service. It should be read alongside our{" "}
            <Link
              className="text-sand underline decoration-sand/40 underline-offset-4 transition hover:text-signal hover:decoration-signal"
              href="/terms"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              className="text-sand underline decoration-sand/40 underline-offset-4 transition hover:text-signal hover:decoration-signal"
              href="/privacy"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </header>

        <div className="max-w-3xl">
          {disclaimerSections.map((section) => (
            <LegalSection key={section.title} title={section.title}>
              <LegalDocumentBody body={section.body} />
            </LegalSection>
          ))}

          <LegalCrossLinks current="disclaimer" />
        </div>
      </div>
    </article>
  );
}
