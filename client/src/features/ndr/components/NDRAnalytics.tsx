/**
 * NDR Analytics Dashboard
 * 
 * Comprehensive analytics for NDR management:
 * - Reason breakdown
 * - Action effectiveness
 * - Communication stats
 * - Trend analysis
 */

'use client';

import React, { useState } from 'react';
import { useNDRAnalytics, useNDRSelfServiceMetrics, useNDRPreventionMetrics, useNDRROIMetrics } from '@/src/core/api/hooks';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

interface TimeRange {
    value: '7d' | '30d' | '90d';
    label: string;
}

const TIME_RANGES: TimeRange[] = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
];

export function NDRAnalytics() {
    const [timeRange, setTimeRange] = useState<TimeRange['value']>('30d');

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
        }

        return { startDate: startDate.toISOString(), endDate };
    };

    const { data: analytics, isLoading } = useNDRAnalytics(getDateRange(timeRange));
    const { data: selfService } = useNDRSelfServiceMetrics(getDateRange(timeRange));
    const { data: prevention } = useNDRPreventionMetrics(getDateRange(timeRange));
    const { data: roi } = useNDRROIMetrics(getDateRange(timeRange));

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                        <div className="animate-pulse space-y-4">
                            <div className="h-6 bg-[var(--bg-secondary)] rounded w-1/4"></div>
                            <div className="h-64 bg-[var(--bg-secondary)] rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!analytics) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">NDR Analytics</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Insights and performance metrics for NDR management
                    </p>
                </div>
                <div className="flex gap-2">
                    {TIME_RANGES.map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setTimeRange(range.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === range.value
                                ? 'bg-[var(--primary-blue)] text-white'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                    <p className="text-sm text-[var(--text-secondary)]">Total Cases</p>
                    <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                        {analytics.stats.totalCases}
                    </p>
                </div>
                <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                    <p className="text-sm text-[var(--text-secondary)]">Resolution Rate</p>
                    <p className="text-3xl font-bold text-[var(--success)] mt-2">
                        {(analytics.stats.resolutionRate * 100).toFixed(1)}%
                    </p>
                </div>
                <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                    <p className="text-sm text-[var(--text-secondary)]">Avg Resolution Time</p>
                    <p className="text-3xl font-bold text-[var(--primary-blue)] mt-2">
                        {analytics.stats.averageResolutionTime.toFixed(1)}h
                    </p>
                </div>
                <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                    <p className="text-sm text-[var(--text-secondary)]">RTO Conversion</p>
                    <p className="text-3xl font-bold text-[var(--error)] mt-2">
                        {(analytics.stats.rtoConversionRate * 100).toFixed(1)}%
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reason Breakdown */}
                <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                        Failure Reasons
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={analytics.reasonBreakdown}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry: any) => {
                                    const data = entry as { reason: string; percentage: number };
                                    return `${data.reason.replace(/_/g, ' ')}: ${data.percentage ? data.percentage.toFixed(0) : 0}%`;
                                }}
                                outerRadius={100}
                                dataKey="count"
                            >
                                {analytics.reasonBreakdown.map((entry, index) => (
                                    <Cell key={entry.reason || index} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Action Effectiveness */}
                <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                        Action Effectiveness
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.actionEffectiveness}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                                dataKey="action"
                                tickFormatter={(val) => val.replace(/_/g, ' ')}
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                stroke="#9CA3AF"
                            />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                formatter={(value) => `${(value as number * 100).toFixed(1)}%`}
                            />
                            <Legend />
                            <Bar dataKey="successRate" fill="#10B981" name="Success Rate" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Communication Stats */}
            <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                    Communication Performance
                </h3>
                <div className="grid grid-cols-4 gap-6">
                    <div className="text-center">
                        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-2">
                            <svg className="w-24 h-24 transform -rotate-90">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-gray-200 dark:text-gray-700"
                                />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - analytics.communicationStats.smsDeliveryRate)}`}
                                    className="text-blue-600"
                                />
                            </svg>
                            <span className="absolute text-lg font-bold text-gray-900 dark:text-white">
                                {(analytics.communicationStats.smsDeliveryRate * 100).toFixed(0)}%
                            </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">SMS Delivery</p>
                    </div>
                    <div className="text-center">
                        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-2">
                            <svg className="w-24 h-24 transform -rotate-90">
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700" />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - analytics.communicationStats.emailOpenRate)}`}
                                    className="text-purple-600"
                                />
                            </svg>
                            <span className="absolute text-lg font-bold text-gray-900 dark:text-white">
                                {(analytics.communicationStats.emailOpenRate * 100).toFixed(0)}%
                            </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Open Rate</p>
                    </div>
                    <div className="text-center">
                        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-2">
                            <svg className="w-24 h-24 transform -rotate-90">
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700" />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - analytics.communicationStats.whatsappDeliveryRate)}`}
                                    className="text-green-600"
                                />
                            </svg>
                            <span className="absolute text-lg font-bold text-gray-900 dark:text-white">
                                {(analytics.communicationStats.whatsappDeliveryRate * 100).toFixed(0)}%
                            </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp Delivery</p>
                    </div>
                    <div className="text-center">
                        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-2">
                            <svg className="w-24 h-24 transform -rotate-90">
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700" />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - analytics.communicationStats.customerResponseRate)}`}
                                    className="text-orange-600"
                                />
                            </svg>
                            <span className="absolute text-lg font-bold text-gray-900 dark:text-white">
                                {(analytics.communicationStats.customerResponseRate * 100).toFixed(0)}%
                            </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Response</p>
                    </div>
                </div>
            </div>

            {/* Trends */}
            <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                    NDR Trends
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis dataKey="date" stroke="var(--text-secondary)" />
                        <YAxis stroke="var(--text-secondary)" />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="created" stroke="#3B82F6" name="Created" strokeWidth={2} />
                        <Line type="monotone" dataKey="resolved" stroke="#10B981" name="Resolved" strokeWidth={2} />
                        <Line type="monotone" dataKey="rtoConverted" stroke="#EF4444" name="RTO" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>


            {/* Phase 6: New Analytics Sections */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Self-Service Performance */}
                {selfService && (
                    <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                            Customer Self-Service (Magic Link)
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="text-center p-3 bg-[var(--bg-primary)] rounded-lg">
                                <p className="text-xs text-[var(--text-secondary)]">CTR</p>
                                <p className="text-2xl font-bold text-[var(--primary-blue)]">{selfService.ctr}%</p>
                                <p className="text-xs text-[var(--text-tertiary)]">{selfService.magicLinksClicked}/{selfService.magicLinksSent} clicked</p>
                            </div>
                            <div className="text-center p-3 bg-[var(--bg-primary)] rounded-lg">
                                <p className="text-xs text-[var(--text-secondary)]">Response Rate</p>
                                <p className="text-2xl font-bold text-[var(--success)]">{selfService.responseRate}%</p>
                                <p className="text-xs text-[var(--text-tertiary)]">{selfService.customerResponses} responses</p>
                            </div>
                        </div>
                        <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Action Breakdown</h4>
                        <div className="space-y-3">
                            {Object.entries(selfService.actionBreakdown).map(([action, count]) => (
                                <div key={action} className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-primary)] capitalize">{action.replace(/_/g, ' ')}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[var(--primary-blue)]"
                                                style={{ width: `${selfService.customerResponses > 0 ? (count / selfService.customerResponses) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-[var(--text-primary)]">{count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Prevention Layer Impact */}
                {prevention && (
                    <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                            Prevention Layer Impact
                        </h3>
                        <div className="flex items-center justify-center mb-6">
                            <div className="text-center">
                                <p className="text-sm text-[var(--text-secondary)]">Total Shipments Prevented</p>
                                <p className="text-4xl font-bold text-[var(--error)]">{prevention.totalPrevented}</p>
                                <p className="text-xs text-[var(--text-tertiary)]">Potential Bad Deliveries Stopped</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg">
                                <span className="text-sm text-[var(--text-secondary)]">Address Validation Blocks</span>
                                <span className="text-base font-bold text-[var(--text-primary)]">{prevention.addressValidationBlocks}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg">
                                <span className="text-sm text-[var(--text-secondary)]">Fake/Invalid Phone</span>
                                <span className="text-base font-bold text-[var(--text-primary)]">{prevention.phoneVerificationFailures}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg">
                                <span className="text-sm text-[var(--text-secondary)]">COD Verification Rejected</span>
                                <span className="text-base font-bold text-[var(--text-primary)]">{prevention.codVerificationBlocks}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ROI & Cost Savings */}
            {
                roi && (
                    <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                            NDR Management ROI
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                <p className="text-sm text-[var(--text-secondary)]">Net Savings</p>
                                <p className="text-3xl font-bold text-green-500 mt-1">₹{roi.netSavings.toLocaleString('en-IN')}</p>
                                <p className="text-xs text-[var(--text-tertiary)] mt-1">vs Baseline RTO Rate (26%)</p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <p className="text-sm text-[var(--text-secondary)]">ROI</p>
                                <p className="text-3xl font-bold text-blue-500 mt-1">{roi.roi}%</p>
                                <p className="text-xs text-[var(--text-tertiary)] mt-1">Return on Investment</p>
                            </div>
                            <div className="p-4">
                                <p className="text-sm text-[var(--text-secondary)]">Baseline RTO Cost</p>
                                <p className="text-xl font-semibold text-[var(--text-primary)] mt-1">₹{roi.baselineRTOCost.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="p-4">
                                <p className="text-sm text-[var(--text-secondary)]">Current RTO Cost</p>
                                <p className="text-xl font-semibold text-[var(--text-primary)] mt-1">₹{roi.currentRTOCost.toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
