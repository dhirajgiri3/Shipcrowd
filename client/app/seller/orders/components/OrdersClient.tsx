"use client";

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOrdersList } from '@/src/core/api/hooks/useOrders';
import { DataTable } from '@/components/ui/data/DataTable';
import { Button } from '@/components/ui/core/Button';
import { DateRangePicker } from '@/components/ui/form/DateRangePicker';
import { formatCurrency, cn } from '@/src/shared/utils';
import { AnimatedNumber } from '@/hooks/useCountUp';
import { OrderDetailsPanel } from '@/components/seller/OrderDetailsPanel';
import {
    Search,
    Eye,
    Filter,
    Download,
    Package,
    ArrowUpRight,
    AlertCircle,
    RefreshCw,
    CheckCircle2,
    Calendar,
    ChevronDown,
    MoreHorizontal
} from 'lucide-react';
import { Order } from '@/src/types/order';
import {
    LazyAreaChart as AreaChart,
    LazyArea as Area,
    LazyBarChart as BarChart,
    LazyBar as Bar,
    ResponsiveContainer
} from '@/src/components/charts/LazyCharts';

// --- VISUALIZATION DATA ---
const trendData = [
    { name: 'Mon', orders: 12, value: 45000 },
    { name: 'Tue', orders: 19, value: 62000 },
    { name: 'Wed', orders: 15, value: 51000 },
    { name: 'Thu', orders: 25, value: 98000 },
    { name: 'Fri', orders: 32, value: 125000 },
    { name: 'Sat', orders: 28, value: 110000 },
    { name: 'Sun', orders: 22, value: 85000 },
];

export function OrdersClient() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [activeTab, setActiveTab] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const limit = 20;

    // Debounce search input (300ms delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to first page on search
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset page when tab changes
    useEffect(() => {
        setPage(1);
    }, [activeTab]);

    // --- MOCK DATA GENERATOR ---
    const MOCK_ORDERS_DATA = useMemo(() => {
        const statuses = ['delivered', 'in_transit', 'shipped', 'pending', 'cancelled', 'rto'];
        const paymentStatuses = ['paid', 'pending', 'failed'];
        const productsList = [
            'Wireless Noise Cancelling Headphones', 'Smart Fitness Watch Gen 4', 'Ergonomic Office Chair',
            'Mechanical Gaming Keyboard', 'USB-C Docking Station', 'Ultra-Wide Monitor 34"',
            'Bluetooth Portable Speaker', 'Laptop Stand Adjustable', 'Vegan Leather Backpack', 'Smart Home Hub'
        ];
        const customers = [
            'Aarav Patel', 'Vihaan Sharma', 'Aditya Verma', 'Sai Kumar', 'Ananya Singh', 'Diya Rao',
            'Isha Mehta', 'Arjun Nair', 'Meera Reddy', 'Kabir Das', 'Rohan Gupta', 'Sanya Malhotra'
        ];

        return Array.from({ length: 45 }).map((_, i) => {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
            const product = productsList[Math.floor(Math.random() * productsList.length)];
            const customer = customers[Math.floor(Math.random() * customers.length)];
            const amount = Math.floor(Math.random() * 15000) + 999;

            return {
                _id: `ORD-${2024000 + i}`,
                orderNumber: `ORD-${2024000 + i}`,
                customerInfo: {
                    name: customer,
                    phone: `+91 ${9000000000 + Math.floor(Math.random() * 999999999)}`,
                    email: `${customer.toLowerCase().replace(' ', '.')}@example.com`
                },
                products: [
                    {
                        name: product,
                        quantity: Math.floor(Math.random() * 3) + 1,
                        price: amount
                    }
                ],
                currentStatus: status,
                paymentStatus: paymentStatus as 'paid' | 'pending' | 'failed',
                paymentMethod: i % 3 === 0 ? 'cod' : 'prepaid',
                totals: {
                    subtotal: amount,
                    tax: amount * 0.18,
                    shipping: 100,
                    total: amount + (amount * 0.18) + 100
                },
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString()
            } as Order;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, []);

    // Simulate Loading
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const error: any = null;
    const refetch = async () => { setIsLoading(true); setTimeout(() => setIsLoading(false), 500); };

    // Filter Mock Data
    const filteredMockOrders = useMemo(() => {
        let filtered = MOCK_ORDERS_DATA;

        if (debouncedSearch) {
            const lowerSearch = debouncedSearch.toLowerCase();
            filtered = filtered.filter(o =>
                o.orderNumber.toLowerCase().includes(lowerSearch) ||
                o.customerInfo.name.toLowerCase().includes(lowerSearch)
            );
        }

        if (activeTab !== 'all') {
            if (activeTab === 'unshipped') {
                filtered = filtered.filter(o => ['pending', 'processing'].includes(o.currentStatus));
            } else {
                filtered = filtered.filter(o => o.currentStatus === activeTab);
            }
        }

        return filtered;
    }, [debouncedSearch, activeTab, MOCK_ORDERS_DATA]);

    const orders = filteredMockOrders.slice((page - 1) * limit, page * limit);
    const pagination = {
        total: filteredMockOrders.length,
        pages: Math.ceil(filteredMockOrders.length / limit),
        page,
        limit
    };

    // Filter Logic (client-side for payment filter)
    const filteredData = useMemo(() => {
        return orders.filter(item => {
            const matchesPayment = paymentFilter === 'all' || item.paymentStatus === paymentFilter;
            return matchesPayment;
        });
    }, [orders, paymentFilter]);

    // Derived Metrics
    const metrics = useMemo(() => {
        const totalRevenue = filteredData.reduce((acc, curr) => acc + (curr.totals?.total || 0), 0);
        const pendingPaymentCount = filteredData.filter(o => o.paymentStatus === 'pending').length;
        return { totalRevenue, pendingPaymentCount };
    }, [filteredData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    // --- Columns Definition ---
    const columns = [
        {
            header: 'Order ID',
            accessorKey: 'orderNumber',
            cell: (row: Order) => (
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)] text-sm font-mono">{row.orderNumber}</span>
                </div>
            )
        },
        {
            header: 'Date',
            accessorKey: 'createdAt',
            cell: (row: Order) => (
                <div className="flex flex-col text-xs">
                    <span className="text-[var(--text-primary)] font-medium">
                        {new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[var(--text-muted)]">
                        {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            )
        },
        {
            header: 'Customer',
            accessorKey: 'customerInfo',
            cell: (row: Order) => (
                <div className="max-w-[180px]">
                    <div className="font-medium text-[var(--text-primary)] text-sm truncate">{row.customerInfo.name}</div>
                    <div className="text-xs text-[var(--text-muted)] opacity-80 truncate">{row.customerInfo.phone}</div>
                </div>
            )
        },
        {
            header: 'Product',
            accessorKey: 'products',
            cell: (row: Order) => {
                const firstProduct = row.products[0];
                const totalQty = row.products.reduce((sum, p) => sum + p.quantity, 0);
                return (
                    <div className="max-w-[200px] flex items-center gap-2">
                        <div className="flex-1 truncate">
                            <div className="font-medium text-[var(--text-primary)] text-sm truncate" title={firstProduct?.name}>
                                {firstProduct?.name || 'No product'}
                            </div>
                        </div>
                        {row.products.length > 1 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                                +{row.products.length - 1}
                            </span>
                        )}
                        {totalQty > 1 && row.products.length === 1 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                                x{totalQty}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Payment',
            accessorKey: 'paymentStatus',
            cell: (row: Order) => (
                <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border",
                    row.paymentStatus === 'paid' ? "bg-[var(--success-bg)] text-[var(--success)] border-transparent" :
                        row.paymentStatus === 'pending' ? "bg-[var(--warning-bg)] text-[var(--warning)] border-transparent" :
                            "bg-[var(--error-bg)] text-[var(--error)] border-transparent"
                )}>
                    {row.paymentStatus}
                </span>
            )
        },
        {
            header: 'Status',
            accessorKey: 'currentStatus',
            cell: (row: Order) => (
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "w-2 h-2 rounded-full",
                        row.currentStatus === 'delivered' ? "bg-[var(--success)]" :
                            row.currentStatus === 'shipped' || row.currentStatus === 'in_transit' ? "bg-[var(--primary-blue)]" :
                                row.currentStatus === 'cancelled' ? "bg-[var(--error)]" :
                                    "bg-[var(--warning)]"
                    )} />
                    <span className="text-sm text-[var(--text-primary)] capitalize">{row.currentStatus.replace(/_/g, ' ')}</span>
                </div>
            )
        },
        {
            header: 'Amount',
            accessorKey: 'totals',
            cell: (row: Order) => (
                <div className="font-semibold text-[var(--text-primary)] text-sm font-mono">{formatCurrency(row.totals?.total || 0)}</div>
            )
        },
        {
            header: 'Actions',
            accessorKey: '_id',
            cell: (row: Order) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedOrder(row); }} className="h-8 w-8 p-0 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg">
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg">
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen space-y-8 pb-20">
            {/* Added OrderDetailsPanel here: */}
            <OrderDetailsPanel
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />

            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Orders</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Manage your orders and fulfillments</p>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangePicker />
                    <Button
                        onClick={handleRefresh}
                        variant="ghost"
                        size="sm"
                        className={cn("h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm", isRefreshing && "animate-spin")}
                    >
                        <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                    </Button>
                    <Button size="sm" className="h-10 px-5 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-sm font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </header>

            {/* --- METRICS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Orders */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Orders</p>
                            <h3 className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                                <AnimatedNumber value={pagination?.total || 0} />
                            </h3>
                        </div>
                        <div className="text-[var(--success)] flex items-center gap-1 text-xs font-bold bg-[var(--success-bg)] px-2 py-1 rounded-lg">
                            <ArrowUpRight className="w-3 h-3" /> 12%
                        </div>
                    </div>
                    <div className="h-12 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData}>
                                <Bar dataKey="orders" fill="var(--primary-blue)" radius={[4, 4, 0, 0]} opacity={0.8} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Revenue */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Revenue</p>
                            <h3 className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                                {formatCurrency(metrics.totalRevenue)}
                            </h3>
                        </div>
                        <div className="text-[var(--success)] flex items-center gap-1 text-xs font-bold bg-[var(--success-bg)] px-2 py-1 rounded-lg">
                            <ArrowUpRight className="w-3 h-3" /> 8.4%
                        </div>
                    </div>
                    <div className="h-12 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="value" stroke="var(--success)" strokeWidth={2} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                    <div>
                        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Pending Actions</p>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{metrics.pendingPaymentCount}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Payments Pending</p>
                            </div>
                            <div className="flex-1 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{orders.filter(o => o.currentStatus === 'pending').length}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">To Ship</p>
                            </div>
                        </div>
                    </div>
                    <Button variant="link" className="self-start p-0 h-auto text-xs text-[var(--primary-blue)] font-bold mt-4 hover:text-[var(--primary-blue-deep)] flex items-center gap-1">
                        View Action Center <ArrowUpRight className="w-3 h-3" />
                    </Button>
                </motion.div>
            </div>

            {/* --- TABLE & CONTROLS --- */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    {/* Tabs */}
                    <div className="flex p-1.5 rounded-xl bg-[var(--bg-secondary)] w-fit border border-[var(--border-subtle)]">
                        {['all', 'unshipped', 'shipped', 'delivered'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
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
                                        onClick={() => setPaymentFilter(opt as any)}
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

                <div className="bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] overflow-hidden shadow-sm">
                    {/* Error State */}
                    {error && (
                        <div className="py-20 text-center">
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

                    {/* Loading State */}
                    {isLoading && !error && (
                        <div className="py-12">
                            <div className="animate-pulse space-y-4 px-6">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-6 py-2">
                                        <div className="h-6 bg-[var(--bg-secondary)] rounded-md w-24" />
                                        <div className="h-6 bg-[var(--bg-secondary)] rounded-md w-32" />
                                        <div className="h-6 bg-[var(--bg-secondary)] rounded-md w-48 flex-1" />
                                        <div className="h-6 bg-[var(--bg-secondary)] rounded-md w-24" />
                                        <div className="h-6 bg-[var(--bg-secondary)] rounded-md w-20" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    {!isLoading && !error && (
                        <>
                            <DataTable
                                columns={columns}
                                data={filteredData}
                                onRowClick={(row) => setSelectedOrder(row)}
                                isLoading={isLoading}
                            />
                            {filteredData.length === 0 && (
                                <div className="py-24 text-center">
                                    <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Package className="w-10 h-10 text-[var(--text-muted)]" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">No orders found</h3>
                                    <p className="text-[var(--text-muted)] text-sm mt-2 mb-6">Your search criteria didn't match any records.</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => { setSearch(''); setActiveTab('all'); setPaymentFilter('all'); }}
                                        className="text-[var(--primary-blue)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
                                    >
                                        Clear all filters
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

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
