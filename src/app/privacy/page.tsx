import type { Metadata } from "next";
import { PrivacyPolicyContent } from "../../../components/legal/PrivacyPolicyContent";
import { Footer } from "../../../components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | PutWatermark",
  description:
    "How PutWatermark collects, uses, and protects your information, including browser only processing, account data, and temporary server side video handling.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="landing-theme">
      <PrivacyPolicyContent />
      <Footer />
    </main>
  );
}
