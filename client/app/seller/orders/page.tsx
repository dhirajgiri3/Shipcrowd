"use client";

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MOCK_ORDERS } from '@/lib/mockData';
import { DataTable } from '@/src/shared/components/DataTable';
import { Button } from '@/src/shared/components/button';
import { DateRangePicker } from '@/src/shared/components/DateRangePicker';
import { formatCurrency, cn } from '@/src/shared/utils';
import { AnimatedNumber } from '@/hooks/useCountUp';
import {
    Search,
    Eye,
    MoreHorizontal,
    Filter,
    Download,
    Package,
    ArrowUpRight,
    CreditCard,
    AlertCircle,
    RefreshCw,
    Calendar,
    ChevronDown,
    CheckCircle2,
    Clock,
    XCircle
} from 'lucide-react';
import { Order } from '@/types/admin';
import {
    AreaChart,
    Area,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

// --- VISUALIZATION DATA ---
const trendData = [
    { name: 'Mon', orders: 12, value: 4500 },
    { name: 'Tue', orders: 19, value: 6200 },
    { name: 'Wed', orders: 15, value: 5100 },
    { name: 'Thu', orders: 25, value: 9800 },
    { name: 'Fri', orders: 32, value: 12500 },
    { name: 'Sat', orders: 28, value: 11000 },
    { name: 'Sun', orders: 22, value: 8500 },
];

export default function SellerOrdersPage() {
    const [search, setSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [activeTab, setActiveTab] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filter Logic
    const filteredData = useMemo(() => {
        return MOCK_ORDERS.filter(item => {
            const matchesSearch =
                item.id.toLowerCase().includes(search.toLowerCase()) ||
                item.customer.name.toLowerCase().includes(search.toLowerCase()) ||
                item.customer.email.toLowerCase().includes(search.toLowerCase()) ||
                item.productName.toLowerCase().includes(search.toLowerCase());

            const matchesTab = activeTab === 'all' || item.shipmentStatus === activeTab;
            const matchesPayment = paymentFilter === 'all' || item.paymentStatus === paymentFilter;

            return matchesSearch && matchesTab && matchesPayment;
        });
    }, [search, activeTab, paymentFilter]);

    // Derived Metrics
    const metrics = useMemo(() => {
        const totalRevenue = filteredData.reduce((acc, curr) => acc + curr.amount, 0);
        const pendingPaymentCount = filteredData.filter(o => o.paymentStatus === 'pending').length;
        return { totalRevenue, pendingPaymentCount };
    }, [filteredData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // --- Columns Definition ---
    const columns = [
        {
            header: 'Order ID',
            accessorKey: 'id',
            cell: (row: Order) => (
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)] text-sm font-mono">{row.id}</span>
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
            accessorKey: 'customer',
            cell: (row: Order) => (
                <div className="max-w-[180px]">
                    <div className="font-medium text-[var(--text-primary)] text-sm truncate">{row.customer.name}</div>
                    <div className="text-xs text-[var(--text-muted)] opacity-80 truncate">{row.customer.email}</div>
                </div>
            )
        },
        {
            header: 'Product',
            accessorKey: 'productName',
            cell: (row: Order) => (
                <div className="max-w-[200px] flex items-center gap-2">
                    <div className="flex-1 truncate">
                        <div className="font-medium text-[var(--text-primary)] text-sm truncate" title={row.productName}>{row.productName}</div>
                    </div>
                    {row.quantity > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                            x{row.quantity}
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Payment',
            accessorKey: 'paymentStatus',
            cell: (row: Order) => (
                <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border",
                    row.paymentStatus === 'paid' ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20" :
                        row.paymentStatus === 'pending' ? "bg-amber-500/5 text-amber-600 border-amber-500/20" :
                            "bg-rose-500/5 text-rose-600 border-rose-500/20"
                )}>
                    {row.paymentStatus}
                </span>
            )
        },
        {
            header: 'Status',
            accessorKey: 'shipmentStatus',
            cell: (row: Order) => (
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "w-2 h-2 rounded-full",
                        row.shipmentStatus === 'delivered' ? "bg-emerald-500" :
                            row.shipmentStatus === 'shipped' ? "bg-blue-500" :
                                "bg-amber-500"
                    )} />
                    <span className="text-sm text-[var(--text-primary)] capitalize">{row.shipmentStatus}</span>
                </div>
            )
        },
        {
            header: 'Amount',
            accessorKey: 'amount',
            cell: (row: Order) => (
                <div className="font-semibold text-[var(--text-primary)] text-sm font-mono">{formatCurrency(row.amount)}</div>
            )
        },
        {
            header: 'Actions',
            accessorKey: 'id',
            cell: (row: Order) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(row)} className="h-7 w-7 p-0 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                        <Eye className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen space-y-6 pb-20">
            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Orders</h1>
                    <p className="text-sm text-[var(--text-muted)]">Manage your orders and fulfillments</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker />
                    <Button
                        onClick={handleRefresh}
                        variant="ghost"
                        size="sm"
                        className={cn("h-9 w-9 p-0 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]", isRefreshing && "animate-spin")}
                    >
                        <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                    </Button>
                    <Button size="sm" className="h-9 px-4 rounded-lg bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-xs font-medium">
                        Export CSV
                    </Button>
                </div>
            </header>

            {/* --- METRICS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Orders */}
                <div className="p-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Total Orders</p>
                            <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                                <AnimatedNumber value={MOCK_ORDERS.length} />
                            </h3>
                        </div>
                        <div className="text-emerald-500 flex items-center gap-1 text-xs font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            <ArrowUpRight className="w-3 h-3" /> 12%
                        </div>
                    </div>
                    <div className="h-10 w-full mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData}>
                                <Bar dataKey="orders" fill="#3B82F6" opacity={0.8} radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue */}
                <div className="p-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Revenue</p>
                            <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                                {formatCurrency(metrics.totalRevenue)}
                            </h3>
                        </div>
                        <div className="text-emerald-500 flex items-center gap-1 text-xs font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            <ArrowUpRight className="w-3 h-3" /> 8.4%
                        </div>
                    </div>
                    <div className="h-10 w-full mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="#10B981" fillOpacity={0.1} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Pending Actions</p>
                        <div className="mt-2 text-sm text-[var(--text-primary)] font-medium">
                            {metrics.pendingPaymentCount} payments pending
                        </div>
                        <div className="text-sm text-[var(--text-muted)]">
                            {MOCK_ORDERS.filter(o => o.shipmentStatus === 'unshipped').length} orders to ship
                        </div>
                    </div>
                    <Button variant="link" className="self-start p-0 h-auto text-xs text-[var(--primary-blue)] font-medium mt-2">
                        View details &rarr;
                    </Button>
                </div>
            </div>

            {/* --- TABLE & CONTROLS --- */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    {/* Tabs */}
                    <div className="flex p-1 rounded-lg bg-[var(--bg-secondary)] w-fit">
                        {['all', 'unshipped', 'shipped', 'delivered'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all capitalize",
                                    activeTab === tab
                                        ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search orders..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-3 py-1.5 h-9 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus:border-[var(--primary-blue)] text-sm w-64 transition-colors placeholder:text-[var(--text-muted)]"
                            />
                        </div>
                        <div className="relative group">
                            <button className="h-9 px-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-sm font-medium flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5" />
                                <span className="capitalize">{paymentFilter === 'all' ? 'All Payments' : paymentFilter}</span>
                                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                            </button>
                            {/* Filter Dropdown */}
                            <div className="absolute top-full right-0 mt-1 w-40 p-1 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                {['all', 'paid', 'pending', 'failed'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setPaymentFilter(opt as any)}
                                        className={cn(
                                            "w-full text-left px-3 py-1.5 text-xs rounded-md capitalize",
                                            paymentFilter === opt ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-sm">
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        onRowClick={(row) => setSelectedOrder(row)}
                    />
                    {filteredData.length === 0 && (
                        <div className="py-12 text-center">
                            <p className="text-[var(--text-muted)] text-sm">No orders found.</p>
                            <Button
                                variant="link"
                                onClick={() => { setSearch(''); setActiveTab('all'); setPaymentFilter('all'); }}
                                className="text-[var(--primary-blue)] text-xs mt-1"
                            >
                                Clear filters
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
