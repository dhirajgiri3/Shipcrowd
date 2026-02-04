'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    TrendingDown,
    TrendingUp,
    AlertTriangle,
    Truck,
    MapPin,
    Phone,
    XCircle,
    Lightbulb,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { formatCurrency } from '@/src/lib/dashboard/data-utils';
import { useRTOAnalytics, type RTOAnalyticsData } from '@/src/core/api/hooks/analytics';

/**
 * RTO Analytics Component
 *
 * Shows RTO (Return to Origin) rate, trends, courier breakdown, and reasons.
 * Provides actionable recommendations to reduce RTO.
 */

interface RTOAnalyticsProps {
    onViewDetails?: () => void;
}

const getReasonIcon = (reason: string) => {
    switch (reason) {
        case 'customer_unavailable':
            return Phone;
        case 'customer_refused':
            return XCircle;
        case 'incorrect_address':
            return MapPin;
        default:
            return Package;
    }
};

const RTOAnalytics = memo(function RTOAnalytics({
    onViewDetails
}: RTOAnalyticsProps) {
    // API Hooks
    const { data: rtoData, isLoading, error } = useRTOAnalytics();

    if (isLoading) {
        return (
            <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-6">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
                </div>
            </div>
        );
    }

    if (error || !rtoData || !rtoData.summary) {
        return (
            <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-[var(--text-muted)] opacity-30 mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        Unable to load RTO analytics
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Please try again later or contact support if the issue persists.
                    </p>
                </div>
            </div>
        );
    }

    const isImproving = rtoData.summary.change < 0;
    const isBetterThanAverage = rtoData.summary.currentRate < rtoData.summary.industryAverage;

    // Find best and worst courier - safe array operations
    const sortedCouriers = rtoData.byCourier && Array.isArray(rtoData.byCourier) && rtoData.byCourier.length > 0
        ? [...rtoData.byCourier].sort((a, b) => a.rate - b.rate)
        : [];
    const bestCourier = sortedCouriers[0] || null;
    const worstCourier = sortedCouriers.length > 0 ? sortedCouriers[sortedCouriers.length - 1] : null;

    return (
        <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isImproving ? 'bg-[var(--success-bg)]' : 'bg-[var(--error-bg)]'}`}>
                            {isImproving ? (
                                <TrendingDown className="w-5 h-5 text-[var(--success)]" />
                            ) : (
                                <TrendingUp className="w-5 h-5 text-[var(--error)]" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">
                                RTO Analytics
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Return to Origin performance
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {onViewDetails && (
                            <button
                                onClick={onViewDetails}
                                className="text-xs font-medium text-[var(--primary-blue)] hover:underline flex items-center gap-1"
                            >
                                View Details <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Main Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Current Rate */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                    >
                        <p className="text-xs text-[var(--text-muted)] mb-1">Current RTO Rate</p>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-2xl font-bold ${rtoData.summary.currentRate > 10 ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>
                                {rtoData.summary.currentRate}%
                            </p>
                            <span className={`text-xs font-medium ${isImproving ? 'text-[var(--success)]' : 'text-[var(--error)]'} flex items-center gap-1`}>
                                <span>{isImproving ? '↓' : '↑'}{Math.abs(rtoData.summary.change)}%</span>
                                <span className="text-[10px] opacity-80 hidden sm:inline">{isImproving ? 'Improved' : 'Degraded'}</span>
                            </span>
                        </div>
                    </motion.div>

                    {/* Industry Average */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                    >
                        <p className="text-xs text-[var(--text-muted)] mb-1">Industry Average</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-[var(--text-primary)]">
                                {rtoData.summary.industryAverage}%
                            </p>
                            {isBetterThanAverage && (
                                <span className="text-xs font-medium text-[var(--success)]">
                                    You're better!
                                </span>
                            )}
                        </div>
                    </motion.div>

                    {/* Total RTO */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                    >
                        <p className="text-xs text-[var(--text-muted)] mb-1">RTO Orders</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                            {rtoData.summary.totalRTO}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                            of {rtoData.summary.totalOrders} orders
                        </p>
                    </motion.div>

                    {/* Estimated Loss */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="p-4 rounded-xl bg-[var(--error-bg)] border border-[var(--error)]/20"
                    >
                        <p className="text-xs text-[var(--error)]/80 mb-1">Estimated Loss</p>
                        <p className="text-2xl font-bold text-[var(--error)]">
                            {formatCurrency(rtoData.summary.estimatedLoss)}
                        </p>
                        <p className="text-xs text-[var(--error)]/70">
                            this month
                        </p>
                    </motion.div>
                </div>

                {/* Courier Performance */}
                <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[var(--text-muted)]" />
                        RTO by Courier
                    </h4>
                    <div className="space-y-2">
                        {rtoData.byCourier.map((courier, idx) => (
                            <motion.div
                                key={courier.courier}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                            {courier.courier}
                                        </p>
                                        {courier === bestCourier && sortedCouriers.length > 1 && courier.rate <= 7 && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--success-bg)] text-[var(--success)] rounded">
                                                Best
                                            </span>
                                        )}
                                        {courier === worstCourier && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--error-bg)] text-[var(--error)] rounded">
                                                Needs attention
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {courier.count} RTO of {courier.total} orders
                                    </p>
                                </div>

                                {/* Rate Bar */}
                                <div className="w-32 hidden sm:block">
                                    <div className="h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(courier.rate / 15 * 100, 100)}%` }}
                                            transition={{ delay: idx * 0.05 + 0.2, duration: 0.5 }}
                                            className={`h-full rounded-full ${courier.rate > 10
                                                ? 'bg-[var(--error)]'
                                                : courier.rate > 7
                                                    ? 'bg-[var(--warning)]'
                                                    : 'bg-[var(--success)]'
                                                }`}
                                        />
                                    </div>
                                </div>

                                <span className={`text-sm font-semibold min-w-[50px] text-right ${courier.rate > 10
                                    ? 'text-[var(--error)]'
                                    : courier.rate > 7
                                        ? 'text-[var(--warning)]'
                                        : 'text-[var(--success)]'
                                    }`}>
                                    {courier.rate}%
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* RTO Reasons */}
                <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--text-muted)]" />
                        RTO Reasons
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {rtoData.byReason.map((reason, idx) => {
                            const Icon = getReasonIcon(reason.reason);
                            return (
                                <motion.div
                                    key={reason.reason}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                                >
                                    <Icon className="w-4 h-4 text-[var(--text-muted)] mb-2" />
                                    <p className="text-lg font-bold text-[var(--text-primary)]">
                                        {reason.percentage}%
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                                        {reason.label}
                                    </p>
                                    <p className="text-[10px] text-[var(--text-muted)]">
                                        {reason.count} orders
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Recommendations */}
                {rtoData.recommendations.length > 0 && (
                    <div className="pt-4 border-t border-[var(--border-subtle)]">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-[var(--warning)]" />
                            Recommendations
                        </h4>
                        <div className="space-y-2">
                            {rtoData.recommendations.map((rec, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="p-4 rounded-lg bg-gradient-to-r from-[var(--warning-bg)] to-[var(--bg-secondary)] border border-[var(--warning)]/20"
                                >
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                        {rec.message}
                                    </p>
                                    {rec.impact && (
                                        <p className="text-xs text-[var(--success)] mt-1 font-medium">
                                            Projected Impact: {rec.impact}
                                        </p>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export { RTOAnalytics };
export type { RTOAnalyticsData, RTOAnalyticsProps };
