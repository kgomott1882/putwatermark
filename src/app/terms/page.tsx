import type { Metadata } from "next";
import { TermsOfServiceContent } from "../../../components/legal/TermsOfServiceContent";
import { Footer } from "../../../components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | PutWatermark",
  description:
    "Terms governing your use of PutWatermark: accounts, credits, acceptable use, content ownership, and refunds.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsOfServicePage() {
  return (
    <main className="landing-theme">
      <TermsOfServiceContent />
      <Footer />
    </main>
  );
}
