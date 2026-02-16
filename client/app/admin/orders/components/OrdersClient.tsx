'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Package, Truck, CheckCircle, Clock,
    ArrowUpRight, RefreshCw, XCircle, Loader2, ArrowRight,
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { Select } from '@/src/components/ui/form/Select';
import { OrderTable } from './OrderTable';
import { useAdminOrders, useGetCourierRates, useAdminShipOrder, useAdminDeleteOrder, useOrderExport } from '@/src/core/api/hooks/admin';
import { useAdminWarehouses } from '@/src/core/api/hooks/logistics/useAdminWarehouses';
import { Order, OrderListParams, CourierRate } from '@/src/types/domain/order';
import { showSuccessToast, showErrorToast } from '@/src/lib/error';
import { formatCurrency, cn, parsePaginationQuery } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/core/Badge';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';
import { useUrlDateRange } from '@/src/hooks/analytics/useUrlDateRange';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';

const ORDER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'unshipped', label: 'To Ship' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'rto', label: 'RTO' },
    { key: 'cancelled', label: 'Cancelled' },
] as const;
type OrderTabKey = (typeof ORDER_TABS)[number]['key'];
const isOrderTabKey = (value: string): value is OrderTabKey => ORDER_TABS.some((tab) => tab.key === value);
const DEFAULT_LIMIT = 10;

export default function OrdersClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // -- State from URL & Local --
    const { page, limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const statusParam = searchParams.get('status') || 'all';
    const status: OrderTabKey = isOrderTabKey(statusParam) ? statusParam : 'all';
    const sort = searchParams.get('sort') || 'createdAt';
    const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';
    const search = searchParams.get('search') || '';
    const {
        range: dateRange,
        startDateIso,
        endDateIso,
        setRange,
    } = useUrlDateRange();

    const [searchInput, setSearchInput] = useState(search);
    const debouncedSearch = useDebouncedValue(searchInput, 300);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(searchParams.get('warehouse') || 'all');
    const [selectedSource, setSelectedSource] = useState<string>(searchParams.get('source') || 'all');

    // -- Hooks --
    const { data: warehousesData } = useAdminWarehouses({ limit: 100 });
    const warehouses = warehousesData?.warehouses ?? [];

    // Shipping Modal State
    const [isShipModalOpen, setIsShipModalOpen] = useState(false);
    const [selectedOrderForShip, setSelectedOrderForShip] = useState<Order | null>(null);
    const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
    const [courierRates, setCourierRates] = useState<CourierRate[]>([]);
    const [quoteExpiresAt, setQuoteExpiresAt] = useState<Date | null>(null);
    const [quoteTimeLeftSec, setQuoteTimeLeftSec] = useState<number>(0);
    const [selectedRateBreakdown, setSelectedRateBreakdown] = useState<CourierRate | null>(null);

    // Keep local controls in sync with URL (back/forward/share links)
    useEffect(() => {
        const nextSearch = searchParams.get('search') || '';
        setSearchInput((current) => (current === nextSearch ? current : nextSearch));

        const nextWarehouse = searchParams.get('warehouse') || 'all';
        setSelectedWarehouseId((current) => (current === nextWarehouse ? current : nextWarehouse));

        const nextSource = searchParams.get('source') || 'all';
        setSelectedSource((current) => (current === nextSource ? current : nextSource));
    }, [searchParams]);

    // -- Update URL Helper --
    const updateUrl = (updates: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        // Preserve other existing params if not overwritten
        searchParams.forEach((value, key) => {
            if (!(key in updates)) {
                params.set(key, value);
            }
        });

        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        });
        router.push(`?${params.toString()}`, { scroll: false });
    };

    // -- Query Params --
    const queryParams: OrderListParams = useMemo(() => ({
        page,
        limit,
        status: status === 'all' ? undefined : status,
        sortBy: sort,
        sortOrder: order,
        search: debouncedSearch || undefined,
        warehouse: selectedWarehouseId !== 'all' ? selectedWarehouseId : undefined,
        source: selectedSource !== 'all' ? selectedSource : undefined,
        startDate: startDateIso,
        endDate: endDateIso,
    }), [page, limit, status, sort, order, debouncedSearch, selectedWarehouseId, selectedSource, startDateIso, endDateIso]);

    // -- Fetch Data --
    const {
        data: ordersResponse,
        isLoading,
        isFetching,
        refetch
    } = useAdminOrders(queryParams);

    const getCourierRatesMutation = useGetCourierRates({ suppressDefaultErrorHandling: true });
    const shipOrderMutation = useAdminShipOrder();
    const deleteOrderMutation = useAdminDeleteOrder();
    const exportOrderMutation = useOrderExport();

    const orders = ordersResponse?.data || [];
    const pagination = ordersResponse?.pagination;
    const stats = ordersResponse?.stats || {};

    // Reset to page 1 when current page is out of range (e.g. after filters reduce total)
    useEffect(() => {
        const total = pagination?.total ?? 0;
        const pages = pagination?.pages ?? 1;
        if (total > 0 && page > pages && orders.length === 0) {
            updateUrl({ page: 1 });
        }
    }, [pagination?.total, pagination?.pages, page, orders.length]);

    // -- Event Handlers --
    // Sync search with URL
    useEffect(() => {
        if (debouncedSearch !== search) {
            updateUrl({ search: debouncedSearch, page: 1 });
        }
    }, [debouncedSearch]);

    const handleTabChange = (newStatus: OrderTabKey) => {
        updateUrl({ status: newStatus, page: 1 });
    };

    const handleSort = (key: string) => {
        const isSameKey = sort === key;
        const newOrder = isSameKey && order === 'desc' ? 'asc' : 'desc';
        updateUrl({ sort: key, order: newOrder });
    };

    const handlePageChange = (newPage: number) => {
        updateUrl({ page: newPage });
    };

    const handleDateRangeChange = setRange;

    const handleRefresh = () => {
        refetch();
        showSuccessToast('Orders refreshed');
    };

    const fetchCourierRatesForOrder = useCallback(async (order: Order) => {
        const totalWeight = order.products.reduce((sum, product) => {
            const productWeight = product.weight || 0;
            return sum + (productWeight * product.quantity);
        }, 0);

        const orderWarehouseId = typeof order.warehouseId === 'object'
            ? (order.warehouseId?._id || order.warehouseId?.id)
            : order.warehouseId;
        const warehouse = warehouses.find((w: any) => w._id === orderWarehouseId || w.id === orderWarehouseId);
        const fromPincode = warehouse?.address?.postalCode || order.customerInfo.address.postalCode;

        const orderCompanyId = typeof order.companyId === 'object'
            ? (order.companyId as { _id?: string })?._id
            : order.companyId;
        if (!orderCompanyId) {
            showErrorToast('Order has no company context. Cannot fetch rates.');
            return;
        }

        const result = await getCourierRatesMutation.mutateAsync({
            fromPincode,
            toPincode: order.customerInfo.address.postalCode,
            weight: totalWeight > 0 ? totalWeight : 0.5,
            paymentMode: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
            orderValue: Number(order.totals?.total || 0),
            length: 20,
            width: 15,
            height: 10,
            companyId: orderCompanyId,
        });

        const rates = result.data || [];
        const recommendation = rates.find((rate) => rate.isRecommended)?.optionId || rates[0]?.optionId || rates[0]?.courierId || null;
        const expiresAtRaw = rates[0]?.expiresAt;
        const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
        const nextTimeLeft = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : 0;

        setCourierRates(rates);
        setSelectedCourier(recommendation);
        setQuoteExpiresAt(expiresAt);
        setQuoteTimeLeftSec(nextTimeLeft);
    }, [getCourierRatesMutation, warehouses]);

    const handleShipNow = async (order: Order) => {
        setSelectedOrderForShip(order);
        setSelectedCourier(null);
        setCourierRates([]);
        setQuoteExpiresAt(null);
        setQuoteTimeLeftSec(0);
        setIsShipModalOpen(true);

        try {
            await fetchCourierRatesForOrder(order);
        } catch (error) {
            showErrorToast('Unable to fetch courier rates right now');
        }
    };

    const refreshQuotes = async () => {
        if (!selectedOrderForShip) return;
        try {
            await fetchCourierRatesForOrder(selectedOrderForShip);
            showSuccessToast('Quotes refreshed');
        } catch {
            // handled by mutation hook
        }
    };

    useEffect(() => {
        if (!isShipModalOpen || !quoteExpiresAt) {
            return;
        }

        const updateTimer = () => {
            const next = Math.max(0, Math.floor((quoteExpiresAt.getTime() - Date.now()) / 1000));
            setQuoteTimeLeftSec(next);
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [isShipModalOpen, quoteExpiresAt]);

    const handleCreateShipment = async () => {
        if (!selectedCourier || !selectedOrderForShip) {
            showErrorToast('Please select a courier');
            return;
        }

        if (quoteExpiresAt && quoteExpiresAt.getTime() <= Date.now()) {
            showErrorToast('Selected quote has expired. Refreshing rates...');
            await refreshQuotes();
            return;
        }

        try {
            const selectedRate = courierRates.find((rate) => (rate.optionId || rate.courierId) === selectedCourier);
            await shipOrderMutation.mutateAsync({
                orderId: selectedOrderForShip._id,
                courierId: selectedRate?.courierId || selectedCourier,
                serviceType: selectedRate?.serviceType || 'Surface',
                sessionId: selectedRate?.sessionId,
                optionId: selectedRate?.optionId,
            });

            showSuccessToast(`Shipment created for order ${selectedOrderForShip.orderNumber}`);

            setIsShipModalOpen(false);
            setSelectedOrderForShip(null);
            setSelectedCourier(null);
            setQuoteExpiresAt(null);
            setQuoteTimeLeftSec(0);
            refetch();
        } catch (error) {
            const apiError = error as { code?: string; message?: string };
            const expired = apiError?.code === 'BIZ_INVALID_STATE' || /expired/i.test(apiError?.message || '');
            if (expired) {
                showErrorToast('Quote session expired. Refreshing latest rates...');
                await refreshQuotes();
            }
        }
    };

    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const handleDeleteOrder = (orderId: string) => {
        setDeleteTarget(orderId);
    };

    const handleExport = () => {
        exportOrderMutation.mutate({
            dataType: 'orders',
            filters: {
                search: debouncedSearch || undefined,
                status: status === 'all' ? undefined : [status],
                warehouse: selectedWarehouseId !== 'all' ? selectedWarehouseId : undefined,
                startDate: startDateIso,
                endDate: endDateIso,
            }
        });
    };

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[var(--bg-secondary)] min-h-screen">
            <PageHeader
                title="Order Management"
                breadcrumbs={[
                    { label: 'Admin', href: '/admin' },
                    { label: 'Orders', active: true },
                ]}
                description="Monitor, fulfil and track orders across all your sellers in real-time."
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
                            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={exportOrderMutation.isPending}>
                            {exportOrderMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                            {exportOrderMutation.isPending ? 'Exporting...' : 'Export'}
                        </Button>
                    </div>
                }
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Orders"
                    value={stats['all'] || pagination?.total || 0}
                    icon={Package}
                    variant="default"
                    trend={{ value: 12, label: 'vs last week', positive: true }}
                    delay={0}
                />
                <StatsCard
                    title="Orders to Ship"
                    value={(stats['pending'] || 0) + (stats['ready_to_ship'] || 0)}
                    icon={Clock}
                    variant="warning"
                    trend={{ value: 5, label: 'vs yesterday', positive: false }}
                    delay={1}
                />
                <StatsCard
                    title="RTO Rate"
                    value="2.4%"
                    icon={XCircle}
                    variant="critical"
                    description="Calculated from last 30 days"
                    delay={2}
                />
                <StatsCard
                    title="Delivered Today"
                    value={stats['delivered'] || 0}
                    icon={CheckCircle}
                    variant="success"
                    trend={{ value: 8, label: 'vs yesterday', positive: true }}
                    delay={3}
                />
            </div>

            {/* Controls & Filters - Consistent with seller Orders/Shipments */}
            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <PillTabs
                        tabs={ORDER_TABS}
                        activeTab={status}
                        onTabChange={(key) => handleTabChange(key)}
                        className="max-w-full lg:max-w-[500px] overflow-x-auto"
                    />

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <SearchInput
                            widthClass="w-full sm:w-72"
                            placeholder="Search by Order ID, Customer, Phone..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <div className="w-full sm:w-auto sm:min-w-[160px]">
                            <label htmlFor="admin-orders-source-filter" className="sr-only">
                                Order source filter
                            </label>
                            <Select
                                id="admin-orders-source-filter"
                                value={selectedSource}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSelectedSource(value);
                                    updateUrl({ source: value === 'all' ? null : value, page: 1 });
                                }}
                                options={[
                                    { value: 'all', label: 'All Sources' },
                                    { value: 'manual', label: 'Manual' },
                                    { value: 'bulk_import', label: 'Bulk Import' },
                                    { value: 'api', label: 'REST API' },
                                    { value: 'shopify', label: 'Shopify' },
                                    { value: 'woocommerce', label: 'WooCommerce' },
                                    { value: 'amazon', label: 'Amazon' },
                                    { value: 'flipkart', label: 'Flipkart' },
                                ]}
                                className="h-11 rounded-xl border-[var(--border-subtle)] text-[var(--text-secondary)]"
                            />
                        </div>
                        <div className="w-full sm:w-auto sm:min-w-[170px]">
                            <label htmlFor="admin-orders-warehouse-filter" className="sr-only">
                                Warehouse filter
                            </label>
                            <Select
                                id="admin-orders-warehouse-filter"
                                value={selectedWarehouseId}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSelectedWarehouseId(value);
                                    updateUrl({ warehouse: value === 'all' ? null : value, page: 1 });
                                }}
                                options={[
                                    { value: 'all', label: 'All Warehouses' },
                                    ...warehouses.map((w) => ({ value: w._id, label: w.name })),
                                ]}
                                className="h-11 rounded-xl border-[var(--border-subtle)] text-[var(--text-secondary)]"
                            />
                        </div>
                        <DateRangePicker
                            value={dateRange}
                            onRangeChange={handleDateRangeChange}
                            className="shrink-0"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content Table - Using New OrderTable */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <OrderTable
                    data={orders}
                    isLoading={isLoading}
                    onRefresh={refetch}
                    pagination={{
                        total: pagination?.total || 0,
                        page: page,
                        limit: limit,
                        totalPages: pagination?.pages || 1
                    }}
                    onPageChange={handlePageChange}
                    onSort={handleSort}
                    sortBy={sort}
                    sortOrder={order}
                    onShip={handleShipNow}
                    onDelete={handleDeleteOrder}
                />
            </motion.div>

            {/* Ship Modal with Premium Styling */}
            <Modal
                isOpen={isShipModalOpen}
                onClose={() => setIsShipModalOpen(false)}
                title="Create Shipment"
            >
                {selectedOrderForShip && (
                    <div className="space-y-6">
                        {/* Order Summary Card */}
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border-subtle)]">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-subtle)]">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-lg text-[var(--text-primary)]">{selectedOrderForShip.orderNumber}</p>
                                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-[var(--bg-primary)]">
                                            {selectedOrderForShip.paymentMethod}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] mt-0.5">{selectedOrderForShip.companyId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-xl text-[var(--text-primary)]">{formatCurrency(selectedOrderForShip.totals.total)}</p>
                                    <p className="text-xs text-[var(--text-muted)]">Total Value</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 text-sm">
                                <div>
                                    <p className="text-[var(--text-muted)] text-xs uppercase font-semibold tracking-wider mb-1">Customer</p>
                                    <p className="font-medium text-[var(--text-primary)]">{selectedOrderForShip.customerInfo.name}</p>
                                    <p className="text-[var(--text-muted)]">{selectedOrderForShip.customerInfo.address.city}</p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)] text-xs uppercase font-semibold tracking-wider mb-1">Shipping From</p>
                                    <p className="font-medium text-[var(--text-primary)]">
                                        {typeof selectedOrderForShip.warehouseId === 'object'
                                            ? (selectedOrderForShip.warehouseId?.name || selectedOrderForShip.warehouseId?._id || selectedOrderForShip.warehouseId?.id || 'Default')
                                            : (selectedOrderForShip.warehouseId || 'Default')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Courier Selection */}
                        <div>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-[var(--primary-blue)]" />
                                    Select Courier Partner
                                </p>
                                <div className="flex items-center gap-2">
                                    {quoteExpiresAt && (
                                        <Badge variant={quoteTimeLeftSec <= 60 ? 'warning' : 'outline'} className="text-[10px]">
                                            Quote expires in {Math.floor(quoteTimeLeftSec / 60)}:{String(quoteTimeLeftSec % 60).padStart(2, '0')}
                                        </Badge>
                                    )}
                                    <Button variant="outline" size="sm" onClick={refreshQuotes} disabled={getCourierRatesMutation.isPending}>
                                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', getCourierRatesMutation.isPending && 'animate-spin')} />
                                        Refresh
                                    </Button>
                                </div>
                            </div>
                            {getCourierRatesMutation.isPending ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-[var(--primary-blue)]" />
                                    <span className="ml-2 text-sm text-[var(--text-muted)]">Loading courier rates...</span>
                                </div>
                            ) : courierRates.length === 0 ? (
                                <div className="text-center py-8 text-sm text-[var(--text-muted)]">
                                    No courier rates available
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                                    {courierRates.map((courier) => (
                                        <div
                                            key={courier.optionId || courier.courierId}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setSelectedCourier(courier.optionId || courier.courierId)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSelectedCourier(courier.optionId || courier.courierId);
                                                }
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left relative overflow-hidden group cursor-pointer",
                                                selectedCourier === (courier.optionId || courier.courierId)
                                                    ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)] ring-1 ring-[var(--primary-blue)]"
                                                    : "border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]"
                                            )}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                                                    selectedCourier === (courier.optionId || courier.courierId) ? "bg-[var(--bg-primary)] text-[var(--primary-blue)]" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                                                )}>
                                                    <Truck className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[var(--text-primary)]">{courier.courierName}</p>
                                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                                        ETA: {courier.estimatedDeliveryDays} days
                                                        {courier.rating && <span className="text-[var(--warning)]"> • ★ {courier.rating.average}</span>}
                                                        {courier.confidence && <span> • {courier.confidence.toUpperCase()} confidence</span>}
                                                    </p>
                                                    {courier.isRecommended && (
                                                        <Badge variant="info" className="text-[10px] mt-1">
                                                            Recommended
                                                        </Badge>
                                                    )}
                                                    {courier.tags && courier.tags.length > 0 && (
                                                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                                            {courier.tags.join(' • ')}
                                                        </p>
                                                    )}
                                                    {!!courier.sellBreakdown && (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setSelectedRateBreakdown(courier);
                                                            }}
                                                            className="mt-2 text-[11px] font-semibold text-[var(--primary-blue)] hover:underline"
                                                        >
                                                            View Breakdown
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right relative z-10">
                                                <p className="font-bold text-lg text-[var(--text-primary)]">{formatCurrency(courier.rate)}</p>
                                                {courier.rate === Math.min(...courierRates.map(c => c.rate)) && (
                                                    <Badge variant="success" className="text-[10px] ml-auto mt-1 flex w-fit">
                                                        Best Price
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                            <Button variant="ghost" onClick={() => setIsShipModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant={selectedCourier ? 'primary' : 'secondary'}
                                onClick={handleCreateShipment}
                                disabled={!selectedCourier || (quoteExpiresAt ? quoteExpiresAt.getTime() <= Date.now() : false)}
                            >
                                Create Shipment
                                <ArrowRight className="h-4 w-4 ml-1.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete order"
                description="Are you sure you want to delete this order? This action cannot be undone. Orders with active shipments must have the shipment cancelled first."
                confirmText="Delete"
                confirmVariant="danger"
                onCancel={() => setDeleteTarget(null)}
                onConfirm={async () => {
                    if (!deleteTarget) return;
                    try {
                        await deleteOrderMutation.mutateAsync(deleteTarget);
                        showSuccessToast('Order deleted successfully');
                        setDeleteTarget(null);
                    } catch {
                        // Error toast shown by handleApiError in useAdminDeleteOrder
                        // Keep dialog open so user can read error and retry after fixing (e.g. cancel shipment)
                    }
                }}
            />

            <Modal
                isOpen={!!selectedRateBreakdown}
                onClose={() => setSelectedRateBreakdown(null)}
                title="Quote Breakdown"
            >
                {selectedRateBreakdown && (
                    <div className="space-y-4 text-sm">
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                            <p className="font-semibold text-[var(--text-primary)]">{selectedRateBreakdown.courierName}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                Source: {(selectedRateBreakdown.pricingSource || 'table').toUpperCase()} • Confidence: {(selectedRateBreakdown.confidence || 'medium').toUpperCase()}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                                <p className="text-xs text-[var(--text-muted)]">Chargeable Weight</p>
                                <p className="font-semibold text-[var(--text-primary)]">{selectedRateBreakdown.chargeableWeight || 0} kg</p>
                            </div>
                            <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                                <p className="text-xs text-[var(--text-muted)]">Quoted Total</p>
                                <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(selectedRateBreakdown.quotedAmount || selectedRateBreakdown.rate)}</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-[var(--border-subtle)] p-4">
                            <p className="font-semibold text-[var(--text-primary)] mb-3">Sell Breakdown</p>
                            <div className="space-y-2 text-[var(--text-secondary)]">
                                <div className="flex items-center justify-between"><span>Base Charge</span><span>{formatCurrency(selectedRateBreakdown.sellBreakdown?.baseCharge || 0)}</span></div>
                                <div className="flex items-center justify-between"><span>Weight Charge</span><span>{formatCurrency(selectedRateBreakdown.sellBreakdown?.weightCharge || 0)}</span></div>
                                <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(selectedRateBreakdown.sellBreakdown?.subtotal || 0)}</span></div>
                                <div className="flex items-center justify-between"><span>COD</span><span>{formatCurrency(selectedRateBreakdown.sellBreakdown?.codCharge || 0)}</span></div>
                                <div className="flex items-center justify-between"><span>Fuel</span><span>{formatCurrency(selectedRateBreakdown.sellBreakdown?.fuelCharge || 0)}</span></div>
                                <div className="flex items-center justify-between"><span>RTO</span><span>{formatCurrency(selectedRateBreakdown.sellBreakdown?.rtoCharge || 0)}</span></div>
                                <div className="flex items-center justify-between"><span>GST</span><span>{formatCurrency(selectedRateBreakdown.sellBreakdown?.gst || 0)}</span></div>
                                <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 font-semibold text-[var(--text-primary)]">
                                    <span>Total</span>
                                    <span>{formatCurrency(selectedRateBreakdown.sellBreakdown?.total || selectedRateBreakdown.quotedAmount || selectedRateBreakdown.rate)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
