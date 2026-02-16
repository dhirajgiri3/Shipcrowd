'use client';
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/src/components/ui/core/Button';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { cn, parsePaginationQuery, syncPaginationQuery } from '@/src/lib/utils';
import { ShipmentDetailModal } from '@/src/components/admin/ShipmentDetailModal';
import { ShipmentTable } from './ShipmentTable';
import {
    Package,
    Truck,
    CheckCircle,
    Clock,
    AlertTriangle,
    RotateCcw,
    FileOutput,
    RefreshCw,
} from 'lucide-react';
import { showSuccessToast } from '@/src/lib/error';
import { useShipments, useShipmentStats, Shipment as ApiShipment } from '@/src/core/api/hooks/orders/useShipments';
import { useAdminWarehouses } from '@/src/core/api/hooks/logistics/useAdminWarehouses';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Select } from '@/src/components/ui/form/Select';
import { useUrlDateRange } from '@/src/hooks/analytics/useUrlDateRange';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { CARRIER_LIST } from '@/src/constants/carriers';

const DEFAULT_LIMIT = 20;

const SHIPMENT_TABS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending Pickup' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'ndr', label: 'NDR' },
    { key: 'rto', label: 'RTO' },
] as const;
type ShipmentTabKey = (typeof SHIPMENT_TABS)[number]['key'];
const isShipmentTabKey = (value: string): value is ShipmentTabKey => SHIPMENT_TABS.some((tab) => tab.key === value);

export function ShipmentsClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const { page: urlPage, limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const [page, setPage] = useState(urlPage);
    const statusParam = searchParams.get('status') || 'all';
    const status: ShipmentTabKey = isShipmentTabKey(statusParam) ? statusParam : 'all';
    const search = searchParams.get('search') || '';
    const [searchInput, setSearchInput] = useState(search);
    const debouncedSearch = useDebouncedValue(searchInput, 300);
    const [selectedCarrier, setSelectedCarrier] = useState<string>(searchParams.get('carrier') || 'all');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(searchParams.get('warehouse') || 'all');
    const [selectedShipment, setSelectedShipment] = useState<any | null>(null);

    const { data: warehousesData } = useAdminWarehouses({ limit: 100 });
    const warehouses = warehousesData?.warehouses ?? [];
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const hasInitializedFilterReset = useRef(false);

    const {
        range: dateRange,
        startDateIso,
        endDateIso,
        setRange,
    } = useUrlDateRange();

    useEffect(() => {
        setSearchInput((current) => (current === search ? current : search));
        const { page: nextPage } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
        setPage((current) => (current === nextPage ? current : nextPage));
        setSelectedCarrier((current) => (current === (searchParams.get('carrier') || 'all') ? current : (searchParams.get('carrier') || 'all')));
        setSelectedWarehouseId((current) => (current === (searchParams.get('warehouse') || 'all') ? current : (searchParams.get('warehouse') || 'all')));
        setIsUrlHydrated(true);
    }, [searchParams, search]);

    useEffect(() => {
        if (!isUrlHydrated) return;
        if (!hasInitializedFilterReset.current) {
            hasInitializedFilterReset.current = true;
            return;
        }
        setPage(1);
    }, [debouncedSearch, status, startDateIso, endDateIso, selectedCarrier, selectedWarehouseId, isUrlHydrated]);

    useEffect(() => {
        if (!isUrlHydrated) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set('status', status);
        if (debouncedSearch) params.set('search', debouncedSearch);
        else params.delete('search');
        if (selectedCarrier !== 'all') params.set('carrier', selectedCarrier);
        else params.delete('carrier');
        if (selectedWarehouseId !== 'all') params.set('warehouse', selectedWarehouseId);
        else params.delete('warehouse');
        syncPaginationQuery(params, { page, limit }, { defaultLimit: DEFAULT_LIMIT });

        const nextQuery = params.toString();
        const currentQuery = searchParams.toString();
        if (nextQuery !== currentQuery) {
            router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
        }
    }, [status, debouncedSearch, page, limit, selectedCarrier, selectedWarehouseId, isUrlHydrated, searchParams, pathname, router]);

    const handleTabChange = (key: ShipmentTabKey) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('status', key);
        params.set('page', '1');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', String(newPage));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleRefresh = () => {
        refetch();
        showSuccessToast('Shipments refreshed');
    };

    // Fetch shipments
    const { data: shipmentsResponse, isLoading, refetch, isFetching } = useShipments({
        status: status !== 'all' ? status : undefined,
        search: debouncedSearch || undefined,
        carrier: selectedCarrier !== 'all' ? selectedCarrier : undefined,
        warehouse: selectedWarehouseId !== 'all' ? selectedWarehouseId : undefined,
        startDate: startDateIso,
        endDate: endDateIso,
        page,
        limit
    });

    // Fetch stats
    const { data: stats } = useShipmentStats({ startDate: startDateIso, endDate: endDateIso });

    const shipmentsData = shipmentsResponse?.shipments || [];
    const pagination = shipmentsResponse?.pagination;

    // Reset to page 1 when current page is out of range (e.g. after filters reduce total)
    useEffect(() => {
        const total = pagination?.total ?? 0;
        const pages = pagination?.pages ?? 1;
        if (total > 0 && page > pages && shipmentsData.length === 0) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', '1');
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
    }, [pagination?.total, pagination?.pages, page, shipmentsData.length, searchParams, pathname, router]);

    // Helper to extract order number
    const getOrderNumber = (orderId: any) => {
        if (typeof orderId === 'object' && orderId?.orderNumber) {
            return orderId.orderNumber;
        }
        return 'N/A';
    };

    const handleShipmentClick = (row: ApiShipment) => {
        const domainShipment = {
            id: row._id,
            awb: row.trackingNumber,
            orderNumber: getOrderNumber(row.orderId),
            status: row.currentStatus,
            customer: {
                name: (row as any).deliveryDetails?.recipientName || 'Unknown',
                phone: (row as any).deliveryDetails?.recipientPhone || 'N/A',
                email: (row as any).deliveryDetails?.recipientEmail || ''
            },
            origin: {
                city: 'Warehouse',
                state: '',
                pincode: ''
            },
            destination: {
                city: (row as any).deliveryDetails?.address?.city || '',
                state: (row as any).deliveryDetails?.address?.state || '',
                pincode: (row as any).deliveryDetails?.address?.postalCode || ''
            },
            courier: row.carrier,
            paymentMode: (row as any).paymentDetails?.type || 'prepaid',
            codAmount: (row as any).paymentDetails?.codAmount || 0,
            weight: (row as any).packageDetails?.weight || 0,
            createdAt: row.createdAt,
            quoteSnapshot: {
                provider: (row as any)?.pricingDetails?.selectedQuote?.provider,
                serviceName: (row as any)?.pricingDetails?.selectedQuote?.serviceName,
                quotedSellAmount: (row as any)?.pricingDetails?.selectedQuote?.quotedSellAmount,
                expectedCostAmount: (row as any)?.pricingDetails?.selectedQuote?.expectedCostAmount,
                expectedMarginAmount: (row as any)?.pricingDetails?.selectedQuote?.expectedMarginAmount,
                confidence: (row as any)?.pricingDetails?.selectedQuote?.confidence,
            },
        };
        setSelectedShipment(domainShipment);
    };

    const handleExport = () => {
        showSuccessToast('Export started. You will receive an email shortly.');
    };

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[var(--bg-secondary)] min-h-screen">
            <PageHeader
                title="Shipments"
                breadcrumbs={[
                    { label: 'Admin', href: '/admin' },
                    { label: 'Shipments', active: true },
                ]}
                description="Track and manage all deliveries across the platform."
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <DateRangePicker value={dateRange} onRangeChange={setRange} />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isFetching}
                            className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                        >
                            <RefreshCw size={16} className={cn(isFetching && 'animate-spin')} />
                            Refresh
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                        >
                            <FileOutput size={16} className="mr-2" />
                            Export
                        </Button>
                    </div>
                }
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatsCard title="Total Shipments" value={stats?.total || 0} icon={Package} variant="default" />
                <StatsCard title="Pending Pickup" value={stats?.pending || 0} icon={Clock} variant="warning" />
                <StatsCard title="In Transit" value={stats?.in_transit || 0} icon={Truck} variant="info" />
                <StatsCard title="Delivered" value={stats?.delivered || 0} icon={CheckCircle} variant="success" />
                <StatsCard title="NDR / Issues" value={stats?.ndr || 0} icon={AlertTriangle} variant="critical" />
                <StatsCard title="RTO / Returned" value={stats?.rto || 0} icon={RotateCcw} variant="critical" />
            </div>

            {/* Filters & Table - Consistent with admin Orders and seller Shipments */}
            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <PillTabs
                        tabs={SHIPMENT_TABS}
                        activeTab={status}
                        onTabChange={handleTabChange}
                        className="max-w-full lg:max-w-[500px] overflow-x-auto"
                    />

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
                        <SearchInput
                            widthClass="w-full sm:w-72"
                            placeholder="Search by AWB, Order ID, or Customer..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <div className="w-full sm:w-auto sm:min-w-[160px]">
                            <label htmlFor="admin-shipments-carrier-filter" className="sr-only">Carrier filter</label>
                            <Select
                                id="admin-shipments-carrier-filter"
                                value={selectedCarrier}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSelectedCarrier(value);
                                    const params = new URLSearchParams(searchParams.toString());
                                    if (value !== 'all') params.set('carrier', value);
                                    else params.delete('carrier');
                                    params.set('page', '1');
                                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                                }}
                                options={[
                                    { value: 'all', label: 'All Carriers' },
                                    ...CARRIER_LIST.map((c) => ({ value: c.name, label: c.name })),
                                ]}
                                className="h-11 rounded-xl border-[var(--border-subtle)] text-[var(--text-secondary)]"
                            />
                        </div>
                        <div className="w-full sm:w-auto sm:min-w-[170px]">
                            <label htmlFor="admin-shipments-warehouse-filter" className="sr-only">Warehouse filter</label>
                            <Select
                                id="admin-shipments-warehouse-filter"
                                value={selectedWarehouseId}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSelectedWarehouseId(value);
                                    const params = new URLSearchParams(searchParams.toString());
                                    if (value !== 'all') params.set('warehouse', value);
                                    else params.delete('warehouse');
                                    params.set('page', '1');
                                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                                }}
                                options={[
                                    { value: 'all', label: 'All Warehouses' },
                                    ...warehouses.map((w) => ({ value: w._id, label: w.name })),
                                ]}
                                className="h-11 rounded-xl border-[var(--border-subtle)] text-[var(--text-secondary)]"
                            />
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <ShipmentTable
                        data={shipmentsData}
                        isLoading={isLoading}
                        onRefresh={handleRefresh}
                        pagination={pagination ? {
                            total: pagination.total,
                            page: pagination.page,
                            limit: pagination.limit,
                            totalPages: pagination.pages
                        } : undefined}
                        onPageChange={handlePageChange}
                        onRowClick={handleShipmentClick}
                    />
                </motion.div>
            </div>

            {/* Detail Modal */}
            <ShipmentDetailModal
                isOpen={!!selectedShipment}
                onClose={() => setSelectedShipment(null)}
                shipment={selectedShipment}
            />
        </div>
    );
}
