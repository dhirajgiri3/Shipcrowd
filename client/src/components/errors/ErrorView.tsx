'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowRight, Terminal, AlertTriangle, Box, Compass } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { cn } from '@/src/lib/utils';

interface ErrorViewProps {
    error?: Error & { digest?: string };
    reset?: () => void;
    title?: string;
    message?: string;
    homePath?: string;
}

/**
 * Premium "Lost Shipment" Error View
 * 
 * Features:
 * - Interactive Mouse Parallax
 * - Floating "Lost Container" 3D-ish Element
 * - "Mission Control" Terminal for Stack Trace
 * - Buttery Smooth Framer Motion Entrance
 */
export const ErrorView: React.FC<ErrorViewProps> = ({ error, reset, title, message, homePath }) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [showDetails, setShowDetails] = useState(false);

    // Handle interactive parallax
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth - 0.5) * 20,
                y: (e.clientY / window.innerHeight - 0.5) * 20,
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleReload = () => {
        if (reset) {
            reset();
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="relative min-h-[600px] w-full h-[80vh] flex items-center justify-center overflow-hidden bg-[var(--bg-primary)] p-6">

            {/* --- Background Ambient Glow --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--primary-blue-soft)]/30 rounded-full blur-[120px]" />
            </div>

            {/* --- Floating Particles (Parallax) --- */}
            <motion.div
                className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10"
                animate={{
                    x: mousePosition.x * -1,
                    y: mousePosition.y * -1,
                }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
            >
                {/* Randomly placed "shipping" debris */}
                <Box className="absolute top-1/4 left-1/4 w-8 h-8 text-[var(--primary-blue)] rotate-12" />
                <Compass className="absolute bottom-1/3 right-1/4 w-12 h-12 text-[var(--text-tertiary)] -rotate-45" />
                <div className="absolute top-1/3 right-1/3 w-4 h-4 rounded-full bg-[var(--warning)]" />
                <div className="absolute bottom-1/4 left-1/3 w-2 h-2 rounded-full bg-[var(--error)]" />
            </motion.div>


            {/* --- Main Content Card --- */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} // smooth ease-out-expo
                className="relative z-10 max-w-2xl w-full"
            >
                <div className="text-center space-y-8">

                    {/* Hero Graphic: The Lost Container */}
                    <div className="relative inline-block">
                        <motion.div
                            animate={{
                                y: [0, -10, 0],
                                rotate: [0, 2, -1, 0]
                            }}
                            transition={{
                                duration: 6,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="relative z-10 w-40 h-40 mx-auto"
                        >
                            {/* Abstract Container Box */}
                            <div className="w-full h-full bg-gradient-to-br from-[var(--primary-blue-light)] to-[var(--primary-blue)] rounded-2xl shadow-brand-lg flex items-center justify-center border border-[var(--glass-border)] transform rotate-12">
                                <AlertTriangle className="w-16 h-16 text-white drop-shadow-md" strokeWidth={1.5} />
                            </div>

                            {/* Shadow Puddle */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/10 dark:bg-black/30 rounded-[100%] blur-md" />
                        </motion.div>
                    </div>

                    {/* Text Content */}
                    <div className="space-y-4">
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-[var(--text-display-lg)] font-bold tracking-tight text-[var(--text-primary)] leading-none"
                        >
                            {title || 'Shipment Lost'}
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-[var(--text-body-lg)] text-[var(--text-secondary)] max-w-md mx-auto"
                        >
                            {message || "We've encountered an anomaly in the shipping manifest. The system has paused to protect your data."}
                        </motion.p>
                    </div>

                    {/* Action Area */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleReload}
                            className="w-full sm:w-auto min-w-[200px] shadow-brand-sm hover:shadow-brand transition-all"
                        >
                            <RefreshCw className="mr-2 w-5 h-5 animate-spin-slow" />
                            Re-establish Connection
                        </Button>

                        {homePath && (
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => window.location.href = homePath}
                                className="w-full sm:w-auto min-w-[200px]"
                            >
                                <ArrowRight className="mr-2 w-5 h-5" />
                                Return to Base
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={() => setShowDetails(!showDetails)}
                            className="w-full sm:w-auto text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                            <Terminal className="mr-2 w-5 h-5" />
                            {showDetails ? 'Hide Flight Recorder' : 'View Flight Recorder'}
                        </Button>
                    </motion.div>

                    {/* Terminal Error Details (Collapsible) */}
                    <AnimatePresence>
                        {showDetails && error && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden w-full text-left max-w-xl mx-auto mt-8"
                            >
                                <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg p-4 font-mono text-xs shadow-inner">
                                    <div className="flex items-center gap-2 mb-2 text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] pb-2">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--error)]" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--warning)]" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)]" />
                                        </div>
                                        <span className="ml-2">system_diagnostics.log</span>
                                    </div>
                                    <p className="text-[var(--error)] font-bold mb-2 break-words">
                                        &gt; Error: {error.message}
                                    </p>
                                    {error.digest && (
                                        <p className="text-[var(--text-tertiary)] text-xs mb-2 font-mono">
                                            &gt; Digest: {error.digest}
                                        </p>
                                    )}
                                    <div className="text-[var(--text-muted)] opacity-70 max-h-40 overflow-y-auto scrollbar-hide break-all whitespace-pre-wrap">
                                        {error.stack || 'No stack trace available.'}
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
