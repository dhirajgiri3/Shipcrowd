"use client"

import { motion, useInView, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { Brain, Zap, BarChart3, CheckCircle2, AlertCircle, ShieldCheck, Sparkles, TrendingUp } from "lucide-react"

export default function AIShowcase() {
    const containerRef = useRef(null)
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    })

    const y = useTransform(scrollYProgress, [0, 1], [100, -100])
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

    return (
        <section ref={containerRef} className="bg-white text-gray-950 py-32 md:py-40 overflow-hidden relative">

            {/* Ethereal Background Gradient */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-radial from-primaryBlue/5 via-transparent to-transparent opacity-50 blur-3xl animate-pulse-slow" />
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-100/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-100/30 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />
            </div>

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10">
                {/* Part 1: Section Header */}
                <div className="text-center mb-20 md:mb-32">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primaryBlue/5 border border-primaryBlue/10 mb-8 backdrop-blur-sm"
                    >
                        <Sparkles size={12} className="text-primaryBlue fill-current" />
                        <span className="text-xs font-bold text-primaryBlue tracking-widest uppercase">
                            Neural Engine V2.0
                        </span>
                    </motion.div>

                    <h2 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-8 tracking-tight text-charcoal-900">
                        Logistics Intelligence. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryBlue via-indigo-500 to-primaryBlue bg-300% animate-gradient">
                            Reimagined.
                        </span>
                    </h2>

                    <p className="text-xl text-charcoal-500 max-w-2xl mx-auto leading-relaxed font-medium">
                        Shipcrowd analyzes millions of shipments in real-time to predict delays, optimize costs, and automate resolutions.
                    </p>
                </div>

                {/* Part 2: The Ethereal Core */}
                <div className="relative h-[400px] md:h-[500px] mb-32 flex items-center justify-center perspective-[2000px] [perspective:2000px]">

                    {/* Floating Data Particles (Background) */}
                    <div className="absolute inset-0 pointer-events-none">
                        {[...Array(15)].map((_, i) => (
                            <FloatingParticle key={i} index={i} />
                        ))}
                    </div>

                    {/* Central Orb System */}
                    <div className="relative w-[500px] h-[500px] flex items-center justify-center transform-style-3d [transform-style:preserve-3d]">

                        {/* 1. Core Energy Ball (Breathing Gradient) */}
                        <motion.div
                            className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-primaryBlue via-indigo-500 to-cyan-400 blur-[60px] opacity-40 mix-blend-screen"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />

                        {/* 2. Glass Sphere (The Physical Core) */}
                        <div className="relative w-48 h-48 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[inset_0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center z-20 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50" />
                            <Brain size={80} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] relative z-10" strokeWidth={1} />

                            {/* Inner Scanning Effect */}
                            <motion.div
                                className="absolute top-0 w-full h-full bg-gradient-to-b from-transparent via-white/30 to-transparent"
                                animate={{ y: ['-100%', '100%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                        </div>

                        {/* 3. 3D Orbital Splines */}
                        {[0, 1, 2].map((i) => (
                            <OrbitalSpline key={i} index={i} />
                        ))}

                        {/* Floating Interaction Nodes */}
                        <FloatingNode x={-200} y={-50} icon={Zap} label="Speed" value="0.2ms" delay={0} />
                        <FloatingNode x={200} y={80} icon={TrendingUp} label="Optimized" value="+24%" delay={1} />
                        <FloatingNode x={0} y={180} icon={ShieldCheck} label="Security" value="100%" delay={2} />

                    </div>
                </div>

                {/* Part 3: Features - Glassmorphism Panels */}
                <div className="space-y-32">
                    <FeaturesSection />
                </div>
            </div>
        </section>
    )
}

// ----------------------------------------------------------------------------------
// Sub-Components
// ----------------------------------------------------------------------------------

function OrbitalSpline({ index }: { index: number }) {
    const rotateX = index === 0 ? 60 : index === 1 ? -60 : 75
    const rotateY = index === 0 ? 45 : index === 1 ? -45 : 0
    const rotateZ = index === 2 ? 45 : 0

    return (
        <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
                transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
                transformStyle: "preserve-3d" // Fallback
            }}
        >
            <div className="w-[450px] h-[450px] rounded-full border border-primaryBlue/20 shadow-[0_0_30px_rgba(37,37,255,0.1)] opacity-60 animate-spin-slower" style={{ animationDuration: `${20 + index * 5}s` }}>
                {/* Particle moving along the path */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_#2525FF]" />
            </div>
        </div>
    )
}

function FloatingParticle({ index }: { index: number }) {
    const randomX = Math.random() * 100 - 50
    const randomY = Math.random() * 100 - 50
    const duration = 10 + Math.random() * 10

    return (
        <motion.div
            className="absolute w-1 h-1 bg-primaryBlue rounded-full opacity-20"
            style={{
                left: `${50 + randomX}%`,
                top: `${50 + randomY}%`
            }}
            animate={{
                y: [0, -100, 0],
                opacity: [0, 0.4, 0]
            }}
            transition={{
                duration: duration,
                repeat: Infinity,
                delay: index * 0.5,
                ease: "easeInOut"
            }}
        />
    )
}

function FloatingNode({ x, y, icon: Icon, label, value, delay }: any) {
    return (
        <motion.div
            className="absolute z-30 flex flex-col items-center gap-2"
            style={{ x, y }}
            animate={{ y: [y, y - 15, y] }}
            transition={{ duration: 4, repeat: Infinity, delay, ease: "easeInOut" }}
        >
            <div className="bg-white/80 backdrop-blur-xl p-3 rounded-2xl border border-white/50 shadow-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primaryBlue/10 flex items-center justify-center">
                    <Icon size={16} className="text-primaryBlue" />
                </div>
                <div>
                    <div className="text-[10px] text-charcoal-500 uppercase tracking-wide font-semibold">{label}</div>
                    <div className="text-sm font-bold text-gray-900">{value}</div>
                </div>
            </div>
            {/* Connecting line to center (visual only, dashed) */}
            <div className="absolute top-0 left-1/2 w-px h-[200px] -translate-x-1/2 -translate-y-full bg-gradient-to-t from-primaryBlue/20 to-transparent -z-10" style={{ transformOrigin: "bottom" }} />
        </motion.div>
    )
}

function FeaturesSection() {
    return (
        <>
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
                description="We process 10M+ historical data points to flag high-risk orders before you ship, saving you up to 30% in return costs."
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
        </>
    )
}

function GlassFeature({ index, title, description, icon: Icon, color, align = "left", demo }: any) {
    return (
        <div className={`flex flex-col lg:flex-row items-center gap-16 ${align === "right" ? "lg:flex-row-reverse" : ""}`}>
            {/* Text Content */}
            <div className="flex-1 space-y-8">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-white to-gray-50 border border-white shadow-sm flex items-center justify-center">
                    <Icon size={32} className={`text-${color}-600`} strokeWidth={1.5} />
                </div>
                <div>
                    <div className={`text-${color}-600 font-mono text-sm font-bold mb-3`}>0{index} / INTELLIGENCE</div>
                    <h3 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">{title}</h3>
                    <p className="text-lg text-gray-500 leading-relaxed">{description}</p>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-gray-200 to-transparent" />
            </div>

            {/* Visual Glass Card */}
            <div className="flex-1 w-full">
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primaryBlue/10 to-purple-100/10 rounded-[40px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative bg-white/60 backdrop-blur-2xl border border-white/60 p-2 rounded-[40px] shadow-2xl shadow-gray-200/50 overflow-hidden">
                        <div className="bg-white/50 rounded-[32px] p-8 h-[400px] flex items-center justify-center relative overflow-hidden">
                            {/* Inner content */}
                            {demo}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ----------------------------------------------------------------------------------
// Demo Visuals (Clean & Abstract)
// ----------------------------------------------------------------------------------

function CarrierListDemo() {
    return (
        <div className="w-full max-w-sm flex flex-col gap-3">
            {[1, 2, 3].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex items-center justify-between p-4 rounded-2xl border ${i === 0 ? 'bg-white border-primaryBlue/30 shadow-lg shadow-primaryBlue/10' : 'bg-white/50 border-transparent blur-[0.5px]'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${i === 0 ? 'bg-primaryBlue' : 'bg-gray-200'} flex items-center justify-center text-white font-bold`}>
                            {i === 0 ? 'AI' : ''}
                        </div>
                        <div className="space-y-1">
                            <div className={`h-2.5 rounded-full ${i === 0 ? 'w-24 bg-gray-900' : 'w-20 bg-gray-300'}`} />
                            <div className="h-2 w-12 bg-gray-200 rounded-full" />
                        </div>
                    </div>
                    {i === 0 && <span className="text-primaryBlue font-bold text-sm">Best Match</span>}
                </motion.div>
            ))}
        </div>
    )
}

function PredictionGraphDemo() {
    return (
        <div className="relative w-full h-full flex items-end justify-center gap-2 px-8 pb-8">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent" />
            <motion.div className="w-full h-[1px] bg-indigo-500/20 absolute bottom-8 left-0" />

            {[30, 45, 35, 60, 40, 75, 55, 90, 65, 80].map((h, i) => (
                <motion.div
                    key={i}
                    className="flex-1 rounded-t-lg bg-indigo-500"
                    style={{ opacity: 0.1 + (i / 10) * 0.9 }}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 1, type: "spring" }}
                />
            ))}

            <div className="absolute top-8 right-8 bg-white/90 backdrop-blur shadow-lg p-3 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-indigo-700">Trend Detected</span>
                </div>
            </div>
        </div>
    )
}

function ResolutionFlowDemo() {
    return (
        <div className="relative w-full flex items-center justify-center">
            {/* Animated Flow Line */}
            <svg className="absolute w-[200px] h-20 overflow-visible">
                <motion.path
                    d="M 0 40 Q 100 0, 200 40"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeOpacity="0.2"
                />
                <motion.path
                    d="M 0 40 Q 100 0, 200 40"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            </svg>

            <div className="flex justify-between w-[300px] z-10">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-gray-100">
                    <AlertCircle className="text-rose-500" />
                </div>
                <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-emerald-500 shadow-emerald-200">
                    <CheckCircle2 className="text-emerald-500" />
                </div>
            </div>
        </div>
    )
}
