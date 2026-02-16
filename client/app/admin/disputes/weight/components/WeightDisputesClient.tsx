'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Button } from '@/src/components/ui/core/Button';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { AdminDisputesTable } from '@/src/features/disputes/components/AdminDisputesTable';
import {
    useAdminDisputeMetrics,
    useAdminDisputeAnalytics,
} from '@/src/core/api/hooks/admin/disputes/useAdminDisputes';
import { useUrlDateRange } from '@/src/hooks/analytics/useUrlDateRange';
import { formatCompactCurrency } from '@/src/lib/utils';
import { PageHeaderSkeleton, CardSkeleton } from '@/src/components/ui';
import { AlertCircle, BarChart3, Clock, IndianRupee, Scale } from 'lucide-react';

export function WeightDisputesClient() {
    const [showAnalytics, setShowAnalytics] = useState(false);
    const { range, startDateIso, endDateIso, setRange } = useUrlDateRange({ defaultDays: 30 });

    const dateRange = { startDate: startDateIso, endDate: endDateIso };
    const { data: metrics, isLoading: metricsLoading } = useAdminDisputeMetrics(dateRange);
    const { data: analytics, isLoading: analyticsLoading } = useAdminDisputeAnalytics({
        ...dateRange,
        enabled: showAnalytics,
    });

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto bg-[var(--bg-secondary)] min-h-screen pb-20 space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Weight Disputes"
                description="Review and resolve weight discrepancy disputes across the platform."
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[
                    { label: 'Admin', href: '/admin' },
                    { label: 'Disputes', href: '/admin/disputes/weight' },
                    { label: 'Weight', active: true },
                ]}
                actions={<DateRangePicker value={range} onRangeChange={setRange} />}
            />

            {/* Metrics - Show skeleton when loading, don't block page */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {metricsLoading ? (
                    <>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <CardSkeleton key={i} className="h-24" />
                        ))}
                    </>
                ) : (
                    <>
                        <StatsCard
                            title="Total"
                            value={metrics?.total ?? 0}
                            icon={Scale}
                            variant="default"
                        />
                        <StatsCard
                            title="Pending"
                            value={metrics?.pending ?? 0}
                            icon={AlertCircle}
                            variant="warning"
                        />
                        <StatsCard
                            title="Under Review"
                            value={metrics?.underReview ?? 0}
                            icon={Clock}
                            variant="info"
                        />
                        <StatsCard
                            title="Resolved"
                            value={metrics?.resolved ?? 0}
                            icon={Scale}
                            variant="success"
                        />
                        <StatsCard
                            title="Auto Resolved"
                            value={metrics?.autoResolved ?? 0}
                            icon={Clock}
                            variant="default"
                        />
                        <Card className="border-[var(--border-subtle)] bg-[var(--error-bg)]/30">
                            <CardContent className="p-5 flex flex-col justify-between h-full">
                                <div className="flex items-center gap-2 mb-2">
                                    <IndianRupee className="w-5 h-5 text-[var(--error)]" />
                                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                                        Total Impact
                                    </span>
                                </div>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {formatCompactCurrency(metrics?.totalFinancialImpact ?? 0)}
                                </p>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Resolution Stats - Deferred until user clicks to load */}
            {!showAnalytics ? (
                <Card className="border-[var(--border-subtle)]">
                    <CardContent className="py-6 flex items-center justify-between">
                        <p className="text-sm text-[var(--text-secondary)]">
                            Avg resolution time, discrepancy, and resolved count for the selected date range.
                        </p>
                        <Button
                            variant="secondary"
                            onClick={() => setShowAnalytics(true)}
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Resolution Stats
                        </Button>
                    </CardContent>
                </Card>
            ) : analyticsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <CardSkeleton key={i} className="h-24" />
                    ))}
                </div>
            ) : (
                analytics?.stats?.overview && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-[var(--border-subtle)]">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Avg Resolution Time
                                    </p>
                                    <p className="text-xl font-bold text-[var(--text-primary)]">
                                        {(analytics.stats.resolutionTimeStats.averageHours || 0).toFixed(1)}h
                                    </p>
                                </div>
                                <div className="p-3 bg-[var(--success-bg)] rounded-full">
                                    <Clock className="h-5 w-5 text-[var(--success)]" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-[var(--border-subtle)]">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Avg Discrepancy
                                    </p>
                                    <p className="text-xl font-bold text-[var(--text-primary)]">
                                        {(analytics.stats.overview.averageDiscrepancy || 0).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="p-3 bg-[var(--warning-bg)] rounded-full">
                                    <AlertCircle className="h-5 w-5 text-[var(--warning)]" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-[var(--border-subtle)]">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Resolved Disputes
                                    </p>
                                    <p className="text-xl font-bold text-[var(--text-primary)]">
                                        {analytics.stats.overview.resolved ?? 0}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            )}

            {/* Disputes Table */}
            <AdminDisputesTable />
        </div>
    );
}
