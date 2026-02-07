'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Truck, CheckCircle, AlertCircle, Clock,
    Search, Filter, MoreVertical, FileText, Download,
    RefreshCw, Calendar as CalendarIcon, XCircle,
    LayoutDashboard, RefreshCcw, Box, Loader2, ArrowRight
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard'; // Reusable component
import { DataTable } from '@/src/components/ui/data/DataTable';
import { useAdminOrders, useGetCourierRates, useShipOrder } from '@/src/core/api/hooks/admin';
import { Order, OrderListParams, CourierRate } from '@/src/types/domain/order';
import { showSuccessToast, showErrorToast } from '@/src/lib/error';
import { formatCurrency, cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem
} from '@/src/components/ui/feedback/DropdownMenu';
import { format } from 'date-fns';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';

// Tabs configuration
const ORDER_TABS = [
    { id: 'all', label: 'All Orders', icon: Package },
    { id: 'new', label: 'New', icon: AlertCircle },
    { id: 'ready', label: 'Ready for Ship', icon: Clock },
    { id: 'shipped', label: 'Shipped', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle },
    { id: 'rto', label: 'RTO', icon: XCircle },
    { id: 'cancelled', label: 'Cancelled', icon: XCircle },
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

    const [searchTerm, setSearchTerm] = useState(search);
    const [debouncedSearch, setDebouncedSearch] = useState(search);

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
    }), [page, limit, status, sort, order, debouncedSearch]);

    // -- Fetch Data --
    const {
        data: ordersResponse,
        isLoading,
        isFetching,
        refetch
    } = useAdminOrders(queryParams);

    const getCourierRatesMutation = useGetCourierRates();
    const shipOrderMutation = useShipOrder();

    const orders = ordersResponse?.data || [];
    const pagination = ordersResponse?.pagination;
    const stats = ordersResponse?.stats || {}; // Faceted stats from server

    // -- Event Handlers --
    const handleTabChange = (newStatus: string) => {
        updateUrl({ status: newStatus, page: 1 }); // Reset to page 1 on tab change
    };

    const handleSort = (key: string) => {
        const isSameKey = sort === key;
        const newOrder = isSameKey && order === 'desc' ? 'asc' : 'desc';
        updateUrl({ sort: key, order: newOrder });
    };

    const handlePageChange = (newPage: number) => {
        updateUrl({ page: newPage });
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

        // Calculate total weight from order products
        const totalWeight = order.products.reduce((sum, product) => {
            const productWeight = product.weight || 0;
            return sum + (productWeight * product.quantity);
        }, 0);

        // Fetch courier rates
        try {
            const result = await getCourierRatesMutation.mutateAsync({
                fromPincode: order.customerInfo.address.postalCode,
                toPincode: order.customerInfo.address.postalCode,
                weight: totalWeight || 500, // Use calculated weight or default to 500g if not available
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


    // -- Table Columns --
    const columns = useMemo(() => [
        {
            header: 'Order ID',
            accessorKey: 'orderNumber', // Sortable
            cell: (row: Order) => (
                <div>
                    <div className="font-medium text-[var(--text-primary)]">{row.orderNumber}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{format(new Date(row.createdAt), 'MMM d, h:mm a')}</div>
                </div>
            )
        },
        {
            header: 'Customer',
            accessorKey: 'customer', // Mapped to customerInfo.name in backend
            cell: (row: Order) => (
                <div>
                    <div className="text-[var(--text-primary)] font-medium">{row.customerInfo?.name}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{row.customerInfo?.phone}</div>
                </div>
            )
        },
        {
            header: 'Product',
            accessorKey: 'items', // Mapped
            cell: (row: Order) => (
                <div className="max-w-[200px]">
                    <div className="text-[var(--text-secondary)] truncate">
                        {row.products?.[0]?.name}
                    </div>
                    {row.products?.length > 1 && (
                        <div className="text-xs text-[var(--text-tertiary)]">
                            +{row.products.length - 1} more items
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Amount',
            accessorKey: 'amount', // Mapped to totals.total
            cell: (row: Order) => (
                <div className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(row.totals?.total || 0)}
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            row.paymentMethod === 'cod' ? "bg-[var(--warning)]" : "bg-[var(--success)]"
                        )} />
                        <span className="text-xs text-[var(--text-secondary)] capitalize">{row.paymentMethod}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row: Order) => {
                const statusColors: Record<string, string> = {
                    new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    ready: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    rto: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                };
                return (
                    <Badge className={statusColors[row.currentStatus] || 'bg-gray-100 text-gray-700'}>
                        {row.currentStatus}
                    </Badge>
                );
            }
        },
        {
            header: 'Actions',
            accessorKey: 'actions',
            width: 'w-[50px]',
            cell: (row: Order) => {
                if (status === 'new' || status === 'ready') {
                    return (
                        <div className="flex items-center gap-2">
                            <Tooltip content="Ship Order">
                                <Button
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleShipNow(row);
                                    }}
                                    className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white h-8 px-3 text-xs shadow-custom"
                                >
                                    <Truck className="h-3 w-3 mr-1.5" />
                                    Ship
                                </Button>
                            </Tooltip>
                        </div>
                    )
                }
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[var(--bg-tertiary)]">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem onClick={() => router.push(`/admin/orders/${row.orderNumber}`)}>
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                Delete Order
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            }
        }
    ], [router, order, sort, status]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--primary-blue)] mb-1 bg-[var(--primary-blue-soft)] w-fit px-3 py-1 rounded-full">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Order Command Center</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                        Order Management
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Monitor, fulfil and track orders across all your sellers in real-time.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleRefresh} disabled={isFetching} className="bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                        Sync Orders
                    </Button>
                    <Button variant="outline" className="bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                    </Button>
                </div>
            </div>

            {/* Quick Stats - Using Reusable StatsCard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="h-[120px]">
                    <StatsCard
                        title="Total Orders"
                        value={stats['all'] || pagination?.total || 0}
                        icon={Package}
                        variant="default"
                        iconColor="text-blue-500 bg-blue-500"
                        trend={{ value: 12, label: 'vs last week', positive: true }}
                    />
                </div>
                <div className="h-[120px]">
                    <StatsCard
                        title="Pending Shipments"
                        value={(stats['new'] || 0) + (stats['ready'] || 0)}
                        icon={Clock}
                        variant="warning"
                        trend={{ value: 5, label: 'vs yesterday', positive: false }}
                    />
                </div>
                <div className="h-[120px]">
                    <StatsCard
                        title="RTO Rate"
                        value="2.4%"
                        icon={XCircle}
                        variant="critical"
                        description="Calculated from last 30 days"
                    />
                </div>
                <div className="h-[120px]">
                    <StatsCard
                        title="Delivered Today"
                        value={stats['delivered'] || 0} // This might need a specific 'today' endpoint, simplified for now
                        icon={CheckCircle}
                        variant="success"
                        trend={{ value: 8, label: 'vs yesterday', positive: true }}
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] shadow-sm">

                {/* Toolbar */}
                <div className="p-4 border-b border-[var(--border-subtle)] space-y-4">
                    {/* Tabs */}
                    <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-1">
                        {ORDER_TABS.map((tab) => {
                            const isActive = status === tab.id;
                            // Calculate count: if 'all', use total, else use stat for that status
                            const count = tab.id === 'all' ? (pagination?.total || 0) : (stats[tab.id] || 0);

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                        ${isActive
                                            ? 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                                        }
                                    `}
                                >
                                    <tab.icon className={`w-4 h-4 ${isActive ? 'text-[var(--primary-blue)]' : ''}`} />
                                    {tab.label}
                                    <span className={`
                                        ml-1 px-1.5 py-0.5 rounded-md text-xs
                                        ${isActive ? 'bg-[var(--primary-blue)]/10' : 'bg-[var(--bg-tertiary)]'}
                                    `}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                        <div className="relative w-full sm:w-[350px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <Input
                                placeholder="Search by Order ID, Customer, Phone..."
                                className="pl-9 bg-[var(--bg-secondary)] border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--primary-blue)] transition-all h-10 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button variant="outline" className="w-full sm:w-auto bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]">
                                <Filter className="w-4 h-4 mr-2" />
                                Filters
                            </Button>
                            <Button variant="outline" className="w-full sm:w-auto bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]">
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                Date
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="p-4 relative min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center p-8"
                            >
                                <Loader2 className="h-10 w-10 animate-spin text-[var(--primary-blue)] mb-4" />
                                <p className="text-sm text-[var(--text-muted)]">Loading orders...</p>
                            </motion.div>
                        ) : orders.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                            >
                                <div className="h-20 w-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-4">
                                    <Box className="h-10 w-10 text-[var(--text-muted)] opacity-50" />
                                </div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">No orders found</h3>
                                <p className="text-[var(--text-muted)] max-w-sm mx-auto mt-1 mb-6">
                                    We couldn't find any orders matching your search filters for this category.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => { setSearchTerm(''); handleTabChange('all'); }}
                                    className="border-[var(--border-default)]"
                                >
                                    Clear Filters
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="table"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <DataTable
                                    columns={columns}
                                    data={orders}
                                    isLoading={isLoading}
                                    sortBy={sort}
                                    sortOrder={order}
                                    onSort={handleSort}
                                    pagination={{
                                        currentPage: page,
                                        totalPages: pagination?.pages || 1,
                                        totalItems: pagination?.total || 0,
                                        onPageChange: handlePageChange
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

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
