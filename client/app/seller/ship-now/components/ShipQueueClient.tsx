"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { Button } from '@/src/components/ui/core/Button';
import { Checkbox } from '@/src/components/ui/core/Checkbox';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { OrderQuoteShipModal } from '@/src/components/seller/shipping/OrderQuoteShipModal';
import { useOrdersList } from '@/src/core/api/hooks/orders/useOrders';
import { useUrlDateRange } from '@/src/hooks';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import type { Order } from '@/src/types/domain/order';
import { cn, formatCurrency, formatPaginationRange, parsePaginationQuery, syncPaginationQuery } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { Clock, Package, RefreshCw, Send, Truck, Users } from 'lucide-react';
import { isSellerOrderShippable } from '@/src/lib/utils/order-shipping-eligibility';

const DEFAULT_LIMIT = 20;

export function ShipQueueClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { addToast } = useToast();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const debouncedSearch = useDebouncedValue(search, 300);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [shipTargetOrder, setShipTargetOrder] = useState<Order | null>(null);
    const [batchQueue, setBatchQueue] = useState<Order[]>([]);
    const [batchSuccessCount, setBatchSuccessCount] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { range: dateRange, startDateIso, endDateIso, setRange } = useUrlDateRange();
    const { limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });

    useEffect(() => {
        const searchParam = searchParams.get('search') || '';
        setSearch((current) => (current === searchParam ? current : searchParam));

        const { page: nextPage } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
        setPage((current) => (current === nextPage ? current : nextPage));

        setIsUrlHydrated(true);
    }, [searchParams]);

    useEffect(() => {
        if (!isUrlHydrated) return;

        const params = new URLSearchParams(searchParams.toString());
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
    }, [debouncedSearch, page, limit, isUrlHydrated, searchParams, pathname, router]);

    const { data, isLoading, refetch } = useOrdersList({
        page,
        limit,
        status: 'unshipped',
        search: debouncedSearch || undefined,
        startDate: startDateIso,
        endDate: endDateIso,
    });

    const orders = data?.data || [];
    const pagination = data?.pagination;
    const shippableOrders = useMemo(
        () => orders.filter((order) => isSellerOrderShippable(order)),
        [orders]
    );
    const shippableIds = useMemo(() => shippableOrders.map((order) => order._id), [shippableOrders]);
    const isBatchRunning = batchQueue.length > 0;
    const allSelected = shippableIds.length > 0 && shippableIds.every((id) => selectedIds.includes(id));
    const isIndeterminate = selectedIds.length > 0 && !allSelected;

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, startDateIso, endDateIso]);

    useEffect(() => {
        setSelectedIds((prev) => prev.filter((id) => shippableIds.includes(id)));
    }, [shippableIds]);

    useEffect(() => {
        const total = pagination?.total ?? 0;
        const pages = pagination?.pages ?? 1;
        if (total > 0 && page > pages && orders.length === 0) {
            setPage(1);
        }
    }, [pagination?.total, pagination?.pages, page, orders.length]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (!checked) {
            setSelectedIds([]);
            return;
        }
        setSelectedIds(shippableIds);
    };

    const toggleSelectOrder = (orderId: string, checked: boolean) => {
        setSelectedIds((prev) => {
            if (checked) return Array.from(new Set([...prev, orderId]));
            return prev.filter((id) => id !== orderId);
        });
    };

    const handleStartBatch = () => {
        if (selectedIds.length === 0) return;
        const queue = shippableOrders.filter((order) => selectedIds.includes(order._id));
        if (queue.length === 0) {
            addToast('No shippable orders selected', 'warning');
            return;
        }
        setBatchQueue(queue);
        setBatchSuccessCount(0);
        setShipTargetOrder(queue[0]);
    };

    const handleShipSuccess = async (orderId: string) => {
        setSelectedIds((prev) => prev.filter((id) => id !== orderId));

        if (!isBatchRunning) {
            setShipTargetOrder(null);
            await refetch();
            return;
        }

        const nextQueue = batchQueue.filter((order) => order._id !== orderId);
        setBatchQueue(nextQueue);
        setBatchSuccessCount((prev) => prev + 1);

        if (nextQueue.length > 0) {
            setShipTargetOrder(nextQueue[0]);
            await refetch();
            return;
        }

        setShipTargetOrder(null);
        addToast(`Batch shipping completed: ${batchSuccessCount + 1} orders shipped`, 'success');
        await refetch();
    };

    const handleShipModalClose = () => {
        if (isBatchRunning) {
            setBatchQueue([]);
            addToast('Batch shipping paused. You can continue from selected orders.', 'info');
        }
        setShipTargetOrder(null);
    };

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Ship Queue"
                description="Fast lane for orders ready to ship"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Ship Queue', active: true },
                ]}
                actions={
                    <div className="flex items-center gap-3">
                        <DateRangePicker value={dateRange} onRangeChange={setRange} />
                        <Button
                            onClick={handleRefresh}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm',
                                isRefreshing && 'animate-spin'
                            )}
                            aria-label="Refresh ship queue"
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                    </div>
                }
            />

            <OrderQuoteShipModal
                order={shipTargetOrder}
                isOpen={!!shipTargetOrder}
                onClose={handleShipModalClose}
                onShipSuccess={handleShipSuccess}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    title="Ready to Ship"
                    value={pagination?.total || 0}
                    icon={Truck}
                    iconColor="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                />
                <StatsCard
                    title="Selected for Batch"
                    value={selectedIds.length}
                    icon={Users}
                    iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                />
                <StatsCard
                    title="Batch In Progress"
                    value={isBatchRunning ? batchQueue.length : 0}
                    icon={Send}
                    iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                />
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <SearchInput
                        placeholder="Search by order number, customer, phone..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            className="h-11 px-4 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)]"
                            disabled={selectedIds.length === 0 || isBatchRunning}
                            onClick={handleStartBatch}
                        >
                            Batch Ship Selected ({selectedIds.length})
                        </Button>
                    </div>
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                <tr>
                                    <th className="px-4 py-3 w-12">
                                        <Checkbox
                                            checked={allSelected ? true : isIndeterminate ? 'indeterminate' : false}
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Select all shippable orders"
                                        />
                                    </th>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Order</th>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Customer</th>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Created</th>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Total</th>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Status</th>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">
                                            Loading orders ready to ship...
                                        </td>
                                    </tr>
                                ) : shippableOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">
                                            No orders are currently ready to ship for this filter.
                                        </td>
                                    </tr>
                                ) : (
                                    shippableOrders.map((order) => {
                                        const isSelected = selectedIds.includes(order._id);
                                        return (
                                            <tr key={order._id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                                <td className="px-4 py-3">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => toggleSelectOrder(order._id, checked)}
                                                        aria-label={`Select order ${order.orderNumber}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-[var(--text-primary)]">{order.orderNumber}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">{order.products.length} item(s)</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-[var(--text-primary)]">{order.customerInfo.name}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">{order.customerInfo.phone}</p>
                                                </td>
                                                <td className="px-4 py-3 text-[var(--text-secondary)]">
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                                                    {formatCurrency(order.totals?.total || 0)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge domain="order" status={order.currentStatus} size="sm" />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        size="sm"
                                                        className="h-9 px-3 rounded-lg bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)]"
                                                        onClick={() => setShipTargetOrder(order)}
                                                        disabled={isBatchRunning}
                                                    >
                                                        Ship Now
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {pagination && pagination.pages > 1 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-sm text-[var(--text-muted)]">
            {formatPaginationRange(page, limit, pagination.total)}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-[var(--text-secondary)]">
                                Page {page} of {pagination.pages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.pages}
                                onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="sr-only" aria-live="polite">
                {isBatchRunning
                    ? `Batch shipping in progress. ${batchQueue.length} orders remaining.`
                    : `Ship queue loaded with ${pagination?.total || 0} orders.`}
            </div>
        </div>
    );
}
