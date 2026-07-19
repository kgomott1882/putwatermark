import {
  LegalCrossLinks,
  LegalDocumentBody,
  LegalSection,
} from "./LegalDocumentPrimitives";
import { pageContainerClass } from "../pageContainer";
import {
  TERMS_OF_SERVICE_LAST_UPDATED,
  termsOfServiceSections,
} from "@/lib/termsOfServiceContent";

export function TermsOfServiceContent() {
  return (
    <article className="landing-section border-b">
      <div className={`${pageContainerClass} pb-16 md:pb-24`}>
        <header className="max-w-3xl pt-10 md:pt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sand">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-beige md:text-5xl">
            Terms of Service
          </h1>
          <p className="landing-muted mt-5 text-sm leading-7">
            Last updated: {TERMS_OF_SERVICE_LAST_UPDATED}
          </p>
          <p className="mt-8 text-base leading-8 text-beige md:text-lg md:leading-9">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your use of PutWatermark,
            operated by Jetskie Softwares (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
            &ldquo;our&rdquo;). By using PutWatermark, you agree to these Terms. If you
            don&apos;t agree, please don&apos;t use the service.
          </p>
        </header>

        <div className="max-w-3xl">
          {termsOfServiceSections.map((section) => (
            <LegalSection key={section.title} title={section.title}>
              <LegalDocumentBody body={section.body} />
            </LegalSection>
          ))}

          <LegalCrossLinks current="terms" />
        </div>
      </div>
    </article>
  );
}
