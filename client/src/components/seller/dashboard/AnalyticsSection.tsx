/**
 * AnalyticsSection - Priority 4 in information hierarchy
 * Psychology: Progressive disclosure - hide complexity by default
 * 
 * Shows analytics and trends in a collapsible section:
 * - Order trends
 * - Cost analysis
 * - Courier performance
 * - Zone-wise distribution
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, MapPin, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnalyticsData {
    orderTrend: {
        labels: string[];
        values: number[];
    };
    topCouriers: {
        name: string;
        orders: number;
        avgCost: number;
    }[];
    zoneDistribution: {
        zone: string;
        percentage: number;
        orders: number;
    }[];
}

interface AnalyticsSectionProps {
    data: AnalyticsData;
    defaultExpanded?: boolean;
}

export function AnalyticsSection({ data, defaultExpanded = false }: AnalyticsSectionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Analytics
                    </h2>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
            </button>

            {/* Expandable Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden border-t border-gray-200 dark:border-gray-700"
                    >
                        <div className="p-4 space-y-6">
                            {/* Order Trend */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        Order Trend (Last 7 Days)
                                    </h3>
                                </div>
                                <div className="h-48 flex items-end justify-between gap-2">
                                    {data.orderTrend.values.map((value, index) => {
                                        const maxValue = Math.max(...data.orderTrend.values);
                                        const height = (value / maxValue) * 100;

                                        return (
                                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${height}%` }}
                                                    transition={{ delay: index * 0.1 }}
                                                    className="w-full bg-blue-500 dark:bg-blue-400 rounded-t-lg relative group"
                                                >
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                        {value} orders
                                                    </div>
                                                </motion.div>
                                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                                    {data.orderTrend.labels[index]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Top Couriers */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Truck className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        Top Couriers
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    {data.topCouriers.map((courier, index) => (
                                        <motion.div
                                            key={courier.name}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-sm font-bold text-green-700 dark:text-green-400">
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {courier.name}
                                                    </div>
                                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                                        {courier.orders} orders
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    ₹{courier.avgCost}
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                                    avg cost
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Zone Distribution */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        Zone Distribution
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    {data.zoneDistribution.map((zone, index) => (
                                        <motion.div
                                            key={zone.zone}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    Zone {zone.zone}
                                                </span>
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {zone.orders} orders ({zone.percentage}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${zone.percentage}%` }}
                                                    transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                                                    className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full"
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
