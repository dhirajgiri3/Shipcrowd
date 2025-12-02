import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import ProblemSection from "@/components/ProblemSection";
import AIShowcase from "@/components/AIShowcase";
import FeatureEcosystem from "@/components/FeatureEcosystem";
import HowItWorks from "@/components/HowItWorks";
import SocialProof from "@/components/SocialProof";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white selection:bg-primaryBlue/20 selection:text-primaryBlue">
      <Navigation />
      <Hero />
      <TrustBar />
      <ProblemSection />
      <AIShowcase />
      <FeatureEcosystem />
      <HowItWorks />
      <SocialProof />
      <Pricing />
      <Footer />
    </main>
  );
}