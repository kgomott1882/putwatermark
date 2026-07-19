import {
  LegalCrossLinks,
  LegalDocumentBody,
  LegalSection,
} from "./LegalDocumentPrimitives";
import { pageContainerClass } from "../pageContainer";
import {
  PRIVACY_POLICY_LAST_UPDATED,
  privacyPolicySections,
} from "@/lib/privacyPolicyContent";

export function PrivacyPolicyContent() {
  return (
    <article className="landing-section border-b">
      <div className={`${pageContainerClass} pb-16 md:pb-24`}>
        <header className="max-w-3xl pt-10 md:pt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sand">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-beige md:text-5xl">
            Privacy Policy
          </h1>
          <p className="landing-muted mt-5 text-sm leading-7">
            Last updated: {PRIVACY_POLICY_LAST_UPDATED}
          </p>
          <p className="mt-8 text-base leading-8 text-beige md:text-lg md:leading-9">
            This policy explains what information PutWatermark (&ldquo;we,&rdquo;
            &ldquo;us&rdquo;) collects, how it&apos;s used, and what choices you have.
            PutWatermark is operated by Jetskie Softwares.
          </p>
        </header>

        <div className="max-w-3xl">
          {privacyPolicySections.map((section) => (
            <LegalSection key={section.title} title={section.title}>
              <LegalDocumentBody body={section.body} />
            </LegalSection>
          ))}

          <LegalCrossLinks current="privacy" />
        </div>
      </div>
    </article>
  );
}
