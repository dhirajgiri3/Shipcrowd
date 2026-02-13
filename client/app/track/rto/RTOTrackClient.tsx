'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    RotateCcw,
    Search,
    Truck,
    Package,
    MapPin,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    PhoneCall,
    FileText,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/src/components/ui/core/Input';
import { Button } from '@/src/components/ui/core/Button';
import { Card } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { cn } from '@/src/lib/utils';
import { useRTOTracking } from '@/src/core/api/hooks/tracking/useRTOTracking';

/* ------------------------------------------------------------------ */
/*  Status metadata for the info banner shown below the status badge  */
/* ------------------------------------------------------------------ */
const RTO_STATUS_INFO: Record<string, { description: string; color: string }> = {
    initiated: {
        description: 'Return request has been initiated and is being processed',
        color: 'bg-[var(--info-bg)] text-[var(--info)]',
    },
    in_transit: {
        description: 'Package is on its way back to our warehouse',
        color: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    },
    delivered_to_warehouse: {
        description: 'Package has been received at our warehouse',
        color: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]',
    },
    qc_pending: {
        description: 'Item is undergoing quality inspection',
        color: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    },
    qc_completed: {
        description: 'Quality check completed successfully',
        color: 'bg-[var(--success-bg)] text-[var(--success)]',
    },
    restocked: {
        description: 'Item has been restocked in inventory',
        color: 'bg-[var(--success-bg)] text-[var(--success)]',
    },
    disposed: {
        description: 'Return process has been completed',
        color: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
    },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return date;
    }
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function RTOTrackClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlAwb = searchParams.get('awb') ?? '';
    const { addToast } = useToast();

    const [mode, setMode] = useState<'awb' | 'order'>('awb');
    const [awb, setAwb] = useState(urlAwb);
    const [orderNumber, setOrderNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    const { useTrackByAWB, useTrackByOrder } = useRTOTracking();

    // Pre-fill from URL and trigger search
    useEffect(() => {
        if (urlAwb.trim()) {
            setAwb(urlAwb.trim());
            setMode('awb');
            setHasSearched(true);
        }
    }, [urlAwb]);

    const awbQuery = useTrackByAWB(awb, mode === 'awb' && hasSearched);
    const orderQuery = useTrackByOrder(orderNumber, phone, mode === 'order' && hasSearched);

    const activeQuery = mode === 'awb' ? awbQuery : orderQuery;
    const { data: result, isLoading, error, isError } = activeQuery;

    /* ---- handlers ---- */
    const handleSearch = () => {
        if (mode === 'awb') {
            if (!awb.trim()) { addToast('Please enter an AWB number', 'warning'); return; }
        } else {
            if (!orderNumber.trim()) { addToast('Please enter order number', 'warning'); return; }
            if (!phone.trim()) { addToast('Please enter phone number', 'warning'); return; }
            if (phone.trim().replace(/\D/g, '').length < 10) {
                addToast('Please enter a valid 10-digit phone number', 'warning');
                return;
            }
        }
        setHasSearched(true);
    };

    const handleReset = () => {
        setAwb('');
        setOrderNumber('');
        setPhone('');
        setHasSearched(false);
        router.push('/track/rto');
    };

    // Toast on API error
    useEffect(() => {
        if (isError && error && hasSearched) {
            const apiError = error as any;
            const msg =
                apiError.response?.data?.error ||
                apiError.response?.data?.message ||
                apiError.message ||
                'Unable to find RTO information. Please check your details and try again.';
            addToast(msg, 'error');
        }
    }, [isError, error, hasSearched, addToast]);

    const statusInfo = result?.status ? RTO_STATUS_INFO[result.status] : null;

    /* ================================================================ */
    /*  RENDER                                                          */
    /* ================================================================ */
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* ─────────── Header Banner ─────────── */}
            <div className="relative bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-deep)] text-white overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
                </div>

                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/track')}
                        className="text-white/90 hover:text-white hover:bg-white/10 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Track
                    </Button>

                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/10 rounded-[var(--radius-xl)] backdrop-blur-sm">
                            <RotateCcw className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Return Tracking</h1>
                            <p className="text-white/80 text-lg mt-1">Track your RTO (Return to Origin) shipment status</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─────────── Main Content ─────────── */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* ── Search Card ── */}
                <Card className="border border-[var(--border-default)] shadow-sm">
                    <div className="p-6 space-y-6">
                        {/* Mode toggles */}
                        <div className="flex gap-3">
                            <Button
                                variant={mode === 'awb' ? 'primary' : 'secondary'}
                                size="md"
                                onClick={() => { setMode('awb'); setHasSearched(false); }}
                                className="flex-1"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Search by AWB
                            </Button>
                            <Button
                                variant={mode === 'order' ? 'primary' : 'secondary'}
                                size="md"
                                onClick={() => { setMode('order'); setHasSearched(false); }}
                                className="flex-1"
                            >
                                <PhoneCall className="w-4 h-4 mr-2" />
                                Search by Order
                            </Button>
                        </div>

                        {/* Search forms */}
                        {mode === 'awb' ? (
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-[var(--text-primary)]">
                                    AWB / Tracking Number
                                </label>
                                <Input
                                    value={awb}
                                    onChange={(e) => setAwb(e.target.value)}
                                    placeholder="Enter forward or reverse AWB number"
                                    icon={<Search className="w-4 h-4" />}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="h-12 text-base"
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-[var(--text-muted)]">
                                    Enter the AWB number from your shipment or return label
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-[var(--text-primary)]">
                                        Order Number
                                    </label>
                                    <Input
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(e.target.value)}
                                        placeholder="e.g., ORD-123456"
                                        className="h-12 text-base"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-[var(--text-primary)]">
                                        Registered Phone Number
                                    </label>
                                    <Input
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Enter 10-digit phone number"
                                        type="tel"
                                        maxLength={10}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="h-12 text-base"
                                        disabled={isLoading}
                                    />
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Enter the phone number used during order placement
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <Button
                                onClick={handleSearch}
                                isLoading={isLoading}
                                className="flex-1"
                                size="lg"
                            >
                                {!isLoading && <Search className="w-5 h-5 mr-2" />}
                                Track Return
                            </Button>
                            {hasSearched && (
                                <Button variant="secondary" onClick={handleReset} size="lg" disabled={isLoading}>
                                    <RotateCcw className="w-5 h-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>

                {/* ── Loading ── */}
                {isLoading && (
                    <Card className="border border-[var(--border-default)]">
                        <div className="p-12 flex flex-col items-center justify-center">
                            <Loader variant="spinner" size="lg" className="text-[var(--primary-blue)] mb-4" />
                            <p className="text-[var(--text-muted)] text-lg">Tracking your return...</p>
                        </div>
                    </Card>
                )}

                {/* ── Results ── */}
                {isMounted && (
                    <AnimatePresence mode="wait">
                        {!isLoading && result && hasSearched && (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4, type: 'spring' }}
                                className="space-y-6"
                            >
                                {/* Status Overview */}
                                <Card className="border border-[var(--border-default)] overflow-hidden">
                                    <div className="bg-gradient-to-r from-[var(--primary-blue-soft)] to-[var(--bg-primary)] p-6 border-b border-[var(--border-default)]">
                                        <div className="flex items-start justify-between flex-wrap gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-[var(--primary-blue)] text-white rounded-[var(--radius-xl)]">
                                                    <Package className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Return Status</h2>
                                                    <p className="text-sm text-[var(--text-secondary)]">{result.statusLabel}</p>
                                                </div>
                                            </div>
                                            <StatusBadge domain="rto" status={result.status} showIcon />
                                        </div>

                                        {statusInfo && (
                                            <div className={cn('mt-4 p-4 rounded-[var(--radius-lg)] flex items-start gap-3', statusInfo.color)}>
                                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm font-medium">{statusInfo.description}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        <div className="grid gap-0">
                                            <DetailRow icon={<FileText />} label="Order Number" value={result.orderNumber} />
                                            <DetailRow icon={<Truck />} label="Forward AWB" value={result.forwardAwb} mono />
                                            <DetailRow icon={<RotateCcw />} label="Reverse AWB" value={result.reverseAwb} mono />
                                            <DetailRow icon={<Clock />} label="Initiated On" value={formatDate(result.initiatedAt)} />
                                            <DetailRow icon={<Clock />} label="Expected Return" value={result.expectedReturnDate ? formatDate(result.expectedReturnDate) : null} />
                                            <div className="flex items-center justify-between py-3">
                                                <span className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Refund Status
                                                </span>
                                                <Badge variant={result.refundStatus.includes('Pending') ? 'warning' : 'success'}>
                                                    {result.refundStatus}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Tracking History */}
                                {result.reverseTracking?.trackingHistory && result.reverseTracking.trackingHistory.length > 0 && (
                                    <Card className="border border-[var(--border-default)]">
                                        <div className="p-6 border-b border-[var(--border-default)]">
                                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                                <MapPin className="w-5 h-5 text-[var(--primary-blue)]" />
                                                Tracking History
                                            </h3>
                                            <p className="text-sm text-[var(--text-muted)] mt-1">Real-time updates on your return shipment</p>
                                        </div>
                                        <div className="p-6">
                                            <div className="relative pl-6">
                                                {/* Vertical line */}
                                                <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-[var(--primary-blue)] to-[var(--border-default)]" />

                                                {result.reverseTracking.trackingHistory.map((event, index) => {
                                                    const isLatest = index === 0;
                                                    const total = result.reverseTracking!.trackingHistory!.length;
                                                    const isLast = index === total - 1;

                                                    return (
                                                        <div key={index} className="relative pb-8 last:pb-0 group">
                                                            {/* Node */}
                                                            <div
                                                                className={cn(
                                                                    'absolute -left-[19px] top-1 w-5 h-5 rounded-full border-[3px] border-[var(--bg-primary)]',
                                                                    isLatest
                                                                        ? 'bg-[var(--primary-blue)] shadow-[0_0_0_4px_var(--primary-blue-soft)] scale-125'
                                                                        : isLast
                                                                            ? 'bg-[var(--border-default)]'
                                                                            : 'bg-[var(--success)]',
                                                                )}
                                                            />

                                                            {/* Content */}
                                                            <div
                                                                className={cn(
                                                                    'p-4 rounded-[var(--radius-lg)] border transition-colors',
                                                                    isLatest
                                                                        ? 'bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/30'
                                                                        : 'bg-[var(--bg-primary)] border-[var(--border-default)] group-hover:border-[var(--border-strong)]',
                                                                )}
                                                            >
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={cn(
                                                                            'font-semibold text-base capitalize mb-1',
                                                                            isLatest ? 'text-[var(--primary-blue)]' : 'text-[var(--text-primary)]',
                                                                        )}>
                                                                            {event.status || 'Status Update'}
                                                                        </p>
                                                                        {event.location && (
                                                                            <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
                                                                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                                                                {event.location}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs font-medium text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
                                                                        {formatDate(event.timestamp)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* Info message from reverse tracking */}
                                {result.reverseTracking?.message && (
                                    <Card className="border border-[var(--info)]/20 bg-[var(--info-bg)]">
                                        <div className="p-4 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-[var(--info)] flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-[var(--info)] font-medium">{result.reverseTracking.message}</p>
                                        </div>
                                    </Card>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}

                {/* ── Empty states ── */}
                {isMounted && !isLoading && !result && !isError && hasSearched && (
                    <EmptyState
                        icon={<Package className="w-16 h-16" />}
                        title="No Return Found"
                        description="We couldn't find any return information for the provided details. Please check and try again."
                    />
                )}

                {isMounted && !isLoading && !result && !hasSearched && (
                    <EmptyState
                        icon={<RotateCcw className="w-16 h-16" />}
                        title="Track Your Return"
                        description="Enter your AWB number or order details above to track your return shipment status"
                    />
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Small helper row for the details grid                             */
/* ------------------------------------------------------------------ */
function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string | null | undefined; mono?: boolean }) {
    if (!value) return null;
    return (
        <div className="flex items-center justify-between py-3 border-b border-[var(--border-default)] border-dashed last:border-0">
            <span className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                <span className="w-4 h-4 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
                {label}
            </span>
            <span className={cn('font-medium text-[var(--text-primary)]', mono && 'font-mono font-semibold')}>
                {value}
            </span>
        </div>
    );
}
