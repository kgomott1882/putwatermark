import { Capabilities } from "../../components/Capabilities";
import { FAQ } from "../../components/FAQ";
import { FinalCTA } from "../../components/FinalCTA";
import { Footer } from "../../components/Footer";
import { Hero } from "../../components/Hero";
import { HowItWorks } from "../../components/HowItWorks";
import { KeyFeatures } from "../../components/KeyFeatures";

export default function Home() {
  return (
    <main className="bg-ink text-paper">
      <Hero />
      <HowItWorks />
      <KeyFeatures />
      <Capabilities />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
