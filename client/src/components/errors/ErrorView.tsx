'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowRight, Terminal, AlertTriangle, Box, Compass, Activity } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';

interface ErrorViewProps {
    error?: Error & { digest?: string };
    reset?: () => void;
    title?: string;
    message?: string;
    homePath?: string;
}

/**
 * Premium "Lost Shipment" Error View
 * - Aligned with Shipcrowd Global Design System V2
 * - Uses Semantic CSS Variables for Theme Support
 * - Enhanced Visual Hierarchy & Animation
 */
export const ErrorView: React.FC<ErrorViewProps> = ({ error, reset, title, message, homePath }) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [showDetails, setShowDetails] = useState(false);

    // Smooth Interactive Parallax
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Calculated for subtle, premium feel
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            setMousePosition({ x, y });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleReload = () => {
        if (reset) reset();
        else window.location.reload();
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-y-auto scrollbar-hide bg-[var(--bg-primary)] p-6 md:p-12 transition-colors duration-500">

            {/* --- Background Ambient Atmosphere --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[800px] h-[800px] bg-[var(--primary-blue-soft)] rounded-full blur-[160px] opacity-40 dark:opacity-10 mix-blend-screen" />
                <div className="absolute bottom-[20%] right-[20%] w-[600px] h-[600px] bg-[var(--primary-blue-light)] rounded-full blur-[180px] opacity-20 dark:opacity-5 mix-blend-screen" />
            </div>

            {/* --- Floating Particles (Parallax Layer) --- */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                    x: mousePosition.x * -1.5,
                    y: mousePosition.y * -1.5,
                }}
                transition={{ type: "spring", stiffness: 20, damping: 30, mass: 1 }}
            >
                {/* Decorative Elements */}
                <Box className="absolute top-[15%] left-[15%] w-12 h-12 text-[var(--primary-blue)] opacity-[0.08] dark:opacity-[0.15] rotate-12" />
                <Compass className="absolute bottom-[20%] right-[15%] w-16 h-16 text-[var(--text-tertiary)] opacity-[0.06] dark:opacity-[0.1] -rotate-45" />
                <div className="absolute top-[25%] right-[25%] w-3 h-3 rounded-full bg-[var(--warning)] opacity-30 blur-[2px]" />
                <div className="absolute bottom-[35%] left-[25%] w-2 h-2 rounded-full bg-[var(--error)] opacity-30 blur-[2px]" />
            </motion.div>


            {/* --- Main Content Card --- */}
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 max-w-2xl w-full"
            >
                {/* Glassmorphism Frame */}
                <div className="relative overflow-hidden rounded-[2rem] bg-[var(--bg-secondary)]/80 dark:bg-[var(--bg-secondary)]/60 backdrop-blur-3xl border border-[var(--border-default)] dark:border-[var(--border-subtle)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12),0_20px_40px_-10px_rgba(0,0,0,0.08)] dark:shadow-none p-8 md:p-16 text-center ring-1 ring-white/40 dark:ring-white/5">

                    {/* Subtle Noise Texture overlay */}
                    <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                    {/* Hero Graphic: The Lost Container */}
                    <div className="relative inline-block mb-12">
                        <motion.div
                            animate={{
                                y: [-8, 8, -8],
                                rotateZ: [1, -1, 1]
                            }}
                            transition={{
                                duration: 6,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="relative z-10"
                        >
                            <div className="relative group cursor-default">
                                {/* Clean Glass Container */}
                                <div className="relative w-28 h-28 bg-gradient-to-br from-white/80 to-white/40 dark:from-white/5 dark:to-white/0 backdrop-blur-xl rounded-[1.75rem] border border-white/60 dark:border-white/10 flex items-center justify-center shadow-xl shadow-[var(--primary-blue-soft)]/20 dark:shadow-none transition-transform duration-500 ease-out group-hover:scale-105 group-hover:-rotate-2">
                                    <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-tr from-white/40 to-transparent opacity-50 dark:opacity-10 pointer-events-none" />
                                    <AlertTriangle className="w-12 h-12 text-[var(--primary-blue)] drop-shadow-sm opacity-90" strokeWidth={1.5} />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Typography */}
                    <div className="space-y-5 relative z-10 mb-12">
                        <motion.h2
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]"
                        >
                            {title || 'Shipment Lost in Transit'}
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.35, duration: 0.6 }}
                            className="text-lg md:text-xl text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed text-balance font-light"
                        >
                            {message || "We've encountered a navigation anomaly. The system has paused this stream to protect your data integrity."}
                        </motion.p>
                    </div>

                    {/* Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10"
                    >
                        <Button
                            className="w-full sm:w-auto min-w-[180px] h-14 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-[var(--primary-blue)]/20 rounded-2xl text-base font-medium transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                            onClick={handleReload}
                        >
                            <RefreshCw className="mr-2.5 w-5 h-5" />
                            Retry Connection
                        </Button>

                        {homePath && (
                            <Button
                                className="w-full sm:w-auto min-w-[180px] h-14 border border-[var(--border-default)] dark:border-[var(--border-subtle)] bg-[var(--bg-primary)]/50 hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-2xl text-base font-medium backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
                                onClick={() => window.location.href = homePath}
                            >
                                <ArrowRight className="mr-2.5 w-5 h-5" />
                                Return to Base
                            </Button>
                        )}
                    </motion.div>

                    {/* System Log Toggle */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-14 pt-8 border-t border-[var(--border-default)] dark:border-[var(--border-subtle)]"
                    >
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="group flex items-center justify-center gap-2.5 mx-auto text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--primary-blue)] transition-all px-4 py-2 rounded-lg hover:bg-[var(--bg-hover)]/50"
                        >
                            <Terminal className="w-4 h-4 transition-transform group-hover:scale-110" />
                            {showDetails ? 'Close Diagnostics' : 'System Diagnostics'}
                        </button>
                    </motion.div>

                    {/* Terminal View */}
                    <AnimatePresence>
                        {showDetails && error && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                animate={{ height: 'auto', opacity: 1, marginTop: 32 }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
                                className="overflow-hidden w-full text-left max-w-2xl mx-auto"
                            >
                                <div className="bg-[#1e1e2e] dark:bg-[#0B0C15] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/50">

                                    {/* Terminal Bar */}
                                    <div className="flex items-center justify-between px-5 py-3 bg-white/5 border-b border-white/5">
                                        <div className="flex gap-2">
                                            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#ff5f56]/20" />
                                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#ffbd2e]/20" />
                                            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#27c93f]/20" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Activity className="w-3.5 h-3.5 text-[var(--text-tertiary)] opacity-70" />
                                            <span className="text-[10px] font-mono text-[var(--text-tertiary)] opacity-70 uppercase tracking-widest">Live Trace</span>
                                        </div>
                                    </div>

                                    {/* Console Output */}
                                    <div className="p-6 font-mono text-xs md:text-sm overflow-x-auto text-[#a0a0c0]">
                                        <div className="flex items-center gap-3 mb-4 text-[var(--error)] bg-[var(--error)]/10 p-2 rounded-md border border-[var(--error)]/20 w-fit">
                                            <span className="font-bold opacity-80">$</span>
                                            <span className="font-semibold tracking-wide">CRITICAL_FAILURE</span>
                                        </div>

                                        <p className="text-[#e2e2e3] mb-5 leading-relaxed">
                                            <span className="text-[#ff5f56] mr-2">Error:</span>
                                            {error.message}
                                        </p>

                                        {error.digest && (
                                            <div className="text-[var(--text-tertiary)] mb-4 flex items-center gap-2 bg-white/5 w-fit px-3 py-1 rounded-full text-[10px]">
                                                <span className="opacity-50">DIGEST:</span>
                                                <span className="text-[var(--primary-blue-light)] font-mono tracking-wider">{error.digest}</span>
                                            </div>
                                        )}

                                        <div className="mt-6">
                                            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2 opacity-60">Stack Trace</div>
                                            <div className="p-4 bg-black/20 rounded-xl border border-white/5 shadow-inner">
                                                <code className="block max-h-64 overflow-y-auto scrollbar-hide pr-2 text-[11px] leading-loose text-[#8899ac] whitespace-pre-wrap select-all">
                                                    {error.stack || 'Stack trace hidden for security or unavailable.'}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </motion.div>
        </div>
    );
};
