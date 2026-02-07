'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Truck, CheckCircle, AlertCircle, Clock,
    Search, Filter, MoreVertical, FileText, ArrowUpRight,
    RefreshCw, Calendar as CalendarIcon, XCircle,
    LayoutDashboard, RefreshCcw, Box, Loader2, ArrowRight,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { OrderTable } from './OrderTable'; // New component
import { useAdminOrders, useGetCourierRates, useShipOrder, useDeleteOrder, useOrderExport } from '@/src/core/api/hooks/admin';
import { useWarehouses } from '@/src/core/api/hooks/logistics';
import { Order, OrderListParams, CourierRate } from '@/src/types/domain/order';
import { showSuccessToast, showErrorToast } from '@/src/lib/error';
import { formatCurrency, cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/core/Badge';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { DateRange } from '@/src/lib/data';

// Tabs configuration
const ORDER_TABS = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New' },
    { id: 'ready', label: 'Ready' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'rto', label: 'RTO' },
    { id: 'cancelled', label: 'Cancelled' },
];

export default function OrdersClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // -- State from URL & Local --
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 10;
    const status = searchParams.get('status') || 'all';
    const sort = searchParams.get('sort') || 'createdAt';
    const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';


    const [searchTerm, setSearchTerm] = useState(search);
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');

    // -- Hooks --
    const { data: warehouses = [] } = useWarehouses();

    // Shipping Modal State
    const [isShipModalOpen, setIsShipModalOpen] = useState(false);
    const [selectedOrderForShip, setSelectedOrderForShip] = useState<Order | null>(null);
    const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
    const [courierRates, setCourierRates] = useState<CourierRate[]>([]);

    // -- Debounce Search --
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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
        startDate: startDate || undefined,
        endDate: endDate || undefined,
    }), [page, limit, status, sort, order, debouncedSearch, selectedWarehouseId, startDate, endDate]);

    // -- Fetch Data --
    const {
        data: ordersResponse,
        isLoading,
        isFetching,
        refetch
    } = useAdminOrders(queryParams);

    const getCourierRatesMutation = useGetCourierRates();
    const shipOrderMutation = useShipOrder();
    const deleteOrderMutation = useDeleteOrder();
    const exportOrderMutation = useOrderExport();

    const orders = ordersResponse?.data || [];
    const pagination = ordersResponse?.pagination;
    const stats = ordersResponse?.stats || {};

    // -- Event Handlers --
    // Sync search with URL
    useEffect(() => {
        if (debouncedSearch !== search) {
            updateUrl({ search: debouncedSearch, page: 1 });
        }
    }, [debouncedSearch]);

    const handleTabChange = (newStatus: string) => {
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

    const handleDateRangeChange = (range: DateRange) => {
        updateUrl({
            startDate: range.from.toISOString(),
            endDate: range.to.toISOString(),
            page: 1
        });
    };

    const handleRefresh = () => {
        refetch();
        showSuccessToast('Orders refreshed');
    };

    const handleShipNow = async (order: Order) => {
        setSelectedOrderForShip(order);
        setSelectedCourier(null);
        setCourierRates([]);
        setIsShipModalOpen(true);

        const totalWeight = order.products.reduce((sum, product) => {
            const productWeight = product.weight || 0;
            return sum + (productWeight * product.quantity);
        }, 0);

        try {
            const result = await getCourierRatesMutation.mutateAsync({
                fromPincode: order.customerInfo.address.postalCode,
                toPincode: order.customerInfo.address.postalCode,
                weight: totalWeight || 500,
                paymentMode: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid'
            });
            setCourierRates(result.data);
        } catch (error) {
            console.error('Failed to fetch courier rates:', error);
        }
    };

    const handleCreateShipment = async () => {
        if (!selectedCourier || !selectedOrderForShip) {
            showErrorToast('Please select a courier');
            return;
        }

        try {
            await shipOrderMutation.mutateAsync({
                orderId: selectedOrderForShip._id,
                courierId: selectedCourier,
                serviceType: 'Surface'
            });

            setIsShipModalOpen(false);
            setSelectedOrderForShip(null);
            setSelectedCourier(null);
            refetch();
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
            try {
                await deleteOrderMutation.mutateAsync(orderId);
            } catch (error) {
                // Error handled by mutation
            }
        }
    };

    const handleExport = () => {
        exportOrderMutation.mutate({
            dataType: 'orders',
            filters: {
                search: debouncedSearch || undefined,
                status: status === 'all' ? undefined : [status],
                warehouse: selectedWarehouseId !== 'all' ? selectedWarehouseId : undefined,
                // startDate, endDate from state if available
            }
        });
    };

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[var(--bg-secondary)] min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Order Management</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Monitor, fulfil and track orders across all your sellers in real-time.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isFetching}
                        className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
                        Refresh Data
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exportOrderMutation.isPending}
                        className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-50"
                    >
                        {exportOrderMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                        {exportOrderMutation.isPending ? 'Exporting...' : 'Export Data'}
                    </button>
                </div>
            </div>

            {/* Stats Grid - Bento Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Orders"
                    value={stats['all'] || pagination?.total || 0}
                    icon={Package}
                    iconColor="bg-blue-600 text-white"
                    trend={{ value: 12, label: 'vs last week', positive: true }}
                    delay={0}
                />
                <StatsCard
                    title="Pending Shipments"
                    value={(stats['new'] || 0) + (stats['ready'] || 0) + (stats['pending'] || 0)}
                    icon={Clock}
                    iconColor="bg-orange-500 text-white"
                    trend={{ value: 5, label: 'vs yesterday', positive: false }}
                    delay={1}
                />
                <StatsCard
                    title="RTO Rate"
                    value="2.4%"
                    icon={XCircle}
                    iconColor="bg-red-500 text-white"
                    description="Calculated from last 30 days"
                    delay={2}
                />
                <StatsCard
                    title="Delivered Today"
                    value={stats['delivered'] || 0}
                    icon={CheckCircle}
                    iconColor="bg-emerald-500 text-white"
                    trend={{ value: 8, label: 'vs yesterday', positive: true }}
                    delay={3}
                />
            </div>

            {/* Controls & Filters - Matched with Sellers Page */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-default)]">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search by Order ID, Customer, Phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm focus:outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                    />
                </div>

                <div className="flex items-center gap-4">
                    {/* Warehouse Filter */}

                    <div className="relative">
                        <select
                            value={selectedWarehouseId}
                            onChange={(e) => {
                                setSelectedWarehouseId(e.target.value);
                                updateUrl({ page: 1 });
                            }}
                            className="h-10 pl-3 pr-10 rounded-lg bg-transparent hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] font-medium focus:outline-none transition-all cursor-pointer appearance-none border border-transparent hover:border-[var(--border-subtle)]"
                        >
                            <option value="all">All Warehouses</option>
                            {warehouses.map((w) => (
                                <option key={w._id} value={w._id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" size={16} />
                    </div>

                    {/* Date Picker Integrated */}
                    <div className="hidden md:block">
                        <DateRangePicker onRangeChange={handleDateRangeChange} />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg overflow-x-auto scrollbar-hide max-w-[500px]">
                        {ORDER_TABS.map((tab) => {
                            const isActive = status === tab.id;
                            const count = tab.id === 'all' ? (pagination?.total || 0) : (stats[tab.id] || 0);

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${isActive
                                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                        }`}
                                >
                                    {tab.label}
                                    {count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'bg-[var(--bg-primary)]/50'}`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
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
                                    <p className="font-medium text-[var(--text-primary)]">{selectedOrderForShip.warehouseId || 'Default'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Courier Selection */}
                        <div>
                            <p className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                <Truck className="h-4 w-4 text-[var(--primary-blue)]" />
                                Select Courier Partner
                            </p>
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
                                        <button
                                            key={courier.courierId}
                                            onClick={() => setSelectedCourier(courier.courierId)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left relative overflow-hidden group",
                                                selectedCourier === courier.courierId
                                                    ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)] ring-1 ring-[var(--primary-blue)]"
                                                    : "border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]"
                                            )}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                                                    selectedCourier === courier.courierId ? "bg-white text-[var(--primary-blue)]" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                                                )}>
                                                    <Truck className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[var(--text-primary)]">{courier.courierName}</p>
                                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                                        ETA: {courier.estimatedDeliveryDays} days
                                                        {courier.rating && <span className="text-[var(--warning)]"> • ★ {courier.rating.average}</span>}
                                                    </p>
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
                                        </button>
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
                                onClick={handleCreateShipment}
                                disabled={!selectedCourier}
                                className={cn(
                                    "transition-all duration-300",
                                    selectedCourier ? "bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/25" : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                                )}
                            >
                                Create Shipment
                                <ArrowRight className="h-4 w-4 ml-1.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
