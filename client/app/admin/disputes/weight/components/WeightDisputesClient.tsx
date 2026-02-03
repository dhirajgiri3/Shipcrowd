'use client';

import React from 'react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { AdminDisputesTable } from '@/src/features/disputes/components/AdminDisputesTable';
import { useAdminDisputeMetrics, useAdminDisputeAnalytics } from '@/src/core/api/hooks/admin/disputes/useAdminDisputes';
import { formatCompactCurrency } from '@/src/lib/utils';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { AlertCircle, CheckCircle, Clock, FileText, TrendingUp } from 'lucide-react';

export function WeightDisputesClient() {
    const { data: metrics, isLoading: metricsLoading } = useAdminDisputeMetrics();
    const { data: analytics } = useAdminDisputeAnalytics();

    if (metricsLoading) {
        return <Loader message="Loading dispute metrics..." />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                    Weight Disputes - Admin
                </h1>
                <p className="text-[var(--text-secondary)]">
                    Review and resolve weight discrepancy disputes
                </p>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* Total */}
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-[var(--text-secondary)]">Total</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                            {metrics?.total || 0}
                        </p>
                    </CardContent>
                </Card>

                {/* Pending */}
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-[var(--text-secondary)]">Pending</p>
                        <p className="text-2xl font-bold text-[var(--warning)]">
                            {metrics?.pending || 0}
                        </p>
                    </CardContent>
                </Card>

                {/* Under Review */}
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-[var(--text-secondary)]">Under Review</p>
                        <p className="text-2xl font-bold text-[var(--primary-blue)]">
                            {metrics?.underReview || 0}
                        </p>
                    </CardContent>
                </Card>

                {/* Resolved */}
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-[var(--text-secondary)]">Resolved</p>
                        <p className="text-2xl font-bold text-[var(--success)]">
                            {metrics?.resolved || 0}
                        </p>
                    </CardContent>
                </Card>

                {/* Auto Resolved */}
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-[var(--text-secondary)]">Auto Resolved</p>
                        <p className="text-2xl font-bold text-[var(--primary-blue)]">
                            {metrics?.autoResolved || 0}
                        </p>
                    </CardContent>
                </Card>

                {/* Financial Impact */}
                <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-sm p-4 text-white">
                    <p className="text-sm text-[var(--error-bg)]">Total Impact</p>
                    <p className="text-2xl font-bold">
                        {formatCompactCurrency(metrics?.totalFinancialImpact || 0)}
                    </p>
                </div>
            </div>

            {/* Resolution Stats */}
            {analytics?.stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Seller Response Rate</p>
                                <p className="text-xl font-bold text-[var(--text-primary)]">
                                    {(analytics.stats.sellerResponseRate * 100).toFixed(1)}%
                                </p>
                            </div>
                            <div className="p-3 bg-[var(--info-bg)] rounded-full">
                                <TrendingUp className="h-5 w-5 text-[var(--info)]" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Avg Resolution Time</p>
                                <p className="text-xl font-bold text-[var(--text-primary)]">
                                    {(metrics?.averageResolutionTime || 0).toFixed(1)}h
                                </p>
                            </div>
                            <div className="p-3 bg-[var(--success-bg)] rounded-full">
                                <Clock className="h-5 w-5 text-[var(--success)]" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Auto-Resolve Rate</p>
                                <p className="text-xl font-bold text-[var(--text-primary)]">
                                    {(analytics.stats.autoResolveRate * 100).toFixed(1)}%
                                </p>
                            </div>
                            <div className="p-3 bg-[var(--primary-blue-soft)] rounded-full">
                                <CheckCircle className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Avg Discrepancy</p>
                                <p className="text-xl font-bold text-[var(--text-primary)]">
                                    {(analytics.stats.averageDiscrepancy || 0).toFixed(1)}%
                                </p>
                            </div>
                            <div className="p-3 bg-[var(--warning-bg)] rounded-full">
                                <AlertCircle className="h-5 w-5 text-[var(--warning)]" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Disputes Table */}
            <AdminDisputesTable />
        </div>
    );
}
