'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    TrendingDown,
    IndianRupee,
    Truck,
    Percent,
    Package,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { formatCurrency } from '@/src/lib/dashboard/data-utils';
import { useProfitabilityAnalytics, type ProfitabilityData } from '@/src/core/api/hooks/analytics';

/**
 * Profitability Card
 *
 * Shows actual profit calculation instead of estimated 15%
 * Breaks down costs: shipping, COD charges, platform fees, GST, RTO costs
 */

interface ProfitabilityCardProps {
    onViewDetails?: () => void;
}

const CostBreakdownItem = memo(function CostBreakdownItem({
    label,
    amount,
    percentage,
    color,
    icon: Icon
}: {
    label: string;
    amount: number;
    percentage: number;
    color: string;
    icon: React.ElementType<{ className?: string }>;
}) {
    return (
        <div className="flex items-center gap-3 py-2">
            <div className={`p-1.5 rounded-md ${color}`}>
                <Icon className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)]">{label}</p>
            </div>
            <div className="text-right">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                    {formatCurrency(amount)}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                    {percentage.toFixed(1)}%
                </p>
            </div>
        </div>
    );
});

const ProfitabilityCard = memo(function ProfitabilityCard({
    onViewDetails
}: ProfitabilityCardProps) {
    const [showBreakdown, setShowBreakdown] = useState(false);

    // API Hooks
    const { data: profitData, isLoading, error } = useProfitabilityAnalytics();

    if (isLoading) {
        return (
            <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-6">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
                </div>
            </div>
        );
    }

    if (error || !profitData) {
        return (
            <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-[var(--text-muted)] opacity-30 mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        Unable to load profitability data
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Please try again later or contact support if the issue persists.
                    </p>
                </div>
            </div>
        );
    }

    const isImproving = (profitData.comparison?.previousPeriod.change ?? 0) > 0;
    const isHealthyMargin = profitData.summary.profitMargin >= 40;

    // Calculate percentages for breakdown
    const totalCosts = profitData.summary.totalCosts;
    const getPercentage = (amount: number) => totalCosts > 0 ? (amount / totalCosts) * 100 : 0;

    return (
        <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isHealthyMargin ? 'bg-[var(--success-bg)]' : 'bg-[var(--warning-bg)]'}`}>
                            <IndianRupee className={`w-5 h-5 ${isHealthyMargin ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">
                                Profitability
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Actual profit after all costs
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Revenue */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                    >
                        <p className="text-xs text-[var(--text-muted)] mb-1">Total Revenue</p>
                        <p className="text-xl font-bold text-[var(--text-primary)]">
                            {formatCurrency(profitData.summary.totalRevenue)}
                        </p>
                    </motion.div>

                    {/* Costs */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                    >
                        <p className="text-xs text-[var(--text-muted)] mb-1">Total Costs</p>
                        <p className="text-xl font-bold text-[var(--error)]">
                            -{formatCurrency(profitData.summary.totalCosts)}
                        </p>
                    </motion.div>

                    {/* Net Profit */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-4 rounded-xl bg-[var(--success-bg)] border border-[var(--success)]/20"
                    >
                        <p className="text-xs text-[var(--success)]/80 mb-1">Net Profit</p>
                        <p className="text-xl font-bold text-[var(--success)]">
                            {formatCurrency(profitData.summary.netProfit)}
                        </p>
                    </motion.div>

                    {/* Profit Margin */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                    >
                        <p className="text-xs text-[var(--text-muted)] mb-1">Profit Margin</p>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-xl font-bold ${isHealthyMargin ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                                {profitData.summary.profitMargin.toFixed(1)}%
                            </p>
                            {profitData.comparison && (
                                <span className={`text-xs font-medium ${isImproving ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                                    {isImproving ? '↑' : '↓'}{Math.abs(profitData.comparison.previousPeriod.change).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Per Order Stats */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[var(--primary-blue-soft)] to-[var(--bg-secondary)] border border-[var(--primary-blue)]/20 mb-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <Package className="w-5 h-5 text-[var(--primary-blue)]" />
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    Average Per Order
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Based on your orders
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">Revenue</p>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    {formatCurrency(profitData.averagePerOrder.revenue)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">Profit</p>
                                <p className="text-sm font-semibold text-[var(--success)]">
                                    {formatCurrency(profitData.averagePerOrder.profit)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">Margin</p>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    {profitData.averagePerOrder.margin.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cost Breakdown Toggle */}
                <button
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                        Cost Breakdown
                    </span>
                    {showBreakdown ? (
                        <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                </button>

                {/* Cost Breakdown Details */}
                <AnimatePresence>
                    {showBreakdown && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 space-y-1">
                                <CostBreakdownItem
                                    label="Shipping Costs"
                                    amount={profitData.breakdown.shippingCosts}
                                    percentage={getPercentage(profitData.breakdown.shippingCosts)}
                                    color="bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]"
                                    icon={Truck}
                                />
                                <CostBreakdownItem
                                    label="COD Charges"
                                    amount={profitData.breakdown.codCharges}
                                    percentage={getPercentage(profitData.breakdown.codCharges)}
                                    color="bg-[var(--warning-bg)] text-[var(--warning)]"
                                    icon={IndianRupee}
                                />
                                <CostBreakdownItem
                                    label="Platform Fees"
                                    amount={profitData.breakdown.platformFees}
                                    percentage={getPercentage(profitData.breakdown.platformFees)}
                                    color="bg-[var(--info-bg)] text-[var(--info)]"
                                    icon={Percent}
                                />
                                {profitData.breakdown.rtoCosts > 0 && (
                                    <CostBreakdownItem
                                        label="RTO Costs"
                                        amount={profitData.breakdown.rtoCosts}
                                        percentage={getPercentage(profitData.breakdown.rtoCosts)}
                                        color="bg-[var(--error-bg)] text-[var(--error)]"
                                        icon={Package}
                                    />
                                )}
                                {profitData.breakdown.gst > 0 && (
                                    <CostBreakdownItem
                                        label="GST"
                                        amount={profitData.breakdown.gst}
                                        percentage={getPercentage(profitData.breakdown.gst)}
                                        color="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                                        icon={Percent}
                                    />
                                )}

                                {/* Total */}
                                <div className="flex items-center justify-between pt-3 mt-2 border-t border-[var(--border-subtle)]">
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">Total Costs</p>
                                    <p className="text-sm font-bold text-[var(--error)]">
                                        {formatCurrency(profitData.summary.totalCosts)}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Low Margin Warning */}
                {!isHealthyMargin && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning)]/20"
                    >
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-[var(--warning)]">
                                    Margin Below Target
                                </p>
                                <p className="text-xs text-[var(--warning)]/80 mt-1">
                                    Your profit margin is below 40%. Consider optimizing shipping costs or reviewing your pricing strategy.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
});

export { ProfitabilityCard };
export type { ProfitabilityData, ProfitabilityCardProps };
