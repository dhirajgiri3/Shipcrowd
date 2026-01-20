/**
 * TodaySnapshot - Priority 2 in information hierarchy  
 * Psychology: Money-first - Indian sellers prioritize revenue and costs
 * 
 * Shows critical financial and operational metrics for today:
 * - Revenue (COD + Prepaid)
 * - Shipping costs
 * - Net profit
 * - Order counts
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

    return (
        <div className="space-y-3">
            {/* Header */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Today&apos;s Snapshot
            </h2>

            {/* Metrics Grid */}
            <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                {metrics.map((metric, index) => {
                    const Icon = iconMap[metric.icon];
                    const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;

                    return (
                        <motion.div
                            key={metric.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                        >
                            {/* Icon and Trend */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                {metric.change !== undefined && (
                                    <div className={`
                    flex items-center gap-1 text-xs font-medium
                    ${metric.trend === 'up' ? 'text-green-600 dark:text-green-400' : ''}
                    ${metric.trend === 'down' ? 'text-red-600 dark:text-red-400' : ''}
                    ${metric.trend === 'neutral' ? 'text-gray-600 dark:text-gray-400' : ''}
                  `}>
                                        <TrendIcon className="w-3 h-3" />
                                        {Math.abs(metric.change)}%
                                    </div>
                                )}
                            </div>

                            {/* Value */}
                            <div className="mb-1">
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {metric.value}
                                </div>
                            </div>

                            {/* Label */}
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                {metric.label}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quick Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Net Profit Today
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {metrics.find(m => m.label.includes('Profit'))?.value || '₹0'}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            vs Yesterday
                        </div>
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                            <TrendingUp className="w-4 h-4" />
                            {metrics.find(m => m.label.includes('Profit'))?.change || 0}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
