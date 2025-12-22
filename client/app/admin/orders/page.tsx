"use client";
export const dynamic = "force-dynamic";

import React, { useMemo, useState } from 'react';
import { DataTable } from '@/src/shared/components/DataTable';
import { Card, CardHeader, CardContent } from '@/src/shared/components/card';
import { Input } from '@/src/shared/components/Input';
import { Badge } from '@/src/shared/components/badge';
import { Button } from '@/src/shared/components/button';
import { Modal } from '@/src/shared/components/Modal';
import { Tooltip } from '@/src/shared/components/Tooltip';
import { useToast } from '@/src/shared/components/Toast';
import { formatCurrency, formatDate, cn } from '@/src/shared/utils';
import {
    Search,
    Plus,
    Upload,
    Truck,
    Package,
    Clock,
    CheckCircle2,
    RotateCcw,
    ShoppingBag,
    Printer,
    Download,
    RefreshCcw,
    Zap,
    ArrowRight,
    Building2,
    Eye
} from 'lucide-react';

// Enhanced mock data with fulfillment statuses
const mockOrders = [
    {
        id: 'ORD-2024-001',
        customer: { name: 'Rajesh Kumar', phone: '+91 98765 43210', city: 'Mumbai' },
        items: 3,
        productName: 'Wireless Earbuds Pro',
        amount: 2450,
        paymentMode: 'Prepaid',
        paymentStatus: 'paid',
        fulfillmentStatus: 'new',
        store: 'Shopify',
        seller: 'TechGadgets Inc.',
        warehouse: 'Mumbai WH',
        createdAt: '2024-12-11T10:30:00',
    },
    {
        id: 'ORD-2024-002',
        customer: { name: 'Priya Sharma', phone: '+91 87654 32109', city: 'Delhi' },
        items: 1,
        productName: 'Smart Watch Series 5',
        amount: 899,
        paymentMode: 'COD',
        paymentStatus: 'pending',
        fulfillmentStatus: 'new',
        store: 'WooCommerce',
        seller: 'Fashion Hub',
        warehouse: 'Delhi WH',
        createdAt: '2024-12-11T09:15:00',
    },
    {
        id: 'ORD-2024-003',
        customer: { name: 'Amit Patel', phone: '+91 76543 21098', city: 'Bangalore' },
        items: 2,
        productName: 'Bluetooth Speaker',
        amount: 1599,
        paymentMode: 'Prepaid',
        paymentStatus: 'paid',
        fulfillmentStatus: 'ready',
        store: 'Shopify',
        seller: 'SoundWorks',
        warehouse: 'Bangalore WH',
        createdAt: '2024-12-11T08:45:00',
    },
    {
        id: 'ORD-2024-004',
        customer: { name: 'Sneha Reddy', phone: '+91 65432 10987', city: 'Pune' },
        items: 5,
        productName: 'Phone Case Bundle',
        amount: 4299,
        paymentMode: 'COD',
        paymentStatus: 'pending',
        fulfillmentStatus: 'shipped',
        store: 'Shopify',
        seller: 'AccessoryKing',
        warehouse: 'Mumbai WH',
        awbNumber: 'AWB123456789',
        courier: 'Delhivery',
        createdAt: '2024-12-10T14:20:00',
    },
    {
        id: 'ORD-2024-005',
        customer: { name: 'Vikram Singh', phone: '+91 54321 09876', city: 'Noida' },
        items: 1,
        productName: 'Laptop Stand Pro',
        amount: 3499,
        paymentMode: 'Prepaid',
        paymentStatus: 'paid',
        fulfillmentStatus: 'delivered',
        store: 'WooCommerce',
        seller: 'OfficeEssentials',
        warehouse: 'Delhi WH',
        awbNumber: 'AWB987654321',
        courier: 'Xpressbees',
        createdAt: '2024-12-08T11:00:00',
        deliveredAt: '2024-12-10T16:30:00',
    },
    {
        id: 'ORD-2024-006',
        customer: { name: 'Kavita Iyer', phone: '+91 43210 98765', city: 'Chennai' },
        items: 2,
        productName: 'USB-C Hub',
        amount: 1899,
        paymentMode: 'COD',
        paymentStatus: 'pending',
        fulfillmentStatus: 'rto',
        store: 'Shopify',
        seller: 'TechGadgets Inc.',
        warehouse: 'Chennai WH',
        awbNumber: 'AWB456789123',
        courier: 'DTDC',
        createdAt: '2024-12-05T09:30:00',
        rtoReason: 'Customer not available',
    },
];

// Mock courier rates
const courierRates = [
    { name: 'Delhivery', rate: 58, eta: '3-4 days', rating: 4.5 },
    { name: 'Xpressbees', rate: 52, eta: '4-5 days', rating: 4.2 },
    { name: 'DTDC', rate: 65, eta: '3-4 days', rating: 4.0 },
    { name: 'Ecom Express', rate: 61, eta: '4-5 days', rating: 4.3 },
];

const statusTabs = [
    { id: 'new', label: 'New', icon: Clock, color: 'text-amber-600' },
    { id: 'ready', label: 'Ready to Ship', icon: Package, color: 'text-blue-600' },
    { id: 'shipped', label: 'Shipped', icon: Truck, color: 'text-purple-600' },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-600' },
    { id: 'rto', label: 'RTO/NDR', icon: RotateCcw, color: 'text-rose-600' },
];

type Order = typeof mockOrders[0];

export default function OrdersPage() {
    const [activeTab, setActiveTab] = useState('new');
    const [search, setSearch] = useState('');
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [isShipModalOpen, setIsShipModalOpen] = useState(false);
    const [selectedOrderForShip, setSelectedOrderForShip] = useState<Order | null>(null);
    const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
    const { addToast } = useToast();

    const tabCounts = useMemo(() => ({
        new: mockOrders.filter(o => o.fulfillmentStatus === 'new').length,
        ready: mockOrders.filter(o => o.fulfillmentStatus === 'ready').length,
        shipped: mockOrders.filter(o => o.fulfillmentStatus === 'shipped').length,
        delivered: mockOrders.filter(o => o.fulfillmentStatus === 'delivered').length,
        rto: mockOrders.filter(o => o.fulfillmentStatus === 'rto').length,
    }), []);

    const filteredOrders = useMemo(() => {
        return mockOrders.filter(order => {
            const matchesTab = order.fulfillmentStatus === activeTab;
            const matchesSearch =
                order.id.toLowerCase().includes(search.toLowerCase()) ||
                order.customer.name.toLowerCase().includes(search.toLowerCase()) ||
                order.seller.toLowerCase().includes(search.toLowerCase()) ||
                order.productName.toLowerCase().includes(search.toLowerCase());
            return matchesTab && matchesSearch;
        });
    }, [activeTab, search]);

    const handleShipNow = (order: Order) => {
        setSelectedOrderForShip(order);
        setSelectedCourier(null);
        setIsShipModalOpen(true);
    };

    const handleCreateShipment = () => {
        if (!selectedCourier) {
            addToast('Please select a courier', 'warning');
            return;
        }
        addToast(`Shipment created with ${selectedCourier}! AWB generated.`, 'success');
        setIsShipModalOpen(false);
        setSelectedOrderForShip(null);
        setSelectedCourier(null);
    };

    const handleBulkShip = () => {
        if (selectedOrders.length === 0) {
            addToast('Please select orders to ship', 'warning');
            return;
        }
        addToast(`Creating shipments for ${selectedOrders.length} orders...`, 'info');
    };

    const columns = [
        {
            header: 'Order',
            accessorKey: 'id' as const,
            cell: (row: Order) => (
                <div>
                    <p className="font-semibold text-[var(--text-primary)]">{row.id}</p>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <span className={row.store === 'Shopify' ? 'text-green-600' : 'text-purple-600'}>●</span>
                        {row.store}
                    </p>
                </div>
            )
        },
        {
            header: 'Seller',
            accessorKey: 'seller' as const,
            cell: (row: Order) => (
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[var(--bg-tertiary)] rounded">
                        <Building2 className="h-4 w-4 text-[var(--text-muted)]" />
                    </div>
                    <span className="font-medium text-[var(--text-primary)] text-sm">{row.seller}</span>
                </div>
            )
        },
        {
            header: 'Customer',
            accessorKey: 'customer' as const,
            cell: (row: Order) => (
                <div>
                    <p className="font-medium text-[var(--text-primary)]">{row.customer.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{row.customer.city}</p>
                </div>
            )
        },
        {
            header: 'Product',
            accessorKey: 'productName' as const,
            cell: (row: Order) => (
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[var(--bg-tertiary)] rounded">
                        <ShoppingBag className="h-4 w-4 text-[var(--text-muted)]" />
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)] text-sm">{row.productName}</p>
                        <p className="text-xs text-[var(--text-muted)]">Qty: {row.items}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Amount',
            accessorKey: 'amount' as const,
            cell: (row: Order) => (
                <div>
                    <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(row.amount)}</p>
                    <Badge variant={row.paymentMode === 'COD' ? 'warning' : 'success'} className="text-xs mt-0.5">
                        {row.paymentMode}
                    </Badge>
                </div>
            )
        },
        {
            header: 'Date',
            accessorKey: 'createdAt' as const,
            cell: (row: Order) => <span className="text-sm text-[var(--text-muted)]">{formatDate(row.createdAt)}</span>
        },
        {
            header: 'Action',
            accessorKey: 'id' as const,
            width: 'w-28',
            cell: (row: Order) => {
                if (activeTab === 'new' || activeTab === 'ready') {
                    return (
                        <Tooltip content="Create shipment">
                            <Button
                                size="sm"
                                className="bg-[#2525FF] hover:bg-[#1e1ecc] text-white"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShipNow(row);
                                }}
                            >
                                <Truck className="h-3.5 w-3.5 mr-1" />
                                Ship Now
                            </Button>
                        </Tooltip>
                    );
                }
                if (activeTab === 'shipped') {
                    return (
                        <div className="text-sm">
                            <p className="font-medium text-[var(--text-primary)]">{row.awbNumber}</p>
                            <p className="text-xs text-[var(--text-muted)]">{row.courier}</p>
                        </div>
                    );
                }
                if (activeTab === 'delivered') {
                    return (
                        <Badge variant="success" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Delivered
                        </Badge>
                    );
                }
                if (activeTab === 'rto') {
                    return (
                        <div>
                            <p className="text-xs text-rose-600 font-medium">{row.rtoReason}</p>
                            <Button size="sm" variant="outline" className="mt-1 text-xs h-7">
                                Reattempt
                            </Button>
                        </div>
                    );
                }
                return null;
            }
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Orders</h2>
                    <p className="text-[var(--text-muted)] text-sm mt-0.5">Manage all seller orders and fulfillment</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => addToast('Syncing orders...', 'info')}>
                        <RefreshCcw className="h-4 w-4 mr-1.5" />
                        Sync All
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1.5" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {statusTabs.map((tab) => {
                    const count = tabCounts[tab.id as keyof typeof tabCounts];
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all whitespace-nowrap",
                                isActive
                                    ? "bg-[var(--primary-blue)]/5 border-[var(--primary-blue)] text-[var(--primary-blue)]"
                                    : "bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                            )}
                        >
                            <Icon className={cn("h-4 w-4", isActive ? "text-[#2525FF]" : tab.color)} />
                            <span className="font-medium">{tab.label}</span>
                            <Badge
                                variant={isActive ? "default" : "neutral"}
                                className={cn("text-xs", isActive && "bg-[#2525FF] text-white")}
                            >
                                {count}
                            </Badge>
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
                                    placeholder="Search by order ID, seller, customer, or product..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        {(activeTab === 'new' || activeTab === 'ready') && selectedOrders.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Badge variant="neutral">{selectedOrders.length} selected</Badge>
                                <Button size="sm" onClick={handleBulkShip}>
                                    <Truck className="h-4 w-4 mr-1.5" />
                                    Ship Selected
                                </Button>
                            </div>
                        )}
                        {(activeTab === 'shipped') && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4 mr-1.5" />
                                    Print Labels
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-1.5" />
                                    Manifest
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardContent className="p-0">
                    {filteredOrders.length === 0 ? (
                        <div className="text-center py-16">
                            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-[var(--text-muted)] font-medium">No orders found</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {search ? 'Try adjusting your search' : 'Orders will appear here when synced'}
                            </p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={filteredOrders}
                        />
                    )}
                </CardContent>
            </Card>

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
                                <div>
                                    <p className="font-semibold text-[var(--text-primary)]">{selectedOrderForShip.id}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{selectedOrderForShip.seller}</p>
                                </div>
                                <Badge variant={selectedOrderForShip.paymentMode === 'COD' ? 'warning' : 'success'}>
                                    {selectedOrderForShip.paymentMode}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-[var(--text-muted)]">Customer</p>
                                    <p className="font-medium">{selectedOrderForShip.customer.name}</p>
                                    <p className="text-[var(--text-muted)] text-xs">{selectedOrderForShip.customer.city}</p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)]">Amount</p>
                                    <p className="font-semibold text-lg">{formatCurrency(selectedOrderForShip.amount)}</p>
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
                                                <p className="text-xs text-[var(--text-muted)]">ETA: {courier.eta} • ⭐ {courier.rating}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg text-[var(--text-primary)]">{formatCurrency(courier.rate)}</p>
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
                            <Button onClick={handleCreateShipment} disabled={!selectedCourier}>
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
