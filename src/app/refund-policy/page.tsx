import type { Metadata } from "next";
import { RefundPolicyContent } from "../../../components/legal/RefundPolicyContent";
import { Footer } from "../../../components/Footer";

export const metadata: Metadata = {
  title: "Refund Policy | PutWatermark",
  description:
    "PutWatermark refund policy — unused credit refunds within 14 days, non-refundable spent credits, and credit charges only after successful exports.",
  alternates: {
    canonical: "/refund-policy",
  },
};

export default function RefundPolicyPage() {
  return (
    <main className="landing-theme">
      <RefundPolicyContent />
      <Footer />
    </main>
  );
}
