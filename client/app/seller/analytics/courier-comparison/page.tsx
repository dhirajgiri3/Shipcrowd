/**
 * Courier Comparison Tool
 * 
 * Side-by-side comparison of courier performance metrics.
 * Helps identify the best courier for different KPIs.
 */

'use client';

import { useState } from 'react';
import { useCourierComparison } from '@/src/core/api/hooks/analytics/useAnalytics';
import { Trophy, TrendingUp, TrendingDown, DollarSign, Clock, Package, AlertCircle } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import type { AnalyticsFilters, TimeRange } from '@/src/types/api/analytics';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
];

export default function CourierComparisonPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>('30days');

    const filters: AnalyticsFilters = {
        dateRange: timeRange,
    };

    const { data: comparisonData, isLoading } = useCourierComparison(filters);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading courier data...</p>
                </div>
            </div>
        );
    }

    const metrics = [
        { key: 'successRate', label: 'Success Rate', unit: '%', icon: Package, higher: true },
        { key: 'avgDeliveryTime', label: 'Avg Delivery Time', unit: 'h', icon: Clock, higher: false },
        { key: 'rtoRate', label: 'RTO Rate', unit: '%', icon: AlertCircle, higher: false },
        { key: 'ndrRate', label: 'NDR Rate', unit: '%', icon: AlertCircle, higher: false },
        { key: 'avgCost', label: 'Avg Cost', unit: '₹', icon: DollarSign, higher: false },
        { key: 'onTimeDelivery', label: 'On-Time Delivery', unit: '%', icon: Clock, higher: true },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Courier Comparison
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Compare courier performance across key metrics
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-6 flex gap-2">
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

                {comparisonData && (
                    <>
                        {/* Recommendation Card */}
                        {comparisonData.recommendation && (
                            <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            Recommended Courier
                                        </h2>
                                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                                            {comparisonData.recommendation.reasoning}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium">
                                                Best Overall: {comparisonData.couriers.find(c => c.courierId === comparisonData.recommendation?.overall)?.courierName}
                                            </span>
                                            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium">
                                                Best Speed: {comparisonData.couriers.find(c => c.courierId === comparisonData.recommendation?.bestSpeed)?.courierName}
                                            </span>
                                            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium">
                                                Best Cost: {comparisonData.couriers.find(c => c.courierId === comparisonData.recommendation?.bestCost)?.courierName}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Comparison Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-50 dark:bg-gray-700/50">
                                                Courier
                                            </th>
                                            <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Shipments
                                            </th>
                                            {metrics.map((metric) => (
                                                <th key={metric.key} className="text-center py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <metric.icon className="w-4 h-4" />
                                                        <span>{metric.label}</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonData.couriers.map((courier, index) => {
                                            // Find best values for highlighting
                                            const isBestSuccess = courier.successRate === Math.max(...comparisonData.couriers.map(c => c.successRate));
                                            const isBestSpeed = courier.avgDeliveryTime === Math.min(...comparisonData.couriers.map(c => c.avgDeliveryTime));
                                            const isBestCost = courier.avgCost === Math.min(...comparisonData.couriers.map(c => c.avgCost));

                                            return (
                                                <tr
                                                    key={courier.courierId}
                                                    className={index !== comparisonData.couriers.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}
                                                >
                                                    <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800">
                                                        {courier.courierName}
                                                    </td>
                                                    <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
                                                        {courier.totalShipments.toLocaleString()}
                                                    </td>

                                                    {/* Success Rate */}
                                                    <td className="py-4 px-4 text-center">
                                                        <MetricCell
                                                            value={courier.successRate}
                                                            unit="%"
                                                            isBest={isBestSuccess}
                                                            isGood={courier.successRate >= 90}
                                                        />
                                                    </td>

                                                    {/* Avg Delivery Time */}
                                                    <td className="py-4 px-4 text-center">
                                                        <MetricCell
                                                            value={courier.avgDeliveryTime}
                                                            unit="h"
                                                            isBest={isBestSpeed}
                                                            isGood={courier.avgDeliveryTime <= 48}
                                                        />
                                                    </td>

                                                    {/* RTO Rate */}
                                                    <td className="py-4 px-4 text-center">
                                                        <MetricCell
                                                            value={courier.rtoRate}
                                                            unit="%"
                                                            isGood={courier.rtoRate <= 5}
                                                            lower={true}
                                                        />
                                                    </td>

                                                    {/* NDR Rate */}
                                                    <td className="py-4 px-4 text-center">
                                                        <MetricCell
                                                            value={courier.ndrRate}
                                                            unit="%"
                                                            isGood={courier.ndrRate <= 10}
                                                            lower={true}
                                                        />
                                                    </td>

                                                    {/* Avg Cost */}
                                                    <td className="py-4 px-4 text-center">
                                                        <MetricCell
                                                            value={courier.avgCost}
                                                            unit="₹"
                                                            isBest={isBestCost}
                                                        />
                                                    </td>

                                                    {/* On-Time Delivery */}
                                                    <td className="py-4 px-4 text-center">
                                                        <MetricCell
                                                            value={courier.onTimeDelivery}
                                                            unit="%"
                                                            isGood={courier.onTimeDelivery >= 85}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Highest Success Rate
                                </h3>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {Math.max(...comparisonData.couriers.map(c => c.successRate)).toFixed(1)}%
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {comparisonData.couriers.find(c => c.successRate === Math.max(...comparisonData.couriers.map(x => x.successRate)))?.courierName}
                                </p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Fastest Delivery
                                </h3>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {Math.min(...comparisonData.couriers.map(c => c.avgDeliveryTime)).toFixed(1)}h
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {comparisonData.couriers.find(c => c.avgDeliveryTime === Math.min(...comparisonData.couriers.map(x => x.avgDeliveryTime)))?.courierName}
                                </p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Most Affordable
                                </h3>
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {formatCurrency(Math.min(...comparisonData.couriers.map(c => c.avgCost)))}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {comparisonData.couriers.find(c => c.avgCost === Math.min(...comparisonData.couriers.map(x => x.avgCost)))?.courierName}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ==================== Components ====================

interface MetricCellProps {
    value: number;
    unit: string;
    isBest?: boolean;
    isGood?: boolean;
    lower?: boolean;
}

function MetricCell({ value, unit, isBest, isGood, lower }: MetricCellProps) {
    return (
        <div className={cn(
            'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold',
            isBest && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 ring-2 ring-yellow-400',
            !isBest && isGood && 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
            !isBest && !isGood && 'text-gray-900 dark:text-white'
        )}>
            {unit === '₹' ? formatCurrency(value) : `${value.toFixed(1)}${unit}`}
            {isBest && <Trophy className="w-3 h-3" />}
        </div>
    );
}
