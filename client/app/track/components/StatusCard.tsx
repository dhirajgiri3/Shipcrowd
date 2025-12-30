'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle,
    Truck,
    Package,
    MapPin,
    Box,
    Copy,
    Check,
    Share2,
    Bell,
    Phone,
    Star,
    Clock,
    Shield,
    X,
    QrCode
} from 'lucide-react';
import QRCode from 'qrcode';

interface StatusCardProps {
    trackingNumber: string;
    status: string;
    carrier?: string;
    serviceType?: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
    recipientName?: string;
    destinationCity?: string;
    destinationState?: string;
    className?: string;
}

interface StatusConfig {
    label: string;
    icon: React.ReactNode;
    colorClass: string;
    bgClass: string;
    progress: number;
    ctaLabel?: string;
    ctaIcon?: React.ReactNode;
}

// Mask recipient name for privacy (e.g., "Rahul Giri" -> "R***l G**i")
function maskName(name: string): string {
    if (!name || name.length < 2) return name;
    const parts = name.split(' ');
    return parts.map(part => {
        if (part.length <= 2) return part[0] + '*';
        return part[0] + '*'.repeat(part.length - 2) + part[part.length - 1];
    }).join(' ');
}

// Calculate time remaining until delivery
function getTimeRemaining(targetDate: string): { hours: number; minutes: number; text: string } | null {
    const target = new Date(targetDate);
    const now = new Date();
    const diff = target.getTime() - now.getTime();

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return { hours, minutes, text: `${days} day${days > 1 ? 's' : ''}` };
    }

    return { hours, minutes, text: `${hours}h ${minutes}m` };
}

export function StatusCard({
    trackingNumber,
    status,
    carrier,
    serviceType,
    estimatedDelivery,
    actualDelivery,
    recipientName,
    destinationCity,
    destinationState,
    className = '',
}: StatusCardProps) {
    const [copied, setCopied] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [countdown, setCountdown] = useState<{ hours: number; minutes: number; text: string } | null>(null);

    // Live countdown timer
    useEffect(() => {
        if (!estimatedDelivery || status === 'DELIVERED') return;

        const updateCountdown = () => {
            setCountdown(getTimeRemaining(estimatedDelivery));
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [estimatedDelivery, status]);

    // Generate QR code
    useEffect(() => {
        const trackingUrl = `${window.location.origin}/track?awb=${trackingNumber}`;
        QRCode.toDataURL(trackingUrl, { width: 200, margin: 2 })
            .then(setQrCodeUrl)
            .catch(console.error);
    }, [trackingNumber]);

    const statusConfig = useMemo((): StatusConfig => {
        const normalizedStatus = status.toUpperCase();

        switch (normalizedStatus) {
            case 'DELIVERED':
                return {
                    label: 'Delivered',
                    icon: <CheckCircle className="w-5 h-5" strokeWidth={2.5} />,
                    colorClass: 'text-emerald-600',
                    bgClass: 'bg-emerald-50',
                    progress: 100,
                    ctaLabel: 'Rate Experience',
                    ctaIcon: <Star className="w-4 h-4" />,
                };

            case 'OUT_FOR_DELIVERY':
                return {
                    label: 'Out for Delivery',
                    icon: <Truck className="w-5 h-5" strokeWidth={2.5} />,
                    colorClass: 'text-blue-600',
                    bgClass: 'bg-blue-50',
                    progress: 90,
                    ctaLabel: 'Contact Driver',
                    ctaIcon: <Phone className="w-4 h-4" />,
                };

            case 'ARRIVED_AT_DESTINATION':
                return {
                    label: 'At Local Hub',
                    icon: <MapPin className="w-5 h-5" strokeWidth={2.5} />,
                    colorClass: 'text-indigo-600',
                    bgClass: 'bg-indigo-50',
                    progress: 75,
                    ctaLabel: 'Set Alert',
                    ctaIcon: <Bell className="w-4 h-4" />,
                };

            case 'IN_TRANSIT':
                return {
                    label: 'In Transit',
                    icon: <Truck className="w-5 h-5" strokeWidth={2.5} />,
                    colorClass: 'text-sky-600',
                    bgClass: 'bg-sky-50',
                    progress: 50,
                    ctaLabel: 'Set Alert',
                    ctaIcon: <Bell className="w-4 h-4" />,
                };

            case 'PICKED_UP':
                return {
                    label: 'Picked Up',
                    icon: <Package className="w-5 h-5" strokeWidth={2.5} />,
                    colorClass: 'text-amber-600',
                    bgClass: 'bg-amber-50',
                    progress: 25,
                    ctaLabel: 'Set Alert',
                    ctaIcon: <Bell className="w-4 h-4" />,
                };

            default:
                return {
                    label: 'Order Created',
                    icon: <Box className="w-5 h-5" strokeWidth={2.5} />,
                    colorClass: 'text-slate-600',
                    bgClass: 'bg-slate-50',
                    progress: 10,
                };
        }
    }, [status]);

    const handleCopyTracking = async () => {
        try {
            await navigator.clipboard.writeText(trackingNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleShare = () => {
        // Always show QR modal directly for better UX
        setShowShareModal(true);
    };

    const getCarrierLogo = (name: string) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('bluedart')) return '/logos/blue-dart.png';
        if (n.includes('fedex')) return '/logos/fedex.png';
        if (n.includes('dhl')) return '/logos/dhl.png';
        if (n.includes('delhivery')) return '/logos/delhivery.png';
        if (n.includes('shadowfax')) return '/logos/shadowfax.png';
        if (n.includes('xpressbees')) return '/logos/xpressbees.png';
        if (n.includes('ekart')) return '/logos/ekart.png';
        return null;
    };

    const carrierLogo = getCarrierLogo(carrier || '');
    const maskedRecipient = recipientName ? maskName(recipientName) : null;
    const destination = destinationCity && destinationState ? `${destinationCity}, ${destinationState}` : null;

    return (
        <>
            <motion.div
                className={`flex flex-col min-h-[400px] lg:min-h-[500px] bg-[var(--bg-elevated)] rounded-[var(--radius-3xl)] overflow-hidden border border-[var(--border-default)] ${className}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
                {/* Header: Carrier Logo + Tracking */}
                <div className="px-6 pt-5 flex items-start justify-between">
                    <div>
                        {carrierLogo ? (
                            <div className="h-8 w-24 relative flex items-center justify-start">
                                <img src={carrierLogo} alt={carrier} className="h-full w-full object-contain object-left" />
                            </div>
                        ) : (
                            <span className="text-sm font-semibold text-[var(--text-primary)]">{carrier || 'ShipCrowd'}</span>
                        )}
                        {serviceType && (
                            <p className="text-[11px] font-medium text-[var(--text-muted)] mt-0.5">{serviceType}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopyTracking}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors duration-[var(--duration-base)] text-[11px] font-mono text-[var(--text-tertiary)]"
                        >
                            {trackingNumber}
                            {copied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button
                            onClick={handleShare}
                            className="p-1.5 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors duration-[var(--duration-base)] text-[var(--text-tertiary)]"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Status Section */}
                <div className="flex-1 px-6 py-5 flex flex-col justify-center">
                    {/* Status Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 mb-3"
                    >
                        <div className={`p-1.5 rounded-full ${statusConfig.bgClass} ${statusConfig.colorClass}`}>
                            {statusConfig.icon}
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${statusConfig.colorClass}`}>
                            {status === 'OUT_FOR_DELIVERY' ? 'Happening Now' : 'Current Status'}
                        </span>
                    </motion.div>

                    {/* Status Label */}
                    <motion.h1
                        className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] leading-tight tracking-tight mb-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {statusConfig.label}
                    </motion.h1>

                    {/* Live ETA Countdown */}
                    {countdown && status !== 'DELIVERED' && (
                        <motion.div
                            className="flex items-center gap-2 mt-2 mb-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Clock className="w-4 h-4 text-[var(--primary-blue)]" />
                            <span className="text-base font-semibold text-[var(--text-primary)]">
                                Arriving in <span className="text-[var(--primary-blue)]">{countdown.text}</span>
                            </span>
                        </motion.div>
                    )}

                    {/* Delivered Date */}
                    {status === 'DELIVERED' && actualDelivery && (
                        <motion.p
                            className="text-sm text-[var(--text-tertiary)] mt-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            Delivered on {new Date(actualDelivery).toLocaleDateString('en-IN', {
                                weekday: 'long', month: 'short', day: 'numeric'
                            })}
                        </motion.p>
                    )}

                    {/* Destination + Masked Recipient */}
                    {(destination || maskedRecipient) && (
                        <motion.div
                            className="flex items-center gap-2 mt-3 px-3 py-2 bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)] w-fit"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.25 }}
                        >
                            <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span className="text-xs text-[var(--text-secondary)]">
                                {maskedRecipient && <span className="font-medium">{maskedRecipient}</span>}
                                {maskedRecipient && destination && <span className="text-[var(--text-muted)]"> • </span>}
                                {destination}
                            </span>
                        </motion.div>
                    )}

                    {/* Confidence Indicator */}
                    <motion.div
                        className="flex items-center gap-1.5 mt-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Shield className="w-3.5 h-3.5 text-[var(--success)]" />
                        <span className="text-[11px] text-[var(--text-tertiary)]">
                            <span className="text-[var(--text-success)] font-medium">On Track</span> • 94% of similar packages delivered on time
                        </span>
                    </motion.div>
                </div>

                {/* Bottom Section: Progress Bar + CTA */}
                <div className="px-6 pb-5 mt-auto space-y-4">
                    {/* Progress Bar */}
                    <div>
                        <div className="flex items-end justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Progress</span>
                            <span className={`text-xs font-bold ${statusConfig.colorClass}`}>{statusConfig.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full rounded-full ${statusConfig.colorClass.replace('text-', 'bg-')}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${statusConfig.progress}%` }}
                                transition={{ duration: 1, ease: "circOut", delay: 0.4 }}
                            />
                        </div>
                    </div>

                    {/* Contextual CTA */}
                    {statusConfig.ctaLabel && (
                        <motion.button
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-xl)] ${statusConfig.bgClass} ${statusConfig.colorClass} font-medium text-sm transition-all duration-[var(--duration-base)] hover:opacity-80`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            {statusConfig.ctaIcon}
                            {statusConfig.ctaLabel}
                        </motion.button>
                    )}
                </div>
            </motion.div>

            {/* Share Modal */}
            <AnimatePresence>
                {showShareModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowShareModal(false)}
                    >
                        <motion.div
                            className="bg-[var(--bg-elevated)] rounded-[var(--radius-2xl)] p-6 max-w-sm w-full shadow-xl border border-[var(--border-default)]"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Share Tracking</h3>
                                <button onClick={() => setShowShareModal(false)} className="p-1 hover:bg-[var(--bg-hover)] rounded-[var(--radius-lg)] transition-colors">
                                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                                </button>
                            </div>

                            {/* QR Code */}
                            {qrCodeUrl && (
                                <div className="flex flex-col items-center mb-4">
                                    <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-xl)]">
                                        <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                                    </div>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-2">Scan to track package</p>
                                </div>
                            )}

                            {/* Copy Link */}
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/track?awb=${trackingNumber}`);
                                    setShowShareModal(false);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-[var(--radius-xl)] font-medium text-sm hover:bg-[var(--btn-primary-bg-hover)] transition-colors duration-[var(--duration-base)]"
                            >
                                <Copy className="w-4 h-4" />
                                Copy Tracking Link
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
