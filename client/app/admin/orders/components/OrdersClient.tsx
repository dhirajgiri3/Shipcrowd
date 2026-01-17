"use client";
export const dynamic = "force-dynamic";

import React, { useMemo, useState } from 'react';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { Button } from '@/src/components/ui/core/Button';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency, formatDate, cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
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
    LayoutDashboard,
    Filter,
    MoreHorizontal,
    Box
} from 'lucide-react';

// --- MOCK DATA ---
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

const statusConfig = [
    { id: 'new', label: 'New Orders', icon: Clock, color: 'text-[var(--warning)]', bg: 'bg-[var(--warning-bg)]', border: 'border-[var(--warning)]/20' },
    { id: 'ready', label: 'Ready to Ship', icon: Package, color: 'text-[var(--info)]', bg: 'bg-[var(--info-bg)]', border: 'border-[var(--info)]/20' },
    { id: 'shipped', label: 'In Transit', icon: Truck, color: 'text-[var(--primary-blue)]', bg: 'bg-[var(--primary-blue-soft)]', border: 'border-[var(--primary-blue)]/20' },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-[var(--success)]', bg: 'bg-[var(--success-bg)]', border: 'border-[var(--success)]/20' },
    { id: 'rto', label: 'RTO / NDR', icon: RotateCcw, color: 'text-[var(--error)]', bg: 'bg-[var(--error-bg)]', border: 'border-[var(--error)]/20' },
];

type Order = typeof mockOrders[0];

export function OrdersClient() {
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
            header: 'Order Details',
            accessorKey: 'id' as const,
            cell: (row: Order) => (
                <div className="group cursor-pointer">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">{row.id}</p>
                        <Badge variant="neutral" className="px-1.5 py-0 text-[10px] h-5">{row.store}</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDate(row.createdAt)}</p>
                </div>
            )
        },
        {
            header: 'Merchant',
            accessorKey: 'seller' as const,
            cell: (row: Order) => (
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--border-subtle)]">
                        <Building2 className="h-4 w-4 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)] text-sm">{row.seller}</p>
                        <p className="text-xs text-[var(--text-muted)]">Verified Seller</p>
                    </div>
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
            header: 'Product Info',
            accessorKey: 'productName' as const,
            cell: (row: Order) => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center border border-[var(--border-subtle)]">
                        <ShoppingBag className="h-4 w-4 text-[var(--text-muted)]" />
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)] text-sm">{row.productName}</p>
                        <p className="text-xs text-[var(--text-muted)]">Cty: {row.items}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Amount',
            accessorKey: 'amount' as const,
            cell: (row: Order) => (
                <div>
                    <p className="font-bold text-[var(--text-primary)]">{formatCurrency(row.amount)}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            row.paymentMode === 'COD' ? "bg-[var(--warning)]" : "bg-[var(--success)]"
                        )} />
                        <span className="text-xs text-[var(--text-secondary)]">{row.paymentMode}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Action',
            accessorKey: 'id' as const,
            width: 'w-32',
            cell: (row: Order) => {
                if (activeTab === 'new' || activeTab === 'ready') {
                    return (
                        <div className="flex items-center gap-2">
                            <Tooltip content="Ship Order">
                                <Button
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleShipNow(row);
                                    }}
                                    className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-hover)] text-white h-8 px-3 text-xs shadow-custom"
                                >
                                    <Truck className="h-3 w-3 mr-1.5" />
                                    Ship
                                </Button>
                            </Tooltip>
                        </div>
                    );
                }
                if (activeTab === 'shipped') {
                    return (
                        <div className="text-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="font-mono text-xs font-medium text-[var(--primary-blue)] px-1.5 py-0.5 bg-[var(--primary-blue-soft)] rounded">
                                    {row.awbNumber}
                                </span>
                            </div>
                        </div>
                    );
                }
                if (activeTab === 'delivered') {
                    return (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/20">
                            <CheckCircle2 className="h-3 w-3 mr-1.5" />
                            Delivered
                        </span>
                    );
                }
                if (activeTab === 'rto') {
                    return (
                        <div>
                            <p className="text-[10px] text-[var(--error)] font-medium uppercase tracking-wide mb-1">Action Required</p>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-[var(--error)]/20 hover:border-[var(--error)]/30 hover:bg-[var(--error-bg)] text-[var(--error)]">
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
        <div className="space-y-6 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--primary-blue)] mb-1 bg-[var(--primary-blue-soft)] w-fit px-3 py-1 rounded-full">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Order Command Center</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                        Order Management
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Monitor, fulfil and track orders across all your sellers in real-time.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => addToast('Syncing orders...', 'info')} className="bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Sync Orders
                    </Button>
                    <Button variant="outline" className="bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                    </Button>
                </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {statusConfig.map((status, index) => {
                    const isActive = activeTab === status.id;
                    const count = tabCounts[status.id as keyof typeof tabCounts];
                    const Icon = status.icon;

                    return (
                        <motion.button
                            key={status.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setActiveTab(status.id)}
                            className={cn(
                                "relative flex flex-col p-4 rounded-2xl border transition-all duration-300 text-left group overflow-hidden",
                                isActive
                                    ? `bg-[var(--bg-primary)] border-[var(--primary-blue)] ring-1 ring-[var(--primary-blue)] shadow-[0_0_20px_var(--primary-blue-soft)]`
                                    : "bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:shadow-md"
                            )}
                        >
                            {/* Active Indicator & Background Glow */}
                            {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-blue)]/5 to-transparent pointer-events-none" />
                            )}

                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center transition-colors duration-300",
                                    isActive ? "bg-[var(--primary-blue)] text-white" : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                                )}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-bold font-mono transition-colors",
                                    isActive ? "bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                                )}>
                                    {count}
                                </div>
                            </div>

                            <div className="relative z-10">
                                <p className={cn(
                                    "font-medium text-sm transition-colors",
                                    isActive ? "text-[var(--primary-blue)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                                )}>
                                    {status.label}
                                </p>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Main Content Area */}
            <motion.div
                layout
                className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm"
            >
                {/* Toolbar */}
                <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col md:flex-row gap-4 justify-between bg-[var(--bg-primary)]">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <Input
                            placeholder="Search by ID, Customer, Seller or Product..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-[var(--bg-secondary)] border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--primary-blue)] transition-all h-10 rounded-xl"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {(activeTab === 'new' || activeTab === 'ready') && selectedOrders.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2 mr-2"
                            >
                                <span className="text-sm text-[var(--text-secondary)] font-medium bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                                    {selectedOrders.length} selected
                                </span>
                                <Button
                                    size="sm"
                                    onClick={handleBulkShip}
                                    className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-hover)] text-white shadow-lg shadow-blue-500/20"
                                >
                                    <Truck className="h-4 w-4 mr-2" />
                                    Ship Selected
                                </Button>
                            </motion.div>
                        )}
                        <Button variant="ghost" size="icon" className="text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                            <Filter className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="relative min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {filteredOrders.length === 0 ? (
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
                                    onClick={() => { setSearch(''); setActiveTab('new'); }}
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
                                    data={filteredOrders}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
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
                                        <p className="font-bold text-lg text-[var(--text-primary)]">{selectedOrderForShip.id}</p>
                                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-[var(--bg-primary)]">
                                            {selectedOrderForShip.paymentMode}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] mt-0.5">{selectedOrderForShip.seller}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-xl text-[var(--text-primary)]">{formatCurrency(selectedOrderForShip.amount)}</p>
                                    <p className="text-xs text-[var(--text-muted)]">Total Value</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 text-sm">
                                <div>
                                    <p className="text-[var(--text-muted)] text-xs uppercase font-semibold tracking-wider mb-1">Customer</p>
                                    <p className="font-medium text-[var(--text-primary)]">{selectedOrderForShip.customer.name}</p>
                                    <p className="text-[var(--text-muted)]">{selectedOrderForShip.customer.city}</p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)] text-xs uppercase font-semibold tracking-wider mb-1">Shipping From</p>
                                    <p className="font-medium text-[var(--text-primary)]">{selectedOrderForShip.warehouse}</p>
                                </div>
                            </div>
                        </div>

                        {/* Courier Selection */}
                        <div>
                            <p className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                <Truck className="h-4 w-4 text-[var(--primary-blue)]" />
                                Select Courier Partner
                            </p>
                            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                                {courierRates.map((courier) => (
                                    <button
                                        key={courier.name}
                                        onClick={() => setSelectedCourier(courier.name)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left relative overflow-hidden group",
                                            selectedCourier === courier.name
                                                ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)] ring-1 ring-[var(--primary-blue)]"
                                                : "border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]"
                                        )}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className={cn(
                                                "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                                                selectedCourier === courier.name ? "bg-white text-[var(--primary-blue)]" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                                            )}>
                                                <Truck className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[var(--text-primary)]">{courier.name}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-0.5">ETA: {courier.eta} • <span className="text-[var(--warning)]">★ {courier.rating}</span></p>
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
                                    selectedCourier ? "bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-hover)] text-white shadow-lg shadow-blue-500/25" : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
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
