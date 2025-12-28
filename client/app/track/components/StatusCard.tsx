'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle,
    Truck,
    Package,
    Clock,
    MapPin,
    Box,
    Copy,
    Check,
    ArrowRight
} from 'lucide-react';

interface StatusCardProps {
    trackingNumber: string;
    status: string;
    carrier?: string;
    serviceType?: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
    className?: string;
}

interface StatusConfig {
    label: string;
    subLabel: string;
    icon: React.ReactNode;
    colorClass: string;
    bgClass: string;
    progress: number;
}

export function StatusCard({
    trackingNumber,
    status,
    carrier,
    serviceType,
    estimatedDelivery,
    actualDelivery,
    className = '',
}: StatusCardProps) {
    const [copied, setCopied] = React.useState(false);

    const statusConfig = useMemo((): StatusConfig => {
        const normalizedStatus = status.toUpperCase();

        const formatDate = (dateStr?: string) => {
            if (!dateStr) return '';
            return new Date(dateStr).toLocaleDateString('en-IN', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
            });
        };

        const formatTime = (dateStr?: string) => {
            if (!dateStr) return '';
            return new Date(dateStr).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
            });
        };

        // "Billboard" Style Config
        switch (normalizedStatus) {
            case 'DELIVERED':
                return {
                    label: 'Delivered',
                    subLabel: actualDelivery ? `Arrived on ${formatDate(actualDelivery)}` : 'Package delivered successfully',
                    icon: <CheckCircle className="w-6 h-6" strokeWidth={3} />,
                    colorClass: 'text-emerald-600',
                    bgClass: 'bg-emerald-50',
                    progress: 100,
                };

            case 'OUT_FOR_DELIVERY':
                return {
                    label: 'Out for Delivery',
                    subLabel: 'Arriving today by 8:00 PM',
                    icon: <Truck className="w-6 h-6" strokeWidth={3} />,
                    colorClass: 'text-blue-600',
                    bgClass: 'bg-blue-50',
                    progress: 90,
                };

            case 'ARRIVED_AT_DESTINATION':
                return {
                    label: 'At Local Hub',
                    subLabel: 'Ready for final delivery',
                    icon: <MapPin className="w-6 h-6" strokeWidth={3} />,
                    colorClass: 'text-indigo-600',
                    bgClass: 'bg-indigo-50',
                    progress: 75,
                };

            case 'IN_TRANSIT':
                return {
                    label: 'On the Way',
                    subLabel: estimatedDelivery ? `Expected ${formatDate(estimatedDelivery)}` : 'In transit to destination',
                    icon: <Truck className="w-6 h-6" strokeWidth={3} />,
                    colorClass: 'text-sky-600',
                    bgClass: 'bg-sky-50',
                    progress: 50,
                };

            case 'PICKED_UP':
                return {
                    label: 'Picked Up',
                    subLabel: 'Courier has collected the package',
                    icon: <Package className="w-6 h-6" strokeWidth={3} />,
                    colorClass: 'text-amber-600',
                    bgClass: 'bg-amber-50',
                    progress: 25,
                };

            default:
                return {
                    label: 'Order Created',
                    subLabel: 'Details received, awaiting package',
                    icon: <Box className="w-6 h-6" strokeWidth={3} />,
                    colorClass: 'text-slate-600',
                    bgClass: 'bg-slate-50',
                    progress: 10,
                };
        }
    }, [status, estimatedDelivery, actualDelivery]);

    const handleCopyTracking = async () => {
        try {
            await navigator.clipboard.writeText(trackingNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <motion.div
            className={`flex flex-col h-full bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* Top Bar: Carrier & Tracking */}
            <div className="px-6 pt-6 flex items-start justify-between">
                <div>
                    {/* Carrier Badge */}
                    <div className="flex items-center gap-2 mb-1">
                        {(() => {
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
                            const logo = getCarrierLogo(carrier || '');

                            return logo ? (
                                <div className="h-10 w-32 relative flex items-center justify-start">
                                    <img
                                        src={logo}
                                        alt={carrier}
                                        className="h-full w-full object-contain object-left"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-white font-bold text-[10px] tracking-wider">
                                        {carrier ? carrier.charAt(0) : 'S'}
                                    </div>
                                    <span className="text-sm font-semibold text-slate-900 tracking-tight">
                                        {carrier || 'ShipCrowd'}
                                    </span>
                                </>
                            );
                        })()}
                    </div>
                    {serviceType && (
                        <p className="text-xs font-medium text-slate-500 pl-0 mt-1">{serviceType}</p>
                    )}
                </div>

                <button
                    onClick={handleCopyTracking}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                    {trackingNumber}
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
            </div>

            {/* HERO SECTION: Billboard Status */}
            <div className="flex-1 px-6 py-6 flex flex-col justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="flex items-center gap-3 mb-2"
                >
                    <div className={`p-2 rounded-full ${statusConfig.bgClass} ${statusConfig.colorClass}`}>
                        {statusConfig.icon}
                    </div>
                    <span className={`text-sm font-bold uppercase tracking-wider ${statusConfig.colorClass}`}>
                        {status === 'OUT_FOR_DELIVERY' ? 'Happening Now' : 'Current Status'}
                    </span>
                </motion.div>

                <motion.h1
                    className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                >
                    {statusConfig.label}
                </motion.h1>

                <motion.p
                    className="text-lg text-slate-500 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {statusConfig.subLabel}
                </motion.p>
            </div>

            {/* Bottom Section: Progress Bar */}
            <div className="px-6 pb-8">
                <div className="flex items-end justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Journey Progress</span>
                    <span className={`text-sm font-bold ${statusConfig.colorClass}`}>{statusConfig.progress}%</span>
                </div>

                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full rounded-full ${statusConfig.colorClass.replace('text-', 'bg-')}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${statusConfig.progress}%` }}
                        transition={{ duration: 1, ease: "circOut", delay: 0.4 }}
                    />
                </div>
            </div>
        </motion.div>
    );
}
