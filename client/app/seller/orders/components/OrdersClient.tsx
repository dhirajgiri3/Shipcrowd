"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/src/components/ui/core/Button';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { formatCurrency, cn, formatPaginationRange } from '@/src/lib/utils';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { OrderDetailsPanel } from '@/src/components/seller/orders/OrderDetailsPanel';
import {
    Filter,
    FileOutput,
    Package,
    ArrowUpRight,
    AlertCircle,
    RefreshCw,
    CheckCircle2,
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
import { useUrlDateRange } from '@/src/hooks';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { OrderQuoteShipModal } from '@/src/components/seller/shipping/OrderQuoteShipModal';
import { getShipDisabledReason } from '@/src/lib/utils/order-shipping-eligibility';

const ORDER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'unshipped', label: 'To Ship' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'rto', label: 'RTO' },
    { key: 'cancelled', label: 'Cancelled' },
] as const;

type OrderTabKey = (typeof ORDER_TABS)[number]['key'];

export function OrdersClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [activeTab, setActiveTab] = useState<OrderTabKey>('unshipped');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
    const [smartFilter, setSmartFilter] = useState<FilterPreset>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [shipTargetOrder, setShipTargetOrder] = useState<Order | null>(null);
    const { addToast } = useToast();
    const limit = 20;
    const { range: dateRange, startDateIso, endDateIso, setRange } = useUrlDateRange();

    // Hydrate/sync tab from URL for deep links (e.g. dashboard CTAs)
    useEffect(() => {
        const statusParam = searchParams.get('status');
        const validTabs: OrderTabKey[] = ['all', 'unshipped', 'shipped', 'delivered', 'rto', 'cancelled'];
        const nextTab = statusParam && validTabs.includes(statusParam as OrderTabKey)
            ? (statusParam as OrderTabKey)
            : 'unshipped';

        setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
    }, [searchParams]);

    // Reset page when any filter changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, activeTab, smartFilter, paymentFilter, startDateIso, endDateIso]);

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
        smartFilter: smartFilter !== 'all' ? smartFilter : undefined,
        paymentStatus: paymentFilter !== 'all' ? paymentFilter : undefined,
        startDate: startDateIso,
        endDate: endDateIso,
    });

    // Use real data from API directly
    const ordersData: Order[] = ordersResponse?.data || [];
    const pagination = ordersResponse?.pagination;
    const globalStats = ordersResponse?.globalStats;

    // Reset to page 1 when current page is out of range (e.g. after filters reduce total)
    useEffect(() => {
        const total = pagination?.total ?? 0;
        const pages = pagination?.pages ?? 1;
        if (total > 0 && page > pages && ordersData.length === 0) {
            setPage(1);
        }
    }, [pagination?.total, pagination?.pages, page, ordersData.length]);

    const refetch = async () => {
        setIsRefreshing(true);
        await refetchOrders();
        setIsRefreshing(false);
    };

    // No client-side filtering needed - all filtering is done server-side for better performance
    const filteredOrders = ordersData;

    // Stats cards always use global (unfiltered) stats for consistent UX
    const metrics = useMemo(() => {
        if (globalStats) {
            return {
                totalOrders: globalStats.totalOrders,
                totalRevenue: globalStats.totalRevenue,
                pendingShipmentCount: globalStats.pendingShipments,
                pendingPaymentCount: globalStats.pendingPayments
            };
        }
        return {
            totalOrders: pagination?.total || 0,
            totalRevenue: ordersData.reduce((acc: number, curr: Order) => acc + (curr.totals?.total || 0), 0),
            pendingShipmentCount: ordersData.filter((o: Order) => ['pending', 'ready_to_ship'].includes(o.currentStatus)).length,
            pendingPaymentCount: ordersData.filter((o: Order) => o.paymentStatus === 'pending').length
        };
    }, [globalStats, pagination?.total, ordersData]);


    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <OrderDetailsPanel
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onShipOrder={(order) => {
                    const disabledReason = getShipDisabledReason(order);
                    if (disabledReason) {
                        addToast(disabledReason, 'error');
                        return;
                    }
                    setShipTargetOrder(order);
                }}
            />
            <OrderQuoteShipModal
                order={shipTargetOrder}
                isOpen={!!shipTargetOrder}
                onClose={() => setShipTargetOrder(null)}
                onShipSuccess={() => {
                    setShipTargetOrder(null);
                }}
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
                        <DateRangePicker value={dateRange} onRangeChange={setRange} />
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
                            <FileOutput className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                            onClick={() => window.location.assign('/seller/shipments')}
                            aria-label="Go to shipments page to track orders"
                        >
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                            Track Shipments
                        </Button>
                    </div>
                }
            />

            {/* --- METRICS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Orders"
                    value={metrics.totalOrders}
                    icon={Package}
                    iconColor="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                    trend={{ value: 12, label: 'vs last week', positive: true }}
                    delay={0}
                />
                <StatsCard
                    title="Revenue"
                    value={formatCurrency(metrics.totalRevenue)}
                    icon={TrendingUp}
                    iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                    trend={{ value: 8.4, label: 'vs last week', positive: true }}
                    delay={1}
                />
                <StatsCard
                    title="Orders to Ship"
                    value={metrics.pendingShipmentCount}
                    icon={Clock}
                    iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                    description="Orders waiting to be shipped"
                    delay={2}
                    onClick={() => {
                        setActiveTab('unshipped');
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('status', 'unshipped');
                        params.set('page', '1');
                        router.push(`?${params.toString()}`, { scroll: false });
                    }}
                    isActive={activeTab === 'unshipped'}
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
                    <PillTabs
                        tabs={ORDER_TABS}
                        activeTab={activeTab}
                        onTabChange={(key) => {
                            setActiveTab(key);
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('status', key);
                            params.set('page', '1');
                            router.push(`?${params.toString()}`, { scroll: false });
                        }}
                    />

                    {/* Filters */}
                    <div className="flex items-center gap-3">
                        <SearchInput
                            placeholder="Search orders..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
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
                    counts={ordersResponse?.filterCounts || {
                        all: pagination?.total || 0,
                        needs_attention: 0,
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
                        onShipClick={(order) => {
                            const disabledReason = getShipDisabledReason(order);
                            if (disabledReason) {
                                addToast(disabledReason, 'error');
                                return;
                            }
                            setShipTargetOrder(order);
                        }}
                        className={isMobile ? '' : 'bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] overflow-hidden shadow-sm'}
                    />
                )}

                {/* Empty State - consolidated (no duplicate from ResponsiveOrderList) */}
                {!isLoading && !error && filteredOrders.length === 0 && (
                    <div className="py-24 text-center bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)]">
                        <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
                            <Package className="w-10 h-10 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">No orders found</h3>
                        <p className="text-[var(--text-muted)] text-sm mt-2 mb-6">
                            {(smartFilter !== 'all' || search || activeTab !== 'all' || paymentFilter !== 'all')
                                ? 'No orders match your current filters'
                                : 'Your orders will appear here once created'}
                        </p>
                        {(smartFilter !== 'all' || search || activeTab !== 'all' || paymentFilter !== 'all') && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearch('');
                                    setActiveTab('all');
                                    setPaymentFilter('all');
                                    setSmartFilter('all');
                                    setPage(1);
                                    router.push('/seller/orders?status=all&page=1', { scroll: false });
                                }}
                                className="text-[var(--primary-blue)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
                            >
                                Clear all filters
                            </Button>
                        )}
                    </div>
                )}

                {/* Pagination Controls */}
                {pagination && pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-2 pt-4">
                        <p className="text-sm text-[var(--text-muted)]">
                            {formatPaginationRange(page, limit, pagination.total, 'results')}
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
