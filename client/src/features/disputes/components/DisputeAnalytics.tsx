/**
 * Dispute Analytics Dashboard
 * 
 * Comprehensive analytics for weight disputes:
 * - Dispute trends over time
 * - High-risk sellers identification
 * - Resolution outcomes distribution
 * - Financial impact analysis
 */

'use client';

import React, { useState } from 'react';
import { useDisputeAnalytics } from '@/src/core/api/hooks';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface TimeRange {
    value: '7d' | '30d' | '90d' | '1y';
    label: string;
}

const TIME_RANGES: TimeRange[] = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' },
];

export function DisputeAnalytics() {
    const [timeRange, setTimeRange] = useState<TimeRange['value']>('30d');

    // Calculate date range based on selected time range
    const getDateRange = (range: TimeRange['value']) => {
        const endDate = new Date().toISOString();
        const startDate = new Date();

        switch (range) {
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(startDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
        }

        return { startDate: startDate.toISOString(), endDate };
    };

    const { data: analytics, isLoading } = useDisputeAnalytics(getDateRange(timeRange));

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-gray-500 dark:text-gray-400">No analytics data available</p>
            </div>
        );
    }

    // Calculate derived metrics
    const totalOutcomes = Object.values(analytics.stats.resolutionOutcomes).reduce((sum, val) => sum + val, 0);
    const resolutionRate = analytics.stats.totalDisputes > 0 ? totalOutcomes / analytics.stats.totalDisputes : 0;

    // Prepare outcome distribution data for pie chart
    const outcomeDistribution = [
        { name: 'Seller Favor', count: analytics.stats.resolutionOutcomes.seller_favor },
        { name: 'ShipCrowd Favor', count: analytics.stats.resolutionOutcomes.shipcrowd_favor },
        { name: 'Split', count: analytics.stats.resolutionOutcomes.split },
        { name: 'Waived', count: analytics.stats.resolutionOutcomes.waived },
    ].filter(item => item.count > 0);

    // Prepare trends data
    const trendsData = analytics.trends.map(trend => ({
        date: trend.date,
        disputes: trend.count,
        impact: trend.totalImpact,
    }));

    // Prepare high-risk sellers data
    const highRiskSellers = analytics.highRiskSellers.map(seller => ({
        sellerId: seller.companyId,
        sellerName: seller.companyName,
        totalDisputes: seller.disputeCount,
        disputeRate: seller.disputeCount / analytics.stats.totalDisputes,
        averageDiscrepancy: seller.averageDiscrepancy,
        totalFinancialImpact: seller.totalDiscrepancy,
        riskLevel: seller.disputeCount >= 10 ? 'critical' : seller.disputeCount >= 5 ? 'high' : 'medium',
    }));

    return (
        <div className="space-y-6">
            {/* Header with Time Range Selector */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dispute Analytics</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Insights and trends for weight disputes</p>
                </div>
                <div className="flex gap-2">
                    {TIME_RANGES.map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setTimeRange(range.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === range.value
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Disputes</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                                {analytics.stats.totalDisputes}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Resolution Rate</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                                {(resolutionRate * 100).toFixed(1)}%
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Seller Response Rate</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                                {(analytics.stats.sellerResponseRate * 100).toFixed(1)}%
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Discrepancy</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                                {analytics.stats.averageDiscrepancy.toFixed(1)}%
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dispute Trends Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Dispute Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(date) => formatDate(date)}
                            stroke="#9CA3AF"
                        />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#F9FAFB' }}
                            labelFormatter={(date) => formatDate(date)}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="disputes" stroke="#3B82F6" name="Disputes" strokeWidth={2} />
                        <Line type="monotone" dataKey="impact" stroke="#EF4444" name="Financial Impact (₹)" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resolution Outcomes */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Resolution Outcomes</h3>
                    {outcomeDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={outcomeDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {outcomeDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                            No resolution data available
                        </div>
                    )}
                </div>

                {/* Auto-Resolve Rate & Financial Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Resolution Breakdown</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Auto-Resolve Rate</p>
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                                    {(analytics.stats.autoResolveRate * 100).toFixed(1)}%
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Financial Impact</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                                    {formatCurrency(analytics.stats.totalFinancialImpact)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {outcomeDistribution.map((outcome) => (
                                <div key={outcome.name} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{outcome.name}</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{outcome.count}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* High-Risk Sellers */}
            {highRiskSellers.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">High-Risk Sellers</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Sellers with high dispute rates or financial impact
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Seller</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Disputes</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dispute Rate</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Discrepancy</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Financial Impact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Risk Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {highRiskSellers.map((seller) => (
                                    <tr key={seller.sellerId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {seller.sellerName || seller.sellerId}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {seller.totalDisputes}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                                {(seller.disputeRate * 100).toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {seller.averageDiscrepancy.toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                                {formatCurrency(seller.totalFinancialImpact)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${seller.riskLevel === 'critical'
                                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                : seller.riskLevel === 'high'
                                                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                }`}>
                                                {seller.riskLevel.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
