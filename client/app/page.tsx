import Navigation from "@/src/components/shared/Navigation";
import Hero from "@/src/components/features/landing/Hero";
import TrustBar from "@/src/components/features/landing/TrustBar";
import ProblemSection from "@/src/components/features/landing/ProblemSection";
import AIShowcase from "@/src/components/features/landing/AIShowcase";
import FeatureEcosystem from "@/src/components/features/landing/FeatureEcosystem";
import HowItWorks from "@/src/components/features/landing/HowItWorks";
import SocialProof from "@/src/components/features/landing/SocialProof";
import Pricing from "@/src/components/features/landing/Pricing";
import Footer from "@/src/components/shared/Footer";


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