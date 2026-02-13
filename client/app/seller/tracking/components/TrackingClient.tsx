"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Card } from '@/src/components/ui/core/Card';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { Alert, AlertDescription, AlertTitle } from '@/src/components/ui/feedback/Alert';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { cn } from '@/src/lib/utils';
import {
    Search,
    Truck,
    Package,
    AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSellerTracking } from '@/src/core/api/hooks/seller/useSellerTracking';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { TrackingInfo } from '@/src/core/api/clients/shipping/shipmentApi';

export function TrackingClient() {
    const [search, setSearch] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    // Use the hook to fetch data when searchTerm is set
    const { useTrackShipment } = useSellerTracking();
    const { data: result, isLoading: isSearching, error, isError } = useTrackShipment(searchTerm, !!searchTerm);

    const handleSearch = () => {
        if (!search.trim()) {
            addToast('Please enter an AWB number', 'warning');
            return;
        }
        setSearchTerm(search.trim());
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
                            <Input
                                placeholder="Enter AWB Number (e.g., DL987654321IN)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="h-14 pl-14 text-lg shadow-inner"
                                icon={<Search className="w-5 h-5 text-[var(--text-muted)]" />}
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="h-14 px-8 rounded-2xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-lg font-semibold shadow-brand-lg transition-all hover:scale-105 active:scale-95"
                        >
                            {isSearching ? (
                                <Loader size="sm" variant="spinner" className="text-white mr-2" />
                            ) : 'Track Now'}
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* Error State */}
            {isError && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Alert variant="error" className="rounded-[var(--radius-3xl)] border-none bg-[var(--error-bg)]">
                        <AlertCircle className="h-5 w-5" />
                        <AlertTitle>Tracking Failed</AlertTitle>
                        <AlertDescription>
                            {(error as any)?.response?.data?.message ||
                             (error as any)?.message ||
                             'Shipment not found. Please check the AWB number and try again.'}
                        </AlertDescription>
                    </Alert>
                </motion.div>
            )}

            {/* Loading State */}
            {isSearching && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20"
                >
                    <Loader size="lg" variant="spinner" className="text-[var(--primary-blue)] mb-4" />
                    <p className="text-[var(--text-muted)] text-lg">Tracking your shipment...</p>
                </motion.div>
            )}

            {/* Results Section */}
            <AnimatePresence mode="wait">
                {!isSearching && result ? (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="grid lg:grid-cols-3 gap-8"
                    >
                        {/* Main Status Card */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="rounded-[var(--radius-3xl)] border border-[var(--border-subtle)] shadow-sm overflow-hidden">
                                <div className="p-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[var(--border-subtle)] pb-8">
                                        <div className="flex items-center gap-5">
                                            <div className="h-20 w-20 rounded-2xl bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)] border border-[var(--primary-blue-light)]/20 shadow-inner">
                                                <Truck className="w-10 h-10" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1">Current Status</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <StatusBadge status={result.currentStatus} className="scale-125" />
                                                </div>
                                                <p className="text-sm text-[var(--text-secondary)] mt-2">Via {result.carrier}</p>
                                            </div>
                                        </div>
                                        <div className="text-right bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-subtle)]">
                                            <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1">Estimated Delivery</p>
                                            <p className="text-lg font-bold text-[var(--success)]">{result.estimatedDelivery}</p>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="relative space-y-0 pl-4 pt-4">
                                        {(!result.timeline || result.timeline.length === 0) ? (
                                            <div className="text-center py-12">
                                                <Package className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" />
                                                <p className="text-[var(--text-muted)] text-sm">No tracking events available yet</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Vertical Line */}
                                                <div className="absolute left-[27px] top-4 bottom-8 w-0.5 bg-[var(--border-subtle)]" />

                                                {result.timeline.map((event: any, i: number) => (
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
                                                        ? "bg-[var(--primary-blue)] border-[var(--primary-blue-light)] shadow-[0_0_0_4px_var(--primary-blue-soft)] scale-110"
                                                        : event.completed
                                                            ? "bg-[var(--success)] border-[var(--success-bg)]"
                                                            : "bg-[var(--bg-tertiary)] border-[var(--border-subtle)]"
                                                )} />

                                                <div className={cn(
                                                    "flex-1 p-5 rounded-2xl border transition-all duration-200",
                                                    event.current
                                                        ? "bg-[var(--bg-secondary)] border-[var(--primary-blue)]/30 shadow-md transform scale-[1.01]"
                                                        : "bg-[var(--bg-primary)] border-transparent group-hover:border-[var(--border-subtle)] group-hover:bg-[var(--bg-secondary)]/30"
                                                )}>
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <p className={cn(
                                                                "font-bold text-base capitalize",
                                                                event.current ? "text-[var(--primary-blue)]" : "text-[var(--text-primary)]"
                                                            )}>{event.status?.replace(/_/g, ' ')}</p>
                                                            <p className="text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                                                                {event.location}
                                                            </p>
                                                            {event.description && (
                                                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                                                    {event.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <p className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap">
                                                                {event.timestamp}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-sm">
                                    <div className="p-6">
                                        <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                            <Package className="w-5 h-5 text-[var(--primary-blue)]" /> Shipment Details
                                        </h3>
                                        <dl className="space-y-4">
                                            <div className="pb-4 border-b border-[var(--border-subtle)]">
                                                <dt className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">AWB Number</dt>
                                                <dd className="font-mono font-semibold text-[var(--text-primary)] mt-1">
                                                    {result.awb}
                                                </dd>
                                            </div>
                                            <div className="pb-4 border-b border-[var(--border-subtle)]">
                                                <dt className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Courier Partner</dt>
                                                <dd className="font-semibold text-[var(--text-primary)] mt-1 capitalize">
                                                    {result.carrier}
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
                                    </div>
                                </Card>
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
                    !isError && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <EmptyState
                                        icon={<Package className="w-12 h-12" />}
                                        title="Track Your Shipment"
                                        description="Enter your AWB number above to see the realtime status of your shipment."
                                        className="bg-transparent border-none shadow-none"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )
                )}
            </AnimatePresence>
        </div>
    );
}
