"use client"

import { motion } from "framer-motion"
import { Brain, Zap, TrendingUp, ShieldCheck } from "lucide-react"
import React, { memo } from "react"

export default function BrainAnimation() {
    return (
        <div className="relative h-[400px] w-full flex items-center justify-center">
            {/* The Core System */}
            <div className="relative w-[300px] h-[300px] flex items-center justify-center">

                {/* 1. Central Brain Core - "Neural Pulse" Design */}
                <div className="relative z-20 flex items-center justify-center w-32 h-32">
                    {/* Outer Glow Halo - "Breathing" */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-primaryBlue/20 blur-[40px]"
                        animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.1, 0.9] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Glass Container */}
                    <div className="relative w-full h-full rounded-3xl bg-bg-primary shadow-2xl shadow-indigo-100/50 border border-white/80 backdrop-blur-xl flex items-center justify-center overflow-hidden">
                        {/* Subtle Scanning Beam */}
                        <motion.div
                            className="absolute top-0 w-full h-full bg-gradient-to-b from-transparent via-indigo-50/50 to-transparent"
                            animate={{ top: ['-100%', '100%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                        />
                        <Brain size={56} className="text-primaryBlue relative z-10 drop-shadow-sm" strokeWidth={1.5} />
                    </div>
                </div>

                {/* 2. Floating Insight Nodes */}
                {/* Node 1: Speed (Top Left) */}
                <FloatingNode
                    icon={Zap}
                    label="SPEED"
                    value="0.2ms"
                    className="-translate-x-[160px] -translate-y-[80px]"
                    delay={0}
                />

                {/* Node 2: Optimized (Right) */}
                <FloatingNode
                    icon={TrendingUp}
                    label="OPTIMIZED"
                    value="+24%"
                    className="translate-x-[170px] -translate-y-[10px]"
                    delay={1.5}
                />

                {/* Node 3: Security (Bottom Left) */}
                <FloatingNode
                    icon={ShieldCheck}
                    label="SECURITY"
                    value="100%"
                    className="-translate-x-[60px] translate-y-[130px]"
                    delay={0.8}
                />

                {/* 3. Synaptic Connections - "Data Flow" */}
                {/* We use SVG for clean lines from center to nodes */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10 overflow-visible">
                    <defs>
                        <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="transparent" />
                            <stop offset="50%" stopColor="#2525FF" /> {/* primaryBlue */}
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                    </defs>

                    <SynapseConnection startX={150} startY={150} endX={-10} endY={70} delay={0} /> {/* To Speed */}
                    <SynapseConnection startX={150} startY={150} endX={320} endY={140} delay={1.5} /> {/* To Optimized */}
                    <SynapseConnection startX={150} startY={150} endX={90} endY={280} delay={0.8} /> {/* To Security */}
                </svg>

            </div>
        </div>
    )
}

// ----------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------

const FloatingNode = memo(function FloatingNode({ icon: Icon, label, value, className, delay }: any) {
    return (
        <motion.div
            className={`absolute z-30 ${className}`}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: delay * 0.2 }}
        >
            <motion.div
                animate={{
                    y: [-12, 12, -12],
                    x: [-3, 3, -3],
                    rotate: [-1.5, 1.5, -1.5]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: delay
                }}
                className="flex items-center gap-3 bg-white/80 backdrop-blur-xl px-4 py-3 rounded-[20px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_50px_-10px_rgba(37,37,255,0.1)] transition-all duration-500 cursor-default group"
            >
                <div className="w-9 h-9 rounded-xl bg-primaryBlue/5 group-hover:bg-primaryBlue/10 transition-colors flex items-center justify-center text-primaryBlue">
                    <Icon size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-tertiary tracking-[0.1em] uppercase mb-0.5 opacity-60">{label}</span>
                    <span className="text-body-sm font-bold text-primary tabular-nums tracking-tight">{value}</span>
                </div>
            </motion.div>
        </motion.div>
    )
})

const SynapseConnection = memo(function SynapseConnection({ startX, startY, endX, endY, delay }: { startX: number, startY: number, endX: number, endY: number, delay: number }) {
    return (
        <g>
            {/* Base Path (faint) */}
            <line
                x1={startX} y1={startY}
                x2={endX} y2={endY}
                stroke="#E0E7FF" // indigo-100
                strokeWidth="1.5"
                strokeDasharray="4 4"
            />


            {/* Better Pulse: Moving Dot along the coordinates */}
            <motion.circle
                cx={0} cy={0} r={3} fill="#2525FF"
                initial={{ x: startX, y: startY, opacity: 0 }}
                animate={{
                    x: [startX, endX],
                    y: [startY, endY],
                    opacity: [0, 1, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: delay, repeatDelay: 2 }}
            />
        </g>
    )
})
