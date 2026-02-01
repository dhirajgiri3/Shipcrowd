/**
 * TodaySnapshot - Priority 2 in information hierarchy  
 * Psychology: Money-first - Indian sellers prioritize revenue and costs
 */

'use client';

import { TrendingUp, TrendingDown, Package, IndianRupee, Minus } from 'lucide-react';
import { useIsMobile } from '../../../hooks/ux';
import { motion } from 'framer-motion';

interface MetricData {
    label: string;
    value: string;
    change?: number; // Percentage change from yesterday
    trend?: 'up' | 'down' | 'neutral';
    icon: 'revenue' | 'cost' | 'profit' | 'orders';
}

interface TodaySnapshotProps {
    metrics: MetricData[];
}

const iconMap = {
    revenue: IndianRupee,
    cost: IndianRupee,
    profit: IndianRupee,
    orders: Package
};

export function TodaySnapshot({ metrics }: TodaySnapshotProps) {
    const isMobile = useIsMobile();

    // Find profit metric for summary
    const profitMetric = metrics.find(m => m.label.includes('Profit'));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        Today&apos;s Snapshot
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Real-time performance metrics
                    </p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                {metrics.map((metric, index) => {
                    const Icon = iconMap[metric.icon];
                    const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;

                    const isPositive = metric.trend === 'up';
                    const isNegative = metric.trend === 'down';

                    const trendColor = isPositive
                        ? 'text-[var(--success)]'
                        : isNegative
                            ? 'text-[var(--error)]'
                            : 'text-[var(--text-muted)]';

                    return (
                        <motion.div
                            key={metric.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.4 }}
                            className="group relative rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--border-focus)] transition-all duration-200"
                        >
                            {/* Icon and Trend */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2.5 bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] rounded-xl border border-[var(--primary-blue)]/20">
                                    <Icon className="w-5 h-5" />
                                </div>
                                {metric.change !== undefined && (
                                    <div className={`
                                        flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full
                                        ${trendColor}
                                        ${isPositive ? 'bg-[var(--success-bg)]' : isNegative ? 'bg-[var(--error-bg)]' : 'bg-[var(--bg-secondary)]'}
                                    `}>
                                        <TrendIcon className="w-3 h-3" />
                                        {Math.abs(metric.change)}%
                                    </div>
                                )}
                            </div>

                            {/* Value */}
                            <div className="mb-3">
                                <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                                    {metric.value}
                                </div>
                            </div>

                            {/* Label */}
                            <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                {metric.label}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quick Summary Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary-blue-soft)] to-[var(--bg-secondary)] border border-[var(--primary-blue)]/20 p-6"
            >
                {/* Decorative Gradient Blob */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--primary-blue)]/10 blur-3xl rounded-full pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                            Net Profit Today
                        </div>
                        <div className="text-3xl font-bold text-[var(--text-primary)]">
                            {profitMetric?.value || '₹0'}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                            vs Yesterday
                        </div>
                        <div className={`flex items-center justify-end gap-1.5 text-lg font-bold ${profitMetric?.trend === 'up' ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                            {profitMetric?.trend === 'up' && <TrendingUp className="w-5 h-5" />}
                            <span>{profitMetric?.change || 0}%</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
