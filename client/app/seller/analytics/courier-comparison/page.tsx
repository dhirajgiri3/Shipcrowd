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
import { SpinnerLoader } from '@/src/components/ui';
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
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="text-center">
                    <SpinnerLoader size="lg" />
                    <p className="text-[var(--text-secondary)] mt-4">Loading courier data...</p>
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
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                        Courier Comparison
                    </h1>
                    <p className="text-[var(--text-secondary)]">
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
                                    ? 'bg-[var(--primary-blue)] text-white'
                                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--primary-blue)]'
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
                            <div className="mb-6 bg-gradient-to-r from-[var(--primary-blue-soft)] to-[var(--primary-blue-soft)] rounded-xl border border-[var(--border-subtle)] p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Trophy className="w-6 h-6 text-[var(--primary-blue)]" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                                            Recommended Courier
                                        </h2>
                                        <p className="text-[var(--text-secondary)] mb-3">
                                            {comparisonData.recommendation.reasoning}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-[var(--bg-elevated)] rounded-lg text-sm font-medium">
                                                Best Overall: {comparisonData.couriers.find(c => c.courierId === comparisonData.recommendation?.overall)?.courierName}
                                            </span>
                                            <span className="px-3 py-1 bg-[var(--bg-elevated)] rounded-lg text-sm font-medium">
                                                Best Speed: {comparisonData.couriers.find(c => c.courierId === comparisonData.recommendation?.bestSpeed)?.courierName}
                                            </span>
                                            <span className="px-3 py-1 bg-[var(--bg-elevated)] rounded-lg text-sm font-medium">
                                                Best Cost: {comparisonData.couriers.find(c => c.courierId === comparisonData.recommendation?.bestCost)?.courierName}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Comparison Table */}
                        <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                            <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text-secondary)] sticky left-0 bg-[var(--bg-secondary)]">
                                                Courier
                                            </th>
                                            <th className="text-center py-4 px-4 text-sm font-semibold text-[var(--text-secondary)]">
                                                Shipments
                                            </th>
                                            {metrics.map((metric) => (
                                                <th key={metric.key} className="text-center py-4 px-4 text-sm font-semibold text-[var(--text-secondary)] min-w-[120px]">
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
                                                    className={index !== comparisonData.couriers.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}
                                                >
                                                    <td className="py-4 px-6 font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--bg-elevated)]">
                                                        {courier.courierName}
                                                    </td>
                                                    <td className="py-4 px-4 text-center text-[var(--text-secondary)]">
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
                            <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] p-6">
                                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Highest Success Rate
                                </h3>
                                <p className="text-2xl font-bold text-[var(--success)]">
                                    {Math.max(...comparisonData.couriers.map(c => c.successRate)).toFixed(1)}%
                                </p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">
                                    {comparisonData.couriers.find(c => c.successRate === Math.max(...comparisonData.couriers.map(x => x.successRate)))?.courierName}
                                </p>
                            </div>

                            <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] p-6">
                                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Fastest Delivery
                                </h3>
                                <p className="text-2xl font-bold text-[var(--primary-blue)]">
                                    {Math.min(...comparisonData.couriers.map(c => c.avgDeliveryTime)).toFixed(1)}h
                                </p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">
                                    {comparisonData.couriers.find(c => c.avgDeliveryTime === Math.min(...comparisonData.couriers.map(x => x.avgDeliveryTime)))?.courierName}
                                </p>
                            </div>

                            <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] p-6">
                                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Most Affordable
                                </h3>
                                <p className="text-2xl font-bold text-[var(--primary-blue)]">
                                    {formatCurrency(Math.min(...comparisonData.couriers.map(c => c.avgCost)))}
                                </p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">
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
            isBest && 'bg-[var(--warning-bg)] text-[var(--warning)] ring-2 ring-[var(--warning)]',
            !isBest && isGood && 'bg-[var(--success-bg)] text-[var(--success)]',
            !isBest && !isGood && 'text-[var(--text-primary)]'
        )}>
            {unit === '₹' ? formatCurrency(value) : `${value.toFixed(1)}${unit}`}
            {isBest && <Trophy className="w-3 h-3" />}
        </div>
    );
}
