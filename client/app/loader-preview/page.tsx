'use client';

import React, { useState } from 'react';
import { Loader, LoaderSize } from '@/src/components/ui/feedback/Loader';
import { cn } from '@/src/lib/utils';

export default function LoaderPreviewPage() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [size, setSize] = useState<LoaderSize>('md');
    const [progress, setProgress] = useState(45);
    const [message, setMessage] = useState('Loading data...');
    const [subMessage, setSubMessage] = useState('Please wait while we fetch your information.');
    const [showFullScreen, setShowFullScreen] = useState(false);

    // Toggle theme class on the wrapper
    const containerClass = cn(
        "min-h-screen p-8 transition-colors duration-300",
        theme === 'dark' ? 'dark bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'
    );

    const cardClass = cn(
        "p-6 rounded-xl border transition-all duration-300",
        theme === 'dark'
            ? "bg-gray-900 border-gray-800 shadow-none"
            : "bg-white border-gray-200 shadow-sm"
    );

    return (
        <div className={containerClass}>
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header & Controls */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Loader Design Studio</h1>
                            <p className={cn("mt-2", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                                Preview and iterate on application loading states.
                            </p>
                        </div>

                        <button
                            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                            className={cn(
                                "px-4 py-2 rounded-lg font-medium transition-colors",
                                theme === 'dark'
                                    ? "bg-gray-800 hover:bg-gray-700 text-gray-200"
                                    : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-sm"
                            )}
                        >
                            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                        </button>
                    </div>

                    {/* Controls Grid */}
                    <div className={cn(
                        "p-6 rounded-xl border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
                        theme === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200 shadow-sm"
                    )}>
                        {/* Size Control */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold uppercase tracking-wider opacity-70">
                                Size
                            </label>
                            <div className="flex bg-gray-100/10 p-1 rounded-lg border border-gray-500/20">
                                {(['sm', 'md', 'lg', 'xl'] as LoaderSize[]).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSize(s)}
                                        className={cn(
                                            "flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all",
                                            size === s
                                                ? (theme === 'dark' ? "bg-gray-800 text-white shadow-sm" : "bg-white text-gray-900 shadow-sm")
                                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                        )}
                                    >
                                        {s.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Progress Control */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold uppercase tracking-wider opacity-70">
                                Progress ({progress}%)
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={progress}
                                onChange={(e) => setProgress(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                            />
                        </div>

                        {/* Message Control */}
                        <div className="space-y-3 md:col-span-2">
                            <label className="text-sm font-semibold uppercase tracking-wider opacity-70">
                                Messages
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Main message"
                                    className={cn(
                                        "w-full px-3 py-2 rounded-md border bg-transparent text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none",
                                        theme === 'dark' ? "border-gray-700 placeholder-gray-600" : "border-gray-300 placeholder-gray-400"
                                    )}
                                />
                                <input
                                    type="text"
                                    value={subMessage}
                                    onChange={(e) => setSubMessage(e.target.value)}
                                    placeholder="Sub message"
                                    className={cn(
                                        "w-full px-3 py-2 rounded-md border bg-transparent text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none",
                                        theme === 'dark' ? "border-gray-700 placeholder-gray-600" : "border-gray-300 placeholder-gray-400"
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <hr className={cn("border-t", theme === 'dark' ? "border-gray-800" : "border-gray-200")} />

                {/* Preview Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Truck Loader Card */}
                    <div className={cn(cardClass, "lg:col-span-2 flex flex-col items-center justify-center min-h-[300px]")}>
                        <div className="w-full flex justify-between items-start mb-8">
                            <h3 className="text-lg font-semibold">Truck Loader (Primary)</h3>
                            <button
                                onClick={() => setShowFullScreen(true)}
                                className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors"
                            >
                                Preview Full Screen
                            </button>
                        </div>

                        <Loader
                            variant="truck"
                            size={size}
                            message={message}
                            subMessage={subMessage}
                        />
                    </div>

                    {/* Spinner Loader Card */}
                    <div className={cn(cardClass, "flex flex-col items-center justify-center min-h-[250px]")}>
                        <div className="w-full text-left mb-8">
                            <h3 className="text-lg font-semibold">Spinner</h3>
                            <p className={cn("text-xs mt-1", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                                Used for sections, cards, and modal content.
                            </p>
                        </div>
                        <Loader
                            variant="spinner"
                            size={size}
                            message={message}
                        />
                    </div>

                    {/* Progress Loader Card */}
                    <div className={cn(cardClass, "flex flex-col items-center justify-center min-h-[250px]")}>
                        <div className="w-full text-left mb-8">
                            <h3 className="text-lg font-semibold">Progress Bar</h3>
                            <p className={cn("text-xs mt-1", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                                Used for file uploads and batch operations.
                            </p>
                        </div>
                        <div className="w-full px-8">
                            <Loader
                                variant="progress"
                                size={size}
                                progress={progress}
                                message={`${progress}% Complete`}
                            />
                        </div>
                    </div>

                    {/* Dots Loader Card */}
                    <div className={cn(cardClass, "flex flex-col items-center justify-center min-h-[250px]")}>
                        <div className="w-full text-left mb-8">
                            <h3 className="text-lg font-semibold">Dots</h3>
                            <p className={cn("text-xs mt-1", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                                Used for inline states and button loading.
                            </p>
                        </div>

                        <div className="flex gap-4 items-center">
                            <button disabled className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 opacity-90">
                                <span>Processing</span>
                                <Loader variant="dots" size="sm" className="inline-flex" />
                            </button>

                            <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700" />

                            <Loader variant="dots" size={size} />
                        </div>
                    </div>

                </div>
            </div>

            {/* Full Screen Mode */}
            {showFullScreen && (
                <div
                    onClick={() => setShowFullScreen(false)}
                    className="fixed inset-0 z-50 cursor-pointer"
                    title="Click anywhere to close"
                >
                    {/* We wrap it in a theme provider div to ensure variables work in portal/overlay */}
                    <div className={theme === 'dark' ? 'dark text-white' : 'text-gray-900'}>
                        <Loader
                            variant="truck"
                            fullScreen
                            message={message}
                            subMessage={subMessage}
                        />
                        <div className="fixed top-8 right-8 z-[110] text-sm text-gray-500 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                            Click to close
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
