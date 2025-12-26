'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { Search, MapPin, Clock, ArrowRight, Truck, CheckCircle, AlertCircle, Loader2, Box, X, History } from 'lucide-react';
import { trackingApi, PublicTrackingResponse } from '@/src/core/api/trackingApi';
import { toast } from 'sonner';
import { Navigation, Footer } from "@/src/shared/components";
import confetti from 'canvas-confetti';

// --- Types & Constants ---
interface RecentSearch {
    number: string;
    timestamp: number;
    status?: string;
}

// --- Components ---

// Reuse the Premium Animated Grid Background from Hero
const GridBackground = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[var(--bg-secondary)]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#E2E8F0_1px,transparent_1px),linear-gradient(to_bottom,#E2E8F0_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-40" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_0%,transparent,white)]" />

            <motion.div
                animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primaryBlue/5 rounded-full blur-[100px]"
            />
        </div>
    )
}

const AbstractMapBackground = () => (
    <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="70%" cy="40%" r="3" fill="currentColor" className="animate-ping" />
            <circle cx="30%" cy="60%" r="2" fill="currentColor" />
            <circle cx="50%" cy="20%" r="2" fill="currentColor" />
        </svg>
    </div>
);


export default function TrackPage() {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [shipment, setShipment] = useState<PublicTrackingResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

    // Mouse parallax effect for the "empty state"
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [2, -2]), { stiffness: 150, damping: 20 });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-2, 2]), { stiffness: 150, damping: 20 });

    useEffect(() => {
        // Load recent searches
        const saved = localStorage.getItem('recent_shipment_searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse recent searches", e);
            }
        }

        const handleMouseMove = (e: MouseEvent) => {
            // Only apply parquet if not showing results
            if (shipment) return;

            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const x = (clientX / innerWidth) - 0.5;
            const y = (clientY / innerHeight) - 0.5;
            mouseX.set(x);
            mouseY.set(y);
        }
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY, shipment]);

    // Confetti Effect for Delivered Items
    useEffect(() => {
        if (shipment?.currentStatus === 'DELIVERED') {
            const end = Date.now() + 1000;
            const colors = ['#2563EB', '#3B82F6', '#60A5FA'];

            (function frame() {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors
                });
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }
    }, [shipment]);

    const addToRecent = (number: string, status?: string) => {
        setRecentSearches(prev => {
            const filtered = prev.filter(p => p.number !== number);
            const newHistory = [{ number, timestamp: Date.now(), status }, ...filtered].slice(0, 5);
            localStorage.setItem('recent_shipment_searches', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const removeFromRecent = (e: React.MouseEvent, number: string) => {
        e.stopPropagation();
        setRecentSearches(prev => {
            const updated = prev.filter(p => p.number !== number);
            localStorage.setItem('recent_shipment_searches', JSON.stringify(updated));
            return updated;
        });
    }


    // Mock Data for UI/UX Testing
    const MOCK_SHIPMENT: PublicTrackingResponse = {
        trackingNumber: 'SHP-20231225-8888',
        carrier: 'BlueDart Express',
        serviceType: 'Express Air',
        currentStatus: 'OUT_FOR_DELIVERY',
        estimatedDelivery: new Date(Date.now() + 86400000).toISOString(),
        actualDelivery: undefined,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        recipient: { city: 'Mumbai', state: 'Maharashtra' },
        timeline: [
            { status: 'OUT_FOR_DELIVERY', timestamp: new Date().toISOString(), location: 'Mumbai, Maharashtra', description: 'Shipment is out for delivery. Agent: Rajesh Kumar (9988776655)' },
            { status: 'ARRIVED_AT_DESTINATION', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), location: 'Mumbai Hub', description: 'Shipment arrived at destination facility.' },
            { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000).toISOString(), location: 'New Delhi', description: 'Shipment is in transit to destination.' },
            { status: 'PICKED_UP', timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(), location: 'Gurgaon, Haryana', description: 'Shipment picked up from seller warehouse.' },
            { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), description: 'Order has been created and is ready for processing.' }
        ]
    };

    const getStatusDisplay = (status: string, estimated?: string) => {
        const estDate = estimated ? new Date(estimated).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : '';

        switch (status) {
            case 'DELIVERED':
                return {
                    text: 'Mission Accomplished!',
                    sub: `Delivered safely`,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-500',
                    gradient: 'from-emerald-500 to-green-400',
                    icon: <CheckCircle size={180} />
                };
            case 'OUT_FOR_DELIVERY':
                return {
                    text: 'On the way to you',
                    sub: `Arriving today by 8 PM`,
                    color: 'text-[var(--primary-blue)]',
                    bg: 'bg-blue-500',
                    gradient: 'from-blue-600 to-indigo-500',
                    icon: <Truck size={180} />
                };
            case 'IN_TRANSIT':
                return {
                    text: 'Moving fast',
                    sub: `Expected ${estDate}`,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-500',
                    gradient: 'from-indigo-600 to-purple-500',
                    icon: <Truck size={180} />
                };
            case 'PICKED_UP':
                return {
                    text: 'We have it',
                    sub: 'Picked up from sender',
                    color: 'text-amber-600',
                    bg: 'bg-amber-500',
                    gradient: 'from-amber-500 to-orange-400',
                    icon: <Box size={180} />
                };
            default:
                return {
                    text: status.replace(/_/g, ' '),
                    sub: `Estimated ${estDate}`,
                    color: 'text-slate-900',
                    bg: 'bg-slate-500',
                    gradient: 'from-slate-700 to-slate-500',
                    icon: <Box size={180} />
                };
        }
    };

    const handleTrack = async (e?: React.FormEvent, overrideNumber?: string) => {
        if (e) e.preventDefault();
        const numberToTrack = overrideNumber || trackingNumber;
        if (!numberToTrack.trim()) return;

        // Verify format
        if (!numberToTrack.startsWith('SHP-') && numberToTrack.toUpperCase() !== 'DEMO') {
            // Let backend handle robust validation, but simple check here
        }

        setIsLoading(true);
        setError(null);
        setHasSearched(true);
        setShipment(null);

        // DEMO MODE
        if (numberToTrack.trim().toUpperCase() === 'DEMO') {
            setTimeout(() => {
                setShipment(MOCK_SHIPMENT);
                addToRecent('DEMO', 'OUT_FOR_DELIVERY');
                setIsLoading(false);
            }, 1500); // Slightly longer for dramatic effect
            return;
        }

        try {
            const data = await trackingApi.trackShipment(numberToTrack.trim());
            setShipment(data);
            addToRecent(data.trackingNumber, data.currentStatus);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to find shipment');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[var(--bg-secondary)] flex flex-col font-sans overflow-x-hidden selection:bg-blue-100 selection:text-blue-700">
            <Navigation />
            <GridBackground />

            {/* Main Content Area */}
            <div className="flex-grow relative z-10 flex flex-col items-center justify-center container mx-auto px-4 py-8">

                {/* 
                  LAYOUT ANIMATION CONTAINER 
                */}
                <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`w-full max-w-4xl flex flex-col items-center ${shipment ? 'pt-8' : 'min-h-[60vh] justify-center'}`}
                >
                    {/* Header Text */}
                    <AnimatePresence>
                        {!shipment && !isLoading && !error && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0, scale: 0.9, marginBottom: 0 }}
                                className="text-center mb-12"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[var(--border-subtle)] shadow-sm text-xs font-semibold text-[var(--primary-blue)] tracking-wider uppercase mb-6"
                                >
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary-blue)] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary-blue)]"></span>
                                    </span>
                                    Live Tracking System
                                </motion.div>
                                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--text-primary)] mb-6">
                                    Where is your <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-blue)] to-indigo-600">Shipment?</span>
                                </h1>
                                <p className="text-[var(--text-secondary)] text-lg max-w-lg mx-auto">
                                    Experience the next generation of logistics tracking. Real-time updates, precise locations, and AI-powered estimations.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 3D Floating Search Bar */}
                    <motion.div
                        layout
                        style={{
                            perspective: 1000,
                            rotateX: !shipment && !hasSearched ? rotateX : 0,
                            rotateY: !shipment && !hasSearched ? rotateY : 0,
                        }}
                        className={`w-full max-w-xl relative z-30 ${shipment ? 'mb-8' : 'mb-0'}`}
                    >
                        <motion.form
                            onSubmit={(e) => handleTrack(e)}
                            layoutId="search-container"
                            className={`
                                relative bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200/60
                                transition-all duration-500 ease-out flex items-center p-2 overflow-hidden
                                ${isLoading ? 'ring-4 ring-[var(--primary-blue-soft)]' : 'hover:shadow-[0_30px_60px_-12px_rgba(37,37,255,0.15)] focus-within:ring-4 focus-within:ring-[var(--primary-blue-soft)]'}
                            `}
                        >
                            {/* Scanning Animation Effect */}
                            {isLoading && (
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/30 to-transparent"
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '100%' }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                />
                            )}

                            <div className="pl-4 text-slate-400 z-10">
                                <Search className="w-6 h-6" />
                            </div>
                            <input
                                type="text"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                                placeholder="Enter AWB ID (e.g. SHP-...)"
                                className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-lg text-slate-800 placeholder:text-slate-300 font-semibold tracking-wide z-10"
                                disabled={isLoading}
                            />

                            <AnimatePresence mode="popLayout">
                                {isLoading ? (
                                    <motion.div
                                        key="loader"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="pr-4 z-10"
                                    >
                                        <Loader2 className="w-6 h-6 text-[var(--primary-blue)] animate-spin" />
                                    </motion.div>
                                ) : (
                                    <motion.button
                                        key="button"
                                        layout
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="submit"
                                        disabled={!trackingNumber}
                                        className="bg-[var(--primary-blue)] text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 z-10"
                                    >
                                        <ArrowRight className="w-6 h-6" />
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </motion.form>

                        {/* Demo Link */}
                        {!shipment && !isLoading && !recentSearches.length && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute -bottom-10 left-0 w-full text-center text-sm text-slate-400 font-medium"
                            >
                                Try <span className="text-[var(--primary-blue)] cursor-pointer hover:underline decoration-2" onClick={() => { setTrackingNumber('DEMO'); }}>DEMO</span> for a preview
                            </motion.p>
                        )}
                    </motion.div>

                    {/* Recent Searches Widget */}
                    <AnimatePresence>
                        {!shipment && !isLoading && recentSearches.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                className="w-full max-w-xl mt-4"
                            >
                                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">
                                    <History size={12} />
                                    <span>Recent Searches</span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {recentSearches.map((search, idx) => (
                                        <motion.div
                                            key={search.number}
                                            layout
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onClick={() => {
                                                setTrackingNumber(search.number);
                                                handleTrack(undefined, search.number);
                                            }}
                                            className="group relative bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-[var(--primary-blue)] hover:shadow-md transition-all"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                <Box size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">{search.number}</span>
                                                <span className="text-[10px] font-medium text-slate-400 uppercase">{search.status?.replace(/_/g, ' ') || 'Tracked recently'}</span>
                                            </div>
                                            <button
                                                onClick={(e) => removeFromRecent(e, search.number)}
                                                className="absolute -top-2 -right-2 bg-slate-100 hover:bg-slate-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={10} className="text-slate-500" />
                                            </button>
                                        </motion.div>
                                    ))}
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        onClick={() => { setTrackingNumber('DEMO'); handleTrack(undefined, 'DEMO'); }}
                                        className="bg-[var(--primary-blue)]/5 border border-[var(--primary-blue)]/10 text-[var(--primary-blue)] rounded-xl px-4 py-3 text-sm font-semibold hover:bg-[var(--primary-blue)]/10 transition-colors"
                                    >
                                        Try Demo
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ERROR STATE */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: 10, height: 0 }}
                            className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-xl flex items-center gap-3 shadow-lg shadow-red-500/5 max-w-md mt-4"
                        >
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="font-medium">{error}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* RESULT DASHBOARD - BENTO GRID */}
                <AnimatePresence>
                    {shipment && (
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25, staggerChildren: 0.1 }}
                            className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6 pb-20"
                        >
                            {/* Define display properties based on status */}
                            {(() => {
                                const display = getStatusDisplay(shipment.currentStatus, shipment.estimatedDelivery);

                                return (
                                    <>
                                        {/* WIDGET 1: STATUS HERO (Full width on mobile, 5 cols on desktop) */}
                                        <motion.div
                                            className="col-span-1 md:col-span-5 bg-white rounded-[32px] p-8 border border-slate-100 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] relative overflow-hidden group h-[340px] flex flex-col justify-between"
                                            whileHover={{ y: -5 }}
                                        >
                                            {/* Abstract Background Decoration */}
                                            <div className={`absolute top-0 right-0 p-8 opacity-10 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12 ${display.color}`}>
                                                {display.icon}
                                            </div>

                                            <div className="relative z-10 w-full">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className={`w-3 h-3 rounded-full ${display.bg} animate-pulse`} />
                                                    <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">Current Status</span>
                                                </div>
                                                <h2 className={`text-4xl font-black ${display.color} leading-tight mb-2 tracking-tight`}>
                                                    {display.text}
                                                </h2>
                                                <p className="text-slate-500 font-medium text-lg">
                                                    {display.sub}
                                                </p>
                                            </div>

                                            <div className="relative z-10">
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: shipment.currentStatus === 'DELIVERED' ? '100%' : '65%' }}
                                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                                        className={`h-full rounded-full bg-gradient-to-r ${display.gradient}`}
                                                    />
                                                </div>
                                                <div className="flex justify-between mt-3 text-xs font-bold text-slate-300 uppercase">
                                                    <span>Start</span>
                                                    <span>Progress</span>
                                                    <span>Goal</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </>
                                );
                            })()}

                            {/* WIDGET 2: INFORMATION GRID (7 cols) */}
                            <motion.div className="col-span-1 md:col-span-7 grid grid-cols-2 gap-4 h-auto md:h-[340px]">
                                {/* Carrier Info */}
                                <motion.div
                                    className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm col-span-1 flex flex-col justify-center items-center text-center hover:shadow-md transition-shadow relative overflow-hidden"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-4 shadow-sm border border-slate-100">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Shipped With</span>
                                    <div className="text-xl font-bold text-slate-900">{shipment.carrier}</div>
                                    <div className="text-xs text-slate-500 mt-2 font-medium bg-slate-100 px-3 py-1 rounded-full">{shipment.serviceType}</div>
                                </motion.div>

                                {/* Location Info with Abstract Map */}
                                <motion.div
                                    className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm col-span-1 flex flex-col justify-center items-center text-center hover:shadow-md transition-shadow relative overflow-hidden text-blue-600"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <AbstractMapBackground />
                                    <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4 shadow-sm relative z-10">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600/60 uppercase tracking-wider mb-2 relative z-10">Desintation</span>
                                    <div className="text-xl font-bold text-slate-900 relative z-10">{shipment.recipient.city}</div>
                                    <div className="text-sm text-slate-500 relative z-10">{shipment.recipient.state}</div>
                                </motion.div>

                                {/* Tracking ID */}
                                <motion.div
                                    className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-8 col-span-2 flex items-center justify-between text-white shadow-lg shadow-slate-900/10 cursor-pointer group"
                                    whileHover={{ scale: 1.01 }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(shipment.trackingNumber);
                                        toast.success('Copied to clipboard');
                                    }}
                                >
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block group-hover:text-white transition-colors">Tracking Number</span>
                                        <div className="text-3xl font-mono tracking-wider font-light">{shipment.trackingNumber}</div>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5 group-hover:bg-white/20 transition-all">
                                        <Box className="w-6 h-6 text-white" />
                                    </div>
                                </motion.div>
                            </motion.div>

                            {/* WIDGET 3: TIMELINE (Full width) */}
                            <motion.div
                                className="col-span-1 md:col-span-12 bg-white rounded-[32px] p-8 md:p-10 border border-slate-100 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)]"
                            >
                                <div className="flex items-center gap-3 mb-10">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[var(--primary-blue)] flex items-center justify-center">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">Detailed Journey</h3>
                                        <p className="text-sm text-slate-500">Real-time event log for your shipment</p>
                                    </div>
                                </div>

                                <div className="relative pl-4 md:pl-0">
                                    {/* Animated Line */}
                                    <div className="absolute left-[27px] md:left-[39px] top-4 bottom-4 w-0.5 bg-slate-100 md:block hidden" />
                                    <div className="absolute left-[8px] top-4 bottom-4 w-0.5 bg-slate-100 md:hidden block" />

                                    <div className="space-y-10">
                                        {shipment.timeline.map((event, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -20 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.1 }}
                                                className="relative flex gap-6 md:gap-10 group"
                                            >
                                                {/* Node */}
                                                <div className={`
                                                    relative z-10 w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[20px] border-[6px] border-white shadow-xl flex items-center justify-center flex-shrink-0 transition-all duration-500
                                                    ${i === 0 ? 'bg-[var(--primary-blue)] text-white shadow-blue-500/30 scale-110' : 'bg-white text-slate-400 grayscale'}
                                                `}>
                                                    {i === 0
                                                        ? <Truck size={24} className="md:w-8 md:h-8" strokeWidth={2} />
                                                        : <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-slate-200" />}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 py-1 md:py-3">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
                                                        <h4 className={`text-lg md:text-xl font-bold ${i === 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                                                            {event.status.replace(/_/g, ' ')}
                                                        </h4>
                                                        <span className="text-xs md:text-sm font-mono text-slate-400 bg-slate-50 px-3 py-1 rounded-full inline-block w-fit mt-1 md:mt-0 border border-slate-100">
                                                            {new Date(event.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-500 leading-relaxed max-w-2xl text-base">
                                                        {event.description}
                                                    </p>
                                                    {event.location && (
                                                        <div className="flex items-center gap-2 mt-3 text-sm font-semibold text-slate-400">
                                                            <MapPin size={16} className="text-slate-300" />
                                                            {event.location}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>

            <Footer />
        </main>
    );
}
