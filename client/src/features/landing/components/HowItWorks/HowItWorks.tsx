"use client"

import { memo, useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import Link from "next/link"
import { Store, ArrowRight, Zap, CheckCircle } from "lucide-react"

const CARD_SPRING = { type: "spring" as const, stiffness: 380, damping: 28 }
const CARD_STAGGER = 0.07
const MICRO_DURATION = 0.35

const STEPS = [
    { number: "01", title: "Connect Store", description: "One-click integration with Shopify, WooCommerce, or custom API.", visual: "store" },
    { number: "02", title: "Select Couriers", description: "AI automatically selects the best courier based on speed and cost.", visual: "courier" },
    { number: "03", title: "Automate Shipping", description: "Labels generated, pickups scheduled, and customers notified instantly.", visual: "automation" },
    { number: "04", title: "Track & Delight", description: "Real-time branded tracking pages that keep your customers happy.", visual: "tracking" },
] as const

export default function HowItWorks() {
    const reducedMotion = useReducedMotion()
    const { ref: stepsRef, inView: stepsInView } = useInView({ threshold: 0.1, triggerOnce: true })

    return (
        <section
            className="relative py-24 md:py-28 overflow-hidden bg-primary"
            id="how-it-works"
            aria-label="How Shipcrowd works - four steps from order to delivery"
        >
            <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--tw-gradient-stops))] from-primaryBlue/[0.06] via-transparent to-transparent" />
                <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-primaryBlue/5 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10">
                {/* Header */}
                <header className="text-center max-w-4xl mx-auto mb-16 md:mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primaryBlue/5 border border-primaryBlue/10 mb-6 backdrop-blur-sm"
                    >
                        <Zap size={12} className="text-primaryBlue shrink-0" aria-hidden="true" />
                        <span className="text-xs font-bold text-primaryBlue tracking-widest uppercase">
                        Seamless Integration
                        </span>
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: reducedMotion ? 0 : 0.1, duration: 0.6 }}
                        className="text-display-lg md:text-display-xl font-bold leading-tight mb-6 tracking-tighter text-primary"
                    >
                        How Shipcrowd{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryBlue via-indigo-500 to-primaryBlue bg-300% animate-gradient">
                            Works.
                        </span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: reducedMotion ? 0 : 0.2, duration: 0.6 }}
                        className="text-body-lg text-secondary max-w-3xl mx-auto leading-relaxed text-balance"
                    >
                        From order to delivery in four simple, automated steps using our AI-driven platform.
                    </motion.p>
                </header>

                {/* Steps + Connector */}
                <div ref={stepsRef} className="relative grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20 items-stretch">
                    {/* Animated connector (desktop): draw-in on scroll; full when reduced motion */}
                    <div className="hidden lg:block absolute top-[120px] left-0 right-0 h-px z-0 pointer-events-none overflow-hidden">
                        <motion.div
                            className="h-full w-full bg-gradient-to-r from-transparent via-primaryBlue/25 to-transparent"
                            initial={{ scaleX: 0 }}
                            animate={stepsInView || reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
                            transition={{ duration: reducedMotion ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] }}
                            style={{ originX: 0 }}
                        />
                    </div>

                    {STEPS.map((step, i) => (
                    <StepCard
                            key={step.number}
                            number={step.number}
                            title={step.title}
                            description={step.description}
                            visualKey={step.visual}
                            index={i}
                            reducedMotion={reducedMotion}
                        />
                    ))}
                </div>

                {/* CTA Section */}
                <motion.div
                    initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="relative rounded-3xl overflow-hidden p-12 md:p-24 text-center"
                >
                    <div className="absolute inset-0 bg-primaryBlue">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[shine_3s_infinite]" />
                        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-400/30 to-transparent blur-3xl opacity-50" />
                        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-500/30 to-transparent blur-3xl opacity-50" />
                    </div>
                    <div className="relative z-10 max-w-[800px] mx-auto">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight tracking-tight">
                            Ready to Start Your Intelligent Shipping Journey?
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link
                                href="/signup"
                                className="inline-flex items-center justify-center gap-2 h-14 px-8 bg-white text-primaryBlue font-bold rounded-xl shadow-[0_10px_30px_-10px_rgba(255,255,255,0.4)] hover:scale-105 hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.5)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primaryBlue"
                                aria-label="Sign up and start shipping for free"
                            >
                                Start Shipping Free
                                <ArrowRight size={20} aria-hidden />
                            </Link>
                            <Link
                                href="/login"
                                className="h-14 px-8 inline-flex items-center justify-center bg-transparent border border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-colors backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primaryBlue"
                                aria-label="Sign in to your account"
                            >
                                Sign in
                            </Link>
                        </div>
                        <div className="mt-8 flex items-center justify-center gap-6 text-white/80 text-sm font-medium">
                            <span className="flex items-center gap-2"><Zap size={14} aria-hidden /> No credit card required</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full" aria-hidden />
                            <span>5-minute setup</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

function StepCard({
    number,
    title,
    description,
    visualKey,
    index,
    reducedMotion,
}: {
    number: string
    title: string
    description: string
    visualKey: (typeof STEPS)[number]["visual"]
    index: number
    reducedMotion: boolean | null
}) {
    const { ref, inView } = useInView({ threshold: 0.15, rootMargin: "0px 0px -24px 0px", triggerOnce: true })
    const noMotion = reducedMotion === true
    const visual = useMemo(() => {
        if (visualKey === "store") return <StoreVisual inView={inView} reducedMotion={noMotion} />
        if (visualKey === "courier") return <CourierVisual inView={inView} reducedMotion={noMotion} />
        if (visualKey === "automation") return <AutomationVisual inView={inView} reducedMotion={noMotion} />
        return <TrackingVisual inView={inView} reducedMotion={noMotion} />
    }, [visualKey, inView, noMotion])

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: noMotion ? 0 : 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={
                noMotion
                    ? { duration: 0.25, delay: index * 0.04 }
                    : { delay: 0.05 + index * CARD_STAGGER, ...CARD_SPRING }
            }
            className="group relative z-10 h-full"
        >
            <div className="rounded-3xl p-2 md:p-3 border border-[var(--border-default)] bg-[var(--bg-primary)]/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:shadow-lg group-hover:shadow-primaryBlue/5 group-hover:border-primaryBlue/20 transition-all duration-500 h-full flex flex-col">
                <div className="aspect-[4/3] shrink-0 rounded-2xl mb-6 overflow-hidden relative group-hover:bg-primaryBlue/5 transition-colors duration-500 flex items-center justify-center border border-[var(--border-default)] bg-[var(--bg-secondary)]">
                    {visual}
                </div>
                <div className="px-4 pb-6 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primaryBlue/10 text-primaryBlue font-bold text-sm border border-primaryBlue/20">
                            {number}
                        </span>
                        <h3 className="text-title-md font-bold text-primary leading-tight tracking-tight">
                            {title}
                        </h3>
                    </div>
                    <p className="text-body-sm text-secondary leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>
        </motion.div>
    )
}

// ----------------------
// High-Fidelity Visuals (GPU-friendly: opacity + transform only)
// ----------------------

const StoreVisual = memo(function StoreVisual({ inView, reducedMotion }: { inView: boolean; reducedMotion: boolean }) {
    const animate = inView && !reducedMotion
    const transition = { duration: MICRO_DURATION, ease: "easeOut" }
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <motion.div
                className="bg-[var(--bg-primary)] p-6 rounded-2xl shadow-sm border border-[var(--border-default)]"
                initial={animate ? { opacity: 0, scale: 0.92 } : false}
                animate={animate ? { opacity: 1, scale: 1 } : {}}
                transition={{ ...transition, delay: 0.05 }}
            >
                <Store size={48} className="text-primaryBlue" />
            </motion.div>
            <motion.div
                className="absolute top-1/2 right-1/4 translate-x-12 -translate-y-12 bg-[var(--bg-primary)] px-3 py-1.5 rounded-lg shadow-sm border border-[var(--border-default)] flex items-center gap-2"
                initial={animate ? { opacity: 0, x: 8 } : false}
                animate={animate ? { opacity: 1, x: 0 } : {}}
                transition={{ ...transition, delay: 0.15 }}
            >
                <div className="w-2 h-2 rounded-full bg-emerald" />
                <span className="text-caption font-bold text-primary">Connected</span>
            </motion.div>
        </div>
    )
})

const COURIER_LABELS = ["Blue Dart", "FedEx", "DHL", "Delhivery", "UPS", "DTDC"]

const CourierVisual = memo(function CourierVisual({ inView, reducedMotion }: { inView: boolean; reducedMotion: boolean }) {
    const animate = inView && !reducedMotion
    return (
        <div className="grid grid-cols-3 gap-3">
            {COURIER_LABELS.map((c, i) => (
                <motion.div
                    key={i}
                    className={`relative w-16 h-12 rounded-lg flex items-center justify-center shadow-sm text-[10px] font-bold border bg-[var(--bg-primary)] ${i === 1 ? "border-primaryBlue ring-2 ring-primaryBlue/20 text-primaryBlue" : "border-[var(--border-default)] text-secondary"}`}
                    initial={animate ? { opacity: 0, y: 6 } : false}
                    animate={animate ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: MICRO_DURATION, ease: "easeOut", delay: 0.03 + i * 0.04 }}
                >
                    {c}
                    {i === 1 && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primaryBlue rounded-full border-2 border-white" />}
                </motion.div>
            ))}
        </div>
    )
})

const AutomationVisual = memo(function AutomationVisual({ inView, reducedMotion }: { inView: boolean; reducedMotion: boolean }) {
    const animate = inView && !reducedMotion
    const t = { duration: MICRO_DURATION, ease: "easeOut" as const }
    return (
        <div className="relative w-[280px] bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl shadow-lg p-4">
            <motion.div
                className="absolute -top-3 right-4 bg-emerald/10 text-emerald text-caption font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse"
                initial={animate ? { opacity: 0, y: -4 } : false}
                animate={animate ? { opacity: 1, y: 0 } : {}}
                transition={{ ...t, delay: 0.05 }}
            >
                <CheckCircle size={10} /> Shipment Created
            </motion.div>
            <div className="text-caption font-bold text-primary mb-3">Auto filled order</div>
            <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className={`h-6 bg-[var(--bg-tertiary)] rounded ${i === 2 ? "w-2/3" : "w-full"}`}
                        initial={animate ? { opacity: 0, scaleX: 0 } : false}
                        animate={animate ? { opacity: 1, scaleX: 1 } : {}}
                        transition={{ ...t, delay: 0.1 + i * 0.06 }}
                        style={{ originX: 0 }}
                    />
                ))}
            </div>
            <motion.div
                className="mt-3 flex justify-end"
                initial={animate ? { opacity: 0 } : false}
                animate={animate ? { opacity: 1 } : {}}
                transition={{ ...t, delay: 0.3 }}
            >
                <div className="w-16 h-6 bg-primaryBlue rounded" />
            </motion.div>
        </div>
    )
})

const TrackingVisual = memo(function TrackingVisual({ inView, reducedMotion }: { inView: boolean; reducedMotion: boolean }) {
    const showFull = inView || reducedMotion
    const pathDuration = reducedMotion ? 0 : 0.65
    const progressDuration = reducedMotion ? 0 : 0.5
    return (
        <div className="relative w-[280px] h-[160px] bg-[var(--bg-tertiary)] rounded-xl overflow-hidden border border-[var(--border-default)]">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(var(--text-tertiary)_1px,transparent_1px)] [background-size:8px_8px]" aria-hidden />
            <svg className="absolute inset-0 w-full h-full" aria-hidden>
                <motion.path
                    d="M40,100 L100,60 L180,80 L240,40"
                    fill="none"
                    stroke="var(--primary-blue)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    initial={{ pathLength: 0 }}
                    animate={showFull ? { pathLength: 1 } : { pathLength: 0 }}
                    transition={{ duration: pathDuration, ease: "easeOut" }}
                />
                <motion.circle
                    cx="100"
                    cy="60"
                    r="4"
                    fill="var(--primary-blue)"
                    initial={{ opacity: 0 }}
                    animate={showFull ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 0.2, delay: showFull ? pathDuration * 0.5 : 0 }}
                />
                <motion.circle
                    cx="180"
                    cy="80"
                    r="4"
                    fill="var(--primary-blue)"
                    initial={{ opacity: 0 }}
                    animate={showFull ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 0.2, delay: showFull ? pathDuration * 0.8 : 0 }}
                />
            </svg>
            <div className="absolute top-4 right-4 bg-[var(--bg-primary)] px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2 border border-[var(--border-default)]">
                <CheckCircle size={14} className="text-emerald" />
                <span className="text-xs font-bold text-primary">Delivered</span>
            </div>
            <div className="absolute bottom-4 left-4 bg-[var(--bg-primary)] p-2 rounded-lg shadow-sm w-32 border border-[var(--border-default)]">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-primaryBlue rounded-full" />
                    <div className="text-caption font-bold text-primary">Tracking</div>
                </div>
                <div className="h-1 bg-[var(--border-default)] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full w-full bg-primaryBlue rounded-full origin-left"
                        initial={{ scaleX: 0 }}
                        animate={showFull ? { scaleX: 2 / 3 } : { scaleX: 0 }}
                        transition={{ duration: progressDuration, delay: reducedMotion ? 0 : 0.15, ease: "easeOut" }}
                    />
                </div>
            </div>
        </div>
    )
})
