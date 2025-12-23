"use client";
export const dynamic = "force-dynamic";

import React, { useMemo, useState } from 'react';
import { DataTable } from '@/src/shared/components/DataTable';
import { Card, CardContent } from '@/src/shared/components/card';
import { Input } from '@/src/shared/components/Input';
import { Badge } from '@/src/shared/components/badge';
import { Button } from '@/src/shared/components/button';
import { Modal } from '@/src/shared/components/Modal';
import { Tooltip } from '@/src/shared/components/Tooltip';
import { useToast } from '@/src/shared/components/Toast';
import { formatCurrency, formatDate, cn } from '@/src/shared/utils';
import { useOrders, useCreateShipment } from '@/src/core/api/hooks';
import { CreateOrderModal } from '@/components/orders/CreateOrderModal';
import { BulkImportModal } from '@/components/orders/BulkImportModal';
import {
    Search,
    Plus,
    Upload,
    Truck,
    Package,
    Clock,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    ShoppingBag,
    Printer,
    Download,
    RefreshCcw,
    Zap,
    ArrowRight,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

// Courier rates (TODO: Get from API)
const courierRates = [
    { name: 'Delhivery', rate: 58, eta: '3-4 days', rating: 4.5 },
    { name: 'Xpressbees', rate: 52, eta: '4-5 days', rating: 4.2 },
    { name: 'DTDC', rate: 65, eta: '3-4 days', rating: 4.0 },
    { name: 'Ecom Express', rate: 61, eta: '4-5 days', rating: 4.3 },
];

const statusTabs = [
    { id: null, label: 'All', icon: Package, color: 'text-gray-600' },
    { id: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600' },
    { id: 'ready_to_ship', label: 'Ready to Ship', icon: Package, color: 'text-blue-600' },
    { id: 'shipped', label: 'Shipped', icon: Truck, color: 'text-purple-600' },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-600' },
    { id: 'rto', label: 'RTO', icon: RotateCcw, color: 'text-rose-600' },
];

type OrderStatus = 'pending' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled' | 'rto' | null;

interface OrderRow {
    id: string;
    _id: string;
    orderNumber: string;
    customerInfo: {
        name: string;
        phone: string;
        address: {
            city: string;
            state: string;
        };
    };
    products: Array<{ name: string; quantity: number; price: number }>;
    totals: { total: number };
    paymentMethod: 'cod' | 'prepaid';
    currentStatus: string;
    createdAt: string;
}

export default function OrdersPage() {
    const [activeTab, setActiveTab] = useState<OrderStatus>(null);
    const [search, setSearch] = useState('');
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [isShipModalOpen, setIsShipModalOpen] = useState(false);
    const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [selectedOrderForShip, setSelectedOrderForShip] = useState<OrderRow | null>(null);
    const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const { addToast } = useToast();

    // API Hooks
    const {
        data: ordersData,
        isLoading,
        error,
        refetch,
    } = useOrders({
        status: activeTab || undefined,
        search: search || undefined,
        page,
        limit: 20,
    });

    const createShipment = useCreateShipment();

    // Transform API response
    const orders: OrderRow[] = useMemo(() => {
        if (!ordersData?.orders) return [];
        return ordersData.orders.map((order: any) => ({
            ...order,
            id: order._id,
        }));
    }, [ordersData]);

    const pagination = ordersData?.pagination;

    const handleShipNow = (order: OrderRow) => {
        setSelectedOrderForShip(order);
        setSelectedCourier(null);
        setIsShipModalOpen(true);
    };

    const handleCreateShipment = async () => {
        if (!selectedCourier || !selectedOrderForShip) {
            addToast('Please select a courier', 'warning');
            return;
        }

        try {
            await createShipment.mutateAsync({
                orderId: selectedOrderForShip._id,
                courierId: selectedCourier,
                pickupAddress: 'default',
                deliveryAddress: selectedOrderForShip.customerInfo.address,
            } as any);

            addToast(`Shipment created with ${selectedCourier}!`, 'success');
            setIsShipModalOpen(false);
            setSelectedOrderForShip(null);
            setSelectedCourier(null);
            refetch();
        } catch (err) {
            addToast('Failed to create shipment', 'error');
        }
    };

    const handleBulkShip = () => {
        if (selectedOrders.length === 0) {
            addToast('Please select orders to ship', 'warning');
            return;
        }
        addToast(`Creating shipments for ${selectedOrders.length} orders...`, 'info');
    };

    const handleRefresh = () => {
        refetch();
        addToast('Refreshing orders...', 'info');
    };

    const columns = [
        {
            header: 'Order',
            accessorKey: 'orderNumber' as const,
            cell: (row: OrderRow) => (
                <div>
                    <p className="font-semibold text-[var(--text-primary)]">{row.orderNumber}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                        {formatDate(row.createdAt)}
                    </p>
                </div>
            )
        },
        {
            header: 'Customer',
            accessorKey: 'customerInfo' as const,
            cell: (row: OrderRow) => (
                <div>
                    <p className="font-medium text-[var(--text-primary)]">{row.customerInfo.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{row.customerInfo.address?.city}</p>
                </div>
            )
        },
        {
            header: 'Products',
            accessorKey: 'products' as const,
            cell: (row: OrderRow) => (
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[var(--bg-tertiary)] rounded">
                        <ShoppingBag className="h-4 w-4 text-[var(--text-muted)]" />
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)] text-sm">
                            {row.products[0]?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                            {row.products.length} item(s)
                        </p>
                    </div>
                </div>
            )
        },
        {
            header: 'Amount',
            accessorKey: 'totals' as const,
            cell: (row: OrderRow) => (
                <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                        {formatCurrency(row.totals.total)}
                    </p>
                    <Badge
                        variant={row.paymentMethod === 'cod' ? 'warning' : 'success'}
                        className="text-xs mt-0.5"
                    >
                        {row.paymentMethod.toUpperCase()}
                    </Badge>
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'currentStatus' as const,
            cell: (row: OrderRow) => {
                const statusColors: Record<string, string> = {
                    pending: 'bg-amber-100 text-amber-700',
                    ready_to_ship: 'bg-blue-100 text-blue-700',
                    shipped: 'bg-purple-100 text-purple-700',
                    delivered: 'bg-emerald-100 text-emerald-700',
                    cancelled: 'bg-gray-100 text-gray-700',
                    rto: 'bg-rose-100 text-rose-700',
                };
                return (
                    <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        statusColors[row.currentStatus] || 'bg-gray-100 text-gray-700'
                    )}>
                        {row.currentStatus.replace('_', ' ').toUpperCase()}
                    </span>
                );
            }
        },
        {
            header: 'Action',
            accessorKey: '_id' as const,
            width: 'w-28',
            cell: (row: OrderRow) => {
                if (row.currentStatus === 'pending' || row.currentStatus === 'ready_to_ship') {
                    return (
                        <Tooltip content="Create shipment">
                            <Button
                                size="sm"
                                className="bg-[#2525FF] hover:bg-[#1e1ecc] text-white"
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleShipNow(row);
                                }}
                            >
                                <Truck className="h-3.5 w-3.5 mr-1" />
                                Ship
                            </Button>
                        </Tooltip>
                    );
                }
                if (row.currentStatus === 'delivered') {
                    return (
                        <Badge variant="success" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Delivered
                        </Badge>
                    );
                }
                return null;
            }
        }
    ];

    // Loading State
    if (isLoading && !orders.length) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Orders</h2>
                        <p className="text-[var(--text-muted)] text-sm mt-0.5">Manage and fulfill your orders</p>
                    </div>
                </div>
                <Card>
                    <CardContent className="p-12">
                        <div className="flex flex-col items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)] mb-3" />
                            <p className="text-[var(--text-muted)]">Loading orders...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="p-12">
                        <div className="flex flex-col items-center justify-center">
                            <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
                            <p className="text-[var(--text-primary)] font-medium mb-2">Failed to load orders</p>
                            <p className="text-[var(--text-muted)] text-sm mb-4">
                                {(error as any)?.message || 'An unexpected error occurred'}
                            </p>
                            <Button onClick={handleRefresh} size="sm">
                                <RefreshCcw className="h-4 w-4 mr-1.5" />
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Orders</h2>
                    <p className="text-[var(--text-muted)] text-sm mt-0.5">
                        Manage and fulfill your orders
                        {pagination && ` • ${pagination.total} total`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCcw className="h-4 w-4 mr-1.5" />
                        Sync
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsBulkImportModalOpen(true)}>
                        <Upload className="h-4 w-4 mr-1.5" />
                        Import
                    </Button>
                    <Button size="sm" onClick={() => setIsCreateOrderModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        New Order
                    </Button>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {statusTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id ?? 'all'}
                            onClick={() => {
                                setActiveTab(tab.id as OrderStatus);
                                setPage(1);
                            }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all whitespace-nowrap",
                                isActive
                                    ? "bg-[var(--primary-blue)]/5 border-[var(--primary-blue)] text-[var(--primary-blue)]"
                                    : "bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                            )}
                        >
                            <Icon className={cn("h-4 w-4", isActive ? "text-[#2525FF]" : tab.color)} />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Search & Bulk Actions */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by order ID, customer..."
                                    value={search}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        {selectedOrders.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">{selectedOrders.length} selected</Badge>
                                <Button size="sm" onClick={handleBulkShip}>
                                    <Truck className="h-4 w-4 mr-1.5" />
                                    Ship Selected
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardContent className="p-0">
                    {orders.length === 0 ? (
                        <div className="text-center py-16">
                            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-[var(--text-muted)] font-medium">No orders found</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {search ? 'Try adjusting your search' : 'Orders will appear here'}
                            </p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={orders}
                            selectable
                            selectedRows={selectedOrders}
                            onRowSelect={setSelectedOrders}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text-muted)]">
                        Page {pagination.page} of {pagination.pages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Create Shipment Modal */}
            <Modal
                isOpen={isShipModalOpen}
                onClose={() => setIsShipModalOpen(false)}
                title="Create Shipment"
            >
                {selectedOrderForShip && (
                    <div className="space-y-6">
                        {/* Order Summary */}
                        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="font-semibold text-[var(--text-primary)]">
                                    {selectedOrderForShip.orderNumber}
                                </p>
                                <Badge variant={selectedOrderForShip.paymentMethod === 'cod' ? 'warning' : 'success'}>
                                    {selectedOrderForShip.paymentMethod.toUpperCase()}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-[var(--text-muted)]">Customer</p>
                                    <p className="font-medium">{selectedOrderForShip.customerInfo.name}</p>
                                    <p className="text-[var(--text-muted)] text-xs">
                                        {selectedOrderForShip.customerInfo.address?.city}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)]">Amount</p>
                                    <p className="font-semibold text-lg">
                                        {formatCurrency(selectedOrderForShip.totals.total)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Courier Selection */}
                        <div>
                            <p className="font-medium text-[var(--text-primary)] mb-3">Select Courier Partner</p>
                            <div className="space-y-2">
                                {courierRates.map((courier) => (
                                    <button
                                        key={courier.name}
                                        onClick={() => setSelectedCourier(courier.name)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left",
                                            selectedCourier === courier.name
                                                ? "border-[#2525FF] bg-[#2525FF]/5"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-[var(--bg-tertiary)] rounded-lg">
                                                <Truck className="h-5 w-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[var(--text-primary)]">{courier.name}</p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    ETA: {courier.eta} • ⭐ {courier.rating}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg text-[var(--text-primary)]">
                                                {formatCurrency(courier.rate)}
                                            </p>
                                            {courier.rate === Math.min(...courierRates.map(c => c.rate)) && (
                                                <Badge variant="success" className="text-xs">
                                                    <Zap className="h-3 w-3 mr-0.5" />
                                                    Cheapest
                                                </Badge>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={() => setIsShipModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateShipment}
                                disabled={!selectedCourier || createShipment.isPending}
                            >
                                {createShipment.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        Create Shipment
                                        <ArrowRight className="h-4 w-4 ml-1.5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Create Order Modal */}
            <CreateOrderModal
                isOpen={isCreateOrderModalOpen}
                onClose={() => setIsCreateOrderModalOpen(false)}
            />

            {/* Bulk Import Modal */}
            <BulkImportModal
                isOpen={isBulkImportModalOpen}
                onClose={() => setIsBulkImportModalOpen(false)}
                onSuccess={() => {
                    refetch();
                    setIsBulkImportModalOpen(false);
                }}
            />
        </div>
    );
}
