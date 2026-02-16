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
import { useToast } from '@/src/components/ui/feedback/Toast';
import { parsePaginationQuery, syncPaginationQuery } from '@/src/lib/utils';
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

import { useShipments, useShipmentStats, Shipment as ApiShipment } from '@/src/core/api/hooks/orders/useShipments';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { useUrlDateRange } from '@/src/hooks/analytics/useUrlDateRange';
import { useDebouncedValue } from '@/src/hooks/data';

const DEFAULT_LIMIT = 20;

const SHIPMENT_TABS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending Pickup' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'ndr', label: 'NDR' },
    { key: 'rto', label: 'RTO' },
] as const;

export function ShipmentsClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { addToast } = useToast();

    const { page: urlPage, limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const [page, setPage] = useState(urlPage);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const [searchTerm, setSearchTerm] = useState(search);
    const debouncedSearch = useDebouncedValue(searchTerm, 500);
    const [selectedShipment, setSelectedShipment] = useState<any | null>(null);
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const hasInitializedFilterReset = useRef(false);

    const {
        range: dateRange,
        startDateIso,
        endDateIso,
        setRange,
    } = useUrlDateRange();

    useEffect(() => {
        setSearchTerm((current) => (current === search ? current : search));
        const { page: nextPage } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
        setPage((current) => (current === nextPage ? current : nextPage));
        setIsUrlHydrated(true);
    }, [searchParams]);

    useEffect(() => {
        if (!isUrlHydrated) return;
        if (!hasInitializedFilterReset.current) {
            hasInitializedFilterReset.current = true;
            return;
        }
        setPage(1);
    }, [debouncedSearch, status, startDateIso, endDateIso, isUrlHydrated]);

    useEffect(() => {
        if (!isUrlHydrated) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set('status', status);
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
    }, [status, debouncedSearch, page, limit, isUrlHydrated, searchParams, pathname, router]);

    const handleTabChange = (key: string) => {
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
        addToast('Shipments refreshed', 'success');
    };

    // Fetch shipments
    const { data: shipmentsResponse, isLoading, refetch, isFetching } = useShipments({
        status: status !== 'all' ? status : undefined,
        search: debouncedSearch || undefined,
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
        addToast('Export started. You will receive an email shortly.', 'success');
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
                    <div className="flex items-center gap-3">
                        <DateRangePicker value={dateRange} onRangeChange={setRange} />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isFetching}
                        >
                            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <FileOutput size={16} />
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

            {/* Filters & Table */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--bg-primary)] p-2 rounded-xl border border-[var(--border-default)]">
                    <SearchInput
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by AWB, Order ID, or Customer..."
                        widthClass="w-full md:w-96"
                    />
                    <PillTabs
                        tabs={SHIPMENT_TABS}
                        activeTab={status}
                        onTabChange={handleTabChange}
                    />
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
