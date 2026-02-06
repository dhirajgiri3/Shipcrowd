"use client"

import { motion } from "framer-motion"
import React, { useRef, useEffect, useState, memo } from "react"
import { Zap, BarChart3, CheckCircle2, AlertCircle, Sparkles, Brain } from "lucide-react"
import BrainAnimation from "./BrainAnimation"

export default function AIShowcase() {
    const containerRef = useRef<HTMLElement>(null)

    return (
        <section
            ref={containerRef}
            className="bg-primary text-primary py-16 md:py-24 overflow-hidden relative"
            aria-label="AI Features Showcase"
        >

            {/* Ethereal Background Gradient - Static, optimized */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-radial from-primaryBlue/5 via-transparent to-transparent opacity-50 blur-3xl animate-pulse-slow will-change-transform" />
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-100/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 will-change-transform" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-100/30 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 will-change-transform" />
            </div>

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10 flex flex-col items-center justify-center gap-12">
                {/* Part 1: Section Header */}
                <header className="text-center max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primaryBlue/5 border border-primaryBlue/10 mb-6 backdrop-blur-sm"
                    >
                        <Sparkles size={12} className="text-primaryBlue fill-current" aria-hidden="true" />
                        <span className="text-xs font-bold text-primaryBlue tracking-widest uppercase">
                            Neural Engine V2.0
                        </span>
                    </motion.div>

                    <h2 className="text-display-lg md:text-display-xl font-bold leading-tight mb-6 tracking-tighter text-primary">
                        Logistics Intelligence {" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryBlue via-indigo-500 to-primaryBlue bg-300% animate-gradient">
                            Reimagined.
                        </span>
                    </h2>

                    <p className="text-body-lg text-secondary max-w-3xl mx-auto leading-relaxed text-balance">
                        Shipcrowd analyzes millions of shipments in real-time to predict delays, optimize costs, and automate resolutions.
                    </p>
                </header>

                {/* Part 2: The Ethereal Core - NEW Brain Animation */}
                <div
                    className="relative w-full mb-12 flex items-center justify-center"
                    role="img"
                    aria-label="Interactive 3D visualization of Shipcrowd's neural network processing data"
                >
                    <BrainAnimation />
                </div>

                {/* Part 3: Features - Glassmorphism Panels */}
                <div className="space-y-16 w-full max-w-5xl">
                    <FeaturesSection />
                </div>
            </div>
        </section>
    )
}

// ----------------------------------------------------------------------------------
// Sub-Components
// ----------------------------------------------------------------------------------



function FeaturesSection() {
    return (
        <div role="list" className="space-y-16">
            <GlassFeature
                index="01"
                title="Smart Carrier Selection"
                description="Our neural network simulates 50+ carrier scenarios in 200ms to find the perfect balance of cost and speed for every single pincode."
                icon={Zap}
                color="blue"
                demo={<CarrierListDemo />}
            />
            <GlassFeature
                index="02"
                title="Predictive RTO Analysis"
                description="Our risk engine scans 10M+ data points to detect high-risk patterns in real-time, preventing fraud before it happens."
                icon={BarChart3}
                color="indigo"
                align="right"
                demo={<PredictionGraphDemo />}
            />
            <GlassFeature
                index="03"
                title="Automated Resolutions"
                description="Stuck shipment? Our AI detects it instantly and triggers automated workflows to resolve issues without human intervention."
                icon={CheckCircle2}
                color="emerald"
                demo={<ResolutionFlowDemo />}
            />
        </div>
    )
}

function GlassFeature({ index, title, description, icon: Icon, color, align = "left", demo }: any) {
    const isRight = align === "right"

    return (
        <article className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-16 ${isRight ? "lg:flex-row-reverse" : ""}`} role="listitem">
            {/* Text Content */}
            <div className="flex-1 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-white shadow-sm flex items-center justify-center">
                    <Icon size={28} className={`text-${color}-600`} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div>
                    <div className={`text-${color}-600 font-mono text-caption font-bold mb-2 uppercase tracking-widest`} aria-hidden="true">0{index} / INTELLIGENCE</div>
                    <h3 className="text-display-sm font-bold text-primary mb-3 tracking-tight">{title}</h3>
                    <p className="text-body-base text-secondary leading-relaxed text-balance">{description}</p>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-indigo-100 to-transparent opacity-50" aria-hidden="true" />
            </div>

            {/* Visual Glass Card */}
            <div className="flex-1 w-full perspective-[1000px]">
                <div className="relative group perspective-[1000px]">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primaryBlue/10 to-purple-100/10 rounded-[30px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 will-change-opacity" />

                    {/* Interactive Card */}
                    <motion.div
                        whileHover={{ rotateX: 1, rotateY: 1, scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="relative bg-bg-secondary/60 backdrop-blur-2xl border border-white/60 p-2 rounded-[30px] shadow-xl shadow-indigo-100/20 overflow-hidden will-change-transform"
                    >
                        {/* Holographic Sheen Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none mix-blend-overlay" aria-hidden="true" />

                        <div className="bg-bg-primary/50 rounded-[24px] p-6 h-[280px] flex items-center justify-center relative overflow-hidden">
                            {/* Inner content */}
                            {demo}
                        </div>
                    </motion.div>
                </div>
            </div>
        </article>
    )
}

// ----------------------------------------------------------------------------------
// Demo Visuals (Ultra-Premium & Performance Optimized)
// ----------------------------------------------------------------------------------

const CarrierListDemo = memo(function CarrierListDemo() {
    return (
        <div className="w-full max-w-sm flex flex-col gap-3 relative" aria-hidden="true">
            {[1, 2, 3].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20, filter: 'blur(0px)' }}
                    whileInView={{ opacity: 1, x: 0 }}
                    // Focus Mode: Blur other rows when #1 is active (after 1.5s delay)
                    animate={{
                        filter: i !== 0 ? ['blur(0px)', 'blur(0px)', 'blur(1px)'] : 'blur(0px)',
                        opacity: i !== 0 ? [1, 1, 0.5] : 1
                    }}
                    transition={{
                        delay: i * 0.1,
                        filter: { delay: 1.5, duration: 0.5 },
                        opacity: { delay: 1.5, duration: 0.5 }
                    }}
                    viewport={{ once: true }}
                    className={`relative overflow-hidden flex items-center justify-between p-3 rounded-xl border transition-colors duration-500 ${i === 0 ? 'bg-bg-primary border-primaryBlue/30 shadow-lg shadow-primaryBlue/10' : 'bg-bg-primary/40 border-transparent'}`}
                >
                    <div className="flex items-center gap-3 relative z-10">
                        <div className={`w-8 h-8 rounded-full ${i === 0 ? 'bg-primaryBlue' : 'bg-bg-tertiary'} flex items-center justify-center text-white font-bold text-xs`}>
                            {i === 0 ? 'AI' : ''}
                        </div>
                        <div className="space-y-1.5">
                            {/* Animated Stats Bars - Grow on load */}
                            <div className="flex items-center gap-2">
                                <span className="text-caption font-semibold text-tertiary w-8 italic">Cost</span>
                                <motion.div
                                    className={`h-1.5 rounded-full ${i === 0 ? 'bg-primaryBlue' : 'bg-bg-tertiary'}`}
                                    initial={{ width: 0 }}
                                    whileInView={{ width: i === 0 ? 96 : 64 }}
                                    transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-gray-400 w-8">Speed</span>
                                <motion.div
                                    className={`h-1.5 rounded-full ${i === 0 ? 'bg-emerald-400' : 'bg-gray-300'}`}
                                    initial={{ width: 0 }}
                                    whileInView={{ width: i === 0 ? 80 : 48 }}
                                    transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                                />
                            </div>
                        </div>
                    </div>

                    {i === 0 && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 1.5, type: "spring" }}
                            className="bg-primaryBlue/10 text-primaryBlue px-2 py-1 rounded-lg text-xs font-bold border border-primaryBlue/20"
                        >
                            <ScrambleText text="98% Match" />
                        </motion.div>
                    )}

                    {/* Scanning Shine Effect */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        initial={{ x: '-100%' }}
                        whileInView={{ x: '200%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3, delay: i * 0.2 }}
                    />
                </motion.div>
            ))}
        </div>
    )
})

const PredictionGraphDemo = memo(function PredictionGraphDemo() {
    const bars = [30, 45, 35, 60, 40, 75, 55, 90, 65, 80]
    return (
        <div className="relative w-full h-full flex items-end justify-center gap-1.5 px-6 pb-6" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent" />

            {/* Bars */}
            {bars.map((h, i) => {
                const isHighRisk = h > 85 // Only one high risk bar ideally
                return (
                    <div key={i} className="relative flex-1 h-full flex items-end group">
                        <motion.div
                            className={`w-full rounded-t-sm ${isHighRisk ? 'bg-rose-500' : 'bg-indigo-500'}`}
                            style={{ opacity: 0.2 + (i / 10) * 0.8 }}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05, duration: 0.8, type: "spring" }}
                        />
                    </div>
                )
            })}

            {/* Scanning Line */}
            <motion.div
                className="absolute top-0 bottom-0 w-[2px] bg-indigo-500 shadow-[0_0_10px_#6366f1] z-10"
                initial={{ left: '0%', opacity: 0 }}
                whileInView={{ left: '100%', opacity: 1 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
                <div className="absolute top-0 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full border border-indigo-500 shadow-sm" />
            </motion.div>

            {/* Risk Alert Tooltip */}
            <motion.div
                className="absolute top-10 right-10 bg-white/90 backdrop-blur shadow-lg p-2.5 rounded-xl border border-rose-100 flex items-center gap-2 z-20"
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                whileInView={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8], y: [10, 0, 0, 10] }}
                transition={{ duration: 3, repeat: Infinity, times: [0, 0.2, 0.8, 1], delay: 1.8 }}
            >
                <AlertCircle size={14} className="text-rose-500" />
                <span className="text-[10px] font-bold text-rose-700 uppercase">Risk Detected</span>
            </motion.div>
        </div>
    )
})


const ResolutionFlowDemo = memo(function ResolutionFlowDemo() {
    const [step, setStep] = useState(0) // 0..3 sequences

    useEffect(() => {
        let timer: NodeJS.Timeout
        const loop = () => {
            setStep(0)
            setTimeout(() => setStep(1), 1000) // Problem appears
            setTimeout(() => setStep(2), 2500) // AI Fix appears
            setTimeout(() => setStep(3), 4500) // Resolved appears
            // Reset after 7s total
            timer = setTimeout(loop, 7000)
        }
        loop()
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="w-full h-full flex items-center justify-center p-4 relative" aria-hidden="true">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-b from-transparent via-gray-50/30 to-transparent pointer-events-none" />

            <div className="relative w-full max-w-[340px] flex flex-col gap-4 z-10">
                {/* Connecting Line - masked to reveal as steps progress */}
                <div className="absolute left-[27px] top-8 bottom-8 w-[2px] bg-gray-100 -z-10 overflow-hidden rounded-full">
                    <motion.div
                        className="w-full bg-gradient-to-b from-rose-500 via-primaryBlue to-emerald-500 origin-top opacity-50"
                        initial={{ height: 0 }}
                        animate={{ height: step >= 3 ? '100%' : step >= 2 ? '66%' : step >= 1 ? '33%' : '0%' }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                    />
                </div>

                {/* Step 1: Delay Detected */}
                <LogItem
                    visible={step >= 1}
                    icon={AlertCircle}
                    color="text-rose-600"
                    bgColor="bg-rose-50"
                    title="Delay Detected"
                    subtitle="Mumbai Hub • 20m ago"
                    isLast={false}
                />

                {/* Step 2: AI Intervention */}
                <LogItem
                    visible={step >= 2}
                    icon={Brain}
                    color="text-primaryBlue"
                    bgColor="bg-blue-50"
                    title="AI Rerouting..."
                    subtitle="Optimizing path via Pune"
                    isLast={false}
                    pulse={true}
                />

                {/* Step 3: Resolved */}
                <LogItem
                    visible={step >= 3}
                    icon={CheckCircle2}
                    color="text-emerald-600"
                    bgColor="bg-emerald-50"
                    title="Issue Resolved"
                    subtitle="Delivery rescheduled: Tomorrow"
                    isLast={true}
                />
            </div>
        </div>
    )
})

const LogItem = memo(function LogItem({ visible, icon: Icon, color, bgColor, title, subtitle, isLast, pulse }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.98 }}
            animate={visible ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -5, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`relative flex items-center gap-4 p-3 rounded-xl transition-all duration-500 ${visible ? 'bg-white/60 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}
        >
            {/* Icon Circle */}
            <div className={`relative z-10 w-12 h-12 rounded-2xl ${visible ? bgColor : 'bg-gray-50'} flex items-center justify-center shrink-0 transition-colors duration-500`}>
                <Icon size={20} className={visible ? color : 'text-gray-300'} strokeWidth={2} />
                {pulse && visible && (
                    <div className="absolute inset-0 rounded-2xl border border-primaryBlue/30 animate-ping opacity-20" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 py-1">
                <h4 className={`text-[13px] font-semibold tracking-wide ${visible ? 'text-gray-900' : 'text-gray-300'} transition-colors duration-300`}>
                    {title}
                </h4>
                <p className={`text-[11px] font-medium uppercase tracking-wider ${visible ? 'text-gray-400' : 'text-gray-300'} transition-colors duration-300 mt-0.5`}>
                    {subtitle}
                </p>
            </div>

            {/* Active Indicator (Subtle Dot) */}
            {visible && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')} opacity-80`}
                />
            )}
        </motion.div>
    )
})

// Optimized Scramble Text Component
function ScrambleText({ text }: { text: string }) {
    const [display, setDisplay] = useState("")
    const chars = "XYZ%#@!"

    useEffect(() => {
        setDisplay(text) // Reset immediately when text changes
        // Simple flicker effect
        let i = 0
        const interval = setInterval(() => {
            if (i > 5) clearInterval(interval)
            setDisplay(prev => prev.split('').map((c, idx) => Math.random() > 0.8 ? chars[Math.floor(Math.random() * chars.length)] : text[idx]).join(''))
            i++
        }, 50)

        return () => clearInterval(interval)
    }, [text])

    return <span>{display}</span>
}
