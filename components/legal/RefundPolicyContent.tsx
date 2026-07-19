import {
  LegalCrossLinks,
  LegalDocumentBody,
  LegalSection,
} from "./LegalDocumentPrimitives";
import { pageContainerClass } from "../pageContainer";
import {
  REFUND_POLICY_LAST_UPDATED,
  refundPolicySections,
} from "@/lib/refundPolicyContent";

export function RefundPolicyContent() {
  return (
    <article className="landing-section border-b">
      <div className={`${pageContainerClass} pb-16 md:pb-24`}>
        <header className="max-w-3xl pt-10 md:pt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sand">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-beige md:text-5xl">
            Refund Policy
          </h1>
          <p className="landing-muted mt-5 text-sm leading-7">
            Last updated: {REFUND_POLICY_LAST_UPDATED}
          </p>
          <p className="mt-8 text-base leading-8 text-beige md:text-lg md:leading-9">
            This policy explains when PutWatermark credit purchases can be refunded,
            what happens when credits are already spent, and when credits are charged
            for exports.
          </p>
        </header>

        <div className="max-w-3xl">
          {refundPolicySections.map((section) => (
            <LegalSection key={section.title} title={section.title}>
              <LegalDocumentBody body={section.body} />
            </LegalSection>
          ))}

          <LegalCrossLinks current="refund-policy" />
        </div>
      </div>
    </article>
  );
}
