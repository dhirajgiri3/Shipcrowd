"use client"

import { motion } from "framer-motion"
import { Brain, Zap, TrendingUp, ShieldCheck } from "lucide-react"
import React, { memo } from "react"

export default function BrainAnimation() {
    return (
        <div className="relative h-[400px] w-full flex items-center justify-center">
            {/* 1. The Core System */}
            <div className="relative w-[300px] h-[300px] flex items-center justify-center">

                {/* Central Brain Core - Glowing & Pulsing */}
                <div className="relative z-20 flex items-center justify-center w-32 h-32 rounded-full bg-white shadow-xl shadow-primaryBlue/20 border border-white/50 backdrop-blur-sm">
                    {/* Inner Gradient Mesh */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 opacity-80" />

                    {/* Pulsing Ring */}
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-primaryBlue/20"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <Brain size={48} className="text-primaryBlue relative z-10" />
                </div>

                {/* 2. Orbits - Smooth Rotations */}
                <OrbitRing size={220} duration={20} delay={0} />
                <OrbitRing size={280} duration={25} delay={5} direction={-1} />

                {/* 3. Floating Nodes - Fixed positions relative to center, gentle float */}
                {/* Node 1: Speed (Top Left) */}
                <FloatingNode
                    icon={Zap}
                    label="SPEED"
                    value="0.2ms"
                    className="-translate-x-[140px] -translate-y-[60px]"
                    delay={0}
                />

                {/* Node 2: Optimized (Right) */}
                <FloatingNode
                    icon={TrendingUp}
                    label="OPTIMIZED"
                    value="+24%"
                    className="translate-x-[150px] translate-y-0"
                    delay={1.5}
                />

                {/* Node 3: Security (Bottom Left) */}
                <FloatingNode
                    icon={ShieldCheck}
                    label="SECURITY"
                    value="100%"
                    className="-translate-x-[40px] translate-y-[120px]"
                    delay={0.8}
                />

                {/* 4. Connection Lines - Connecting nodes to center */}
                <ConnectionLine startX={-140} startY={-60} endX={0} endY={0} />
                <ConnectionLine startX={150} startY={0} endX={0} endY={0} />
                <ConnectionLine startX={-40} startY={120} endX={0} endY={0} />

            </div>
        </div>
    )
}

// ----------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------

const OrbitRing = memo(function OrbitRing({ size, duration, delay, direction = 1 }: { size: number, duration: number, delay: number, direction?: number }) {
    return (
        <div
            className="absolute rounded-full border border-indigo-100 dark:border-white/5 flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            <motion.div
                className="w-full h-full relative"
                animate={{ rotate: direction * 360 }}
                transition={{ duration: duration, repeat: Infinity, ease: "linear", delay: delay }}
            >
                {/* Satellite Particle */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-primaryBlue rounded-full shadow-sm" />
            </motion.div>
        </div>
    )
})

const FloatingNode = memo(function FloatingNode({ icon: Icon, label, value, className, delay }: any) {
    return (
        <motion.div
            className={`absolute z-30 ${className}`}
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: delay }}
        >
            <div className="flex items-center gap-3 bg-white p-3 pr-5 rounded-2xl shadow-lg shadow-indigo-100/50 border border-white/60 backdrop-blur-md hover:scale-105 transition-transform cursor-default">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-primaryBlue">
                    <Icon size={20} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-0.5">{label}</span>
                    <span className="text-sm font-bold text-gray-900">{value}</span>
                </div>
            </div>
        </motion.div>
    )
})

const ConnectionLine = memo(function ConnectionLine({ startX, startY, endX, endY }: { startX: number, startY: number, endX: number, endY: number }) {
    // Calculate angle and distance
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Offset to not touch the center/nodes directly (visual breathing room)
    const offsetStart = 40;
    const offsetEnd = 60; // radius of center core approx
    const actualWidth = Math.max(0, distance - offsetStart - offsetEnd);

    return (
        <div
            className="absolute top-1/2 left-1/2 h-[1px] bg-indigo-100 origin-left -z-10"
            style={{
                width: distance,
                // We position at start point, then rotate
                transform: `translate(${startX}px, ${startY}px) rotate(${angle}deg)`,
            }}
        >
            {/* Data Pulse Packet */}
            <motion.div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-[2px] w-12 bg-gradient-to-r from-transparent via-primaryBlue to-transparent opacity-0"
                animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: Math.random() * 2 }}
            />
        </div>
    )
})
