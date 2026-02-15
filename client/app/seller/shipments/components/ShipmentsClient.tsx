"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { Button } from '@/src/components/ui/core/Button';
import {
    FileOutput,
    Truck,
    Package,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    ClipboardList,
} from 'lucide-react';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { Shipment, useShipments, useShipmentStats } from '@/src/core/api/hooks/orders/useShipments';
import { ShipmentDetailsPanel } from '@/src/components/seller/shipments/ShipmentDetailsPanel';
import { format } from 'date-fns';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { SourceBadge } from '@/src/components/ui/data/SourceBadge';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { cn, downloadCsv, parsePaginationQuery, syncPaginationQuery } from '@/src/lib/utils';
import { useUrlDateRange } from '@/src/hooks';

const SHIPMENT_TABS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending Pickup' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'rto', label: 'RTO' },
    { key: 'ndr', label: 'NDR' },
] as const;
const DEFAULT_LIMIT = 20;

type ShipmentStatusFilter = (typeof SHIPMENT_TABS)[number]['key'];
const VALID_SHIPMENT_FILTERS: ShipmentStatusFilter[] = ['all', 'pending', 'in_transit', 'delivered', 'rto', 'ndr'];

export function ShipmentsClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [page, setPage] = useState(1);
    const { limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 500);
    const [statusFilter, setStatusFilter] = useState<ShipmentStatusFilter>('all');
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const hasInitializedFilterReset = useRef(false);
    const { addToast } = useToast();
    const { range: dateRange, startDateIso, endDateIso, setRange } = useUrlDateRange();

    const {
        data: shipmentsResponse,
        isLoading,
        error,
        refetch: refetchShipments,
    } = useShipments({
        page,
        limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedSearch || undefined,
        startDate: startDateIso,
        endDate: endDateIso,
    });

    const { data: stats } = useShipmentStats({ startDate: startDateIso, endDate: endDateIso });

    useEffect(() => {
        const statusParam = searchParams.get('status') as ShipmentStatusFilter | null;
        const nextStatus = statusParam && VALID_SHIPMENT_FILTERS.includes(statusParam) ? statusParam : 'all';
        setStatusFilter((currentStatus) => (currentStatus === nextStatus ? currentStatus : nextStatus));

        const searchParam = searchParams.get('search') || '';
        setSearch((currentSearch) => (currentSearch === searchParam ? currentSearch : searchParam));

        const { page: nextPage } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
        setPage((currentPage) => (currentPage === nextPage ? currentPage : nextPage));

        setIsUrlHydrated(true);
    }, [searchParams]);

    useEffect(() => {
        if (!isUrlHydrated) return;
        if (!hasInitializedFilterReset.current) {
            hasInitializedFilterReset.current = true;
            return;
        }
        setPage(1);
    }, [debouncedSearch, statusFilter, startDateIso, endDateIso, isUrlHydrated]);

    useEffect(() => {
        if (!isUrlHydrated) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set('status', statusFilter);

        if (debouncedSearch) {
            params.set('search', debouncedSearch);
        } else {
            params.delete('search');
        }

        syncPaginationQuery(params, { page, limit }, { defaultLimit: DEFAULT_LIMIT });

        const currentQuery = searchParams.toString();
        const nextQuery = params.toString();
        if (nextQuery !== currentQuery) {
            router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
        }
    }, [statusFilter, debouncedSearch, page, limit, isUrlHydrated, searchParams, pathname, router]);

    const shipmentsData = shipmentsResponse?.shipments || [];
    const paginationMeta = shipmentsResponse?.pagination || { total: 0, pages: 1 };

    useEffect(() => {
        const total = paginationMeta.total;
        const pages = paginationMeta.pages;
        if (total > 0 && page > pages && shipmentsData.length === 0) {
            setPage(1);
        }
    }, [paginationMeta.total, paginationMeta.pages, page, shipmentsData.length]);

    const pagination = paginationMeta;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetchShipments();
        setIsRefreshing(false);
    };

    const applyStatusFilter = (status: ShipmentStatusFilter) => {
        setStatusFilter(status);
        setPage(1);
    };

    const handleExportCsv = () => {
        if (shipmentsData.length === 0) {
            addToast('No shipments available to export for current filters', 'info');
            return;
        }

        downloadCsv({
            filename: `shipments-${new Date().toISOString().slice(0, 10)}.csv`,
            header: ['AWB', 'Order Number', 'Carrier', 'Service Type', 'Status', 'Created At'],
            rows: shipmentsData.map((shipment) => [
                shipment.trackingNumber || '',
                typeof shipment.orderId === 'object' ? shipment.orderId?.orderNumber || '' : '',
                shipment.carrier || '',
                shipment.serviceType || '',
                shipment.currentStatus || '',
                shipment.createdAt || '',
            ]),
        });

        addToast('Shipments exported as CSV', 'success');
    };

    const columns = [
        {
            header: 'Shipment Details',
            accessorKey: 'trackingNumber',
            cell: (row: Shipment) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                        <Truck className="w-5 h-5 text-[var(--primary-blue)]" />
                    </div>
                    <div>
                        <div className="font-bold text-[var(--text-primary)] text-sm font-mono">
                            AWB: {row.trackingNumber || 'N/A'}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                            {row.carrier?.toUpperCase() || 'N/A'}
                            {row.serviceType && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-50" />
                                    {row.serviceType}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            header: 'Order Info',
            accessorKey: 'orderId',
            cell: (row: Shipment) => {
                const orderNumber = typeof row.orderId === 'object' ? row.orderId?.orderNumber : 'N/A';
                const customerName = typeof row.orderId === 'object' && row.orderId?.customerInfo?.name
                    ? row.orderId.customerInfo.name
                    : 'Unknown';

                return (
                    <div>
                        <div className="font-medium text-[var(--text-primary)] text-sm">{orderNumber}</div>
                        <div className="text-xs text-[var(--text-muted)]">{customerName}</div>
                    </div>
                );
            },
        },
        {
            header: 'Source',
            accessorKey: 'orderId.source',
            cell: (row: Shipment) => {
                const source = typeof row.orderId === 'object' ? (row.orderId as { source?: string })?.source : undefined;
                return <SourceBadge source={source} size="sm" />;
            },
        },
        {
            header: 'Date',
            accessorKey: 'createdAt',
            cell: (row: Shipment) => (
                <div className="text-sm text-[var(--text-secondary)]">
                    {format(new Date(row.createdAt), 'MMM d, yyyy')}
                    <div className="text-xs text-[var(--text-muted)]">
                        {format(new Date(row.createdAt), 'h:mm a')}
                    </div>
                </div>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'currentStatus',
            cell: (row: Shipment) => <StatusBadge domain="shipment" status={row.currentStatus} size="sm" />,
        },
        {
            header: 'Actions',
            accessorKey: 'actions',
            width: 'min-w-[100px]',
            stickyRight: true,
            cell: (row: Shipment) => (
                <div className="flex items-center gap-2">
                    <ViewActionButton
                        label="View"
                        onClick={(event) => {
                            event.stopPropagation();
                            setSelectedShipment(row);
                        }}
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
            <ShipmentDetailsPanel shipment={selectedShipment} onClose={() => setSelectedShipment(null)} />

            <PageHeader
                title="Shipments"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Shipments', active: true },
                ]}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <DateRangePicker value={dateRange} onRangeChange={setRange} />
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                            onClick={() => router.push('/seller/manifests/create')}
                            aria-label="Create shipment manifest"
                        >
                            <ClipboardList className="w-4 h-4 mr-2" />
                            Create Manifest
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                            onClick={handleExportCsv}
                        >
                            <FileOutput className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                        <Button
                            size="sm"
                            className="h-10 px-4 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-sm font-medium shadow-md shadow-blue-500/20 transition-all"
                            onClick={() => router.push('/seller/ship-now')}
                            aria-label="Go to orders page to ship more orders"
                        >
                            <Truck className="w-4 h-4 mr-2" />
                            Open Ship Queue
                        </Button>
                        <Button
                            onClick={handleRefresh}
                            variant="ghost"
                            size="sm"
                            className={cn('h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm', isRefreshing && 'animate-spin')}
                            aria-label="Refresh shipments"
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Shipments"
                    value={stats?.total || 0}
                    icon={Package}
                    iconColor="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                    trend={{ value: 5, label: 'vs last week', positive: true }}
                    delay={0}
                    onClick={() => applyStatusFilter('all')}
                />
                <StatsCard
                    title="In Transit"
                    value={stats?.in_transit || 0}
                    icon={Truck}
                    iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                    description="Active shipments on the way"
                    delay={1}
                    onClick={() => applyStatusFilter('in_transit')}
                />
                <StatsCard
                    title="Delivered"
                    value={stats?.delivered || 0}
                    icon={CheckCircle2}
                    iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                    trend={{ value: 12, label: 'vs last week', positive: true }}
                    delay={2}
                    onClick={() => applyStatusFilter('delivered')}
                />
                <StatsCard
                    title="Exceptions (RTO/NDR)"
                    value={(stats?.rto || 0) + (stats?.ndr || 0)}
                    icon={AlertCircle}
                    iconColor="text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                    variant="critical"
                    description="Requires attention"
                    delay={3}
                    onClick={() => applyStatusFilter('rto')}
                />
            </div>

            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <PillTabs
                        tabs={SHIPMENT_TABS}
                        activeTab={statusFilter}
                        onTabChange={(key) => applyStatusFilter(key as ShipmentStatusFilter)}
                    />

                    <div className="flex items-center gap-3">
                        <SearchInput
                            widthClass="w-full sm:w-72"
                            placeholder="Search by AWB or Order ID..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                </div>

                {error ? (
                    <div className="bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-sm py-20 text-center">
                        <div className="w-20 h-20 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-[var(--error)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Failed to load shipments</h3>
                        <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">{error.message || 'An unexpected error occurred. Please try again.'}</p>
                        <Button variant="primary" onClick={() => refetchShipments()} className="mx-auto">
                            <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
                        </Button>
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={shipmentsData}
                        isLoading={isLoading}
                        onRowClick={(row) => setSelectedShipment(row as Shipment)}
                        pagination={{
                            currentPage: page,
                            totalPages: pagination.pages,
                            onPageChange: setPage,
                            totalItems: pagination.total,
                        }}
                    />
                )}
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-primary)]/90 p-3 md:hidden">
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        size="md"
                        className="h-11 rounded-xl"
                        onClick={() => router.push('/seller/ship-now')}
                    >
                        <Truck className="w-4 h-4 mr-2" />
                        Ship Queue
                    </Button>
                    <Button
                        size="md"
                        variant="outline"
                        className="h-11 rounded-xl"
                        onClick={handleExportCsv}
                    >
                        <FileOutput className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>
        </div>
    );
}
