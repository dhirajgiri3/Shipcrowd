"use client";

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/src/components/ui/core/Button';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { formatCurrency, cn } from '@/src/lib/utils';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { OrderDetailsPanel } from '@/src/components/seller/OrderDetailsPanel';
import {
    Search,
    Filter,
    Download,
    Package,
    ArrowUpRight,
    AlertCircle,
    RefreshCw,
    CheckCircle2,
    RotateCcw,
    ChevronDown,
    FileText,
    TrendingUp,
    Clock,
    AlertTriangle
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { Order } from '@/src/types/domain/order';
import { SmartFilterChips, FilterPreset } from '@/src/components/seller/orders/SmartFilterChips';
import { ResponsiveOrderList } from '@/src/components/seller/orders/ResponsiveOrderList';
import { useIsMobile } from '@/src/hooks/ux';
import { useOrdersList } from '@/src/core/api/hooks/orders/useOrders';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';

export function OrdersClient() {
    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [activeTab, setActiveTab] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
    const [smartFilter, setSmartFilter] = useState<FilterPreset>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const { addToast } = useToast();
    const limit = 20;

    // Reset page on search change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    // Reset page when tab changes
    useEffect(() => {
        setPage(1);
    }, [activeTab]);

    // --- REAL API INTEGRATION ---
    const {
        data: ordersResponse,
        isLoading,
        error,
        refetch: refetchOrders
    } = useOrdersList({
        page,
        limit,
        status: activeTab !== 'all' ? activeTab : undefined,
        search: debouncedSearch || undefined,
    });

    // Use real data from API directly
    const ordersData: Order[] = ordersResponse?.data || [];
    const pagination = ordersResponse?.pagination;
    const stats = ordersResponse?.stats;

    const refetch = async () => {
        setIsRefreshing(true);
        await refetchOrders();
        setIsRefreshing(false);
    };

    // Filter Logic (client-side for payment filter & smart filter if API doesn't support)
    // In a real scenario, these should ideally be passed as params to the API
    const filteredOrders = useMemo(() => {
        let filtered = ordersData;

        // Apply Payment Filter
        if (paymentFilter !== 'all') {
            filtered = filtered.filter(o => o.paymentStatus === paymentFilter);
        }

        // Apply Smart Filter (Only for visual filtering on current page if API not supported)
        // Ideally, this should be a backend param
        if (smartFilter !== 'all') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            switch (smartFilter) {
                case 'needs_attention':
                    filtered = filtered.filter(o =>
                        ['rto', 'cancelled', 'ready_to_ship', 'ndr', 'pickup_pending', 'pickup_failed', 'exception'].includes(o.currentStatus)
                    );
                    break;
                case 'today':
                    filtered = filtered.filter(o => {
                        const orderDate = new Date(o.createdAt);
                        orderDate.setHours(0, 0, 0, 0);
                        return orderDate.getTime() === today.getTime();
                    });
                    break;
                case 'cod_pending':
                    filtered = filtered.filter(o =>
                        o.paymentMethod === 'cod' && o.currentStatus !== 'delivered'
                    );
                    break;
                case 'last_7_days':
                    filtered = filtered.filter(o => {
                        const orderDate = new Date(o.createdAt);
                        return orderDate >= sevenDaysAgo;
                    });
                    break;
                case 'zone_b':
                    filtered = filtered.filter(o => {
                        const state = o.customerInfo?.address?.state;
                        return state && ['Maharashtra', 'Gujarat', 'Madhya Pradesh', 'Chhattisgarh'].includes(state);
                    });
                    break;
            }
        }

        return filtered;
    }, [ordersData, paymentFilter, smartFilter]);


    // Derived Metrics from available data (or use stats from API if available)
    const metrics = useMemo(() => {
        // Fallback calculation from current page data if global stats missing
        const totalRevenue = ordersData.reduce((acc: number, curr: Order) => acc + (curr.totals?.total || 0), 0);
        const pendingPaymentCount = ordersData.filter((o: Order) => o.paymentStatus === 'pending').length;
        const pendingShipmentCount = ordersData.filter((o: Order) => o.currentStatus === 'pending').length;
        return { totalRevenue, pendingPaymentCount, pendingShipmentCount };
    }, [ordersData]);


    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <OrderDetailsPanel
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />

            {/* --- HEADER --- */}
            <PageHeader
                title="Orders"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Orders', active: true }
                ]}
                actions={
                    <div className="flex items-center gap-3">
                        <DateRangePicker />
                        <Button
                            onClick={refetch}
                            variant="ghost"
                            size="sm"
                            className={cn("h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm", isRefreshing && "animate-spin")}
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all" onClick={() => addToast('Bulk Manifest feature coming soon', 'info')}>
                            <FileText className="w-4 h-4 mr-2" />
                            Bulk Manifest
                        </Button>
                        <Button size="sm" variant="outline" className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all" onClick={() => addToast('Bulk Label feature coming soon', 'info')}>
                            <Package className="w-4 h-4 mr-2" />
                            Bulk Label
                        </Button>
                        <Button size="sm" className="h-10 px-5 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-sm font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                }
            />

            {/* --- METRICS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Orders"
                    value={pagination?.total || 0}
                    icon={Package}
                    iconColor="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                    trend={{ value: 12, label: 'vs last week', positive: true }}
                    delay={0}
                />
                <StatsCard
                    title="Revenue"
                    value={formatCurrency(metrics.totalRevenue)} // Note: This might be page-only revenue if API doesn't provide global
                    icon={TrendingUp}
                    iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                    trend={{ value: 8.4, label: 'vs last week', positive: true }}
                    delay={1}
                />
                <StatsCard
                    title="Pending Shipments"
                    value={metrics.pendingShipmentCount}
                    icon={Clock}
                    iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                    description="Orders waiting to be shipped"
                    delay={2}
                />
                <StatsCard
                    title="Pending Payments"
                    value={metrics.pendingPaymentCount}
                    icon={AlertTriangle}
                    iconColor="text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
                    delay={3}
                />
            </div>

            {/* --- TABLE & CONTROLS --- */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    {/* Tabs */}
                    <div className="flex p-1.5 rounded-xl bg-[var(--bg-secondary)] w-fit border border-[var(--border-subtle)] overflow-x-auto">
                        {['all', 'unshipped', 'shipped', 'delivered'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap",
                                    activeTab === tab
                                        ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search orders..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2.5 h-11 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)] text-sm w-72 transition-all placeholder:text-[var(--text-muted)] shadow-sm"
                            />
                        </div>
                        <div className="relative group">
                            <button className="h-11 px-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-sm font-medium flex items-center gap-2 hover:bg-[var(--bg-secondary)] transition-colors shadow-sm">
                                <Filter className="w-4 h-4" />
                                <span className="capitalize">{paymentFilter === 'all' ? 'All Payments' : paymentFilter}</span>
                                <ChevronDown className="w-4 h-4 opacity-50" />
                            </button>
                            {/* Filter Dropdown */}
                            <div className="absolute top-full right-0 mt-2 w-48 p-1.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                {['all', 'paid', 'pending', 'failed'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setPaymentFilter(opt as 'all' | 'paid' | 'pending' | 'failed')}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-sm rounded-lg capitalize transition-colors flex items-center justify-between",
                                            paymentFilter === opt ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                                        )}
                                    >
                                        {opt}
                                        {paymentFilter === opt && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary-blue)]" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Smart Filter Chips */}
                <SmartFilterChips
                    activeFilter={smartFilter}
                    onFilterChange={(filter) => {
                        setSmartFilter(filter);
                        setPage(1); // Reset pagination
                    }}
                    counts={{
                        all: pagination?.total || 0,
                        needs_attention: 0, // Todo: Get from API facets
                        today: 0,
                        cod_pending: 0,
                        last_7_days: 0,
                        zone_b: 0
                    }}
                />

                {/* Error State */}
                {error && (
                    <div className="bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-sm py-20 text-center">
                        <div className="w-20 h-20 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-[var(--error)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Failed to load orders</h3>
                        <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">{error.message || 'An unexpected error occurred while fetching your orders. Please try again.'}</p>
                        <Button
                            variant="primary"
                            onClick={() => refetch()}
                            className="mx-auto"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
                        </Button>
                    </div>
                )}

                {/* Responsive Order List */}
                {!error && (
                    <ResponsiveOrderList
                        orders={filteredOrders}
                        isLoading={isLoading}
                        onOrderClick={(order) => setSelectedOrder(order)}
                        className={isMobile ? '' : 'bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] overflow-hidden shadow-sm'}
                    />
                )}

                {/* Empty State with Clear Filters */}
                {!isLoading && !error && filteredOrders.length === 0 && (
                    <div className="text-center mt-4 py-8">
                        <p className="text-[var(--text-muted)] mb-4">No orders found matching your criteria</p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearch('');
                                setActiveTab('all');
                                setPaymentFilter('all');
                                setSmartFilter('all');
                            }}
                            className="text-[var(--primary-blue)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
                        >
                            Clear all filters
                        </Button>
                    </div>
                )}

                {/* Pagination Controls */}
                {pagination && pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-2 pt-4">
                        <p className="text-sm text-[var(--text-muted)]">
                            Showing <span className="font-bold text-[var(--text-primary)]">{((page - 1) * limit) + 1}</span> to{' '}
                            <span className="font-bold text-[var(--text-primary)]">{Math.min(page * limit, pagination.total)}</span> of{' '}
                            <span className="font-bold text-[var(--text-primary)]">{pagination.total}</span> results
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="h-9 px-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-sm disabled:opacity-50"
                            >
                                Previous
                            </Button>
                            <span className="text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                                Page {page} / {pagination.pages}
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                disabled={page === pagination.pages}
                                className="h-9 px-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-sm disabled:opacity-50"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
