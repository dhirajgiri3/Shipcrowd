'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RotateCcw, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { useRTOAnalytics } from '@/src/core/api/hooks/analytics/useRTOAnalytics';
import { useRTOEvents, type RTOFilters } from '@/src/core/api/hooks/rto/useRTOManagement';
import { RTOCasesTable } from '../components/RTOCasesTable';
import { RTOAnalytics } from '@/src/components/seller/dashboard/RTOAnalytics';
import type { RTOReturnStatus } from '@/src/types/api/rto.types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'initiated', label: 'Initiated' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered_to_warehouse', label: 'At Warehouse' },
    { value: 'qc_pending', label: 'QC Pending' },
    { value: 'qc_completed', label: 'QC Done' },
    { value: 'restocked', label: 'Restocked' },
    { value: 'disposed', label: 'Disposed' },
];

export function RTOListPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [filters, setFilters] = useState<RTOFilters>({
        page: 1,
        limit: 20,
        sortBy: 'triggeredAt',
        sortOrder: 'desc',
    });
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [analyticsOpen, setAnalyticsOpen] = useState(false);

    // Deep link from dashboard: /seller/rto?returnStatus=qc_pending
    useEffect(() => {
        const status = searchParams.get('returnStatus');
        if (status && STATUS_OPTIONS.some((o) => o.value === status)) {
            setStatusFilter(status);
        }
    }, [searchParams]);

    const { data: listData, isLoading } = useRTOEvents({
        ...filters,
        returnStatus: statusFilter === 'all' ? undefined : (statusFilter as RTOReturnStatus),
    });

    const { data: analyticsData } = useRTOAnalytics();

    const handleRowClick = (rto: { _id: string }) => {
        router.push(`/seller/rto/${rto._id}`);
    };

    const metrics = analyticsData?.summary;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--error-bg)] flex items-center justify-center">
                            <RotateCcw className="w-5 h-5 text-[var(--error)]" />
                        </div>
                        RTO Management
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Return to Origin cases and quality checks
                    </p>
                </div>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-[var(--border-subtle)]">
                    <CardContent className="p-4">
                        <p className="text-xs text-[var(--text-muted)]">Pending QC</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                            {listData?.rtoEvents?.filter((e) => e.returnStatus === 'qc_pending').length ?? 0}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-[var(--border-subtle)]">
                    <CardContent className="p-4">
                        <p className="text-xs text-[var(--text-muted)]">In Transit (Reverse)</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                            {listData?.rtoEvents?.filter((e) => e.returnStatus === 'in_transit').length ?? 0}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-[var(--border-subtle)]">
                    <CardContent className="p-4">
                        <p className="text-xs text-[var(--text-muted)]">This Month</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                            {metrics?.totalRTO ?? 0}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-[var(--border-subtle)]">
                    <CardContent className="p-4">
                        <p className="text-xs text-[var(--text-muted)]">Est. Loss (Month)</p>
                        <p className="text-2xl font-bold text-[var(--error)]">
                            ₹{(metrics?.estimatedLoss ?? 0).toLocaleString('en-IN')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] min-w-[200px]"
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                    disabled={(filters.page ?? 1) <= 1}
                    className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm disabled:opacity-50"
                >
                    Previous
                </button>
                <span className="text-sm text-[var(--text-secondary)]">
                    Page {filters.page ?? 1} of {listData?.pagination?.pages || 1}
                </span>
                <button
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                    disabled={(listData?.pagination?.pages ?? 1) <= (filters.page ?? 1)}
                    className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm disabled:opacity-50"
                >
                    Next
                </button>
            </div>

            {/* Table */}
            <RTOCasesTable
                data={listData?.rtoEvents ?? []}
                loading={isLoading}
                onRowClick={handleRowClick}
            />

            {/* Analytics (collapsible) */}
            <div className="border-t border-[var(--border-subtle)] pt-6">
                <button
                    type="button"
                    onClick={() => setAnalyticsOpen((o) => !o)}
                    className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)] hover:underline"
                >
                    <TrendingUp className="w-5 h-5" />
                    RTO Analytics & Insights {analyticsOpen ? '▼' : '▶'}
                </button>
                {analyticsOpen && (
                    <div className="mt-4">
                        <RTOAnalytics onViewDetails={undefined} />
                    </div>
                )}
            </div>
        </div>
    );
}
