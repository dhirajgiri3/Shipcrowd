'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RotateCcw, TrendingUp, Search, RefreshCw, Filter, Download, Package, AlertTriangle, CheckCircle2, Truck, ClipboardCheck } from 'lucide-react';
import { useRTOAnalytics } from '@/src/core/api/hooks/rto/useRTOAnalytics';
import { useRTOEvents, type RTOFilters } from '@/src/core/api/hooks/rto/useRTOManagement';
import { RTOAnalytics } from '@/src/components/seller/dashboard/RTOAnalytics';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Button } from '@/src/components/ui/core/Button';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { cn, formatDate } from '@/src/lib/utils';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { RTODetailsPanel } from '@/src/components/seller/rto/RTODetailsPanel';
import type { RTOEventDetail, RTOShipmentRef, RTOOrderRef, RTOWarehouseRef, RTOReturnStatus } from '@/src/types/api/rto.types';
import { RTO_REASON_LABELS } from '@/src/types/api/rto.types';

const STATUS_TABS: { id: string; label: string }[] = [
    { id: 'all', label: 'All Statuses' },
    { id: 'initiated', label: 'Initiated' },
    { id: 'in_transit', label: 'In Transit' },
    { id: 'delivered_to_warehouse', label: 'At Warehouse' },
    { id: 'qc_pending', label: 'QC Pending' },
    { id: 'qc_completed', label: 'QC Done' },
    { id: 'restocked', label: 'Restocked' },
    { id: 'disposed', label: 'Disposed' },
];

export function RTOListPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebouncedValue(searchTerm, 500);
    const [analyticsOpen, setAnalyticsOpen] = useState(false);
    const [selectedRTO, setSelectedRTO] = useState<RTOEventDetail | null>(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const limit = 20;

    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Deep link from dashboard: /seller/rto?returnStatus=qc_pending
    useEffect(() => {
        const status = searchParams.get('returnStatus');
        if (status && STATUS_TABS.some((o) => o.id === status)) {
            setStatusFilter(status);
        }
    }, [searchParams]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [statusFilter, debouncedSearch]);

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
                        <DateRangePicker />
                        <Button
                            onClick={() => refetch()}
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                        <Button size="sm" className="h-10 px-5 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-sm font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                            <Download className="w-4 h-4 mr-2" />
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
                    {/* Status Tabs - Standard Pill Container */}
                    <div className="flex p-1.5 rounded-xl bg-[var(--bg-secondary)] w-fit border border-[var(--border-subtle)] overflow-x-auto">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setStatusFilter(tab.id)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap",
                                    statusFilter === tab.id
                                        ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search RTO cases..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2.5 h-11 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)] text-sm w-72 transition-all placeholder:text-[var(--text-muted)] shadow-sm"
                            />
                        </div>
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
