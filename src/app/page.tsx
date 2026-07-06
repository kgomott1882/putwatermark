import { Capabilities } from "../../components/Capabilities";
import { FinalCTA } from "../../components/FinalCTA";
import { Footer } from "../../components/Footer";
import { Hero } from "../../components/Hero";
import { HowItWorks } from "../../components/HowItWorks";
import { KeyFeatures } from "../../components/KeyFeatures";

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <KeyFeatures />
      <Capabilities />
      <FinalCTA />
      <Footer />
    </>
  );
}
