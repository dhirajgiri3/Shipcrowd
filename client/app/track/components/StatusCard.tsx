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
    Check
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
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
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
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            });
        };

        switch (normalizedStatus) {
            case 'DELIVERED':
                return {
                    label: 'Delivered',
                    description: actualDelivery
                        ? `Delivered on ${formatDate(actualDelivery)}`
                        : 'Package delivered successfully',
                    icon: <CheckCircle className="w-8 h-8" strokeWidth={2} />,
                    color: 'text-[var(--success)]',
                    bgColor: 'bg-[var(--success-bg)]',
                    borderColor: 'border-[var(--success-border)]',
                    progress: 100,
                };

            case 'OUT_FOR_DELIVERY':
                return {
                    label: 'Out for Delivery',
                    description: 'Your package will arrive today',
                    icon: <Truck className="w-8 h-8" strokeWidth={2} />,
                    color: 'text-[var(--primary-blue)]',
                    bgColor: 'bg-[var(--primary-blue-soft)]',
                    borderColor: 'border-[var(--primary-blue)]',
                    progress: 85,
                };

            case 'ARRIVED_AT_DESTINATION':
                return {
                    label: 'At Local Hub',
                    description: 'Package arrived at destination facility',
                    icon: <MapPin className="w-8 h-8" strokeWidth={2} />,
                    color: 'text-[var(--primary-blue)]',
                    bgColor: 'bg-[var(--primary-blue-soft)]',
                    borderColor: 'border-[var(--primary-blue)]',
                    progress: 70,
                };

            case 'IN_TRANSIT':
                return {
                    label: 'In Transit',
                    description: estimatedDelivery
                        ? `Expected by ${formatDate(estimatedDelivery)}`
                        : 'Package is on the way',
                    icon: <Truck className="w-8 h-8" strokeWidth={2} />,
                    color: 'text-[var(--info)]',
                    bgColor: 'bg-[var(--info-bg)]',
                    borderColor: 'border-[var(--info-border)]',
                    progress: 50,
                };

            case 'PICKED_UP':
                return {
                    label: 'Picked Up',
                    description: 'Package collected from seller',
                    icon: <Package className="w-8 h-8" strokeWidth={2} />,
                    color: 'text-[var(--warning)]',
                    bgColor: 'bg-[var(--warning-bg)]',
                    borderColor: 'border-[var(--warning-border)]',
                    progress: 25,
                };

            case 'ORDER_CREATED':
            case 'CREATED':
                return {
                    label: 'Order Created',
                    description: 'Awaiting pickup',
                    icon: <Box className="w-8 h-8" strokeWidth={2} />,
                    color: 'text-[var(--text-secondary)]',
                    bgColor: 'bg-[var(--bg-tertiary)]',
                    borderColor: 'border-[var(--border-default)]',
                    progress: 10,
                };

            default:
                return {
                    label: status.replace(/_/g, ' '),
                    description: 'Processing shipment',
                    icon: <Clock className="w-8 h-8" strokeWidth={2} />,
                    color: 'text-[var(--text-tertiary)]',
                    bgColor: 'bg-[var(--bg-tertiary)]',
                    borderColor: 'border-[var(--border-default)]',
                    progress: 0,
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
            className={`relative bg-[var(--bg-elevated)] rounded-2xl p-6 md:p-8 border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            {/* Tracking Number Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopyTracking}
                        className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                            {trackingNumber}
                        </span>
                        <AnimatePresence mode="wait">
                            {copied ? (
                                <motion.div
                                    key="check"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                >
                                    <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="copy"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                >
                                    <Copy className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>
                </div>

                {carrier && (
                    <div className="text-right">
                        <span className="text-xs text-[var(--text-tertiary)]">Carrier</span>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{carrier}</p>
                    </div>
                )}
            </div>

            {/* Status Display */}
            <div className="flex items-start gap-4 mb-8">
                <div className={`p-3 rounded-xl ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.icon}
                </div>
                <div className="flex-1">
                    <motion.h2
                        className={`text-2xl md:text-3xl font-semibold ${statusConfig.color} mb-1`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                    >
                        {statusConfig.label}
                    </motion.h2>
                    <motion.p
                        className="text-sm md:text-base text-[var(--text-secondary)]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                    >
                        {statusConfig.description}
                    </motion.p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[var(--text-tertiary)]">Progress</span>
                    <span className="text-xs font-medium text-[var(--text-tertiary)]">{statusConfig.progress}%</span>
                </div>
                <div className="relative h-2 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <motion.div
                        className={`absolute inset-y-0 left-0 rounded-full ${statusConfig.progress === 100
                                ? 'bg-[var(--success)]'
                                : 'bg-[var(--primary-blue)]'
                            }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${statusConfig.progress}%` }}
                        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
                    />
                </div>
                <div className="flex justify-between">
                    <span className="text-[10px] text-[var(--text-muted)]">Order placed</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Delivered</span>
                </div>
            </div>

            {/* Service Type Badge */}
            {serviceType && (
                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                        {serviceType}
                    </span>
                </div>
            )}
        </motion.div>
    );
}
