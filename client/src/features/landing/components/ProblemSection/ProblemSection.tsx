"use client"

import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import { LayoutDashboard, FileSpreadsheet, BarChart2, MessageSquare, Flame } from "lucide-react"
import Image from "next/image"
import React, { memo, useEffect, useState } from "react"

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PROBLEMS = [
    {
        title: "Juggling 5+ Courier Dashboards?",
        description:
            "Logging into BlueDart, Delhivery, and DTDC separately just to track orders? It's chaos.",
        icon: LayoutDashboard,
        image: "https://res.cloudinary.com/divbobkmd/image/upload/v1770407203/ChatGPT_Image_Feb_7_2026_01_16_23_AM_bscls8.png",
        accent: "text-blue-500",
        bg: "bg-blue-50",
        tag: "5+ dashboards",
    },
    {
        title: "Manual Excel Entry Errors?",
        description:
            "One typo in a pincode can cause a failed delivery. Spreadsheets aren't scalable.",
        icon: FileSpreadsheet,
        image: "https://res.cloudinary.com/divbobkmd/image/upload/v1770406625/ChatGPT_Image_Feb_7_2026_01_06_42_AM_f1ni76.png",
        accent: "text-amber-500",
        bg: "bg-amber-50",
        tag: "Excel",
    },
    {
        title: "Flying Blind on Analytics?",
        description:
            "Don't know which courier is fastest or cheapest? You're losing money on every shipment.",
        icon: BarChart2,
        image: "https://res.cloudinary.com/divbobkmd/image/upload/v1770406783/ChatGPT_Image_Feb_7_2026_01_09_27_AM_zimdei.png",
        accent: "text-red-500",
        bg: "bg-red-50",
        tag: "No data",
    },
    {
        title: "Customer Support Overload?",
        description:
            '"Where is my order?" calls eating up your day? WISMO tickets are killing productivity.',
        icon: MessageSquare,
        image: "https://res.cloudinary.com/divbobkmd/image/upload/v1770406957/ChatGPT_Image_Feb_7_2026_01_12_07_AM_raza5y.png",
        accent: "text-purple-500",
        bg: "bg-purple-50",
        tag: "WISMO",
    },
] as const

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function ProblemSectionHeader() {
    return (
        <header className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primaryBlue/5 border border-primaryBlue/10 mb-6 backdrop-blur-sm"
            >
                <Flame size={12} className="text-primaryBlue fill-current shrink-0" aria-hidden="true" />
                <span className="text-xs font-bold text-primaryBlue tracking-widest uppercase">
                    The Current Reality
                </span>
            </motion.div>

            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-display-lg md:text-display-xl font-bold leading-tight mb-6 tracking-tighter text-primary"
            >
                Shipping Logistics shouldn't feel like{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryBlue via-indigo-500 to-primaryBlue bg-300% animate-gradient">
                    fighting a fire.
                </span>
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-body-lg text-secondary max-w-3xl mx-auto leading-relaxed text-balance"
            >
                Most e-commerce brands lose 20% of their operational time just managing logistics manually.
            </motion.p>
        </header>
    )
}

// ---------------------------------------------------------------------------
// Mini-demos for problem cards
// ---------------------------------------------------------------------------

const DASHBOARD_TABS = [
    { name: "BlueDart", color: "bg-blue-500" },
    { name: "Delhivery", color: "bg-orange-500" },
    { name: "DTDC", color: "bg-green-600" },
    { name: "Ecom", color: "bg-amber-500" },
    { name: "+2 more", color: "bg-slate-400" },
] as const

const DASHBOARD_CONTENT: { title: string; stat: string; rows: string[] }[] = [
    { title: "BlueDart Orders", stat: "124 today", rows: ["IN-4521 · Mumbai", "IN-4522 · Delhi", "IN-4523 · Bangalore"] },
    { title: "Delhivery Hub", stat: "89 pending", rows: ["DLV-901 · In transit", "DLV-902 · Warehouse", "DLV-903 · Out for delivery"] },
    { title: "DTDC Tracking", stat: "56 shipped", rows: ["DTDC-331 · Chennai", "DTDC-332 · Kolkata", "DTDC-333 · Hyderabad"] },
    { title: "Ecom Express", stat: "41 active", rows: ["EC-771 · Picked", "EC-772 · Dispatched", "EC-773 · Delivered"] },
    { title: "Another login...", stat: "???", rows: ["Different UI", "Different data", "Same chaos"] },
]

const DashboardsDemo = memo(function DashboardsDemo() {
    const [activeIndex, setActiveIndex] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    useEffect(() => {
        let loadingTimeout: ReturnType<typeof setTimeout>
        const t = setInterval(() => {
            setIsLoading(true)
            setActiveIndex((i) => (i + 1) % DASHBOARD_TABS.length)
            loadingTimeout = setTimeout(() => setIsLoading(false), 450)
        }, 2600)
        return () => {
            clearInterval(t)
            clearTimeout(loadingTimeout)
        }
    }, [])
    const content = DASHBOARD_CONTENT[activeIndex]
    return (
        <div className="w-full h-full flex flex-col p-3" aria-hidden="true">
            <div className="flex gap-0.5 border-b border-slate-200 shrink-0">
                {DASHBOARD_TABS.map((t, i) => (
                    <motion.div
                        key={t.name}
                        role="presentation"
                        animate={{
                            opacity: i === activeIndex ? 1 : 0.7,
                            scale: i === activeIndex ? 1.02 : 1,
                            borderBottomColor: i === activeIndex ? "var(--primary-blue)" : "transparent",
                            borderBottomWidth: i === activeIndex ? 2 : 0,
                            backgroundColor: i === activeIndex ? "white" : "rgb(248 250 252)",
                        }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="relative -mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 border-transparent px-2.5 py-2"
                    >
                        <span className={`block w-1.5 h-1.5 rounded-full shrink-0 ${t.color}`} />
                        <span className="text-caption font-semibold text-primary truncate max-w-[52px]">
                            {t.name}
                        </span>
                    </motion.div>
                ))}
            </div>
            <div className="flex-1 min-h-0 rounded-b-lg border border-t-0 border-slate-200 bg-slate-50 overflow-hidden relative">
                <AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 flex flex-col justify-center gap-2 px-3 py-3 bg-white z-10"
                        >
                            <div className="h-2 w-4/5 rounded bg-primaryBlue/10 animate-pulse" />
                            <div className="h-2 w-2/3 rounded bg-primaryBlue/10 animate-pulse" />
                            <div className="h-2 w-3/4 rounded bg-primaryBlue/10 animate-pulse" />
                        </motion.div>
                    )}
                </AnimatePresence>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={activeIndex}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 flex flex-col p-3"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-caption font-bold text-slate-800">{content.title}</span>
                            <span className="text-[10px] font-semibold text-primaryBlue bg-primaryBlue/10 px-1.5 py-0.5 rounded-md">
                                {content.stat}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {content.rows.map((row, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="text-caption font-medium text-slate-600 py-1.5 px-2 rounded-md bg-white border border-slate-200"
                                >
                                    {row}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
})

const ExcelDemo = memo(function ExcelDemo() {
    const [showError, setShowError] = useState(false)
    useEffect(() => {
        const t = setInterval(() => setShowError((b) => !b), 2400)
        return () => clearInterval(t)
    }, [])
    const rows = [
        { id: "ORD-001", pincode: "110001", status: "Shipped" },
        { id: "ORD-002", pincode: "1100O1", status: "Pending" },
        { id: "ORD-003", pincode: "400001", status: "Shipped" },
    ]
    return (
        <div className="w-full h-full flex flex-col justify-center p-4 bg-slate-50" aria-hidden="true">
            <div className="grid grid-cols-12 gap-2 text-caption font-bold uppercase tracking-wider text-slate-500 mb-2 pb-1.5 border-b border-slate-200">
                <span className="col-span-4">Order</span>
                <span className="col-span-4">Pincode</span>
                <span className="col-span-4">Status</span>
            </div>
            <div className="space-y-2">
                {rows.map((row, i) => (
                    <motion.div
                        key={row.id}
                        layout
                        animate={i === 1 && showError ? { x: [0, -3, 3, -2, 2, 0] } : {}}
                        transition={{ duration: 0.4 }}
                        className="grid grid-cols-12 gap-2 text-caption font-medium items-center"
                    >
                        <span className="col-span-4 text-slate-700">{row.id}</span>
                        <span className="col-span-4">
                            {i === 1 ? (
                                <motion.span
                                    animate={{
                                        backgroundColor: showError ? "var(--error-bg)" : "transparent",
                                        borderColor: showError ? "var(--error)" : "transparent",
                                    }}
                                    className="inline-block rounded-md px-1.5 py-0.5 border-2 font-mono"
                                >
                                    {row.pincode}
                                    {showError && (
                                        <span className="text-[10px] text-[var(--error)] ml-0.5">(O not 0)</span>
                                    )}
                                </motion.span>
                            ) : (
                                <span className="font-mono text-slate-700">{row.pincode}</span>
                            )}
                        </span>
                        <span className="col-span-4 text-slate-700">{row.status}</span>
                    </motion.div>
                ))}
            </div>
            {showError && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2 flex items-center gap-2 text-caption font-semibold text-[var(--error)]"
                >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--error-bg)] font-bold leading-none shrink-0">
                        !
                    </span>
                    Invalid pincode — delivery at risk
                </motion.div>
            )}
        </div>
    )
})

const AnalyticsDemo = memo(function AnalyticsDemo() {
    return (
        <div className="relative w-full h-full flex flex-col p-3" aria-hidden="true">
            <div className="absolute inset-0 bg-linear-to-b from-primaryBlue/[0.04] to-transparent pointer-events-none" />
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-dashed border-slate-300 overflow-hidden relative bg-white">
                <div className="absolute left-0 right-0 top-0 bottom-6 flex flex-col" aria-hidden="true">
                    <div className="flex-1 border-l-2 border-b-2 border-dashed border-slate-300 rounded-bl" />
                </div>
                <span className="absolute left-2 top-2 text-caption font-semibold text-slate-500 uppercase tracking-wider">
                    Cost
                </span>
                <span className="absolute right-2 bottom-7 text-caption font-semibold text-slate-500 uppercase tracking-wider">
                    Courier
                </span>
                <div className="absolute left-2 right-2 bottom-7 top-2 flex items-end justify-around gap-1 px-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-1 max-w-[20px] flex flex-col items-center justify-end">
                            <div className="w-full rounded-t bg-primaryBlue/15 h-[8%] min-h-[4px]" />
                            <span className="text-caption text-slate-400 mt-0.5 font-medium">?</span>
                        </div>
                    ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center px-2">
                        <p className="text-body-sm font-bold text-slate-500">No data</p>
                        <p className="text-caption text-slate-500 mt-0.5">Cheapest? Fastest?</p>
                        <p className="text-caption text-slate-500">You&apos;re flying blind.</p>
                    </div>
                </div>
                <div className="absolute inset-0 top-0 bottom-6 overflow-hidden pointer-events-none">
                    <motion.div
                        className="absolute left-0 top-0 bottom-0 w-full"
                        style={{ willChange: "transform" }}
                        animate={{ x: ["0%", "100%"] }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "linear",
                            repeatDelay: 1.5,
                        }}
                    >
                        <div
                            className="absolute left-0 top-0 bottom-0 w-[2px] bg-primaryBlue/70 rounded-full shadow-[0_0_8px_rgba(37,37,255,0.35)]"
                            aria-hidden="true"
                        />
                        <div
                            className="absolute left-0 top-0 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primaryBlue border-2 border-white shadow-sm"
                            aria-hidden="true"
                        />
                    </motion.div>
                </div>
                <p className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-caption font-medium text-primaryBlue whitespace-nowrap animate-pulse">
                    Searching...
                </p>
            </div>
        </div>
    )
})

const SUPPORT_MESSAGES = [
    "Where is my order?",
    "WISMO #1024",
    "Delivery ETA?",
    "Track my package",
    "Order delayed?",
]

const SupportDemo = memo(function SupportDemo() {
    const [visibleCount, setVisibleCount] = useState(1)
    const [ticketCount, setTicketCount] = useState(3)
    useEffect(() => {
        const t = setInterval(() => {
            setVisibleCount((n) => {
                if (n >= 5) {
                    setTicketCount((c) => (c >= 18 ? 3 : c + 3))
                    return 1
                }
                return n + 1
            })
        }, 1800)
        return () => clearInterval(t)
    }, [])
    const displayMessages = SUPPORT_MESSAGES.slice(0, visibleCount)
    return (
        <div className="w-full h-full flex flex-col p-4 bg-slate-50" aria-hidden="true">
            <div className="flex items-center justify-between mb-2">
                <span className="text-caption font-bold uppercase tracking-wider text-slate-500">
                    Inbox
                </span>
                <motion.span
                    key={ticketCount}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-caption font-bold text-primaryBlue bg-primaryBlue/10 px-2 py-0.5 rounded-full"
                >
                    {ticketCount} today
                </motion.span>
            </div>
            <div className="flex-1 min-h-0 space-y-2 overflow-hidden">
                {displayMessages.map((msg, i) => (
                    <motion.div
                        key={`${visibleCount}-${i}`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-caption font-medium text-slate-700"
                    >
                        {msg}
                    </motion.div>
                ))}
            </div>
            <p className="text-caption text-slate-500 mt-2 font-medium text-center">
                More tickets piling up...
            </p>
        </div>
    )
})

// ---------------------------------------------------------------------------
// Problem card (with demo on top)
// ---------------------------------------------------------------------------

type Problem = (typeof PROBLEMS)[number]

const DEMO_COMPONENTS = [DashboardsDemo, ExcelDemo, AnalyticsDemo, SupportDemo]

const ProblemCard = memo(function ProblemCard({
    problem,
    index,
    reducedMotion,
}: {
    problem: Problem
    index: number
    reducedMotion: boolean | null
}) {
    const Icon = problem.icon
    const Demo = DEMO_COMPONENTS[index]
    return (
        <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
                delay: index * 0.12,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={reducedMotion ? undefined : { y: -4 }}
            className="group relative bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-2xl overflow-hidden transition-all duration-300 hover:border-primaryBlue/25"
        >
            <div className="absolute inset-0 bg-linear-to-br from-primaryBlue/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="h-[180px] md:h-[200px] shrink-0 bg-slate-50 border-b border-slate-200 rounded-t-2xl overflow-hidden">
                    <Demo />
                </div>

                <div className="p-6 md:p-8 flex flex-col flex-1">
                    <div className="rounded-xl overflow-hidden mb-4 shrink-0 border border-[var(--border-default)]">
                        <div className="relative w-full aspect-video group-hover:scale-[1.02] transition-transform duration-300">
                            <Image
                                src={problem.image}
                                alt={problem.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        </div>
                    </div>

                    <div
                        className={`inline-flex w-10 h-10 rounded-xl ${problem.bg} items-center justify-center mb-3 shrink-0`}
                    >
                        <Icon className={`w-5 h-5 ${problem.accent}`} strokeWidth={2} />
                    </div>

                    <h3 className="text-title-md font-bold text-primary mb-2 group-hover:text-primaryBlue transition-colors duration-300 tracking-tight">
                        {problem.title}
                    </h3>
                    <p className="text-body-base text-secondary leading-relaxed flex-1">
                        {problem.description}
                    </p>
                </div>
            </div>
        </motion.article>
    )
})

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------

export default function ProblemSection() {
    const reducedMotion = useReducedMotion()
    return (
        <section
            className="relative py-20 md:py-28 overflow-hidden bg-primary"
            aria-label="Problems we solve"
        >
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--tw-gradient-stops))] from-primaryBlue/[0.06] via-transparent to-transparent" />
            </div>

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10">
                <ProblemSectionHeader />
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                    {PROBLEMS.map((problem, i) => (
                        <div
                            key={i}
                            className={i === 0 || i === 3 ? "md:col-span-7" : "md:col-span-5"}
                        >
                            <ProblemCard
                                problem={problem}
                                index={i}
                                reducedMotion={reducedMotion}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
