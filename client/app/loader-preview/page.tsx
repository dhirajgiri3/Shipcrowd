'use client';

import React, { useState } from 'react';
import { Loader, LoaderSize } from '@/src/components/ui/feedback/Loader';
import { cn } from '@/src/lib/utils';

export default function LoaderPreviewPage() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [size, setSize] = useState<LoaderSize>('md');
    const [progress, setProgress] = useState(45);
    const [message, setMessage] = useState('Verifying credentials...');
    const [subMessage, setSubMessage] = useState('This usually takes a few seconds.');
    const [showFullScreen, setShowFullScreen] = useState(false);

    // Dynamic Theme Wrapper
    const wrapperClass = cn(
        "min-h-screen transition-colors duration-500 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800",
        theme === 'dark' ? "dark bg-zinc-950 text-zinc-50" : "bg-zinc-50 text-zinc-900"
    );

    return (
        <div className={wrapperClass}>
            {/* Sticky Glass Header */}
            <header className="sticky top-0 z-40 w-full border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-zinc-950/60">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center">
                            <span className="text-zinc-50 dark:text-zinc-900 font-bold text-lg">L</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                                Global Loader System
                            </h1>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                Design System v2.0 • Neutral Aesthetics
                            </p>
                        </div>
                    </div>

                    {/* Global Actions */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            {(['sm', 'md', 'lg', 'xl'] as LoaderSize[]).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSize(s)}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-all",
                                        size === s
                                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-2 hidden md:block" />

                        <button
                            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                            className={cn(
                                "h-9 px-4 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                                theme === 'dark'
                                    ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                                    : "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 shadow-sm"
                            )}
                        >
                            {theme === 'light' ? (
                                <>
                                    <span className="opacity-70">Turn Off Lights</span>
                                    <span>Moon</span>
                                </>
                            ) : (
                                <>
                                    <span className="opacity-70">Turn On Lights</span>
                                    <span>Sun</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 lg:p-12 space-y-12">

                {/* Playground Controls Section */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                    <div className="md:col-span-8 space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 ml-1">
                            Simulation Context
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Primary status message..."
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-sm focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-400"
                            />
                            <input
                                type="text"
                                value={subMessage}
                                onChange={(e) => setSubMessage(e.target.value)}
                                placeholder="Secondary explanation..."
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-sm focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-400"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-4 space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Simulated Progress
                            </label>
                            <span className="text-xs font-mono text-zinc-900 dark:text-zinc-100">{progress}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={(e) => setProgress(Number(e.target.value))}
                            className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                        />
                    </div>
                </section>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />

                {/* Showcase Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Primary Loader Showcase (Larger) */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Primary Truck Loader</h2>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                                High Value / Auth / Tracking
                            </span>
                        </div>

                        <div className="relative group rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-12 min-h-[400px] flex items-center justify-center overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-black/50">
                            {/* Grid Background Pattern */}
                            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                                style={{ backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`, backgroundSize: '24px 24px' }}
                            />

                            <Loader
                                variant="truck"
                                size={size}
                                message={message}
                                subMessage={subMessage}
                            />

                            <button
                                onClick={() => setShowFullScreen(true)}
                                className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-bold tracking-wide shadow-lg transform translate-y-2 group-hover:translate-y-0 duration-300"
                            >
                                Preview Overlay Pattern
                            </button>
                        </div>
                    </div>

                    {/* Secondary Loaders Column */}
                    <div className="lg:col-span-5 flex flex-col gap-8">

                        {/* Spinner Card */}
                        <div className="flex-1 flex flex-col gap-4">
                            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 px-1">Contextual Spinner</h2>
                            <div className="flex-1 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-8 flex flex-col items-center justify-center gap-6 relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                                <Loader variant="spinner" size={size} />
                                <p className="text-sm text-zinc-500 text-center max-w-[200px]">
                                    Minimal circular indicator for cards, tables, and modal contents.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Dots Card */}
                            <div className="flex flex-col gap-4">
                                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 px-1">Inline Dots</h2>
                                <div className="aspect-square rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 flex flex-col items-center justify-center gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                                    <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                                        <Loader variant="dots" size={size === 'xl' ? 'lg' : size} />
                                    </div>
                                    <span className="text-xs text-zinc-400">Button State</span>
                                </div>
                            </div>

                            {/* Progress Card */}
                            <div className="flex flex-col gap-4">
                                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 px-1">Progress</h2>
                                <div className="aspect-square rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 flex flex-col items-center justify-center gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                                    <div className="w-full">
                                        <Loader variant="progress" size={size === 'xl' ? 'md' : 'sm'} progress={progress} />
                                    </div>
                                    <span className="text-xs text-zinc-400">Batch Ops</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </main>

            {/* Full Screen Overlay Portal */}
            {showFullScreen && (
                <div
                    onClick={() => setShowFullScreen(false)}
                    className="fixed inset-0 z-[100] cursor-pointer"
                >
                    <div className={theme === 'dark' ? 'dark text-zinc-50' : 'text-zinc-900'}>
                        <Loader
                            variant="truck"
                            fullScreen
                            message={message}
                            subMessage={subMessage}
                        />
                        <div className="fixed top-8 right-8 z-[110] animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium text-zinc-500 mix-blend-difference">
                                Click anywhere to close
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
