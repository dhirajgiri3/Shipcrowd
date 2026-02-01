/**
 * AnalyticsSection - Priority 4 in information hierarchy
 * Psychology: Progressive disclosure - hide complexity by default
 */

'use client';

import { useState } from 'react';
import { ChevronDown, BarChart3, TrendingUp, MapPin, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LazyBarChart as BarChart,
    LazyBar as Bar,
    LazyXAxis as XAxis,
    LazyYAxis as YAxis,
    LazyCartesianGrid as CartesianGrid,
    LazyTooltip as Tooltip,
    LazyResponsiveContainer as ResponsiveContainer,
} from '@/src/components/features/charts/LazyCharts';
import { cn } from '@/src/lib/utils';
import { useIsMobile } from '../../../hooks/ux';
import { BottomSheet } from '@/src/components/patterns/BottomSheet';

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

export function AnalyticsSection({ data, defaultExpanded = true }: AnalyticsSectionProps) {
    const isMobile = useIsMobile();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Transform order trend data for recharts
    const chartData = data.orderTrend.labels.map((label, index) => ({
        name: label,
        value: data.orderTrend.values[index]
    }));

    const handleToggle = () => {
        if (isMobile) {
            setIsSheetOpen(true);
        } else {
            setIsExpanded(!isExpanded);
        }
    };

    const AnalyticsContent = (
        <div className="space-y-8">
            {/* Order Trend Chart */}
            <div>
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-1.5 rounded-lg bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]">
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)] text-sm">
                            Order Trend
                        </h3>
                        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">
                            Last 7 Days
                        </p>
                    </div>
                </div>

                <div className="h-[250px] w-full p-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barSize={28}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="var(--border-subtle)"
                                opacity={0.4}
                            />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                    fontSize: 11,
                                    fill: 'var(--text-secondary)',
                                    fontWeight: 500,
                                    dy: 10
                                }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                    fontSize: 11,
                                    fill: 'var(--text-secondary)',
                                    fontWeight: 500,
                                    dx: -10
                                }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-primary)',
                                    borderColor: 'var(--border-subtle)',
                                    borderRadius: '12px',
                                    boxShadow: 'var(--shadow-md)',
                                    padding: '12px 16px',
                                    border: '1px solid var(--border-subtle)'
                                }}
                                itemStyle={{
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontWeight: 600
                                }}
                                labelStyle={{
                                    color: 'var(--text-secondary)',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                                formatter={(value) => [`${value} orders`, 'Volume']}
                                cursor={{ fill: 'var(--bg-secondary)', opacity: 0.4, radius: 4 }}
                            />
                            <Bar
                                dataKey="value"
                                fill="var(--primary-blue)"
                                radius={[6, 6, 6, 6]}
                                activeBar={{ fill: 'var(--primary-blue-deep)' }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Couriers */}
            <div>
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-1.5 rounded-lg bg-[var(--success-bg)] text-[var(--success)]">
                        <Truck className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)] text-sm">
                            Top Couriers
                        </h3>
                        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">
                            By Volume
                        </p>
                    </div>
                </div>
                <div className="space-y-4">
                    {data.topCouriers.map((courier, index) => (
                        <motion.div
                            key={courier.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                            className="group flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all",
                                    index === 0 ? "bg-[var(--primary-blue)] text-white border-[var(--primary-blue)]" :
                                        index === 1 ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-default)]" :
                                            "bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)]"
                                )}>
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-[var(--text-primary)] text-sm group-hover:text-[var(--primary-blue)] transition-colors">
                                        {courier.name}
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                                        {courier.orders.toLocaleString()} shipments
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-[var(--text-primary)] text-sm">
                                    ₹{courier.avgCost}
                                </div>
                                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">
                                    Avg Cost
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Zone Distribution */}
            <div>
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-1.5 rounded-lg bg-[var(--info-bg)] text-[var(--info)]">
                        <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)] text-sm">
                            Zone Distribution
                        </h3>
                        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">
                            Delivery Zones
                        </p>
                    </div>
                </div>
                <div className="space-y-5">
                    {data.zoneDistribution.map((zone, index) => (
                        <motion.div
                            key={zone.zone}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="flex items-center justify-between text-xs mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">
                                        Zone {zone.zone}
                                    </span>
                                    <span className="text-[var(--text-secondary)] font-medium">
                                        {zone.orders} orders
                                    </span>
                                </div>
                                <span className="font-bold text-[var(--primary-blue)]">
                                    {zone.percentage}%
                                </span>
                            </div>
                            <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${zone.percentage}%` }}
                                    transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
                                    className="h-full bg-[var(--primary-blue)] rounded-full"
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-[var(--shadow-sm)] overflow-hidden">
                {/* Header */}
                <button
                    onClick={handleToggle}
                    className="w-full flex items-center justify-between p-6 hover:bg-[var(--bg-secondary)]/50 transition-colors duration-200"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] border border-[var(--primary-blue)]/20">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                Analytics & Insights
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                Performance trends and courier comparison
                            </p>
                        </div>
                    </div>
                    {/* Desktop chevron */}
                    {!isMobile && (
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                        </motion.div>
                    )}
                    {/* Mobile indicator */}
                    {isMobile && (
                        <div className="text-xs font-medium text-[var(--primary-blue)] bg-[var(--primary-blue-soft)] px-2 py-1 rounded-lg">
                            View Details
                        </div>
                    )}
                </button>

                {/* Desktop Expandable Content */}
                {!isMobile && (
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden border-t border-[var(--border-subtle)]"
                            >
                                <div className="p-6">
                                    {AnalyticsContent}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Mobile Bottom Sheet */}
            {isMobile && (
                <BottomSheet
                    isOpen={isSheetOpen}
                    onClose={() => setIsSheetOpen(false)}
                    title="Analytics & Insights"
                >
                    {AnalyticsContent}
                </BottomSheet>
            )}
        </>
    );
}
