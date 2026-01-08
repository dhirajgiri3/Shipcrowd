"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Button } from '@/components/ui/core/Button';
import { cn } from '@/src/shared/utils';
import {
    Search,
    Truck,
    Package,
    MapPin,
    Clock,
    ArrowRight,
    Calendar,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Tracking Data
const mockTrackingData = {
    awb: 'DL987654321IN',
    status: 'In Transit',
    estimatedDelivery: 'Dec 14, 2024',
    origin: 'Mumbai, MH',
    destination: 'New Delhi, DL',
    courier: 'Delhivery',
    history: [
        {
            status: 'Out for Delivery',
            location: 'New Delhi, DL',
            timestamp: 'Dec 14, 09:30 AM',
            completed: false,
            current: true,
            icon: Truck
        },
        {
            status: 'Arrived at Destination Hub',
            location: 'New Delhi, DL',
            timestamp: 'Dec 13, 08:45 PM',
            completed: true,
            current: false,
            icon: MapPin
        },
        {
            status: 'In Transit',
            location: 'Jaipur, RJ',
            timestamp: 'Dec 12, 11:20 AM',
            completed: true,
            current: false,
            icon: Truck
        },
        {
            status: 'Picked Up',
            location: 'Mumbai, MH',
            timestamp: 'Dec 11, 04:15 PM',
            completed: true,
            current: false,
            icon: Package
        },
        {
            status: 'Order Placed',
            location: 'Online',
            timestamp: 'Dec 11, 10:00 AM',
            completed: true,
            current: false,
            icon: Calendar
        }
    ]
};

export function TrackingClient() {
    const [search, setSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<typeof mockTrackingData | null>(null);

    const handleSearch = () => {
        if (!search.trim()) return;
        setIsSearching(true);
        // Simulate API call
        setTimeout(() => {
            setResult(mockTrackingData);
            setIsSearching(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen pb-20 space-y-8">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-[var(--radius-3xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-8 md:p-12 shadow-sm">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--primary-blue)]/10 to-transparent rounded-bl-full -mr-20 -mt-20 pointer-events-none" />

                <div className="relative z-10 max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] text-xs font-bold uppercase tracking-wider mb-4 border border-[var(--primary-blue-light)]/20"
                    >
                        <span className="w-2 h-2 rounded-full bg-[var(--primary-blue)] animate-pulse" />
                        Real-time Logistics
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight mb-4"
                    >
                        Track Your Shipments
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-[var(--text-muted)] mb-8 max-w-xl"
                    >
                        Enter your AWB number to get real-time application updates, delivery estimates, and detailed shipment journeys.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-3"
                    >
                        <div className="relative flex-1 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] group-focus-within:text-[var(--primary-blue)] transition-colors" />
                            <input
                                type="text"
                                placeholder="Enter AWB Number (e.g., DL987654321IN)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full h-14 pl-14 pr-4 rounded-2xl bg-[var(--bg-secondary)] border border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)] text-lg transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)] shadow-inner"
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="h-14 px-8 rounded-2xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-lg font-semibold shadow-brand-lg transition-all hover:scale-105 active:scale-95"
                        >
                            {isSearching ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Tracking...
                                </span>
                            ) : 'Track Now'}
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* Results Section */}
            <AnimatePresence mode="wait">
                {result ? (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="grid lg:grid-cols-3 gap-8"
                    >
                        {/* Main Status Card */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="p-8 rounded-[var(--radius-3xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[var(--border-subtle)] pb-8">
                                    <div className="flex items-center gap-5">
                                        <div className="h-20 w-20 rounded-2xl bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)] border border-[var(--primary-blue-light)]/20 shadow-inner">
                                            <Truck className="w-10 h-10" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1">Current Status</p>
                                            <h2 className="text-3xl font-bold text-[var(--text-primary)]">{result.status}</h2>
                                            <p className="text-sm text-[var(--text-secondary)] mt-1">Via {result.courier}</p>
                                        </div>
                                    </div>
                                    <div className="text-right bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-subtle)]">
                                        <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1">Estimated Delivery</p>
                                        <p className="text-xl font-bold text-[var(--success)]">{result.estimatedDelivery}</p>
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="relative space-y-0 pl-4 pt-4">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[27px] top-4 bottom-8 w-0.5 bg-[var(--border-subtle)]" />

                                    {result.history.map((event, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="relative flex gap-8 pb-10 last:pb-0 group"
                                        >
                                            {/* Node */}
                                            <div className={cn(
                                                "relative z-10 flex-shrink-0 w-6 h-6 rounded-full border-[3px] transition-all duration-300 mt-1",
                                                event.current
                                                    ? "bg-[var(--primary-blue)] border-blue-100 dark:border-blue-900 shadow-[0_0_0_4px_var(--primary-blue-soft)] scale-110"
                                                    : event.completed
                                                        ? "bg-[var(--success)] border-green-100 dark:border-green-900"
                                                        : "bg-[var(--bg-tertiary)] border-[var(--border-subtle)]"
                                            )} />

                                            <div className={cn(
                                                "flex-1 p-5 rounded-2xl border transition-all duration-200",
                                                event.current
                                                    ? "bg-[var(--bg-secondary)] border-[var(--primary-blue)]/30 shadow-md transform scale-[1.01]"
                                                    : "bg-[var(--bg-primary)] border-transparent group-hover:border-[var(--border-subtle)] group-hover:bg-[var(--bg-secondary)]/30"
                                            )}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className={cn(
                                                            "font-bold text-base",
                                                            event.current ? "text-[var(--primary-blue)]" : "text-[var(--text-primary)]"
                                                        )}>{event.status}</p>
                                                        <p className="text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                                                            <MapPin className="w-3.5 h-3.5 opacity-70" />
                                                            {event.location}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-[var(--text-primary)]">{event.timestamp.split(',')[0]}</p>
                                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{event.timestamp.split(',')[1]}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm"
                            >
                                <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-[var(--primary-blue)]" /> Shipment Details
                                </h3>
                                <dl className="space-y-4">
                                    <div className="pb-4 border-b border-[var(--border-subtle)]">
                                        <dt className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Courier Partner</dt>
                                        <dd className="font-semibold text-[var(--text-primary)] mt-1 flex items-center gap-2">
                                            {result.courier}
                                            <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                                        </dd>
                                    </div>
                                    <div className="pb-4 border-b border-[var(--border-subtle)]">
                                        <dt className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Origin</dt>
                                        <dd className="font-medium text-[var(--text-primary)] mt-1">{result.origin}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Destination</dt>
                                        <dd className="font-medium text-[var(--text-primary)] mt-1">{result.destination}</dd>
                                    </div>
                                </dl>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Button variant="outline" className="w-full h-12 rounded-xl bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all">
                                    <AlertCircle className="w-4 h-4 mr-2" /> Report an Issue
                                </Button>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : (
                    /* Search Placeholder / Empty State */
                    !isSearching && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Recent Searches</h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {[1, 2].map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setSearch('DL987654321IN'); handleSearch(); }}
                                                className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] hover:border-[var(--primary-blue)]/30 transition-all text-left group shadow-sm hover:shadow-md"
                                            >
                                                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:bg-[var(--primary-blue-soft)] group-hover:text-[var(--primary-blue)] transition-colors">
                                                    <Clock className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[var(--text-primary)]">DL987654321IN</p>
                                                    <p className="text-xs text-[var(--text-muted)] mt-1">Checked 2 hours ago</p>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-[var(--text-muted)] ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )
                )}
            </AnimatePresence>
        </div>
    );
}
