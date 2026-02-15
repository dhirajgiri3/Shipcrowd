'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RotateCcw, TrendingUp, RefreshCw, Filter, FileOutput, Package, AlertTriangle, CheckCircle2, Truck, ClipboardCheck } from 'lucide-react';
import { useRTOAnalytics } from '@/src/core/api/hooks/rto/useRTOAnalytics';
import { useRTOEvents, type RTOFilters } from '@/src/core/api/hooks/rto/useRTOManagement';
import { RTOAnalytics } from '@/src/components/seller/dashboard/RTOAnalytics';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Button } from '@/src/components/ui/core/Button';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { cn, formatDate, parsePaginationQuery, syncPaginationQuery } from '@/src/lib/utils';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { RTODetailsPanel } from '@/src/components/seller/rto/RTODetailsPanel';
import type { RTOEventDetail, RTOShipmentRef, RTOOrderRef, RTOWarehouseRef, RTOReturnStatus } from '@/src/types/api/rto.types';
import { RTO_REASON_LABELS } from '@/src/types/api/rto.types';
import { useUrlDateRange } from '@/src/hooks';
import { useSellerExport } from '@/src/core/api/hooks/seller/useSellerExports';

const STATUS_TABS = [
    { key: 'all', label: 'All Statuses' },
    { key: 'initiated', label: 'Initiated' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'delivered_to_warehouse', label: 'At Warehouse' },
    { key: 'qc_pending', label: 'QC Pending' },
    { key: 'qc_completed', label: 'QC Done' },
    { key: 'restocked', label: 'Restocked' },
    { key: 'disposed', label: 'Disposed' },
] as const;
const DEFAULT_LIMIT = 20;

export function RTOListPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    type RTOTabKey = (typeof STATUS_TABS)[number]['key'];
    const [statusFilter, setStatusFilter] = useState<RTOTabKey>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebouncedValue(searchTerm, 500);
    const [analyticsOpen, setAnalyticsOpen] = useState(false);
    const [selectedRTO, setSelectedRTO] = useState<RTOEventDetail | null>(null);
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const hasInitializedFilterReset = useRef(false);
    const exportSellerData = useSellerExport();

    // Pagination state
    const [page, setPage] = useState(1);
    const { limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const {
        range: dateRange,
        startDateIso: startDate,
        endDateIso: endDate,
        setRange,
    } = useUrlDateRange();

    // Hydrate/sync filters from URL
    useEffect(() => {
        const statusParam = searchParams.get('status');
        if (statusParam && STATUS_TABS.some((o) => o.key === statusParam)) {
            setStatusFilter(statusParam as RTOTabKey);
        } else {
            setStatusFilter('all');
        }

        const searchParam = searchParams.get('search') || '';
        setSearchTerm((current) => (current === searchParam ? current : searchParam));

        const { page: nextPage } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
        setPage((currentPage) => (currentPage === nextPage ? currentPage : nextPage));

        setIsUrlHydrated(true);
    }, [searchParams]);

    // Reset page when filters change (but not on first hydration pass)
    useEffect(() => {
        if (!isUrlHydrated) return;
        if (!hasInitializedFilterReset.current) {
            hasInitializedFilterReset.current = true;
            return;
        }
        setPage(1);
    }, [statusFilter, debouncedSearch, startDate, endDate, isUrlHydrated]);

    // Sync URL from local filters
    useEffect(() => {
        if (!isUrlHydrated) return;

        const params = new URLSearchParams(searchParams.toString());
        if (statusFilter !== 'all') {
            params.set('status', statusFilter);
        } else {
            params.delete('status');
        }

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

    const { data: listData, isLoading, refetch, error } = useRTOEvents({
        page,
        limit,
        sortBy: 'triggeredAt',
        sortOrder: 'desc',
        startDate,
        endDate,
        returnStatus: statusFilter === 'all' ? undefined : (statusFilter as RTOReturnStatus),
        search: debouncedSearch || undefined,
    });

    const { data: analyticsData } = useRTOAnalytics({
        startDate,
        endDate,
    });

    const summary = analyticsData?.summary;
    const stats = analyticsData?.stats;
    const pagination = listData?.pagination;
    const rtoData = listData?.rtoEvents || [];

    // Table Columns Definition
    const columns = [
        {
            header: 'RTO Details',
            accessorKey: 'rtoId',
            cell: (row: RTOEventDetail) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                        <RotateCcw className="w-5 h-5 text-[var(--error)]" />
                    </div>
                    <div>
                        <div className="font-bold text-[var(--text-primary)] text-sm font-mono">
                            #{row._id.slice(-8).toUpperCase()}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                            {formatDate(row.triggeredAt)}
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Shipment Info',
            accessorKey: 'shipment',
            cell: (row: RTOEventDetail) => {
                const shipment = row.shipment as RTOShipmentRef | undefined;
                const order = row.order as RTOOrderRef | undefined;
                const awb = shipment?.awb || shipment?.trackingNumber || 'N/A';
                const orderNum = order?.orderNumber || 'N/A';

                return (
                    <div>
                        <div className="font-medium text-[var(--text-primary)] text-sm">AWB: {awb}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">Order: {orderNum}</div>
                    </div>
                );
            }
        },
        {
            header: 'Reason',
            accessorKey: 'rtoReason',
            cell: (row: RTOEventDetail) => (
                <div className="max-w-[150px] truncate" title={RTO_REASON_LABELS[row.rtoReason] || row.rtoReason}>
                    {RTO_REASON_LABELS[row.rtoReason] || row.rtoReason}
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'returnStatus',
            cell: (row: RTOEventDetail) => (
                <StatusBadge domain="rto" status={row.returnStatus} size="sm" />
            )
        },
        {
            header: 'Warehouse',
            accessorKey: 'warehouse',
            cell: (row: RTOEventDetail) => {
                const warehouse = row.warehouse as RTOWarehouseRef | undefined;
                return (
                    <div className="max-w-[120px] truncate" title={warehouse?.name || 'N/A'}>
                        {warehouse?.name || '—'}
                    </div>
                );
            }
        },
        {
            header: 'Actions',
            accessorKey: 'actions',
            cell: (row: RTOEventDetail) => (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <ViewActionButton
                        onClick={() => setSelectedRTO(row)}
                    />
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            {/* RTO Details Sidebar */}
            <RTODetailsPanel
                rto={selectedRTO}
                onClose={() => setSelectedRTO(null)}
            />

            {/* --- HEADER --- */}
            <PageHeader
                title="RTO Management"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'RTO', active: true }
                ]}
                subtitle={
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--text-secondary)]">Manage Return to Origin cases and quality checks</span>
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <DateRangePicker value={dateRange} onRangeChange={setRange} />
                        <Button
                            onClick={() => refetch()}
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                        <Button
                            size="sm"
                            className="h-10 px-5 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-sm font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                            onClick={() => exportSellerData.mutate({
                                module: 'rto',
                                filters: {
                                    returnStatus: statusFilter === 'all' ? undefined : statusFilter,
                                    search: debouncedSearch || undefined,
                                    startDate: startDate || undefined,
                                    endDate: endDate || undefined,
                                },
                            })}
                        >
                            <FileOutput className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                }
            />

            {/* --- STATS GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Pending QC"
                    value={stats?.byStatus?.qc_pending ?? 0}
                    icon={ClipboardCheck}
                    iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                    description="Items awaiting quality check"
                    delay={0}
                />
                <StatsCard
                    title="In Transit"
                    value={stats?.byStatus?.in_transit ?? 0}
                    icon={Truck}
                    iconColor="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                    description="Returns on the way"
                    delay={1}
                />
                <StatsCard
                    title={summary?.periodLabel ?? 'Total RTO'}
                    value={summary?.totalRTO ?? 0}
                    icon={RotateCcw}
                    iconColor="text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400"
                    trend={{ value: 12, label: 'vs last period', positive: false }}
                    delay={2}
                />
                <StatsCard
                    title="Est. Loss"
                    value={`₹${(summary?.estimatedLoss ?? 0).toLocaleString('en-IN')}`}
                    icon={AlertTriangle}
                    iconColor="text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                    variant="critical"
                    description="Potential revenue loss"
                    delay={3}
                />
            </div>

            {/* --- TABLE SECTION --- */}
            <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <PillTabs
                        tabs={STATUS_TABS}
                        activeTab={statusFilter}
                        onTabChange={setStatusFilter}
                    />

                    {/* Search */}
                    <div className="flex items-center gap-3">
                        <SearchInput
                            placeholder="Search RTO cases..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                {error ? (
                    <EmptyState
                        icon={<AlertTriangle />}
                        title="Error Loading RTO Cases"
                        description={error.message || "Something went wrong while fetching data."}
                        action={{
                            label: "Try Again",
                            onClick: () => refetch()
                        }}
                    />
                ) : (
                    <DataTable
                        columns={columns}
                        data={rtoData}
                        isLoading={isLoading}
                        onRowClick={(row) => setSelectedRTO(row)}
                        pagination={{
                            currentPage: page,
                            totalPages: pagination?.pages || 1,
                            onPageChange: setPage,
                            totalItems: pagination?.total || 0,
                        }}
                    />
                )}
            </div>

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
                    <div className="mt-4 animate-in slide-in-from-top-4 fade-in duration-300">
                        <RTOAnalytics
                            onViewDetails={undefined}
                            startDate={startDate}
                            endDate={endDate}
                            periodLabel={summary?.periodLabel}
                            data={analyticsData}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
