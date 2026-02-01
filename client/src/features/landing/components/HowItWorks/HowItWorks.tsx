
"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Store, Truck, PackageCheck, MapPin, ArrowRight, MousePointer2, Zap, Box, BarChart, CheckCircle } from "lucide-react"

export default function HowItWorks() {
    return (
        <section className="py-24 md:py-32 lg:py-40 bg-white relative overflow-hidden" id="how-it-works">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-charcoal-50 to-transparent pointer-events-none" />
            <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-primaryBlue/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10">
                {/* Header */}
                <div className="text-center max-w-[900px] mx-auto mb-24 md:mb-32">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-sm font-bold tracking-widest uppercase text-primaryBlue mb-4"
                    >
                        Seamless Integration
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl lg:text-7xl font-bold text-charcoal-950 mb-6 leading-[1.1] tracking-tight"
                    >
                        How Shipcrowd Works
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg md:text-xl text-charcoal-600 leading-relaxed max-w-[800px] mx-auto"
                    >
                        From order to delivery in four simple, automated steps using our AI-driven platform.
                    </motion.p>
                </div>

                {/* Steps Steps */}
                <div className="relative grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-32">
                    {/* Animated Connector Line (Desktop) */}
                    <div className="hidden lg:block absolute top-[120px] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primaryBlue/20 to-transparent z-0" />

                    <StepCard
                        number="01"
                        title="Connect Store"
                        description="One-click integration with Shopify, WooCommerce, or custom API."
                        visual={<StoreVisual />}
                        delay={0.1}
                    />
                    <StepCard
                        number="02"
                        title="Select Couriers"
                        description="AI automatically selects the best courier based on speed and cost."
                        visual={<CourierVisual />}
                        delay={0.2}
                    />
                    <StepCard
                        number="03"
                        title="Automate Shipping"
                        description="Labels generated, pickups scheduled, and customers notified instantly."
                        visual={<AutomationVisual />}
                        delay={0.3}
                    />
                    <StepCard
                        number="04"
                        title="Track & Delight"
                        description="Real-time branded tracking pages that keep your customers happy."
                        visual={<TrackingVisual />}
                        delay={0.4}
                    />
                </div>

                {/* CTA Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="relative rounded-[40px] overflow-hidden p-12 md:p-24 text-center"
                >
                    {/* Glassmorphic Background */}
                    <div className="absolute inset-0 bg-primaryBlue">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-[shine_3s_infinite]" />
                        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-400/30 to-transparent blur-3xl opacity-50" />
                        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-500/30 to-transparent blur-3xl opacity-50" />
                    </div>

                    <div className="relative z-10 max-w-[800px] mx-auto">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight tracking-tight">
                            Ready to Start Your Intelligent Shipping Journey?
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button className="h-14 px-8 bg-white text-primaryBlue font-bold rounded-xl shadow-[0_10px_30px_-10px_rgba(255,255,255,0.4)] hover:scale-105 hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.5)] transition-all duration-300 flex items-center gap-2">
                                Start Shipping Free
                                <ArrowRight size={20} />
                            </button>
                            <button className="h-14 px-8 bg-transparent border border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-colors backdrop-blur-sm">
                                Book a Demo
                            </button>
                        </div>
                        <div className="mt-8 flex items-center justify-center gap-6 text-white/80 text-sm font-medium">
                            <span className="flex items-center gap-2"><Zap size={14} /> No credit card required</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full" />
                            <span>5-minute setup</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

function StepCard({ number, title, description, visual, delay }: any) {
    const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true })

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
            className="group relative z-10"
        >
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-2 md:p-3 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] group-hover:border-primaryBlue/20 transition-all duration-500">
                {/* Visual Container */}
                <div className="aspect-[4/3] bg-gray-50/50 rounded-2xl mb-8 overflow-hidden relative group-hover:bg-primaryBlue/5 transition-colors duration-500 flex items-center justify-center border border-gray-100/50">
                    {visual}
                </div>

                <div className="px-4 pb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primaryBlue/10 text-primaryBlue font-bold text-sm border border-primaryBlue/20">
                            {number}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">
                            {title}
                        </h3>
                    </div>
                    <p className="text-gray-500 leading-relaxed text-sm font-medium">
                        {description}
                    </p>
                </div>
            </div>
        </motion.div>
    )
}

// ----------------------
// High-Fidelity Visuals
// ----------------------

function StoreVisual() {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-charcoal-100">
                <Store size={48} className="text-primaryBlue" />
            </div>
            {/* Decorative pills */}
            <div className="absolute top-1/2 right-1/4 translate-x-12 -translate-y-12 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-charcoal-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald" />
                <span className="text-[10px] font-bold text-charcoal-900">Connected</span>
            </div>
        </div>
    )
}

function CourierVisual() {
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

function AutomationVisual() {
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

function TrackingVisual() {
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
