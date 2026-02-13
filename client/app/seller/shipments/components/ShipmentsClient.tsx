"use client";

import { useState, useEffect } from 'react';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { Button } from '@/src/components/ui/core/Button';
import {
    Search,
    Download,
    Truck,
    Package,
    AlertCircle,
    CheckCircle2,
    Printer,
    RefreshCw,
} from 'lucide-react';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { useShipments, useShipmentStats } from '@/src/core/api/hooks/orders/useShipments';
import { ShipmentDetailsPanel } from '@/src/components/seller/shipments/ShipmentDetailsPanel';
import { format } from 'date-fns';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { cn } from '@/src/lib/utils';

export function ShipmentsClient() {
    const [page, setPage] = useState(1);
    const limit = 20;
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 500);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedShipment, setSelectedShipment] = useState<any | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { addToast } = useToast();

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
    });

    const { data: stats } = useShipmentStats();

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter]);

    const shipmentsData = shipmentsResponse?.shipments || [];
    const pagination = shipmentsResponse?.pagination || { total: 0, pages: 1 };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetchShipments();
        setIsRefreshing(false);
    };

    const columns = [
        {
            header: 'Shipment Details',
            accessorKey: 'trackingNumber',
            cell: (row: any) => (
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
            cell: (row: any) => {
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
            header: 'Date',
            accessorKey: 'createdAt',
            cell: (row: any) => (
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
            cell: (row: any) => <StatusBadge domain="shipment" status={row.currentStatus} />,
        },
        {
            header: 'Actions',
            accessorKey: 'actions',
            cell: (row: any) => (
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
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <ShipmentDetailsPanel shipment={selectedShipment} onClose={() => setSelectedShipment(null)} />

            <PageHeader
                title="Shipments"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Shipments', active: true },
                ]}
                actions={
                    <div className="flex items-center gap-3">
                        <DateRangePicker />
                        <Button
                            onClick={handleRefresh}
                            variant="ghost"
                            size="sm"
                            className={cn('h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm', isRefreshing && 'animate-spin')}
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                            onClick={() => addToast('Feature coming soon', 'info')}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print Manifest
                        </Button>
                        <Button
                            size="sm"
                            className="h-10 px-5 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-sm font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
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
                />
                <StatsCard
                    title="In Transit"
                    value={stats?.in_transit || 0}
                    icon={Truck}
                    iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                    description="Active shipments on the way"
                    delay={1}
                />
                <StatsCard
                    title="Delivered"
                    value={stats?.delivered || 0}
                    icon={CheckCircle2}
                    iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                    trend={{ value: 12, label: 'vs last week', positive: true }}
                    delay={2}
                />
                <StatsCard
                    title="Exceptions (RTO/NDR)"
                    value={(stats?.rto || 0) + (stats?.ndr || 0)}
                    icon={AlertCircle}
                    iconColor="text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                    variant="critical"
                    description="Requires attention"
                    delay={3}
                />
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex p-1.5 rounded-xl bg-[var(--bg-secondary)] w-fit border border-[var(--border-subtle)] overflow-x-auto">
                        {['all', 'in_transit', 'delivered', 'rto', 'ndr'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap',
                                    statusFilter === tab
                                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                )}
                            >
                                {tab.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search by AWB or Order ID..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="pl-10 pr-4 py-2.5 h-11 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)] text-sm w-72 transition-all placeholder:text-[var(--text-muted)] shadow-sm"
                            />
                        </div>
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
                        onRowClick={(row) => setSelectedShipment(row)}
                        pagination={{
                            currentPage: page,
                            totalPages: pagination.pages,
                            onPageChange: setPage,
                            totalItems: pagination.total,
                        }}
                    />
                )}
            </div>
        </div>
    );
}
