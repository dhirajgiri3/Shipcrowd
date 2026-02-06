"use client"

import React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Network, BarChart2, Map, Package, Layers, CreditCard, Bell, Printer, Puzzle } from "lucide-react"

const HUB_LABELS = ["Ship", "Track", "Manage", "Integrate"] as const

type FeatureCategory = (typeof HUB_LABELS)[number]

type Feature = {
    title: string
    description: string
    category: FeatureCategory
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
    stats: { count: string; label: string }
}

// Central visual: hub-and-spoke + stack bars, subtle idle when motion allowed
function StackVisual({ reducedMotion }: { reducedMotion: boolean | null }) {
    const { ref, inView } = useInView({ threshold: 0.05, triggerOnce: true })
    const noIdle = reducedMotion === true
    const cx = 100
    const cy = 100
    const spokeRadius = 52
    const labelRadius = 72
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
            transition={reducedMotion ? { duration: 0.3 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center gap-2 py-10 px-4"
            aria-hidden
        >
            <div className="flex flex-col gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: reducedMotion ? 0 : -8 }}
                        animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: reducedMotion ? 0 : -8 }}
                        transition={{ delay: 0.1 * i, duration: reducedMotion ? 0.2 : 0.4 }}
                        className="h-3 rounded-full bg-primaryBlue/20"
                        style={{ width: 24 + i * 32 }}
                    />
                ))}
            </div>
            {/* Hub: center icon + spoke lines + labels (labels positioned by angle to avoid overlap) */}
            <div className="relative flex items-center justify-center w-[200px] h-[200px] shrink-0">
                {/* Spoke lines: SVG so they don't affect layout */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" aria-hidden>
                    {[0, 1, 2, 3].map((i) => {
                        const deg = i * 90
                        const rad = (deg * Math.PI) / 180
                        const x2 = cx + spokeRadius * Math.cos(rad)
                        const y2 = cy + spokeRadius * Math.sin(rad)
                        return (
                            <motion.line
                                key={i}
                                x1={cx}
                                y1={cy}
                                x2={x2}
                                y2={y2}
                                stroke="currentColor"
                                strokeWidth={1}
                                strokeDasharray="4 3"
                                className="text-primaryBlue/30"
                                initial={{ opacity: 0 }}
                                animate={inView ? { opacity: 1 } : { opacity: 0 }}
                                transition={{ delay: 0.15 + i * 0.05, duration: 0.35 }}
                            />
                        )
                    })}
                </svg>
                {/* Labels: positioned at labelRadius from center, each in its own quadrant */}
                {[0, 1, 2, 3].map((i) => {
                    const deg = i * 90
                    const rad = (deg * Math.PI) / 180
                    const x = cx + labelRadius * Math.cos(rad)
                    const y = cy + labelRadius * Math.sin(rad)
                    const label = HUB_LABELS[i]
                    return (
                        <motion.span
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={inView ? { opacity: 1 } : { opacity: 0 }}
                            transition={{ delay: 0.2 + i * 0.05, duration: 0.35 }}
                            className="absolute text-caption font-semibold text-tertiary uppercase tracking-wider whitespace-nowrap"
                            style={{
                                left: x,
                                top: y,
                                transform: "translate(-50%, -50%)",
                            }}
                        >
                            {label}
                        </motion.span>
                    )
                })}
                <motion.div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-14 h-14 rounded-2xl bg-primaryBlue/10 border border-primaryBlue/20"
                    initial={false}
                    animate={inView && !noIdle ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    <Layers className="w-7 h-7 text-primaryBlue" strokeWidth={1.5} />
                </motion.div>
            </div>
            <div className="flex flex-col gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: reducedMotion ? 0 : 8 }}
                        animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: reducedMotion ? 0 : 8 }}
                        transition={{ delay: 0.1 * i, duration: reducedMotion ? 0.2 : 0.4 }}
                        className="h-3 rounded-full bg-primaryBlue/20 ml-auto"
                        style={{ width: 24 + (5 - i) * 32 }}
                    />
                ))}
            </div>
        </motion.div>
    )
}

// Parse numeric part for count-up: "15+" -> 15, "25%" -> 25, "70%" -> 70, "5x" -> 5, "500+" -> 500; else null
function parseStatCount(count: string): { value: number; suffix: string } | null {
    const match = count.match(/^(\d+)([+%x]?)$/i)
    if (!match) return null
    return { value: parseInt(match[1], 10), suffix: match[2] || "" }
}

function FeatureShowcase({
    feature,
    index,
    inView,
    reducedMotion,
}: {
    feature: Feature
    index: number
    inView: boolean
    reducedMotion: boolean | null
}) {
    const Icon = feature.icon
    const statParsed = parseStatCount(feature.stats.count)
    const noMotion = reducedMotion === true
    return (
        <motion.div
            initial={{ opacity: 0, y: noMotion ? 0 : 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={
                noMotion
                    ? { delay: index * 0.03, duration: 0.3 }
                    : { delay: index * 0.05, type: "spring", stiffness: 300, damping: 24 }
            }
            whileHover={noMotion ? undefined : { y: -2 }}
            className="group flex flex-col p-8 rounded-2xl bg-[var(--bg-primary)]/90 backdrop-blur-xl border border-white/60 transition-all duration-300 hover:border-primaryBlue/20 hover:shadow-lg hover:shadow-primaryBlue/10 hover:ring-2 hover:ring-primaryBlue/10"
        >
            <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primaryBlue/5 text-primaryBlue group-hover:bg-primaryBlue group-hover:text-white transition-colors duration-200">
                <Icon size={24} strokeWidth={1.5} />
            </div>
            <div className="flex-1 space-y-4">
                <span className="inline-block text-caption font-semibold text-tertiary uppercase tracking-wider px-2 py-0.5 rounded-md bg-primaryBlue/5">
                    {feature.category}
                </span>
                <h3 className="text-title-md font-bold text-primary tracking-tight">
                    {feature.title}
                </h3>
                <p className="text-body-sm text-secondary leading-relaxed">
                    {feature.description}
                </p>
            </div>
            <div className="mt-8 pt-6 border-t border-[var(--border-default)] flex items-baseline gap-2">
                {statParsed && inView && !noMotion ? (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-2xl font-bold text-primaryBlue tabular-nums tracking-tight"
                        transition={{ delay: index * 0.05 + 0.2 }}
                    >
                        <CountUpStat end={statParsed.value} suffix={statParsed.suffix} />
                    </motion.span>
                ) : (
                    <span className="text-2xl font-bold text-primaryBlue tabular-nums tracking-tight">
                        {feature.stats.count}
                    </span>
                )}
                <span className="text-caption font-semibold text-tertiary uppercase tracking-wide">
                    {feature.stats.label}
                </span>
            </div>
        </motion.div>
    )
}

function CountUpStat({ end, suffix }: { end: number; suffix: string }) {
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => setMounted(true), [])
    if (!mounted) return <>{end}{suffix}</>
    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
        >
            <CountUp end={end} suffix={suffix} />
        </motion.span>
    )
}

function CountUp({ end, suffix }: { end: number; suffix: string }) {
    const [value, setValue] = React.useState(0)
    React.useEffect(() => {
        const duration = 800
        const start = 0
        const startTime = performance.now()
        const tick = (now: number) => {
            const elapsed = now - startTime
            const t = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - t, 2)
            setValue(Math.round(start + (end - start) * eased))
            if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
    }, [end])
    return <>{value}{suffix}</>
}

const FEATURES: Feature[] = [
    { title: "Multi-Courier Network", description: "Access 15+ courier partners instantly via a unified API. No separate contracts required.", category: "Ship", icon: Network, stats: { count: "15+", label: "Partners" } },
    { title: "AI Rate Optimization", description: "Intelligent routing engine selects the best carrier for every shipment based on SLA and cost.", category: "Manage", icon: BarChart2, stats: { count: "25%", label: "Savings" } },
    { title: "Real-Time Tracking", description: "Proactive status updates via SMS & Email. Branded tracking pages for superior CX.", category: "Track", icon: Map, stats: { count: "70%", label: "Fewer Calls" } },
    { title: "Warehouse Logic", description: "Automated label generation and manifest creation. Streamline picking and packing.", category: "Ship", icon: Package, stats: { count: "5x", label: "Efficient" } },
    { title: "Bulk Operations", description: "CSV upload and bulk processing for high-volume days. Handle thousands of orders in minutes.", category: "Ship", icon: Layers, stats: { count: "500+", label: "Orders/Min" } },
    { title: "COD Reconciliation", description: "Automated payment tracking and remittance cycles. Precise cash flow visibility.", category: "Manage", icon: CreditCard, stats: { count: "100%", label: "Accurate" } },
    { title: "Smart Alerts", description: "Exception management system. Get notified only when shipments are delayed or stuck.", category: "Track", icon: Bell, stats: { count: "Instant", label: "Updates" } },
    { title: "Label Generation", description: "One-click bulk label printing. Auto-formats for all major courier standards.", category: "Ship", icon: Printer, stats: { count: "0.2s", label: "Gen Time" } },
    { title: "API Integrations", description: "Plugins for Shopify, WooCommerce, and Magento. Custom REST API for enterprise.", category: "Integrate", icon: Puzzle, stats: { count: "10+", label: "Plugins" } },
]

export default function FeatureEcosystem() {
    const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })
    const reducedMotion = useReducedMotion()

    return (
        <section
            id="features"
            className="relative py-24 md:py-28 overflow-hidden bg-primary"
            aria-label="Feature ecosystem - complete logistics stack"
        >
            <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--tw-gradient-stops))] from-primaryBlue/[0.06] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-primaryBlue/[0.04] to-transparent" />
            </div>

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10">
                {/* Centered Header: badge + gradient title + subtitle */}
                <header className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primaryBlue/5 border border-primaryBlue/10 mb-6 backdrop-blur-sm"
                    >
                        <Layers size={12} className="text-primaryBlue shrink-0" aria-hidden="true" />
                        <span className="text-xs font-bold text-primaryBlue tracking-widest uppercase">
                            Full Stack
                        </span>
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-display-lg md:text-display-xl font-bold leading-tight mb-6 tracking-tighter text-primary"
                    >
                        Complete Logistics{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryBlue via-indigo-500 to-primaryBlue bg-300% animate-gradient">
                            Stack.
                        </span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-body-lg text-secondary max-w-3xl mx-auto leading-relaxed text-balance"
                    >
                        Everything you need to ship, track, and manage orders. One platform, zero bloat.
                    </motion.p>
                </header>

                {/* Central stack/hub visual */}
                <StackVisual reducedMotion={reducedMotion} />

                {/* Feature grid */}
                <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((feature, i) => (
                        <FeatureShowcase key={i} feature={feature} index={i} inView={inView} reducedMotion={reducedMotion} />
                    ))}
                </div>
            </div>
        </section>
    )
}
