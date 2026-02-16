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

import React, { useMemo, useState } from 'react';
import { useAdminDisputeAnalytics } from '@/src/core/api/hooks/admin/disputes/useAdminDisputes';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { CardSkeleton, ChartSkeleton } from '@/src/components/ui';
import { FileText, CheckCircle, Scale, IndianRupee } from 'lucide-react';

const CHART_COLORS = [
    'var(--primary-blue)',
    'var(--success)',
    'var(--warning)',
    'var(--error)',
    'var(--primary-purple)',
];

const TIME_RANGES = [
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '90d', label: 'Last 90 Days' },
    { key: '1y', label: 'Last Year' },
] as const;

type TimeRangeKey = (typeof TIME_RANGES)[number]['key'];

function getDateRangeForTimeRange(range: TimeRangeKey): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    switch (range) {
        case '7d':
            start.setDate(start.getDate() - 7);
            break;
        case '30d':
            start.setDate(start.getDate() - 30);
            break;
        case '90d':
            start.setDate(start.getDate() - 90);
            break;
        case '1y':
            start.setFullYear(start.getFullYear() - 1);
            break;
    }
    return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function DisputeAnalytics() {
    const [timeRange, setTimeRange] = useState<TimeRangeKey>('30d');

    const dateRange = useMemo(() => getDateRangeForTimeRange(timeRange), [timeRange]);
    const { data: analytics, isLoading } = useAdminDisputeAnalytics(dateRange);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Dispute Analytics"
                    description="Insights and trends for weight disputes"
                    showBack={true}
                    backUrl="/admin/disputes/weight"
                    breadcrumbs={[
                        { label: 'Admin', href: '/admin' },
                        { label: 'Disputes', href: '/admin/disputes/weight' },
                        { label: 'Analytics', active: true },
                    ]}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <CardSkeleton key={i} className="h-24" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton height={300} />
                    <ChartSkeleton height={300} />
                </div>
                <ChartSkeleton height={300} />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Dispute Analytics"
                    description="Insights and trends for weight disputes"
                    showBack={true}
                    backUrl="/admin/disputes/weight"
                    breadcrumbs={[
                        { label: 'Admin', href: '/admin' },
                        { label: 'Disputes', href: '/admin/disputes/weight' },
                        { label: 'Analytics', active: true },
                    ]}
                />
                <Card className="border-[var(--border-subtle)]">
                    <CardContent className="py-12 text-center">
                        <p className="text-[var(--text-secondary)]">No analytics data available</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const overview = analytics.stats?.overview ?? {};
    const totalDisputes = overview.totalDisputes ?? 0;
    const resolvedCount = overview.resolved ?? 0;
    const resolutionRate = totalDisputes > 0 ? resolvedCount / totalDisputes : 0;
    const autoResolvedCount = overview.autoResolved ?? 0;
    const autoResolveRate = totalDisputes > 0 ? (autoResolvedCount / totalDisputes) * 100 : 0;

    const outcomeDistribution = (analytics.stats?.byOutcome ?? [])
        .map((o) => ({
            name:
                o.outcome === 'seller_favor'
                    ? 'Seller Favor'
                    : o.outcome === 'Shipcrowd_favor'
                      ? 'Shipcrowd Favor'
                      : o.outcome === 'split'
                        ? 'Split'
                        : 'Waived',
            count: o.count,
        }))
        .filter((item) => item.count > 0);

    const trendsData = (analytics.trends ?? []).map((trend) => ({
        date: trend.date,
        disputes: trend.count,
        impact: trend.totalImpact,
    }));

    const highRiskSellers = (analytics.highRiskSellers ?? []).map((seller) => ({
        sellerId: seller.companyId,
        sellerName: (seller as { sellerName?: string; companyName?: string }).sellerName ?? (seller as { sellerName?: string; companyName?: string }).companyName,
        totalDisputes: seller.disputeCount,
        disputeRate: totalDisputes > 0 ? seller.disputeCount / totalDisputes : 0,
        averageDiscrepancy: seller.averageDiscrepancy,
        totalFinancialImpact: seller.totalFinancialImpact,
        riskLevel: seller.disputeCount >= 10 ? 'critical' : seller.disputeCount >= 5 ? 'high' : 'medium',
    }));

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dispute Analytics"
                description="Insights and trends for weight disputes"
                showBack={true}
                backUrl="/admin/disputes/weight"
                breadcrumbs={[
                    { label: 'Admin', href: '/admin' },
                    { label: 'Disputes', href: '/admin/disputes/weight' },
                    { label: 'Analytics', active: true },
                ]}
                actions={
                    <PillTabs
                        tabs={TIME_RANGES}
                        activeTab={timeRange}
                        onTabChange={(k) => setTimeRange(k as TimeRangeKey)}
                    />
                }
            />

            {/** Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Disputes"
                    value={totalDisputes}
                    icon={FileText}
                    variant="default"
                />
                <StatsCard
                    title="Resolution Rate"
                    value={`${(resolutionRate * 100).toFixed(1)}%`}
                    icon={CheckCircle}
                    variant="success"
                />
                <StatsCard
                    title="Avg Discrepancy"
                    value={`${(overview.averageDiscrepancy ?? 0).toFixed(1)}%`}
                    icon={Scale}
                    variant="warning"
                />
                <StatsCard
                    title="Financial Impact"
                    value={formatCurrency(overview.totalFinancialImpact ?? 0)}
                    icon={IndianRupee}
                    variant="critical"
                />
            </div>

            {/** Carrier Performance & Fraud Signals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-[var(--border-subtle)]">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Carrier Performance</h3>
                        {(analytics.carrierPerformance ?? []).length === 0 ? (
                            <p className="text-sm text-[var(--text-secondary)]">No carrier data available for this range.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                                            <th className="py-2 pr-4">Carrier</th>
                                            <th className="py-2 pr-4">Disputes</th>
                                            <th className="py-2 pr-4">Avg Discrepancy</th>
                                            <th className="py-2 pr-4">Seller Favor %</th>
                                            <th className="py-2 pr-0">Shipcrowd Favor %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(analytics.carrierPerformance ?? []).map((c) => (
                                            <tr key={c.carrier} className="border-b border-[var(--border-subtle)]">
                                                <td className="py-2 pr-4 text-[var(--text-primary)]">{c.carrier || 'Unknown'}</td>
                                                <td className="py-2 pr-4 text-[var(--text-primary)]">{c.disputeCount}</td>
                                                <td className="py-2 pr-4 text-[var(--text-primary)]">{c.avgDiscrepancyPct.toFixed(1)}%</td>
                                                <td className="py-2 pr-4 text-[var(--text-primary)]">{(c.sellerFavorRate * 100).toFixed(1)}%</td>
                                                <td className="py-2 pr-0 text-[var(--text-primary)]">{(c.carrierFavorRate * 100).toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-[var(--border-subtle)]">
                    <CardContent className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Fraud Signals</h3>
                        <div>
                            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Under‑Declaration Pattern</h4>
                            {(analytics.fraudSignals?.underDeclarationPattern ?? []).length === 0 ? (
                                <p className="text-sm text-[var(--text-muted)]">No suspicious under‑declaration patterns detected.</p>
                            ) : (
                                <ul className="space-y-1 text-sm">
                                    {(analytics.fraudSignals?.underDeclarationPattern ?? []).map((entry) => (
                                        <li key={entry.companyId} className="flex items-center justify-between">
                                            <span className="text-[var(--text-primary)]">{entry.companyId}</span>
                                            <span className="text-[var(--text-secondary)]">{entry.avgDeclaredVsActual.toFixed(1)}% declared vs actual</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Recent Dispute Spikes</h4>
                            {(analytics.fraudSignals?.recentSpike ?? []).length === 0 ? (
                                <p className="text-sm text-[var(--text-muted)]">No recent spikes detected.</p>
                            ) : (
                                <ul className="space-y-1 text-sm">
                                    {(analytics.fraudSignals?.recentSpike ?? []).map((entry) => (
                                        <li key={entry.companyId} className="flex items-center justify-between">
                                            <span className="text-[var(--text-primary)]">{entry.companyId}</span>
                                            <span className="text-[var(--text-secondary)]">
                                                +{entry.changePct}% ({entry.previousWeek} → {entry.currentWeek})
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/** Dispute Trends Chart */}
            <Card className="border-[var(--border-subtle)]">
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Dispute Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trendsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
                            <XAxis dataKey="date" tickFormatter={(date) => formatDate(date)} stroke="var(--text-muted)" />
                            <YAxis stroke="var(--text-muted)" />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}
                                labelStyle={{ color: 'var(--text-primary)' }}
                                labelFormatter={(date) => formatDate(date)}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="disputes" stroke="var(--primary-blue)" name="Disputes" strokeWidth={2} />
                            <Line type="monotone" dataKey="impact" stroke="var(--error)" name="Financial Impact (₹)" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/** Resolution Outcomes & Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-[var(--border-subtle)]">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Resolution Outcomes</h3>
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
                                        fill="var(--primary-blue)"
                                        dataKey="count"
                                    >
                                        {outcomeDistribution.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-[var(--text-muted)]">No resolution data available</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-[var(--border-subtle)]">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Resolution Breakdown</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[var(--primary-blue-soft)] rounded-[var(--radius-lg)]">
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Auto-Resolve Rate</p>
                                    <p className="text-2xl font-bold text-[var(--primary-blue)] mt-1">{autoResolveRate.toFixed(1)}%</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-[var(--info-bg)] rounded-[var(--radius-lg)]">
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Total Financial Impact</p>
                                    <p className="text-2xl font-bold text-[var(--info)] mt-1">{formatCurrency(overview.totalFinancialImpact ?? 0)}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {outcomeDistribution.map((outcome) => (
                                    <div key={outcome.name} className="p-3 bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)]">
                                        <p className="text-xs text-[var(--text-muted)]">{outcome.name}</p>
                                        <p className="text-lg font-bold text-[var(--text-primary)]">{outcome.count}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/** High-Risk Sellers */}
            {highRiskSellers.length > 0 && (
                <Card className="border-[var(--border-subtle)]">
                    <div className="p-6 border-b border-[var(--border-subtle)]">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">High-Risk Sellers</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Sellers with high dispute rates or financial impact</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-tertiary)]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Seller</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Total Disputes</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Dispute Rate</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Avg Discrepancy</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Financial Impact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Risk Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {highRiskSellers.map((seller) => (
                                    <tr key={seller.sellerId} className="hover:bg-[var(--bg-hover)]">
                                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{seller.sellerName || seller.sellerId}</td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-primary)]">{seller.totalDisputes}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-[var(--warning)]">{(seller.disputeRate * 100).toFixed(1)}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-primary)]">{(seller.averageDiscrepancy ?? 0).toFixed(1)}%</td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-[var(--error)]">{formatCurrency(seller.totalFinancialImpact)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 text-xs font-medium rounded-full ${
                                                    seller.riskLevel === 'critical'
                                                        ? 'bg-[var(--error-bg)] text-[var(--error)]'
                                                        : seller.riskLevel === 'high'
                                                          ? 'bg-[var(--warning-bg)] text-[var(--warning)]'
                                                          : 'bg-[var(--info-bg)] text-[var(--info)]'
                                                }`}
                                            >
                                                {seller.riskLevel.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
