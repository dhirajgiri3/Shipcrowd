"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { Brain, Zap, BarChart3, CheckCircle2, MapPin, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function AIShowcase() {
    const words = ["This", "Isn't", "Software.", "This", "Is", "Your", "AI", "Logistics", "Brain."]

    return (
        <section className="bg-charcoal-950 text-white py-32 overflow-hidden relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primaryBlue/30 via-transparent to-transparent" />
                <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            <div className="container mx-auto px-6 md:px-12 max-w-[1400px] relative z-10">
                {/* Part 1: Section Hero */}
                <div className="text-center mb-32">
                    <motion.div
                        animate={{ textShadow: ['0 0 20px rgba(6,182,212,0.5)', '0 0 30px rgba(6,182,212,0.8)', '0 0 20px rgba(6,182,212,0.5)'] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="text-cyan text-xs font-bold tracking-[0.15em] uppercase mb-6 inline-block"
                    >
                        Powered by Artificial Intelligence
                    </motion.div>

                    <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6 max-w-[900px] mx-auto flex flex-wrap justify-center gap-x-3">
                        {words.map((word, i) => (
                            <motion.span
                                key={i}
                                initial={{ opacity: 0, filter: 'blur(8px)' }}
                                whileInView={{ opacity: 1, filter: 'blur(0px)' }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 + i * 0.08, duration: 0.6 }}
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
                        className="text-xl text-charcoal-300 max-w-[800px] mx-auto leading-relaxed"
                    >
                        ShipCrowd doesn't just manage your shipments—it thinks for you. Our neural engine analyzes millions of data points to make the perfect decision, every single time.
                    </motion.p>
                </div>

                {/* Central Visual: AI Brain */}
                <div className="mb-40 flex justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        className="relative w-[300px] h-[300px] md:w-[500px] md:h-[500px]"
                    >
                        {/* Placeholder for Brain Visual - using CSS shapes and animation */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-full h-full rounded-full bg-primaryBlue/5 blur-3xl"
                            />
                            <div className="relative z-10">
                                <Brain size={200} className="text-primaryBlue opacity-80" strokeWidth={0.5} />
                                <motion.div
                                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 text-cyan mix-blend-overlay"
                                >
                                    <Brain size={200} strokeWidth={0.5} />
                                </motion.div>
                            </div>

                            {/* Orbiting nodes */}
                            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-full h-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20 + i * 2, repeat: Infinity, ease: "linear" }}
                                    style={{ rotate: deg }}
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan rounded-full shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Part 2: Intelligence Pillars */}
                <div className="space-y-32">
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
        <div ref={ref} className={`flex flex-col lg:flex-row items-center gap-16 lg:gap-24 ${align === "right" ? "lg:flex-row-reverse" : ""}`}>
            {/* Content */}
            <motion.div
                initial={{ opacity: 0, x: align === "left" ? -50 : 50 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.8 }}
                className="flex-1"
            >
                <div className="w-14 h-14 rounded-full bg-primaryBlue/20 flex items-center justify-center mb-6 text-primaryBlue border border-primaryBlue/30">
                    <Icon size={28} />
                </div>
                <div className="text-primaryBlue font-bold text-[13px] tracking-widest uppercase mb-4">
                    AI Intelligence #{index}
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-6 text-white">{title}</h3>
                <p className="text-lg text-charcoal-300 mb-8 leading-relaxed">
                    {description}
                </p>
                <ul className="space-y-4">
                    {points.map((point: string, i: number) => (
                        <li key={i} className="flex items-center gap-3 text-charcoal-200 font-medium">
                            <CheckCircle2 size={20} className="text-emerald shrink-0" />
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
                <div className="bg-charcoal-900 border border-charcoal-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group hover:border-charcoal-700 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-primaryBlue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {demo}
                </div>
            </motion.div>
        </div>
    )
}

// Demos

function CourierSelectionDemo() {
    const couriers = [
        { name: "Blue Dart", score: 98, price: "₹45", time: "1-2 Days" },
        { name: "Delhivery", score: 85, price: "₹42", time: "2-3 Days" },
        { name: "XpressBees", score: 72, price: "₹38", time: "3-4 Days" },
    ]

    return (
        <div className="space-y-4 relative z-10">
            <div className="flex justify-between text-sm text-charcoal-400 mb-2">
                <span>Courier Partner</span>
                <span>AI Score</span>
            </div>
            {couriers.map((c, i) => (
                <motion.div
                    key={i}
                    initial={{ width: "0%" }}
                    whileInView={{ width: "100%" }}
                    transition={{ delay: 0.5 + i * 0.2, duration: 0.8 }}
                    className={`p-4 rounded-xl border flex items-center justify-between ${i === 0 ? "bg-primaryBlue/10 border-primaryBlue" : "bg-charcoal-800 border-charcoal-700"}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-primaryBlue text-white" : "bg-charcoal-700 text-charcoal-400"}`}>
                            {c.name[0]}
                        </div>
                        <div>
                            <div className={`font-semibold ${i === 0 ? "text-white" : "text-charcoal-300"}`}>{c.name}</div>
                            <div className="text-xs text-charcoal-500">{c.time} • {c.price}</div>
                        </div>
                    </div>
                    <div className={`text-lg font-bold ${i === 0 ? "text-primaryBlue" : "text-charcoal-500"}`}>
                        {c.score}
                    </div>
                </motion.div>
            ))}
            {/* Tooltip for winner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5 }}
                className="absolute -right-2 top-0 bg-primaryBlue text-white text-xs px-3 py-1 rounded-full shadow-lg"
            >
                Best Match
            </motion.div>
        </div>
    )
}

function PredictiveDemo() {
    return (
        <div className="relative h-[240px] flex items-center justify-center z-10">
            {/* Timeline */}
            <div className="absolute w-full h-1 bg-charcoal-800 rounded-full" />

            {/* Events */}
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.4 }}
                    className="absolute w-4 h-4 rounded-full bg-charcoal-600 border-4 border-charcoal-900"
                    style={{ left: `${20 + i * 30}%` }}
                />
            ))}

            {/* Prediction */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 }}
                className="absolute top-1/2 left-[80%] -translate-y-1/2"
            >
                <div className="w-6 h-6 rounded-full bg-amber text-charcoal-950 flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                    <AlertCircle size={14} />
                </div>
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 bg-charcoal-800 p-3 rounded-lg border border-amber/30 text-center">
                    <div className="text-xs text-amber font-bold mb-1">Delay Predicted</div>
                    <div className="text-[10px] text-charcoal-400">Weather alert in region</div>
                </div>
            </motion.div>
        </div>
    )
}

function ProblemSolvingDemo() {
    return (
        <div className="relative h-[240px] z-10">
            {/* Map placeholder */}
            <div className="absolute inset-0 opacity-20">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-charcoal-700">
                    {/* Simple map shape */}
                    <path d="M20,50 Q40,20 60,40 T90,60" stroke="currentColor" strokeWidth="0.5" fill="none" />
                </svg>
            </div>

            {/* Shipment dots */}
            <motion.div
                className="absolute top-1/3 left-1/4 w-3 h-3 bg-emerald rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Problem dot */}
            <motion.div
                className="absolute top-1/2 left-2/3 w-3 h-3 bg-rose rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
            />

            {/* Resolution Card */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
                className="absolute bottom-4 right-4 bg-charcoal-800 border border-charcoal-700 p-4 rounded-xl w-64"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-rose/10 flex items-center justify-center text-rose">
                        <AlertCircle size={16} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-white">Stuck Shipment</div>
                        <div className="text-[10px] text-charcoal-400">Order #88392</div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-charcoal-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald" />
                        Auto-ticket created
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-charcoal-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald" />
                        Customer notified
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
