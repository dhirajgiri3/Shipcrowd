'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    useCodDiscrepancies,
    useCodDiscrepancyStats,
    useResolveCodDiscrepancy,
} from '@/src/core/api/hooks/finance';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency, cn, parsePaginationQuery, syncPaginationQuery } from '@/src/lib/utils';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { useUrlDateRange } from '@/src/hooks';
import type { DateRange } from '@/src/lib/data';
import {
    AlertCircle,
    RefreshCw,
    FileText,
    AlertTriangle,
    CheckCircle2,
    Clock,
    IndianRupee,
} from 'lucide-react';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import type { CODDiscrepancy } from '@/src/core/api/clients/finance/codDiscrepancyApi';

const DISCREPANCY_TABS = [
    { key: '', label: 'All' },
    { key: 'detected', label: 'Detected' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'resolved', label: 'Resolved' },
] as const;
const DEFAULT_LIMIT = 20;

type StatusFilterKey = (typeof DISCREPANCY_TABS)[number]['key'];

export default function CODDiscrepancyPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { addToast } = useToast();
    const [page, setPage] = useState(1);
    const { limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [resolveTarget, setResolveTarget] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const [hasInitializedFilterReset, setHasInitializedFilterReset] = useState(false);
    const {
        range: dateRange,
        startDateIso,
        endDateIso,
        setRange,
    } = useUrlDateRange();

    const stats = useCodDiscrepancyStats({ startDate: startDateIso, endDate: endDateIso });

    const {
        data: response,
        isLoading,
        error,
        refetch: refetchDiscrepancies,
    } = useCodDiscrepancies({
        page,
        limit,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        startDate: startDateIso,
        endDate: endDateIso,
    });

    const resolveMutation = useResolveCodDiscrepancy();

    const discrepancies: CODDiscrepancy[] = response?.data || [];
    const pagination = response?.pagination || { total: 0, pages: 1, page: 1, limit };

    // Sync filters from URL
    useEffect(() => {
        const statusParam = searchParams.get('status');
        const validKeys = DISCREPANCY_TABS.map((t) => t.key);
        const nextStatus: StatusFilterKey =
            !statusParam || statusParam === 'all' ? '' : validKeys.includes(statusParam as StatusFilterKey) ? (statusParam as StatusFilterKey) : '';
        setStatusFilter((prev) => (prev === nextStatus ? prev : nextStatus));
        const nextSearch = searchParams.get('search') || '';
        setSearch((currentSearch) => (currentSearch === nextSearch ? currentSearch : nextSearch));

        const { page: nextPage } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
        setPage((currentPage) => (currentPage === nextPage ? currentPage : nextPage));
        setIsUrlHydrated(true);
    }, [searchParams]);

    useEffect(() => {
        if (!isUrlHydrated) return;
        if (!hasInitializedFilterReset) {
            setHasInitializedFilterReset(true);
            return;
        }
        setPage(1);
    }, [statusFilter, debouncedSearch, startDateIso, endDateIso, isUrlHydrated, hasInitializedFilterReset]);

    useEffect(() => {
        if (!isUrlHydrated) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set('status', statusFilter || 'all');
        if (debouncedSearch) {
            params.set('search', debouncedSearch);
        } else {
            params.delete('search');
        }
        syncPaginationQuery(params, { page, limit }, { defaultLimit: DEFAULT_LIMIT });

        const nextQuery = params.toString();
        const currentQuery = searchParams.toString();
        if (nextQuery !== currentQuery) {
            router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
        }
    }, [statusFilter, debouncedSearch, page, limit, isUrlHydrated, searchParams, pathname, router]);

    // Reset to page 1 when current page is out of range
    useEffect(() => {
        const total = pagination.total;
        const pages = pagination.pages;
        if (total > 0 && page > pages && discrepancies.length === 0) {
            setPage(1);
        }
    }, [pagination.total, pagination.pages, page, discrepancies.length]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await refetchDiscrepancies();
        setIsRefreshing(false);
    }, [refetchDiscrepancies]);

    const handleStatusChange = useCallback(
        (status: StatusFilterKey) => {
            setStatusFilter(status);
            setPage(1);
        },
        []
    );

    const handleQuickResolve = useCallback((id: string) => setResolveTarget(id), []);
    const handleDateRangeChange = useCallback((range: DateRange) => {
        setRange(range);
    }, [setRange]);

    const handleConfirmResolve = useCallback(() => {
        if (!resolveTarget) return;
        resolveMutation.mutate({
            id: resolveTarget,
            params: { method: 'merchant_writeoff', remarks: 'Manual resolution via dashboard' },
        });
        setResolveTarget(null);
    }, [resolveTarget, resolveMutation]);

    const columns = useMemo(() => [
        {
            header: 'ID',
            accessorKey: 'discrepancyNumber',
            cell: (row: CODDiscrepancy) => (
                <div className="font-mono text-sm font-medium text-[var(--text-primary)]">
                    {row.discrepancyNumber}
                </div>
            ),
        },
        {
            header: 'AWB',
            accessorKey: 'awb',
            cell: (row: CODDiscrepancy) => (
                <div className="font-mono text-sm text-[var(--text-primary)]">{row.awb}</div>
            ),
        },
        {
            header: 'Type',
            accessorKey: 'type',
            cell: (row: CODDiscrepancy) => (
                <span className="text-sm text-[var(--text-secondary)] capitalize">
                    {row.type.replace(/_/g, ' ')}
                </span>
            ),
        },
        {
            header: 'Expected',
            accessorKey: 'amounts.expected.total',
            cell: (row: CODDiscrepancy) => (
                <span className="text-sm text-[var(--text-primary)]">
                    {formatCurrency(row.amounts.expected.total)}
                </span>
            ),
        },
        {
            header: 'Actual',
            accessorKey: 'amounts.actual.collected',
            cell: (row: CODDiscrepancy) => (
                <span className="text-sm text-[var(--text-primary)]">
                    {formatCurrency(row.amounts.actual.collected)}
                </span>
            ),
        },
        {
            header: 'Diff',
            accessorKey: 'amounts.difference',
            cell: (row: CODDiscrepancy) => (
                <span
                    className={cn(
                        'text-sm font-semibold',
                        row.amounts.difference > 0
                            ? 'text-[var(--error)]'
                            : row.amounts.difference < 0
                              ? 'text-[var(--success)]'
                              : 'text-[var(--text-muted)]'
                    )}
                >
                    {row.amounts.difference > 0 ? '+' : ''}
                    {formatCurrency(row.amounts.difference)}
                </span>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row: CODDiscrepancy) => (
                <Badge
                    variant={
                        row.status === 'resolved'
                            ? 'success'
                            : row.status === 'under_review'
                              ? 'info'
                              : 'warning'
                    }
                    size="sm"
                >
                    {row.status.replace(/_/g, ' ')}
                </Badge>
            ),
        },
        {
            header: 'Actions',
            accessorKey: 'actions',
            width: 'min-w-[100px]',
            stickyRight: true,
            cell: (row: CODDiscrepancy) => (
                <div className="flex items-center gap-2">
                    {row.status === 'detected' && (
                        <ViewActionButton
                            label="Accept"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleQuickResolve(row._id);
                            }}
                        />
                    )}
                    {row.status === 'resolved' && (
                        <span className="text-xs text-[var(--text-muted)]">Resolved</span>
                    )}
                </div>
            ),
        },
    ], [handleQuickResolve]);

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <ConfirmDialog
                open={!!resolveTarget}
                title="Accept courier amount"
                description="Are you sure you want to accept the courier amount? This will close the discrepancy."
                confirmText="Accept"
                isLoading={resolveMutation.isPending}
                onCancel={() => setResolveTarget(null)}
                onConfirm={handleConfirmResolve}
            />

            <PageHeader
                title="COD Discrepancies"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'COD', href: '/seller/cod' },
                    { label: 'Discrepancies', active: true },
                ]}
                description="Review and resolve COD payment mismatches"
                actions={
                    <div className="flex items-center gap-3">
                        <DateRangePicker value={dateRange} onRangeChange={handleDateRangeChange} />
                        <Button
                            onClick={handleRefresh}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm',
                                isRefreshing && 'animate-spin'
                            )}
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                            onClick={() => addToast('Export feature coming soon', 'info')}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Discrepancies"
                    value={stats.total ?? 0}
                    icon={AlertTriangle}
                    iconColor="text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
                    delay={0}
                />
                <StatsCard
                    title="Detected"
                    value={stats.detected ?? 0}
                    icon={AlertCircle}
                    iconColor="text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                    variant="critical"
                    description="Requires attention"
                    delay={1}
                    onClick={() => handleStatusChange('detected')}
                    isActive={statusFilter === 'detected'}
                />
                <StatsCard
                    title="Under Review"
                    value={stats.under_review ?? 0}
                    icon={Clock}
                    iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                    delay={2}
                    onClick={() => handleStatusChange('under_review')}
                    isActive={statusFilter === 'under_review'}
                />
                <StatsCard
                    title="Resolved"
                    value={stats.resolved ?? 0}
                    icon={CheckCircle2}
                    iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                    delay={3}
                    onClick={() => handleStatusChange('resolved')}
                    isActive={statusFilter === 'resolved'}
                />
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <PillTabs
                        tabs={DISCREPANCY_TABS}
                        activeTab={statusFilter}
                        onTabChange={handleStatusChange}
                    />

                    <div className="flex items-center gap-3">
                        <SearchInput
                            placeholder="Search by ID or AWB..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-sm py-20 text-center">
                        <div className="w-20 h-20 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-[var(--error)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                            Failed to load discrepancies
                        </h3>
                        <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">
                            {error.message ||
                                'An unexpected error occurred while fetching discrepancies. Please try again.'}
                        </p>
                        <Button variant="primary" onClick={() => refetchDiscrepancies()} className="mx-auto">
                            <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
                        </Button>
                    </div>
                )}

                {!error &&
                    (discrepancies.length > 0 || isLoading ? (
                        <DataTable
                            columns={columns}
                            data={discrepancies}
                            isLoading={isLoading}
                            pagination={{
                                currentPage: page,
                                totalPages: pagination.pages,
                                onPageChange: setPage,
                                totalItems: pagination.total,
                            }}
                        />
                    ) : (
                        <div className="py-24 text-center bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)]">
                            <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
                                <IndianRupee className="w-10 h-10 text-[var(--text-muted)]" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                No discrepancies found
                            </h3>
                            <p className="text-[var(--text-muted)] text-sm mt-2 mb-6">
                                {statusFilter
                                    ? 'No discrepancies match your current filter'
                                    : 'COD discrepancies will appear here when payment mismatches are detected'}
                            </p>
                            {statusFilter && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleStatusChange('')}
                                    className="text-[var(--primary-blue)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
                                >
                                    Clear filter
                                </Button>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );
}
