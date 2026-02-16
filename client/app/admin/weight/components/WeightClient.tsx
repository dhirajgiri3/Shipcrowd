"use client";
export const dynamic = "force-dynamic";

import { useMemo } from 'react';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { Scale, TrendingUp, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/src/lib/utils';
import { useAdminDisputeMetrics } from '@/src/core/api/hooks/admin/disputes/useAdminDisputes';

export function WeightClient() {
    const router = useRouter();
    const metricsRange = useMemo(() => {
        const to = new Date();
        return {
            startDate: startOfDay(subDays(to, 29)).toISOString(),
            endDate: endOfDay(to).toISOString(),
        };
    }, []);
    const { data: metrics, isLoading } = useAdminDisputeMetrics(metricsRange);

    if (isLoading) {
        return <Loader message="Loading weight & dispute overview..." centered />;
    }

    const totalDisputes = metrics?.total || 0;
    const pending = metrics?.pending || 0;
    const underReview = metrics?.underReview || 0;
    const resolved = metrics?.resolved || 0;
    const totalImpact = metrics?.totalFinancialImpact || 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <Scale className="h-6 w-6 text-[var(--primary-blue)]" />
                        Weight & Dispute Center
                    </h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">
                        Central overview for courier weight discrepancies, disputes, and prevention.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/admin/disputes/weight')}>
                        View Disputes
                    </Button>
                    <Button onClick={() => router.push('/admin/disputes/analytics')}>
                        Analytics & Insights
                    </Button>
                </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-[var(--text-secondary)]">Total Disputes</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{totalDisputes}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-[var(--text-secondary)]">Pending</p>
                        <p className="text-2xl font-bold text-[var(--warning)]">{pending}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-[var(--text-secondary)]">Under Review</p>
                        <p className="text-2xl font-bold text-[var(--primary-blue)]">{underReview}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-[var(--text-secondary)]">Resolved</p>
                        <p className="text-2xl font-bold text-[var(--success)]">{resolved}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 bg-[var(--error-bg)] rounded-xl">
                        <p className="text-sm text-[var(--text-secondary)]">Total Financial Impact</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                            {formatCurrency(totalImpact)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Workflow & Prevention overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardContent className="p-6 space-y-3">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-[var(--primary-blue)]" />
                            Dispute Workflow
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Shipments move from discrepancy detection → seller evidence → admin resolution → settlement.
                        </p>
                        <ul className="text-sm text-[var(--text-secondary)] list-disc list-inside space-y-1">
                            <li>Automatic detection from courier webhooks when discrepancy crosses thresholds.</li>
                            <li>Sellers respond from their disputes inbox with packing photos and documents.</li>
                            <li>Admins resolve disputes from the weight disputes admin table with bulk actions.</li>
                        </ul>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.push('/admin/disputes/weight')}>
                            Go to Dispute Inbox
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 space-y-3">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-[var(--primary-blue)]" />
                            Prevention & Fraud Signals
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Use analytics to spot under‑declaration, high‑risk sellers, and carrier issues early.
                        </p>
                        <ul className="text-sm text-[var(--text-secondary)] list-disc list-inside space-y-1">
                            <li>Carrier‑level dispute rates and discrepancy patterns from analytics.</li>
                            <li>Fraud signals for under‑declaration and sudden spikes in disputes.</li>
                            <li>SKU weight profiles (configured in backend) support prevention at packing.</li>
                        </ul>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.push('/admin/disputes/analytics')}>
                            Open Analytics Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
