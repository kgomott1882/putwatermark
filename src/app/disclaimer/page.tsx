import type { Metadata } from "next";
import { DisclaimerContent } from "../../../components/legal/DisclaimerContent";
import { Footer } from "../../../components/Footer";

export const metadata: Metadata = {
  title: "Disclaimer | PutWatermark",
  description:
    "Limits of information on PutWatermark's website and blog — not legal advice, watermark protection, electronic signatures, and third-party comparisons.",
  alternates: {
    canonical: "/disclaimer",
  },
};

export default function DisclaimerPage() {
  return (
    <main className="landing-theme">
      <DisclaimerContent />
      <Footer />
    </main>
  );
}
