import dynamic from 'next/dynamic';
import Hero from "@/src/features/landing/components/Hero";
import { Navigation, Footer } from "@/src/components/ui";

// Dynamic imports for below-the-fold content
const TrustBar = dynamic(() => import("@/src/features/landing/components/TrustBar"));
const ProblemSection = dynamic(() => import("@/src/features/landing/components/ProblemSection"));
const AIShowcase = dynamic(() => import("@/src/features/landing/components/AIShowcase"));
const FeatureEcosystem = dynamic(() => import("@/src/features/landing/components/FeatureEcosystem"));
const HowItWorks = dynamic(() => import("@/src/features/landing/components/HowItWorks"));
const SocialProof = dynamic(() => import("@/src/features/landing/components/SocialProof"));
const Pricing = dynamic(() => import("@/src/features/landing/components/Pricing"));

export function LandingClient() {
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

export default LandingClient;
