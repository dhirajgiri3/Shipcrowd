"use client"

import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import {
    LayoutDashboard,
    FileSpreadsheet,
    BarChart2,
    MessageSquare,
    Flame,
    AlertCircle,
    Search,
    Info,
    Hand,
    Layers,
    AlertTriangle,
    Activity,
    HelpCircle,
    Scan,
    FileWarning,
    Calendar,
    Download,
    Filter,
    ChevronDown,
} from "lucide-react"
import React, { memo, useEffect, useState, useMemo, useRef } from "react"

// ---------------------------------------------------------------------------
// Header (Aligned with AIShowcase)
// ---------------------------------------------------------------------------

function ProblemSectionHeader() {
    return (
        <header className="text-center max-w-4xl mx-auto mb-16 md:mb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/5 border border-red-500/10 mb-6 backdrop-blur-sm"
            >
                <Flame size={12} className="text-red-500 fill-current" aria-hidden="true" />
                <span className="text-xs font-bold text-red-600 tracking-widest uppercase">
                    The Current Reality
                </span>
            </motion.div>

            <motion.h2
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-display-lg md:text-display-xl font-bold leading-tight mb-6 tracking-tighter text-gray-900"
            >
                Shipping logistics shouldn't feel lik{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-[length:200%_auto] animate-gradient">
                    fighting a fire.
                </span>
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-body-lg text-gray-600 max-w-3xl mx-auto leading-relaxed text-balance"
            >
                Most e-commerce brands lose <span className="font-semibold text-gray-900 bg-gray-100 px-1 rounded">20% of their day</span>{" "}
                just managing logistics manually. Chaos is not a strategy.
            </motion.p>
        </header>
    )
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

// --- 1. Dashboard Overload (Stack + Fan Effect + Hover Cue) ---
const DashboardOverloadDemo = memo(function DashboardOverloadDemo() {
    return (
        <div className="relative w-full h-[320px] flex items-center justify-center overflow-hidden" style={{ perspective: "1000px" }}>
            {/* Background elements */}
            <div className="absolute inset-0 bg-slate-50/50" />

            <div className="relative w-[280px] h-[180px]">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute inset-0 rounded-xl shadow-xl border border-slate-200 overflow-hidden bg-white ring-1 ring-black/5"
                        initial={{
                            y: i * 12,
                            scale: 1 - i * 0.04,
                            zIndex: 3 - i,
                            opacity: 1 - i * 0.1
                        }}
                        variants={{
                            active: {
                                y: i === 0 ? -50 : i === 1 ? 0 : 50,
                                x: i === 0 ? -60 : i === 1 ? 0 : 60,
                                rotateZ: i === 0 ? -8 : i === 1 ? 0 : 8,
                                scale: 1.05,
                                zIndex: 10 + i,
                                opacity: 1
                            }
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 18
                        }}
                    >
                        {/* Mock UI Header */}
                        <div className={`h-9 px-3 flex items-center gap-2 border-b border-slate-100 ${i === 0 ? "bg-blue-50/80" : i === 1 ? "bg-orange-50/80" : "bg-emerald-50/80"
                            }`}>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                            </div>
                            <div className="bg-white/50 w-24 h-4 rounded-full ml-2" />
                        </div>
                        {/* Mock UI Body */}
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="w-20 h-5 rounded bg-slate-100" />
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${i === 0 ? "bg-blue-500" : i === 1 ? "bg-orange-500" : "bg-emerald-500"
                                    }`}>
                                    {i === 0 ? "BD" : i === 1 ? "DL" : "DT"}
                                </div>
                            </div>
                            <div className="space-y-2 pt-1">
                                <div className="w-full h-2 rounded bg-slate-50" />
                                <div className="w-5/6 h-2 rounded bg-slate-50" />
                                <div className="w-4/6 h-2 rounded bg-slate-50" />
                            </div>
                        </div>
                    </motion.div>
                ))}

                {/* Hand Animation Cue */}
                <motion.div
                    className="absolute -right-4 bottom-0 pointer-events-none z-20"
                    initial={{ opacity: 0, x: 20, y: 20 }}
                    whileInView={{ opacity: [0, 1, 1, 0], x: [20, 0, -40, -40], y: [20, 0, -20, -20] }}
                    transition={{ delay: 1, duration: 2.5, ease: "easeInOut", times: [0, 0.2, 0.8, 1] }}
                >
                    <Hand className="w-8 h-8 text-slate-800 drop-shadow-lg" fill="white" />
                </motion.div>
            </div>

            {/* Floating Cursor Suggestion (Persistent) */}
            <motion.div
                className="absolute right-8 bottom-6 pointer-events-none opacity-0 md:opacity-100"
                initial={{ y: 0 }}
                animate={{ y: [-4, 0, -4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                <div className="text-[10px] font-medium text-slate-500 bg-white/90 px-2.5 py-1.5 rounded-full shadow-sm border border-slate-200 flex items-center gap-1.5">
                    <Hand size={10} /> Hover stack
                </div>
            </motion.div>
        </div>
    )
})

// --- 2. Excel Chaos (Screen Shake + Glitch) ---
const ExcelChaosDemo = memo(function ExcelChaosDemo() {
    const [glitch, setGlitch] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const interval = setInterval(() => {
            setGlitch(true)
            setTimeout(() => setGlitch(false), 400) // Slightly longer glitch
        }, 3200)
        return () => clearInterval(interval)
    }, [])

    const rows = useMemo(() => Array.from({ length: 7 }), [])

    return (
        <div className="w-full h-full bg-white flex flex-col font-mono text-xs border border-slate-200 rounded-lg overflow-hidden relative shadow-inner">
            <div className="flex h-8 border-b border-slate-200 bg-slate-50 items-center px-4 text-slate-500 gap-2">
                <FileSpreadsheet size={12} className="text-green-600" />
                <span className="truncate">Orders_Export_Final_v3.csv</span>
            </div>

            {/* Shaking Container */}
            <motion.div
                className="flex-1 p-2 grid grid-cols-4 gap-px bg-slate-200 overflow-hidden"
                animate={glitch ? { x: [-2, 2, -2, 1, 0] } : {}}
                transition={{ duration: 0.3 }}
            >
                <div className="col-span-4 bg-slate-50 p-1.5 flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>ID</span> <span>Date</span> <span>Pin</span> <span>Status</span>
                </div>
                {rows.map((_, r) => (
                    <React.Fragment key={r}>
                        {[0, 1, 2, 3].map((c) => {
                            const isErrorRow = r === 2
                            const isErrorCell = isErrorRow && c === 2

                            return (
                                <motion.div
                                    key={`${r}-${c}`}
                                    className={`bg-white p-2 flex items-center relative transition-colors duration-100 ${isErrorCell && glitch ? "!bg-red-50" : ""
                                        }`}
                                >
                                    {isErrorCell && glitch ? (
                                        <motion.span
                                            className="text-red-600 font-bold"
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 0.1, repeat: 3 }}
                                        >
                                            #REF!
                                        </motion.span>
                                    ) : (
                                        <div className={`h-1.5 rounded bg-slate-100 ${c === 0 ? "w-4" : c === 1 ? "w-8" : "w-10"}`} />
                                    )}

                                    {/* Subtle highlight line for error row */}
                                    {isErrorRow && glitch && (
                                        <div className="absolute inset-0 border-y-2 border-red-500/10 pointer-events-none" />
                                    )}
                                </motion.div>
                            )
                        })}
                    </React.Fragment>
                ))}
            </motion.div>

            {/* Alert Overlay */}
            <AnimatePresence>
                {glitch && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] z-20"
                    >
                        <div className="bg-red-50 shadow-xl border border-red-200 rounded-lg p-3 flex items-start gap-3">
                            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                            <div>
                                <div className="font-bold text-red-900 text-xs">Formatting Error</div>
                                <div className="text-red-700 text-[10px] mt-0.5">Invalid pincode data type. Delivery failed.</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
})

// --- 3. Blind Analytics (Clean, Minimal, Production-Level) ---
const BlindAnalyticsDemo = memo(function BlindAnalyticsDemo() {
    return (
        <div className="relative w-full h-full bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col p-6 shadow-[inset_0_2px_12px_rgba(0,0,0,0.02)]">
            {/* Authentic UI Header with Real Icons */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <Calendar size={12} className="text-slate-400" />
                    <div className="w-16 h-2 bg-slate-200 rounded-full" />
                    <ChevronDown size={10} className="text-slate-300 ml-1" />
                </div>

                <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center transition-colors hover:bg-slate-100">
                        <Filter size={14} className="text-slate-400" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center transition-colors hover:bg-slate-100">
                        <Download size={14} className="text-slate-400" />
                    </div>
                </div>
            </div>

            {/* Authentic UI Skeleton: Chart Area */}
            <div className="relative flex-1 opacity-20 blur-[1px]">
                <div className="absolute inset-0 flex items-end justify-between gap-4 px-2 pb-2">
                    {[35, 55, 25, 65, 45, 75, 40].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end gap-1 h-full">
                            <div style={{ height: `${h}%` }} className="w-full bg-slate-300/50 rounded-t-[2px]" />
                            <div className="h-2 w-full bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-full h-px bg-slate-200/50 dashed" />
                    ))}
                </div>
            </div>

            {/* Central "Zero Visibility" State - Clean & Clinical */}
            <div className="absolute inset-0 flex items-center justify-center z-10 backdrop-blur-[2px] bg-white/40">
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100"
                >
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 relative overflow-hidden">
                        <Activity className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-tr from-transparent via-slate-400/10 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                        />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-1">Data Unavailable</h4>
                    <div className="flex gap-1.5 items-center justify-center mt-2">
                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                </motion.div>
            </div>
        </div>
    )
})

// --- 4. Support Flood (Stream + Ripple + Typing Bubble) ---
const SupportFloodDemo = memo(function SupportFloodDemo() {
    const [messages, setMessages] = useState<number[]>([1, 2])
    const [justAdded, setJustAdded] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            setMessages(prev => {
                const next = [...prev, Date.now()]
                if (next.length > 5) return next.slice(next.length - 5)
                return next
            })
            setJustAdded(true)
            setTimeout(() => setJustAdded(false), 200)
        }, 1400)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="w-full h-full bg-slate-50/50 rounded-lg border border-slate-200 p-4 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white via-white/80 to-transparent z-10 pointer-events-none" />

            <div className="flex flex-col justify-end h-full gap-3 relative z-0 pb-2">
                <AnimatePresence mode="popLayout">
                    {messages.map((id, index) => {
                        const isLatest = index === messages.length - 1;
                        return (
                            <motion.div
                                key={id}
                                layout
                                initial={{ opacity: 0, y: 60, scale: 0.9, rotate: -2 }}
                                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                className={`p-3.5 rounded-2xl rounded-tl-none shadow-sm text-xs border ${isLatest
                                        ? "bg-white border-blue-100 shadow-md text-slate-800"
                                        : "bg-white/60 border-slate-100 text-slate-500"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-bold ${isLatest ? "text-blue-600" : "text-slate-600"}`}>Customer {id % 100}</span>
                                    <span className="text-[10px] text-slate-400">Now</span>
                                </div>
                                <p className="leading-snug">My package is delayed again. Please update me??</p>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Pulsing Badge */}
            <div className="absolute top-4 right-4 z-20">
                <motion.div
                    animate={justAdded ? { scale: [1, 1.2, 1] } : {}}
                    className="relative bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg shadow-red-500/20 flex items-center gap-1.5"
                >
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    99+ Tickets
                </motion.div>
                {justAdded && (
                    <div className="absolute inset-0 rounded-full border border-red-500 animate-[ping_0.5s_ease-out_forwards]" />
                )}
            </div>

            {/* Typing Indicator Bubble (Randomly appears) */}
            <motion.div
                className="absolute bottom-20 left-4 bg-slate-800 text-white p-2 rounded-xl rounded-bl-none shadow-lg z-20 flex gap-1"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0, 1, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </motion.div>
        </div>
    )
})


// ---------------------------------------------------------------------------
// Bento Grid Card Wrapper
// ---------------------------------------------------------------------------

function BentoCard({
    title,
    description,
    icon: Icon,
    iconColor, // Format: { bg: string, text: string }
    className = "",
    children,
}: {
    title: string
    description: string
    icon: any
    iconColor: { bg: string; text: string }
    className?: string
    children: React.ReactNode
}) {
    // Mouse tracking for spotlight effect
    const divRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [opacity, setOpacity] = useState(0)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return
        const rect = divRef.current.getBoundingClientRect()
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        setOpacity(1)
    }

    const handleMouseLeave = () => {
        setOpacity(0)
    }

    return (
        <motion.div
            ref={divRef}
            initial="idle"
            whileHover="active"
            whileInView="idle" // Ensure it starts in idle
            viewport={{ once: true, margin: "-50px" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`group relative overflow-hidden rounded-[2rem] bg-white border border-slate-200 transition-all duration-500 flex flex-col ${className}`}
        >
            {/* Spotlight Effect using CSS gradient mask */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-30"
                style={{
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(var(--primary-rgb), 0.08), transparent 40%)`
                }}
            />

            {/* Subtle Inner Border Highlight */}
            <div className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-slate-900/5 pointer-events-none z-20" />

            <div className="flex flex-col h-full relative z-10">
                {/* Content Header */}
                <div className="p-8 md:p-10 flex flex-col gap-5">
                    <div className="relative inline-block self-start">
                        {/* Parent text color applied directly to div for icon inheritance */}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${iconColor.bg} ${iconColor.text} bg-opacity-10 backdrop-blur-sm shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 border border-white/50 shadow-sm`}>
                            <Icon className="w-7 h-7" strokeWidth={1.5} />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight">{title}</h3>
                        <p className="text-slate-500 text-base leading-relaxed text-balance font-medium">
                            {description}
                        </p>
                    </div>
                </div>

                {/* Demo Area - Pushes to bottom */}
                <div className="flex-1 min-h-[240px] bg-slate-50 border-t border-slate-100 flex items-center justify-center p-6 md:p-10 overflow-hidden relative">
                    <div className="absolute inset-0 bg-slate-100/50" /> {/* Subtle tint */}
                    <div className="w-full h-full max-h-[340px] relative z-10 transition-transform duration-500 group-hover:scale-[1.02]">
                        {children}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function ProblemSection() {
    return (
        <section className="py-24 md:py-36 bg-white relative overflow-hidden">

            {/* CSS Variable for Spotlight (Primary Blue) */}
            <style jsx global>{`
                :root {
                    --primary-rgb: 37, 99, 235; /* Blue-600 */
                }
            `}</style>

            <div className="container mx-auto max-w-7xl relative z-10">
                <ProblemSectionHeader />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 px-4 md:px-8">
                    {/* Item 1: Dashboards (Span 4) */}
                    <div className="md:col-span-2 lg:col-span-4">
                        <BentoCard
                            title="Juggling 5+ Dashboard Logins?"
                            description="Logging into BlueDart, Delhivery, and DTDC separately just to track orders? It's chaos that slows your growth."
                            icon={LayoutDashboard}
                            iconColor={{ bg: "bg-blue-600", text: "text-blue-600" }}
                            className="h-full"
                        >
                            <DashboardOverloadDemo />
                        </BentoCard>
                    </div>

                    {/* Item 2: Excel (Span 2) */}
                    <div className="md:col-span-1 lg:col-span-2">
                        <BentoCard
                            title="Manual Excel Errors"
                            description="One typo in a pincode can cause a failed delivery. Spreadsheets do not scale."
                            icon={FileSpreadsheet}
                            iconColor={{ bg: "bg-emerald-600", text: "text-emerald-600" }}
                            className="h-full"
                        >
                            <ExcelChaosDemo />
                        </BentoCard>
                    </div>

                    {/* Item 3: Analytics (Span 2) */}
                    <div className="md:col-span-1 lg:col-span-2">
                        <BentoCard
                            title="Zero Analytics Visibility"
                            description="Don't know your RTO percentage? You're leaking money on every shipment you make."
                            icon={BarChart2}
                            iconColor={{ bg: "bg-violet-600", text: "text-violet-600" }}
                            className="h-full"
                        >
                            <BlindAnalyticsDemo />
                        </BentoCard>
                    </div>

                    {/* Item 4: Support (Span 4) */}
                    <div className="md:col-span-2 lg:col-span-4">
                        <BentoCard
                            title="Customer Support Overload"
                            description="WISMO (Where Is My Order) calls eating up your team's day? Stop manually checking statuses and focus on selling."
                            icon={MessageSquare}
                            iconColor={{ bg: "bg-orange-500", text: "text-orange-500" }}
                            className="h-full"
                        >
                            <SupportFloodDemo />
                        </BentoCard>
                    </div>
                </div>
            </div>
        </section>
    )
}
