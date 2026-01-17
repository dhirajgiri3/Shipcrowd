import { Navigation, Footer } from "@/components/ui";
import Hero from "@/src/features/landing/components/Hero";
import TrustBar from "@/src/features/landing/components/TrustBar";
import ProblemSection from "@/src/features/landing/components/ProblemSection";
import AIShowcase from "@/src/features/landing/components/AIShowcase";
import FeatureEcosystem from "@/src/features/landing/components/FeatureEcosystem";
import HowItWorks from "@/src/features/landing/components/HowItWorks";
import SocialProof from "@/src/features/landing/components/SocialProof";
import Pricing from "@/src/features/landing/components/Pricing";


export default function Page() {
    return (
        <main className="min-h-screen bg-[var(--bg-primary)] selection:bg-primaryBlue/20 selection:text-primaryBlue">
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