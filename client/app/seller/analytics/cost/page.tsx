/**
 * Cost Analysis Dashboard
 * 
 * Comprehensive cost breakdown and savings opportunities.
 * Shows cost by courier, zone, payment method, and time series trends.
 */

'use client';

import { useState } from 'react';
import { useCostAnalysis } from '@/src/core/api/hooks/analytics/useAnalytics';
import { DollarSign, TrendingDown, TrendingUp, Lightbulb, Calendar } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import type { AnalyticsFilters, TimeRange, CostSavingsOpportunity } from '@/src/types/api/analytics';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
];

const impactColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const effortColors = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    complex: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export default function CostAnalysisPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>('30days');

    const filters: AnalyticsFilters = {
        dateRange: timeRange,
    };

    const { data: costData, isLoading } = useCostAnalysis(filters);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading cost analysis...</p>
                </div>
            </div>
        );
    }

    const calculateChange = () => {
        if (!costData?.previous) return null;
        const change = ((costData.current.totalCost - costData.previous.totalCost) / costData.previous.totalCost) * 100;
        return change;
    };

    const change = calculateChange();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Cost Analysis & Optimization
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Analyze shipping costs and identify savings opportunities
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

                {costData && (
                    <>
                        {/* Total Cost Overview */}
                        <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl p-8 mb-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-purple-100 mb-1">Total Shipping Cost</p>
                                    <p className="text-5xl font-bold">{formatCurrency(costData.current.totalCost)}</p>
                                    {change !== null && (
                                        <div className={cn(
                                            'flex items-center gap-1 mt-2',
                                            change > 0 ? 'text-red-200' : 'text-green-200'
                                        )}>
                                            {change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            <span className="text-sm font-medium">
                                                {Math.abs(change).toFixed(1)}% vs previous period
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                                    <DollarSign className="w-10 h-10" />
                                </div>
                            </div>
                        </div>

                        {/* Cost Breakdown Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                            <CostBreakdownCard
                                label="Shipping"
                                amount={costData.current.breakdown.shippingCost}
                                color="blue"
                            />
                            <CostBreakdownCard
                                label="COD Charges"
                                amount={costData.current.breakdown.codCharges}
                                color="green"
                            />
                            <CostBreakdownCard
                                label="Weight Charges"
                                amount={costData.current.breakdown.weightCharges}
                                color="purple"
                            />
                            <CostBreakdownCard
                                label="Fuel Surcharge"
                                amount={costData.current.breakdown.fuelSurcharge}
                                color="orange"
                            />
                            <CostBreakdownCard
                                label="RTO Charges"
                                amount={costData.current.breakdown.rtoCharges}
                                color="red"
                            />
                            <CostBreakdownCard
                                label="Other"
                                amount={costData.current.breakdown.otherCharges}
                                color="gray"
                            />
                        </div>

                        {/* Savings Opportunities */}
                        {costData.savingsOpportunities.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                                        <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Cost Savings Opportunities
                                        </h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Potential savings: {formatCurrency(costData.savingsOpportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0))}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {costData.savingsOpportunities.map((opportunity) => (
                                        <SavingsOpportunityCard key={opportunity.id} opportunity={opportunity} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cost by Courier */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Cost by Courier
                                </h2>
                                <div className="space-y-3">
                                    {costData.current.byCourier.map((courier) => (
                                        <div key={courier.courierId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white">{courier.courierName}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {courier.shipmentCount.toLocaleString()} shipments • Avg: {formatCurrency(courier.avgCostPerShipment)}
                                                </p>
                                            </div>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(courier.cost)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cost by Zone */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Cost by Zone
                                </h2>
                                <div className="space-y-3">
                                    {costData.current.byZone.map((zone) => (
                                        <div key={zone.zoneName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white">{zone.zoneName}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {zone.shipmentCount.toLocaleString()} shipments • Avg: {formatCurrency(zone.avgCostPerShipment)}
                                                </p>
                                            </div>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(zone.cost)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* COD vs Prepaid */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Cost by Payment Method
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">COD</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {costData.current.byPaymentMethod.cod.count.toLocaleString()} orders
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(costData.current.byPaymentMethod.cod.cost)}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Avg: {formatCurrency(costData.current.byPaymentMethod.cod.cost / costData.current.byPaymentMethod.cod.count)}
                                    </p>
                                </div>

                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Prepaid</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {costData.current.byPaymentMethod.prepaid.count.toLocaleString()} orders
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(costData.current.byPaymentMethod.prepaid.cost)}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Avg: {formatCurrency(costData.current.byPaymentMethod.prepaid.cost / costData.current.byPaymentMethod.prepaid.count)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ==================== Components ====================

interface CostBreakdownCardProps {
    label: string;
    amount: number;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
}

function CostBreakdownCard({ label, amount, color }: CostBreakdownCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
        orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        gray: 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700',
    };

    return (
        <div className={cn('p-4 rounded-lg border', colorClasses[color])}>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(amount)}</p>
        </div>
    );
}

function SavingsOpportunityCard({ opportunity }: { opportunity: CostSavingsOpportunity }) {
    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{opportunity.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{opportunity.description}</p>
                </div>
                <div className="text-right ml-4">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(opportunity.potentialSavings)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">potential savings</p>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
                <span className={cn('text-xs px-2 py-1 rounded font-medium', impactColors[opportunity.impact])}>
                    {opportunity.impact} impact
                </span>
                <span className={cn('text-xs px-2 py-1 rounded font-medium', effortColors[opportunity.effort])}>
                    {opportunity.effort} effort
                </span>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <span className="font-medium">Recommendation:</span> {opportunity.recommendation}
            </p>
        </div>
    );
}
