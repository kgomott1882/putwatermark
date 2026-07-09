import type { Metadata } from "next";
import { AboutPageContent } from "../../../components/about/AboutPageContent";
import { Footer } from "../../../components/Footer";

export const metadata: Metadata = {
  title: "About | PutWatermark",
  description:
    "Why PutWatermark exists: a browser-native watermarking tool built to be used, not sold to.",
};

export default function AboutPage() {
  return (
    <main className="landing-theme">
      <AboutPageContent />
      <Footer />
    </main>
  );
}
