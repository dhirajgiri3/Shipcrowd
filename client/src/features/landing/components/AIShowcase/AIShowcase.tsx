"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import { Brain, Zap, BarChart3, CheckCircle2, AlertCircle, Scan, Search, Map, Activity, ShieldCheck, Zap as ZapIcon } from "lucide-react"

export default function AIShowcase() {
    const words = ["This", "Isn't", "Software.", "This", "Is", "Your", "AI", "Logistics", "Brain."]
    const brainRef = useRef(null)
    const isBrainInView = useInView(brainRef, { margin: "0px 0px -200px 0px" })

    return (
        <section className="bg-white text-gray-950 py-24 md:py-32 overflow-hidden relative border-y border-transparent">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#2525FF 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            {/* Gradient accents */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primaryBlue/[0.03] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-400/[0.03] rounded-full blur-3xl pointer-events-none" />

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10">
                {/* Part 1: Section Hero */}
                <div className="text-center mb-24 md:mb-32">
                    <motion.div
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="inline-flex items-center gap-2.5 mb-6"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        <span className="text-cyan-600 text-sm font-bold tracking-wide uppercase">
                            Powered by Artificial Intelligence
                        </span>
                    </motion.div>

                    <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6 max-w-[900px] mx-auto flex flex-wrap justify-center gap-x-3 tracking-tight">
                        {words.map((word, i) => (
                            <motion.span
                                key={i}
                                initial={{ opacity: 0, filter: 'blur(8px)' }}
                                whileInView={{ opacity: 1, filter: 'blur(0px)' }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 + i * 0.08, duration: 0.6 }}
                                className={i >= 6 ? "text-primaryBlue" : ""}
                            >
                                {word}
                            </motion.span>
                        ))}
                    </h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1, duration: 0.6 }}
                        className="text-lg md:text-xl text-gray-600 max-w-[800px] mx-auto leading-relaxed"
                    >
                        Shipcrowd doesn't just manage your shipments—it thinks for you. Our neural engine analyzes millions of data points to make the perfect decision, every single time.
                    </motion.p>
                </div>

                {/* Central Visual: AI Brain Core - OPTIMIZED */}
                <div ref={brainRef} className="mb-32 md:mb-40 flex justify-center">
                    <div className="relative w-[320px] h-[320px] md:w-[500px] md:h-[500px] flex items-center justify-center">

                        {/* 1. Circuit Pattern Background (Static) */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                <pattern id="circuit" patternUnits="userSpaceOnUse" width="10" height="10">
                                    <path d="M0 5 H10 M5 0 V10" stroke="#2525FF" strokeWidth="0.1" fill="none" />
                                    <circle cx="5" cy="5" r="0.5" fill="#2525FF" />
                                </pattern>
                                <rect width="100" height="100" fill="url(#circuit)" />
                            </svg>
                        </div>

                        {/* 2. Deep Pulsing Glow (Reduced blur) */}
                        <motion.div
                            animate={isBrainInView ? { scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] } : {}}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-gradient-radial from-primaryBlue/30 via-cyan-400/15 to-transparent blur-[60px] rounded-full"
                            style={{ willChange: 'transform, opacity' }}
                        />

                        {/* 3. Pulse Ripple Waves (Reduced from 4 to 2) */}
                        {[0, 1].map((i) => (
                            <motion.div
                                key={`ripple-${i}`}
                                className="absolute rounded-full border border-primaryBlue/20"
                                style={{ width: '60%', height: '60%', willChange: 'transform, opacity' }}
                                initial={{ scale: 1, opacity: 0.5 }}
                                animate={isBrainInView ? { scale: 2.5, opacity: 0 } : {}}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    delay: i * 1.5,
                                    ease: "easeOut"
                                }}
                            />
                        ))}

                        {/* 4. Outer Rotating Rings (Optimized with CSS) */}
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={`ring-${i}`}
                                className="absolute rounded-full"
                                style={{
                                    width: `${85 + i * 18}%`,
                                    height: `${85 + i * 18}%`,
                                    border: `1px ${i === 1 ? 'dashed' : 'solid'} rgba(37,37,255,${0.15 - i * 0.03})`,
                                    willChange: 'transform'
                                }}
                                animate={isBrainInView ? { rotate: i % 2 === 0 ? 360 : -360 } : {}}
                                transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear" }}
                            >
                                <motion.div
                                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                    animate={isBrainInView ? { scale: [1, 1.2, 1] } : {}}
                                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                                >
                                    <div className="w-2 h-2 bg-primaryBlue rounded-full shadow-[0_0_8px_rgba(37,37,255,0.6)]" />
                                </motion.div>
                            </motion.div>
                        ))}

                        {/* 5. Particle Flow System (Reduced from 12 to 6) */}
                        {[...Array(6)].map((_, i) => {
                            const angle = (i / 6) * 360
                            const delay = i * 0.5
                            return (
                                <motion.div
                                    key={`particle-${i}`}
                                    className="absolute w-1.5 h-1.5 rounded-full"
                                    style={{
                                        background: i % 2 === 0 ? '#2525FF' : '#06b6d4',
                                        boxShadow: `0 0 6px ${i % 2 === 0 ? '#2525FF' : '#06b6d4'}`,
                                        willChange: 'transform, opacity'
                                    }}
                                    initial={{
                                        x: Math.cos(angle * Math.PI / 180) * 180,
                                        y: Math.sin(angle * Math.PI / 180) * 180,
                                        opacity: 0,
                                        scale: 0
                                    }}
                                    animate={isBrainInView ? {
                                        x: [
                                            Math.cos(angle * Math.PI / 180) * 180,
                                            Math.cos(angle * Math.PI / 180) * 90,
                                            0
                                        ],
                                        y: [
                                            Math.sin(angle * Math.PI / 180) * 180,
                                            Math.sin(angle * Math.PI / 180) * 90,
                                            0
                                        ],
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0.5]
                                    } : {}}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        delay: delay,
                                        ease: "easeInOut"
                                    }}
                                    suppressHydrationWarning
                                />
                            )
                        })}

                        {/* 6. Neural Network SVG Lines (Simplified) */}
                        <svg className="absolute w-[130%] h-[130%] pointer-events-none" viewBox="0 0 100 100">
                            <motion.path
                                d="M50 15 Q 85 15 85 50 T 50 85 T 15 50 T 50 15"
                                fill="none"
                                stroke="url(#blueGradient)"
                                strokeWidth="0.15"
                                initial={{ pathLength: 0 }}
                                animate={isBrainInView ? { pathLength: [0, 1, 0] } : {}}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            />
                            <motion.path
                                d="M50 30 Q 70 30 70 50 T 50 70 T 30 50 T 50 30"
                                fill="none"
                                stroke="url(#cyanGradient)"
                                strokeWidth="0.15"
                                initial={{ pathLength: 0 }}
                                animate={isBrainInView ? { pathLength: [0, 1, 0] } : {}}
                                transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 1 }}
                            />
                            <defs>
                                <linearGradient id="blueGradient">
                                    <stop offset="0%" stopColor="#2525FF" stopOpacity="0.6" />
                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
                                </linearGradient>
                                <linearGradient id="cyanGradient">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                                    <stop offset="100%" stopColor="#2525FF" stopOpacity="0.3" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* 7. Connection Lines to Nodes (Simplified) */}
                        <svg className="absolute w-full h-full pointer-events-none" viewBox="0 0 100 100">
                            {[45, 135, 225, 315].map((angle, i) => (
                                <motion.line
                                    key={`line-${i}`}
                                    x1="50" y1="50"
                                    x2={50 + Math.cos(angle * Math.PI / 180) * 35}
                                    y2={50 + Math.sin(angle * Math.PI / 180) * 35}
                                    stroke={['#F59E0B', '#EF4444', '#2525FF', '#10B981'][i]}
                                    strokeWidth="0.25"
                                    strokeDasharray="2 2"
                                    strokeOpacity="0.4"
                                    initial={{ pathLength: 0 }}
                                    animate={isBrainInView ? { pathLength: [0, 1, 1, 0] } : {}}
                                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
                                />
                            ))}
                        </svg>

                        {/* 8. The Core Brain (Optimized) */}
                        <motion.div
                            className="relative z-10 w-44 h-44 md:w-60 md:h-60"
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                            {/* Outer glow ring */}
                            <motion.div
                                className="absolute -inset-3 rounded-full bg-gradient-to-r from-primaryBlue/15 via-cyan-400/10 to-primaryBlue/15 blur-lg"
                                animate={isBrainInView ? { rotate: 360 } : {}}
                                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                style={{ willChange: 'transform' }}
                            />

                            {/* Main white container */}
                            <div className="absolute inset-0 bg-white rounded-full shadow-[0_0_40px_-10px_rgba(37,37,255,0.3)] border border-primaryBlue/10 overflow-hidden">
                                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-gray-50 via-white to-gray-50" />
                                <div className="absolute inset-6 rounded-full bg-gradient-to-tl from-primaryBlue/5 to-transparent" />

                                {/* Activity rings (simplified) */}
                                <motion.div
                                    className="absolute inset-10 rounded-full border border-primaryBlue/10"
                                    animate={isBrainInView ? { scale: [1, 1.03, 1] } : {}}
                                    transition={{ duration: 2.5, repeat: Infinity }}
                                />
                            </div>

                            {/* Brain Icon Container */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Brain size={85} className="text-gray-100 absolute" strokeWidth={0.8} />

                                <div className="relative">
                                    <Brain size={85} className="text-primaryBlue/70" strokeWidth={1.2} />

                                    {/* Simplified scanning line */}
                                    <motion.div
                                        className="absolute inset-0 overflow-hidden"
                                        style={{ clipPath: 'inset(0 0 0 0)' }}
                                    >
                                        <motion.div
                                            className="absolute w-full h-6 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent"
                                            animate={isBrainInView ? { y: [-80, 80] } : {}}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            style={{ willChange: 'transform' }}
                                        />
                                    </motion.div>
                                </div>

                                {/* Pulsing center dot */}
                                <motion.div
                                    className="absolute w-2.5 h-2.5 bg-primaryBlue rounded-full shadow-[0_0_12px_rgba(37,37,255,0.7)]"
                                    animate={isBrainInView ? { scale: [1, 1.4, 1], opacity: [1, 0.7, 1] } : {}}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </div>

                            {/* Status Badge */}
                            <motion.div
                                className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap"
                                animate={isBrainInView ? { y: [0, -3, 0] } : {}}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                <motion.div
                                    className="w-2 h-2 bg-emerald-400 rounded-full"
                                    animate={isBrainInView ? { scale: [1, 1.2, 1] } : {}}
                                    transition={{ duration: 1.2, repeat: Infinity }}
                                />
                                <span className="tracking-wider">NEURAL ENGINE ACTIVE</span>
                            </motion.div>
                        </motion.div>

                        {/* 9. Floating Data Indicators (Reduced from 4 to 2) */}
                        {[
                            { x: -110, y: -70, value: '99.7%', label: 'Accuracy' },
                            { x: 110, y: 80, value: '2.1ms', label: 'Response' },
                        ].map((stat, i) => (
                            <motion.div
                                key={`stat-${i}`}
                                className="absolute bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg border border-gray-100/50 z-20"
                                style={{ x: stat.x, y: stat.y }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={isBrainInView ? {
                                    opacity: [0, 1, 1, 0],
                                    scale: [0.9, 1, 1, 0.9],
                                } : {}}
                                transition={{
                                    duration: 5,
                                    repeat: Infinity,
                                    delay: i * 2.5,
                                    times: [0, 0.15, 0.85, 1]
                                }}
                            >
                                <div className="text-sm font-bold text-primaryBlue">{stat.value}</div>
                                <div className="text-[9px] text-gray-500 uppercase tracking-wider">{stat.label}</div>
                            </motion.div>
                        ))}

                        {/* 10. Orbiting Functional Nodes (Optimized rotation) */}
                        {[
                            { deg: 45, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
                            { deg: 135, icon: Activity, color: 'text-rose-500', bg: 'bg-rose-50' },
                            { deg: 225, icon: Search, color: 'text-primaryBlue', bg: 'bg-blue-50' },
                            { deg: 315, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        ].map((node, i) => (
                            <motion.div
                                key={`node-${i}`}
                                className="absolute w-full h-full"
                                style={{ rotate: node.deg, willChange: 'transform' }}
                                animate={isBrainInView ? { rotate: node.deg + 360 } : {}}
                                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                            >
                                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                                    <motion.div
                                        className={`w-10 h-10 ${node.bg} rounded-xl shadow-md border border-white flex items-center justify-center`}
                                        style={{ transform: `rotate(-${node.deg}deg)` }}
                                        whileHover={{ scale: 1.15 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                    >
                                        <node.icon size={16} className={node.color} />
                                    </motion.div>
                                </div>
                            </motion.div>
                        ))}

                    </div>
                </div>

                {/* Part 2: Intelligence Pillars */}
                <div className="space-y-24 md:space-y-32">
                    <Pillar
                        index={1}
                        title="AI Courier Selection"
                        description="Stop guessing which courier is best. Our AI analyzes delivery speed, cost, and reliability in real-time to pick the winner for every pincode."
                        icon={Zap}
                        points={["Real-time rate comparison", "Pincode serviceability check", "RTO probability scoring", "Automatic carrier switching"]}
                        demo={<CourierSelectionDemo />}
                    />
                    <Pillar
                        index={2}
                        title="Predictive Operations"
                        description="See the future before it happens. We predict delays, RTOs, and inventory stockouts so you can act before they impact your bottom line."
                        icon={BarChart3}
                        points={["Delay prediction alerts", "RTO risk analysis", "Inventory forecasting", "Smart warehouse routing"]}
                        demo={<PredictiveDemo />}
                        align="right"
                    />
                    <Pillar
                        index={3}
                        title="Proactive Problem Solving"
                        description="Issues fixed before you even know they exist. Our system automatically detects stuck shipments and initiates resolution workflows."
                        icon={CheckCircle2}
                        points={["Stuck shipment detection", "Automated NDR management", "Customer communication", "Claims processing"]}
                        demo={<ProblemSolvingDemo />}
                    />
                </div>
            </div>
        </section>
    )
}

function Pillar({ index, title, description, icon: Icon, points, demo, align = "left" }: any) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })

    return (
        <div ref={ref} className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-16 ${align === "right" ? "lg:flex-row-reverse" : ""}`}>
            {/* Content */}
            <motion.div
                initial={{ opacity: 0, x: align === "left" ? -50 : 50 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.8 }}
                className="flex-1 space-y-6"
            >
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-primaryBlue/5 rounded-full border border-primaryBlue/10">
                    <Icon size={20} className="text-primaryBlue" />
                    <span className="text-xs font-bold text-primaryBlue tracking-wide uppercase">
                        AI Intelligence #{index}
                    </span>
                </div>

                <h3 className="text-3xl md:text-4xl font-bold text-charcoal-950">
                    {title}
                </h3>

                <p className="text-lg text-charcoal-600 leading-relaxed max-w-[540px]">
                    {description}
                </p>

                <ul className="space-y-3">
                    {points.map((point: string, i: number) => (
                        <li key={i} className="flex items-center gap-3 text-charcoal-700 font-medium">
                            <div className="w-5 h-5 rounded-full bg-emerald/10 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 size={14} className="text-emerald" strokeWidth={3} />
                            </div>
                            {point}
                        </li>
                    ))}
                </ul>
            </motion.div>

            {/* Visual / Demo */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="flex-1 w-full"
            >
                <div className="bg-white border border-charcoal-100 rounded-3xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_30px_70px_-15px_rgba(37,37,255,0.12)] transition-all duration-500 relative overflow-hidden group min-h-[400px] flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-primaryBlue/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 w-full h-full flex flex-col justify-center">
                        {demo}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

// Enhanced Demo Components

function CourierSelectionDemo() {
    // Dynamic reordering simulation
    const [sorted, setSorted] = useState(false)
    const ref = useRef(null)
    const inView = useInView(ref)

    useEffect(() => {
        if (!inView) return; // Pause when not in view

        const timer = setInterval(() => {
            setSorted(prev => !prev)
        }, 3000)
        return () => clearInterval(timer)
    }, [inView])

    const couriers = [
        { name: "Blue Dart", score: 98, price: "₹45", time: "1 Day", badge: "Fastest" },
        { name: "Delhivery", score: 85, price: "₹42", time: "2 Days", badge: null },
        { name: "XpressBees", score: 72, price: "₹38", time: "3 Days", badge: "Cheapest" },
    ]

    const displayedCouriers = sorted
        ? couriers
        : [...couriers].sort((a, b) => b.price.localeCompare(a.price)) // random shuffle simulation

    return (
        <div ref={ref} className="relative z-10 w-full max-w-[400px] mx-auto">
            {/* Scanning Effect Overlay */}
            <motion.div
                className="absolute -inset-4 bg-gradient-to-b from-primaryBlue/5 to-transparent z-0 rounded-xl"
                initial={{ opacity: 0, height: "0%" }}
                animate={inView ? { opacity: [0, 1, 0], height: ["0%", "100%", "0%"], top: ["0%", "0%", "100%"] } : {}}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={inView ? { rotate: 360 } : {}}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                        <Scan size={16} className="text-primaryBlue" />
                    </motion.div>
                    <span className="text-xs font-bold text-primaryBlue uppercase tracking-wider">AI Analysis Active</span>
                </div>
                <div className="text-[10px] text-charcoal-400 font-mono">ID: 88291X</div>
            </div>

            <div className="space-y-3 relative">
                {displayedCouriers.map((c, i) => (
                    <motion.div
                        layout
                        key={c.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className={`p-4 rounded-xl border flex items-center justify-between relative overflow-hidden bg-white ${sorted && i === 0
                            ? "border-primaryBlue shadow-lg shadow-primaryBlue/10 ring-1 ring-primaryBlue/20"
                            : "border-charcoal-100 shadow-sm"
                            }`}
                    >
                        {/* Shimmer effect for top choice */}
                        {sorted && i === 0 && (
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12"
                                animate={{ x: ["-100%", "200%"] }}
                                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                            />
                        )}

                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${c.name === "Blue Dart" ? "bg-blue-600 text-white" :
                                c.name === "Delhivery" ? "bg-red-500 text-white" : "bg-purple-600 text-white"
                                }`}>
                                {c.name[0]}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="font-bold text-charcoal-900">{c.name}</div>
                                    {c.badge && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${c.badge === "Fastest" ? "bg-emerald/10 text-emerald" : "bg-amber/10 text-amber"
                                            }`}>
                                            {c.badge}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-charcoal-500 font-medium flex gap-2">
                                    <span className="flex items-center gap-1"><ZapIcon size={10} /> {c.time}</span>
                                    <span>•</span>
                                    <span>{c.price}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className={`text-xl font-bold ${sorted && i === 0 ? "text-primaryBlue" : "text-charcoal-300"}`}>
                                {c.score}
                            </div>
                            <div className="text-[9px] text-charcoal-400 font-bold uppercase tracking-wider">Score</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Best match badge */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={sorted ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                className="absolute -top-2 -right-2 bg-gradient-to-r from-primaryBlue to-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 border border-white/20 z-20"
            >
                <CheckCircle2 size={12} />
                AI Selected
            </motion.div>
        </div>
    )
}

function PredictiveDemo() {
    const ref = useRef(null)
    const inView = useInView(ref)
    return (
        <div ref={ref} className="relative w-full h-[300px] flex items-center justify-center z-10">
            {/* Timeline Wave */}
            <div className="absolute inset-0 flex items-center">
                <svg className="w-full h-24 overflow-visible">
                    <motion.path
                        d="M0 50 Q 150 50, 200 80 T 400 50"
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="2"
                    />
                    <motion.path
                        d="M0 50 Q 150 50, 200 80 T 400 50"
                        fill="none"
                        stroke="#2525FF"
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={inView ? { pathLength: 1 } : {}}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                </svg>
            </div>

            {/* Event Nodes */}
            {[
                { x: "20%", label: "Label Created", delay: 0 },
                { x: "50%", label: "In Transit", delay: 0.8 },
                { x: "80%", label: "Prediction", delay: 1.6 }
            ].map((node, i) => (
                <motion.div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ left: node.x }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: node.delay, duration: 0.5 }}
                >
                    <div className="relative">
                        <div className={`w-4 h-4 rounded-full border-2 border-white shadow-md ${i === 2 ? "bg-amber-500" : "bg-primaryBlue"}`} />
                        {i === 2 && (
                            <motion.div
                                className="absolute -inset-4 rounded-full border border-amber-500/50"
                                animate={inView ? { scale: [1, 2], opacity: [1, 0] } : {}}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                        )}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-charcoal-500 bg-white px-2 py-0.5 rounded-full shadow-sm border border-charcoal-100">
                            {node.label}
                        </div>
                    </div>
                </motion.div>
            ))}

            {/* Prediction Card */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.8 }}
                className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl border-l-4 border-amber-500 shadow-xl max-w-[180px]"
            >
                <div className="flex items-start gap-2 mb-1">
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <div className="text-xs font-bold text-charcoal-900">Delay Risk Detected</div>
                        <div className="text-[10px] text-charcoal-500 leading-tight">High traffic predicted in Mumbai region.</div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

function ProblemSolvingDemo() {
    const ref = useRef(null)
    const inView = useInView(ref)
    return (
        <div ref={ref} className="relative w-full h-[320px] z-10 flex flex-col justify-center items-center">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-30 rounded-xl bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Central Node Structure */}
            <div className="relative w-full max-w-[300px] h-[200px]">
                {/* Connections */}
                <svg className="absolute inset-0 w-full h-full overflow-visible">
                    <line x1="50%" y1="20%" x2="20%" y2="80%" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="50%" y1="20%" x2="80%" y2="80%" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="4 4" />

                    {/* Animated Resolution Line */}
                    <motion.path
                        d="M 150 40 L 60 160"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={inView ? { pathLength: 1 } : {}}
                        transition={{ delay: 1, duration: 0.8 }}
                    />
                </svg>

                {/* Main AI Node */}
                <motion.div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-charcoal-100 z-10"
                    animate={inView ? { y: [0, -5, 0] } : {}}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                    <ShieldCheck size={32} className="text-primaryBlue" />
                </motion.div>

                {/* Problem Node */}
                <motion.div
                    className="absolute bottom-0 left-[10%] w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center border border-rose-100 z-10 group"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <AlertCircle size={20} className="text-rose-500" />
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Stuck Shipment
                    </div>
                </motion.div>

                {/* Resolved Node */}
                <motion.div
                    className="absolute bottom-0 right-[10%] w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center border border-emerald-100 z-10 group"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 2 }}
                >
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Auto Resolved
                    </div>
                </motion.div>
            </div>

            {/* Action Log */}
            <motion.div
                className="mt-8 bg-charcoal-50 rounded-lg p-3 w-full max-w-[280px] border border-charcoal-100"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.5 }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <Activity size={12} className="text-charcoal-400" />
                    <span className="text-[10px] font-bold text-charcoal-500 uppercase">System Log</span>
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-charcoal-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Shipment stuck at hub &gt; 24hrs
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-charcoal-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Ticket #9921 auto-created
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-charcoal-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Customer notified via WhatsApp
                    </div>
                </div>
            </motion.div>

        </div>
    )
}
