"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
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
    Wallet,
    Loader2,
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
import { Modal } from '@/src/components/ui/feedback/Modal';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useGetCourierRates, useShipOrder } from '@/src/core/api/hooks/admin';
import { useOrdersList } from '@/src/core/api/hooks/orders/useOrders';
import { useWarehouses } from '@/src/core/api/hooks/logistics/useWarehouses';
import { useWalletBalance } from '@/src/core/api/hooks/finance/useWallet';
import type { CourierRate } from '@/src/types/domain/order';

export function ShipmentsClient() {
    const [page, setPage] = useState(1);
    const limit = 20;
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 500);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedShipment, setSelectedShipment] = useState<any | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [isShipModalOpen, setIsShipModalOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [courierRates, setCourierRates] = useState<CourierRate[]>([]);
    const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
    const [quoteExpiresAt, setQuoteExpiresAt] = useState<Date | null>(null);
    const [quoteTimeLeftSec, setQuoteTimeLeftSec] = useState(0);

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
    const { data: walletBalance } = useWalletBalance();
    const { data: warehouses = [] } = useWarehouses();

    const { data: eligibleOrdersResponse, isLoading: isLoadingEligibleOrders } = useOrdersList({
        page: 1,
        limit: 50,
        status: 'unshipped',
    });

    const eligibleOrders: any[] = eligibleOrdersResponse?.data || [];
    const selectedOrder = useMemo(
        () => eligibleOrders.find((order) => order._id === selectedOrderId),
        [eligibleOrders, selectedOrderId]
    );

    const getCourierRatesMutation = useGetCourierRates();
    const shipOrderMutation = useShipOrder();

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter]);

    useEffect(() => {
        if (!isShipModalOpen) return;
        if (!selectedOrderId && eligibleOrders.length > 0) {
            setSelectedOrderId(eligibleOrders[0]._id);
        }
    }, [isShipModalOpen, selectedOrderId, eligibleOrders]);

    useEffect(() => {
        if (!isShipModalOpen || !quoteExpiresAt) return;

        const updateTimer = () => {
            const next = Math.max(0, Math.floor((quoteExpiresAt.getTime() - Date.now()) / 1000));
            setQuoteTimeLeftSec(next);
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [isShipModalOpen, quoteExpiresAt]);

    const shipmentsData = shipmentsResponse?.shipments || [];
    const pagination = shipmentsResponse?.pagination || { total: 0, pages: 1 };

    const selectedRate = useMemo(
        () => courierRates.find((rate) => (rate.optionId || rate.courierId) === selectedCourier),
        [courierRates, selectedCourier]
    );

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetchShipments();
        setIsRefreshing(false);
    };

    const openShipModal = () => {
        setIsShipModalOpen(true);
        setCourierRates([]);
        setSelectedCourier(null);
        setQuoteExpiresAt(null);
        setQuoteTimeLeftSec(0);
    };

    const resolveOrderOriginPincode = (order: any): string | null => {
        const orderWarehouseId = typeof order?.warehouseId === 'object'
            ? (order?.warehouseId?._id || order?.warehouseId?.id)
            : order?.warehouseId;

        const orderWarehousePostal = typeof order?.warehouseId === 'object'
            ? order?.warehouseId?.address?.postalCode
            : undefined;

        if (orderWarehousePostal) return orderWarehousePostal;

        const matchedWarehouse = warehouses.find((warehouse) => warehouse._id === orderWarehouseId);
        return matchedWarehouse?.address?.postalCode || null;
    };

    const fetchCourierRatesForOrder = useCallback(async (order: any) => {
        const totalWeight = order.products.reduce((sum: number, product: any) => {
            const productWeight = product.weight || 0.5;
            return sum + (productWeight * product.quantity);
        }, 0);

        const fromPincode = resolveOrderOriginPincode(order);
        if (!fromPincode) {
            addToast('Order has no valid warehouse origin. Please assign a warehouse first.', 'error');
            setCourierRates([]);
            setSelectedCourier(null);
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
        });

        const rates = result.data || [];
        const recommendation =
            rates.find((rate) => rate.isRecommended)?.optionId ||
            rates[0]?.optionId ||
            rates[0]?.courierId ||
            null;

        const expiresAtRaw = rates[0]?.expiresAt;
        const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
        const nextTimeLeft = expiresAt
            ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
            : 0;

        setCourierRates(rates);
        setSelectedCourier(recommendation);
        setQuoteExpiresAt(expiresAt);
        setQuoteTimeLeftSec(nextTimeLeft);
    }, [getCourierRatesMutation, warehouses, addToast]);

    useEffect(() => {
        if (!isShipModalOpen || !selectedOrder) return;
        fetchCourierRatesForOrder(selectedOrder).catch(() => {
            addToast('Unable to fetch courier rates right now', 'error');
        });
    }, [isShipModalOpen, selectedOrder, fetchCourierRatesForOrder, addToast]);

    const handleBookShipment = async () => {
        if (!selectedOrder || !selectedCourier) {
            addToast('Please select an order and courier', 'error');
            return;
        }

        if (quoteExpiresAt && quoteExpiresAt.getTime() <= Date.now()) {
            addToast('Quote session expired. Refreshing rates...', 'error');
            await fetchCourierRatesForOrder(selectedOrder);
            return;
        }

        try {
            const pickedRate = courierRates.find((rate) => (rate.optionId || rate.courierId) === selectedCourier);
            await shipOrderMutation.mutateAsync({
                orderId: selectedOrder._id,
                courierId: pickedRate?.courierId || selectedCourier,
                serviceType: pickedRate?.serviceType || 'standard',
                sessionId: pickedRate?.sessionId,
                optionId: pickedRate?.optionId,
            });

            addToast(`Shipment created for order ${selectedOrder.orderNumber}`, 'success');
            setIsShipModalOpen(false);
            setSelectedOrderId('');
            setCourierRates([]);
            setSelectedCourier(null);
            setQuoteExpiresAt(null);
            setQuoteTimeLeftSec(0);
            refetchShipments();
        } catch (bookingError: any) {
            const message = bookingError?.message || 'Failed to create shipment';
            const code = bookingError?.code || bookingError?.response?.data?.error?.code;

            if (code === 'BIZ_INSUFFICIENT_BALANCE' || /insufficient/i.test(message)) {
                addToast('Insufficient wallet balance. Please recharge wallet and retry.', 'error');
                return;
            }

            if (/expired/i.test(message)) {
                addToast('Quote session expired. Refreshing rates...', 'error');
                await fetchCourierRatesForOrder(selectedOrder);
                return;
            }

            addToast(message, 'error');
        }
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

            <Modal isOpen={isShipModalOpen} onClose={() => setIsShipModalOpen(false)} title="Create Shipment" size="lg">
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="eligibleOrder" className="text-sm font-medium text-[var(--text-primary)]">Eligible Unshipped Order</label>
                        <select
                            id="eligibleOrder"
                            value={selectedOrderId}
                            onChange={(event) => setSelectedOrderId(event.target.value)}
                            disabled={isLoadingEligibleOrders || !eligibleOrders.length}
                            className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)]"
                        >
                            <option value="">
                                {isLoadingEligibleOrders ? 'Loading eligible orders...' : 'Select order'}
                            </option>
                            {eligibleOrders.map((order) => (
                                <option key={order._id} value={order._id}>
                                    {order.orderNumber} - {order.customerInfo?.name} - {formatCurrency(order.totals?.total || 0)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                                <Wallet className="w-4 h-4" />
                                Wallet Balance
                            </span>
                            <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(walletBalance?.balance || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-[var(--text-secondary)]">Estimated Shipping Charge</span>
                            <span className="font-semibold text-[var(--text-primary)]">
                                {formatCurrency(selectedRate?.rate || 0)}
                            </span>
                        </div>
                        {(walletBalance?.balance || 0) < (selectedRate?.rate || 0) && (
                            <div className="mt-2 text-xs text-[var(--error)]">
                                Insufficient balance for booking.
                                <button
                                    type="button"
                                    className="ml-2 underline"
                                    onClick={() => window.location.assign('/seller/wallet')}
                                >
                                    Recharge wallet
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Courier Quotes</p>
                            <div className="flex items-center gap-2">
                                {quoteExpiresAt && (
                                    <span className="text-xs text-[var(--text-muted)]">
                                        Expires in {Math.floor(quoteTimeLeftSec / 60)}:{String(quoteTimeLeftSec % 60).padStart(2, '0')}
                                    </span>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!selectedOrder || getCourierRatesMutation.isPending}
                                    onClick={() => selectedOrder && fetchCourierRatesForOrder(selectedOrder)}
                                >
                                    <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', getCourierRatesMutation.isPending && 'animate-spin')} />
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        {getCourierRatesMutation.isPending ? (
                            <div className="flex items-center justify-center py-8 text-sm text-[var(--text-secondary)]">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Loading courier quotes...
                            </div>
                        ) : courierRates.length === 0 ? (
                            <div className="py-8 text-center text-sm text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-lg">
                                Select an order to load serviceable courier quotes.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                {courierRates.map((rate) => {
                                    const key = rate.optionId || rate.courierId;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setSelectedCourier(key)}
                                            className={cn(
                                                'w-full rounded-lg border p-3 text-left transition-all',
                                                selectedCourier === key
                                                    ? 'border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/20'
                                                    : 'border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]'
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-[var(--text-primary)]">{rate.courierName}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        ETA: {rate.estimatedDeliveryDays} day(s)
                                                        {rate.isRecommended ? ' • Recommended' : ''}
                                                    </p>
                                                </div>
                                                <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(rate.rate)}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                        <Button variant="ghost" onClick={() => setIsShipModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleBookShipment}
                            disabled={
                                !selectedOrder ||
                                !selectedCourier ||
                                shipOrderMutation.isPending ||
                                (quoteExpiresAt ? quoteExpiresAt.getTime() <= Date.now() : false)
                            }
                            className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white"
                        >
                            {shipOrderMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Booking...
                                </>
                            ) : (
                                'Create Shipment'
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

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
                            onClick={openShipModal}
                            size="sm"
                            className="h-10 px-5 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-sm font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <Truck className="w-4 h-4 mr-2" />
                            Create Shipment
                        </Button>
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
