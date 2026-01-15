/**
 * SLA Performance Dashboard
 * 
 * Track and monitor SLA compliance across different metrics:
 * - Pickup SLA, Delivery SLA, NDR Response, COD Settlement
 * - By courier and zone breakdown
 * - Time series trends
 */

'use client';

import { useState } from 'react';
import { useSLAPerformance } from '@/src/core/api/hooks/useAnalytics';
import { Calendar, TrendingUp, TrendingDown, Minus, Package, Truck, Clock, DollarSign } from 'lucide-react';
import { cn, formatDate } from '@/src/lib/utils';
import type { AnalyticsFilters, TimeRange, SLAMetric } from '@/src/types/api/analytics.types';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
];

const statusColors = {
    excellent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-300',
    good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-300',
};

export default function SLAPerformancePage() {
    const [timeRange, setTimeRange] = useState<TimeRange>('30days');

    const filters: AnalyticsFilters = {
        dateRange: timeRange,
    };

    const { data: slaData, isLoading } = useSLAPerformance(filters);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading SLA metrics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        SLA Performance Tracking
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Monitor service level agreement compliance across all operations
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-6 flex items-center gap-4">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div className="flex gap-2">
                        {timeRangeOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setTimeRange(option.value)}
                                className={cn(
                                    'px-4 py-2 rounded-lg font-medium transition-colors',
                                    timeRange === option.value
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary-500'
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Overall Compliance Card */}
                {slaData && (
                    <>
                        <div className="mb-6">
                            <div className={cn(
                                'p-6 rounded-xl border-2',
                                statusColors[slaData.overall.status]
                            )}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-sm font-medium uppercase tracking-wide mb-1">
                                            Overall SLA Compliance
                                        </h2>
                                        <p className="text-4xl font-bold">
                                            {slaData.overall.compliance.toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className={cn(
                                        'px-6 py-3 rounded-lg text-sm font-semibold uppercase',
                                        slaData.overall.status === 'excellent' && 'bg-green-600 text-white',
                                        slaData.overall.status === 'good' && 'bg-blue-600 text-white',
                                        slaData.overall.status === 'warning' && 'bg-yellow-600 text-white',
                                        slaData.overall.status === 'critical' && 'bg-red-600 text-white'
                                    )}>
                                        {slaData.overall.status}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SLA Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <SLAMetricCard
                                metric={slaData.pickupSLA}
                                icon={Package}
                                color="blue"
                            />
                            <SLAMetricCard
                                metric={slaData.deliverySLA}
                                icon={Truck}
                                color="green"
                            />
                            <SLAMetricCard
                                metric={slaData.ndrResponseSLA}
                                icon={Clock}
                                color="orange"
                            />
                            <SLAMetricCard
                                metric={slaData.codSettlementSLA}
                                icon={DollarSign}
                                color="purple"
                            />
                        </div>

                        {/* By Courier */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                SLA Compliance by Courier
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Courier
                                            </th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Overall
                                            </th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Pickup SLA
                                            </th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Delivery SLA
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {slaData.byCourier.map((courier, index) => (
                                            <tr
                                                key={courier.courierId}
                                                className={index !== slaData.byCourier.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}
                                            >
                                                <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                                                    {courier.courierName}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <ComplianceBadge value={courier.compliance} />
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <ComplianceBadge value={courier.pickupSLA} />
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <ComplianceBadge value={courier.deliverySLA} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* By Zone */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                SLA Compliance by Zone
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {slaData.byZone.map((zone) => (
                                    <div
                                        key={zone.zoneId}
                                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {zone.zoneName}
                                            </span>
                                            <ComplianceBadge value={zone.compliance} />
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Avg Delivery: {zone.avgDeliveryTime.toFixed(1)}h
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ==================== Components ====================

interface SLAMetricCardProps {
    metric: SLAMetric;
    icon: React.ComponentType<{ className?: string }>;
    color: 'blue' | 'green' | 'orange' | 'purple';
}

function SLAMetricCard({ metric, icon: Icon, color }: SLAMetricCardProps) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    };

    const trendIcon = metric.trend === 'improving' ? TrendingUp : metric.trend === 'declining' ? TrendingDown : Minus;
    const TrendIcon = trendIcon;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center mb-4', colorClasses[color])}>
                <Icon className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {metric.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {metric.description}
            </p>

            <div className="flex items-end justify-between mb-2">
                <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {metric.compliance.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Actual: {metric.actual.toFixed(1)}{typeof metric.target === 'number' && metric.target < 24 ? 'h' : 'd'}
                    </p>
                </div>
                {metric.trend && (
                    <div className={cn(
                        'flex items-center gap-1 text-xs',
                        metric.trend === 'improving' && 'text-green-600',
                        metric.trend === 'declining' && 'text-red-600',
                        metric.trend === 'stable' && 'text-gray-600'
                    )}>
                        <TrendIcon className="w-4 h-4" />
                    </div>
                )}
            </div>

            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={cn(
                        'h-full transition-all',
                        metric.status === 'excellent' && 'bg-green-600',
                        metric.status === 'good' && 'bg-blue-600',
                        metric.status === 'warning' && 'bg-yellow-600',
                        metric.status === 'critical' && 'bg-red-600'
                    )}
                    style={{ width: `${Math.min(metric.compliance, 100)}%` }}
                />
            </div>
        </div>
    );
}

function ComplianceBadge({ value }: { value: number }) {
    const getColor = (val: number) => {
        if (val >= 95) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        if (val >= 85) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        if (val >= 70) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    };

    return (
        <span className={cn('px-2 py-1 rounded text-xs font-semibold', getColor(value))}>
            {value.toFixed(1)}%
        </span>
    );
}
