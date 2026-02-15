"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/src/components/ui/core/Button';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { formatCurrency, cn, formatPaginationRange, downloadCsv } from '@/src/lib/utils';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { OrderDetailsPanel } from '@/src/components/seller/orders/OrderDetailsPanel';
import {
    Package,
    ArrowUpRight,
    AlertCircle,
    RefreshCw,
    TrendingUp,
    Clock,
    AlertTriangle,
    Truck,
    FileOutput,
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
import { Select } from '@/src/components/ui/form/Select';

const ORDER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'unshipped', label: 'To Ship' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'rto', label: 'RTO' },
    { key: 'cancelled', label: 'Cancelled' },
] as const;
const DEFAULT_LIMIT = 20;

const PAYMENT_FILTERS = ['all', 'paid', 'pending', 'failed'] as const;
const SMART_FILTERS: FilterPreset[] = ['all', 'needs_attention', 'today', 'cod_pending', 'last_7_days', 'zone_b'];

type OrderTabKey = (typeof ORDER_TABS)[number]['key'];
type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

export function OrdersClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [activeTab, setActiveTab] = useState<OrderTabKey>('unshipped');
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
    const [smartFilter, setSmartFilter] = useState<FilterPreset>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [shipTargetOrder, setShipTargetOrder] = useState<Order | null>(null);
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const hasInitializedFilterReset = useRef(false);
    const { addToast } = useToast();
    const limitParam = Number.parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_LIMIT;
    const { range: dateRange, startDateIso, endDateIso, setRange } = useUrlDateRange();

    useEffect(() => {
        const statusParam = searchParams.get('status');
        const validTabs: OrderTabKey[] = ['all', 'unshipped', 'shipped', 'delivered', 'rto', 'cancelled'];
        const nextTab = statusParam && validTabs.includes(statusParam as OrderTabKey)
            ? (statusParam as OrderTabKey)
            : 'unshipped';
        setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));

        const searchParam = searchParams.get('search') || '';
        setSearch((currentSearch) => (currentSearch === searchParam ? currentSearch : searchParam));

        const paymentParam = searchParams.get('paymentStatus') as PaymentFilter | null;
        const nextPayment = paymentParam && PAYMENT_FILTERS.includes(paymentParam) ? paymentParam : 'all';
        setPaymentFilter((currentPayment) => (currentPayment === nextPayment ? currentPayment : nextPayment));

        const smartParam = searchParams.get('smartFilter') as FilterPreset | null;
        const nextSmartFilter = smartParam && SMART_FILTERS.includes(smartParam) ? smartParam : 'all';
        setSmartFilter((currentSmartFilter) => (currentSmartFilter === nextSmartFilter ? currentSmartFilter : nextSmartFilter));

        const pageParam = Number.parseInt(searchParams.get('page') || '1', 10);
        const nextPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
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
    }, [debouncedSearch, activeTab, smartFilter, paymentFilter, startDateIso, endDateIso, isUrlHydrated]);

    useEffect(() => {
        if (!isUrlHydrated) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set('status', activeTab);

        if (debouncedSearch) {
            params.set('search', debouncedSearch);
        } else {
            params.delete('search');
        }

        if (paymentFilter !== 'all') {
            params.set('paymentStatus', paymentFilter);
        } else {
            params.delete('paymentStatus');
        }

        if (smartFilter !== 'all') {
            params.set('smartFilter', smartFilter);
        } else {
            params.delete('smartFilter');
        }

        if (page > 1) {
            params.set('page', String(page));
        } else {
            params.delete('page');
        }
        if (limit !== DEFAULT_LIMIT) {
            params.set('limit', String(limit));
        } else {
            params.delete('limit');
        }

        const currentQuery = searchParams.toString();
        const nextQuery = params.toString();
        if (nextQuery !== currentQuery) {
            router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
        }
    }, [
        activeTab,
        debouncedSearch,
        paymentFilter,
        smartFilter,
        page,
        limit,
        isUrlHydrated,
        searchParams,
        pathname,
        router,
    ]);

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

    const ordersData: Order[] = ordersResponse?.data || [];
    const pagination = ordersResponse?.pagination;
    const globalStats = ordersResponse?.globalStats;

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

    const handleExportCsv = () => {
        if (ordersData.length === 0) {
            addToast('No orders available to export for current filters', 'info');
            return;
        }

        downloadCsv({
            filename: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
            header: ['Order Number', 'Created At', 'Customer', 'Phone', 'Status', 'Payment', 'Total'],
            rows: ordersData.map((order) => [
                order.orderNumber,
                order.createdAt,
                order.customerInfo?.name || '',
                order.customerInfo?.phone || '',
                order.currentStatus,
                order.paymentStatus,
                order.totals?.total ?? 0,
            ]),
        });

        addToast('Orders exported as CSV', 'success');
    };

    const filteredOrders = ordersData;

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
        <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
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

            <PageHeader
                title="Orders"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Orders', active: true }
                ]}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <DateRangePicker value={dateRange} onRangeChange={setRange} />
                        <Button
                            onClick={refetch}
                            variant="ghost"
                            size="sm"
                            className={cn("h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm", isRefreshing && "animate-spin")}
                            aria-label="Refresh orders"
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
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
                        >
                            <Truck className="w-4 h-4 mr-2" />
                            Ship Queue
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                            onClick={() => router.push('/seller/shipments')}
                            aria-label="Go to shipments page to track orders"
                        >
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                            Track Shipments
                        </Button>
                    </div>
                }
            />

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
                        router.push('/seller/ship-now');
                    }}
                />
                <StatsCard
                    title="Pending Payments"
                    value={metrics.pendingPaymentCount}
                    icon={AlertTriangle}
                    iconColor="text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
                    delay={3}
                />
            </div>

            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <PillTabs
                        tabs={ORDER_TABS}
                        activeTab={activeTab}
                        onTabChange={(key) => {
                            setActiveTab(key);
                            setPage(1);
                        }}
                    />

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <SearchInput
                            widthClass="w-full sm:w-72"
                            placeholder="Search orders..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className="w-full sm:w-auto sm:min-w-[170px]">
                            <label htmlFor="orders-payment-filter" className="sr-only">
                                Payment status filter
                            </label>
                            <Select
                                id="orders-payment-filter"
                                value={paymentFilter}
                                onChange={(event) => {
                                    setPaymentFilter(event.target.value as PaymentFilter);
                                    setPage(1);
                                }}
                                options={[
                                    { value: 'all', label: 'All Payments' },
                                    { value: 'paid', label: 'Paid' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'failed', label: 'Failed' },
                                ]}
                                className="h-11 rounded-xl border-[var(--border-subtle)] text-[var(--text-secondary)]"
                            />
                        </div>
                    </div>
                </div>

                <SmartFilterChips
                    activeFilter={smartFilter}
                    onFilterChange={(filter) => {
                        setSmartFilter(filter);
                        setPage(1);
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
                                }}
                                className="text-[var(--primary-blue)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
                            >
                                Clear all filters
                            </Button>
                        )}
                    </div>
                )}

                {pagination && pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-2 pt-4">
                        <p className="text-sm text-[var(--text-muted)]">
                            {formatPaginationRange(page, limit, pagination.total, 'results')}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                                disabled={page === pagination.pages}
                                className="h-9 px-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-sm disabled:opacity-50"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
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
