"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Store, Truck, PackageCheck, CheckCircle, ArrowRight } from "lucide-react"

export default function HowItWorks() {
    return (
        <section className="py-32 bg-white" id="how-it-works">
            <div className="container mx-auto px-6 md:px-12 max-w-[1400px]">
                {/* Header */}
                <div className="text-center max-w-[800px] mx-auto mb-24">
                    <h2 className="text-4xl md:text-5xl font-bold text-charcoal-950 mb-6 leading-tight">
                        How ShipCrowd Works:<br />Your Seamless Journey
                    </h2>
                </div>

                {/* Steps Grid */}
                <div className="grid md:grid-cols-2 gap-x-20 gap-y-24 mb-32 relative">
                    {/* Step 1 */}
                    <StepCard
                        number="01"
                        title="Connect Your Store"
                        description="Connect your shopify access and customerss to near your store."
                        visual={<StoreVisual />}
                    />

                    {/* Step 2 */}
                    <StepCard
                        number="02"
                        title="Select Your Couriers"
                        description="Choose a for your couriers and road couriers, use a in automatics."
                        visual={<CouriersVisual />}
                    />

                    {/* Step 3 */}
                    <StepCard
                        number="03"
                        title="Automate Shipping"
                        description="Auto-filled order form, automates all control e.ent auto merounntents."
                        visual={<AutomateVisual />}
                    />

                    {/* Step 4 */}
                    <StepCard
                        number="04"
                        title="Track & Delight"
                        description="Track your map tatoes of your delivery timelinec and prorenting."
                        visual={<TrackVisual />}
                    />
                </div>

                {/* Blue CTA Section */}
                <div className="bg-primaryBlue rounded-[40px] p-12 md:p-24 text-center relative overflow-hidden">
                    <div className="relative z-10 max-w-[800px] mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">
                            Ready to Start Your Intelligent Shipping Journey?
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button className="h-14 px-8 bg-white text-primaryBlue font-bold rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                                Start Shipping Free
                                <ArrowRight size={20} />
                            </button>
                            <button className="h-14 px-8 bg-transparent border border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-colors">
                                Book a Demo
                            </button>
                        </div>
                        <div className="mt-8 text-white/60 text-sm font-medium">
                            No credit card required • 5-minute setup • Cancel anytime
                        </div>
                    </div>

                    {/* Background Glows */}
                    <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo/50 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan/30 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
                </div>
            </div>
        </section>
    )
}

function StepCard({ number, title, description, visual }: any) {
    const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true })

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6"
        >
            <div className="h-[240px] flex items-center justify-center">
                {visual}
            </div>
            <div>
                <div className="text-xl font-bold text-charcoal-900 mb-2">
                    <span className="mr-2">{number}.</span> {title}
                </div>
                <p className="text-charcoal-600 leading-relaxed max-w-[350px]">
                    {description}
                </p>
            </div>
        </motion.div>
    )
}

// Visuals
function StoreVisual() {
    return (
        <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 bg-white border border-charcoal-100 rounded-2xl shadow-lg flex items-center justify-center p-3">
                {/* Shopify Logo Placeholder */}
                <div className="w-full h-full bg-[#95BF47] rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
            </div>
            <div className="w-16 h-16 bg-white border border-charcoal-100 rounded-2xl shadow-lg flex items-center justify-center p-3">
                {/* Woo Logo Placeholder */}
                <div className="w-full h-full bg-[#9B5C8F] rounded-lg flex items-center justify-center text-white font-bold text-xs">Woo</div>
            </div>
            <div className="w-16 h-16 bg-white border border-charcoal-100 rounded-2xl shadow-lg flex items-center justify-center p-3">
                <div className="font-bold text-charcoal-400">API</div>
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-emerald/10 text-emerald text-xs font-bold px-3 py-1 rounded-full">
                Connected
            </div>
        </div>
    )
}

function CouriersVisual() {
    return (
        <div className="grid grid-cols-3 gap-3">
            {["Blue Dart", "FedEx", "DHL", "DHL", "UPS", "Spam"].map((c, i) => (
                <div key={i} className={`w-16 h-12 bg-white border rounded-lg flex items-center justify-center shadow-sm text-[10px] font-bold text-charcoal-500 ${i === 1 ? "border-primaryBlue ring-2 ring-primaryBlue/20" : "border-charcoal-100"}`}>
                    {c}
                    {i === 1 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-primaryBlue rounded-full border-2 border-white" />}
                </div>
            ))}
        </div>
    )
}

function AutomateVisual() {
    return (
        <div className="relative w-[280px] bg-white border border-charcoal-100 rounded-xl shadow-lg p-4">
            <div className="absolute -top-3 right-4 bg-emerald/10 text-emerald text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <CheckCircle size={10} /> Shipment Created
            </div>
            <div className="text-[10px] font-bold text-charcoal-900 mb-3">Auto filled order</div>
            <div className="space-y-2">
                <div className="h-6 bg-charcoal-50 rounded w-full" />
                <div className="h-6 bg-charcoal-50 rounded w-full" />
                <div className="h-6 bg-charcoal-50 rounded w-2/3" />
            </div>
            <div className="mt-3 flex justify-end">
                <div className="w-16 h-6 bg-primaryBlue rounded" />
            </div>
        </div>
    )
}

function TrackVisual() {
    return (
        <div className="relative w-[280px] h-[160px] bg-charcoal-50 rounded-xl overflow-hidden border border-charcoal-100">
            {/* Map BG */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:8px_8px]" />

            {/* Path */}
            <svg className="absolute inset-0 w-full h-full">
                <path d="M40,100 L100,60 L180,80 L240,40" fill="none" stroke="#2525FF" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="100" cy="60" r="4" fill="#2525FF" />
                <circle cx="180" cy="80" r="4" fill="#2525FF" />
            </svg>

            <div className="absolute top-4 right-4 bg-white px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald" />
                <span className="text-xs font-bold text-charcoal-900">Delivered</span>
            </div>

            <div className="absolute bottom-4 left-4 bg-white p-2 rounded-lg shadow-sm w-32">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-primaryBlue rounded-full" />
                    <div className="text-[10px] font-bold">Tracking</div>
                </div>
                <div className="h-1 bg-charcoal-100 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-primaryBlue" />
                </div>
            </div>
        </div>
    )
}
