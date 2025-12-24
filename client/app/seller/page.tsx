"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/hooks/useCountUp';
import {
    Activity,
    ArrowUpRight,
    Box,
    CheckCircle2,
    DollarSign,
    MapPin,
    Package,
    Settings,
    TrendingUp,
    Truck,
    Wallet,
    Zap
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart as RechartsPieChart,
    Pie,
    Cell
} from 'recharts';
import { useAuth } from '@/src/features/auth';
import { formatCurrency, cn } from '@/src/shared/utils';
import { DateRangePicker } from '@/src/shared/components/DateRangePicker';
import { useSellerActions } from '@/src/core/api/hooks/useSellerActions';
import { ActionsRequired } from '@/components/seller/ActionsRequired';
import { QuickCreate } from '@/components/seller/QuickCreate';
import { SmartInsights } from '@/components/seller/SmartInsights';

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1
    }
};

// --- MOCK DATA ---
const revenueData = [
    { name: 'Mon', revenue: 12000, orders: 45 },
    { name: 'Tue', revenue: 15200, orders: 58 },
    { name: 'Wed', revenue: 13800, orders: 52 },
    { name: 'Thu', revenue: 18500, orders: 68 },
    { name: 'Fri', revenue: 16200, orders: 61 },
    { name: 'Sat', revenue: 21000, orders: 82 },
    { name: 'Sun', revenue: 23500, orders: 95 },
];

const orderStatusData = [
    { name: 'Delivered', value: 1250, color: '#10B981' },
    { name: 'In Transit', value: 380, color: '#3B82F6' },
    { name: 'Pending', value: 210, color: '#F59E0B' },
    { name: 'RTO', value: 85, color: '#EF4444' },
];

const topProducts = [
    { name: 'Wireless Earbuds', sales: 245, revenue: 122500, trend: 'up', change: '+12%' },
    { name: 'Smart Watch', sales: 189, revenue: 283500, trend: 'up', change: '+8%' },
    { name: 'Laptop Stand', sales: 156, revenue: 93600, trend: 'down', change: '-3%' },
    { name: 'USB-C Hub', sales: 134, revenue: 67000, trend: 'up', change: '+15%' },
    { name: 'Bluetooth Speaker', sales: 98, revenue: 73500, trend: 'up', change: '+5%' },
];

// --- COMPONENTS ---

// 1. Stat Card with Sparkline
function StatCard({ title, value, subtext, icon: Icon, trend, trendValue, color, data }: any) {
    return (
        <motion.div
            variants={itemVariants}
            className="relative overflow-hidden p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] group hover:shadow-xl transition-all duration-300"
        >
            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                <Icon className="w-32 h-32" />
            </div>

            <div className="flex items-center justify-between mb-4">
                <div className={cn(
                    "p-3 rounded-2xl",
                    color === 'blue' ? "bg-blue-500/10 text-blue-500" :
                        color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
                            color === 'violet' ? "bg-violet-500/10 text-violet-500" :
                                "bg-amber-500/10 text-amber-500"
                )}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                        trend === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    )}>
                        <TrendingUp className={cn("w-3 h-3", trend === 'down' && "rotate-180")} />
                        {trendValue}
                    </div>
                )}
            </div>

            <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-3xl font-bold text-[var(--text-primary)]">
                        <AnimatedNumber value={value} />
                    </h3>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">{subtext}</p>
            </div>

            <div className="h-16 mt-4 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data || revenueData}>
                        <defs>
                            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={
                                    color === 'blue' ? '#3B82F6' :
                                        color === 'emerald' ? '#10B981' :
                                            color === 'violet' ? '#8B5CF6' : '#F59E0B'
                                } stopOpacity={0.3} />
                                <stop offset="95%" stopColor={
                                    color === 'blue' ? '#3B82F6' :
                                        color === 'emerald' ? '#10B981' :
                                            color === 'violet' ? '#8B5CF6' : '#F59E0B'
                                } stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={
                                color === 'blue' ? '#3B82F6' :
                                    color === 'emerald' ? '#10B981' :
                                        color === 'violet' ? '#8B5CF6' : '#F59E0B'
                            }
                            fill={`url(#gradient-${title})`}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}

export default function SellerDashboardPage() {
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Fetch seller actionable items
    const { data: actionsData, isLoading: actionsLoading } = useSellerActions();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Simulated API Data
    const metrics = {
        revenue: 120300,
        orders: 1925,
        activeShipments: 342,
        deliveryRate: 94.5
    };

    return (
        <div className="min-h-screen space-y-8 pb-10">
            {/* 1. Top Navigation & Welcome */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm font-medium text-[var(--primary-blue)] mb-2"
                    >
                        <div className="px-2 py-1 rounded-md bg-[var(--primary-blue-soft)]/20 border border-[var(--primary-blue)]/20 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary-blue)] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary-blue)]"></span>
                            </span>
                            Live System
                        </div>
                        <span className="text-[var(--text-muted)]">•</span>
                        <span className="text-[var(--text-muted)]">{currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-4xl font-bold text-[var(--text-primary)] tracking-tight"
                    >
                        Welcome back, {user?.name?.split(' ')[0] || 'Seller'}
                    </motion.h1>
                </div>

                <div className="flex items-center gap-3">
                    <DateRangePicker />
                    <button className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                    <Link href="/seller/orders/create">
                        <button className="px-4 py-2.5 rounded-xl bg-[var(--primary-blue)] text-white shadow-lg shadow-blue-500/20 hover:bg-[var(--primary-blue-deep)] transition-colors flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            <span className="font-medium">Create Order</span>
                        </button>
                    </Link>
                </div>
            </header>

            {/* 🎯 ACTIONS REQUIRED - Priority Section */}
            <ActionsRequired
                actions={actionsData?.items || []}
                isLoading={actionsLoading}
            />

            {/* ⚡ QUICK CREATE - Fast Order Creation */}
            <QuickCreate />

            {/* 2. Key Metrics Grid */}
            <motion.section
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                <StatCard
                    title="Total Revenue"
                    value={metrics.revenue}
                    subtext="vs prev. 30 days"
                    icon={DollarSign}
                    trend="up"
                    trendValue="+14.5%"
                    color="emerald"
                    data={revenueData.map(d => ({ value: d.revenue }))}
                />
                <StatCard
                    title="Total Orders"
                    value={metrics.orders}
                    subtext="vs prev. 30 days"
                    icon={Package}
                    trend="up"
                    trendValue="+8.2%"
                    color="blue"
                    data={revenueData.map(d => ({ value: d.orders }))}
                />
                <StatCard
                    title="Active Shipments"
                    value={metrics.activeShipments}
                    subtext="Currently in transit"
                    icon={Truck}
                    trend="up"
                    trendValue="+12"
                    color="violet"
                    data={[
                        { value: 320 }, { value: 325 }, { value: 332 }, { value: 340 }, { value: 338 }, { value: 342 }
                    ]}
                />
                <StatCard
                    title="Delivery Rate"
                    value={98.2}
                    subtext="Success Rate"
                    icon={Zap}
                    trend="up"
                    trendValue="+0.8%"
                    color="amber"
                    data={[
                        { value: 97 }, { value: 97.5 }, { value: 98 }, { value: 97.8 }, { value: 98 }, { value: 98.2 }
                    ]}
                />
            </motion.section>

            {/* 💡 SMART INSIGHTS - AI Powered Recommendations */}
            <SmartInsights />

            {/* 3. Main Dashboard Content - Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN (2/3) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Revenue Analytics Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Revenue Analytics</h3>
                                <p className="text-sm text-[var(--text-secondary)]">Income vs Orders Overview</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">Daily</button>
                                <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--primary-blue)] text-white">Weekly</button>
                                <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">Monthly</button>
                            </div>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(value) => `₹${value / 1000}k`} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-subtle)', borderRadius: '12px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}
                                        itemStyle={{ color: 'var(--text-primary)', fontSize: '12px' }}
                                    />
                                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                    <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Top Products Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Top Products</h3>
                                <p className="text-sm text-[var(--text-secondary)]">Best performing items this week</p>
                            </div>
                            <Link href="/seller/orders">
                                <button className="text-sm font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] flex items-center gap-1">
                                    View All
                                    <ArrowUpRight className="w-4 h-4" />
                                </button>
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {topProducts.map((product, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center">
                                            <Box className="w-5 h-5 text-[var(--text-muted)]" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)] text-sm">{product.name}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{product.sales} sales</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-[var(--text-primary)] text-sm">{formatCurrency(product.revenue)}</p>
                                        <div className={cn(
                                            "text-xs font-bold flex items-center gap-1",
                                            product.trend === 'up' ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            <TrendingUp className={cn("w-3 h-3", product.trend === 'down' && "rotate-180")} />
                                            {product.change}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </div>

                {/* RIGHT COLUMN (1/3) */}
                <div className="space-y-8">

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
                    >
                        <h3 className="font-bold text-[var(--text-primary)] mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <Link href="/seller/orders/create">
                                <button className="w-full p-4 rounded-2xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] transition-colors flex items-center gap-3">
                                    <Package className="w-5 h-5" />
                                    <span className="font-medium">Create New Order</span>
                                </button>
                            </Link>
                            <Link href="/seller/shipments">
                                <button className="w-full p-4 rounded-2xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors flex items-center gap-3">
                                    <Truck className="w-5 h-5" />
                                    <span className="font-medium">Track Shipments</span>
                                </button>
                            </Link>
                            <Link href="/seller/warehouses">
                                <button className="w-full p-4 rounded-2xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors flex items-center gap-3">
                                    <MapPin className="w-5 h-5" />
                                    <span className="font-medium">Manage Warehouses</span>
                                </button>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Order Status Distribution (Donut Chart) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
                    >
                        <h3 className="font-bold text-[var(--text-primary)] mb-6">Order Status</h3>
                        <div className="h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={orderStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {orderStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                    />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-[var(--text-primary)]">1.9k</span>
                                <span className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wide">Orders</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            {orderStatusData.map((status) => (
                                <div key={status.name} className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                                    <span className="text-xs font-medium text-[var(--text-secondary)]">{status.name}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Activity className="w-5 h-5 text-[var(--primary-blue)]" />
                                Recent Activity
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {[
                                { action: 'Order Placed', details: 'Order #ORD-892 placed', time: 'Just now', icon: Package, color: 'blue' },
                                { action: 'Payment Received', details: '₹1,299 received via UPI', time: '2 min ago', icon: Wallet, color: 'emerald' },
                                { action: 'Shipment Created', details: 'AWB generated for order', time: '12 min ago', icon: Truck, color: 'violet' },
                                { action: 'Order Delivered', details: 'Successfully delivered', time: '40 min ago', icon: CheckCircle2, color: 'emerald' },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-3 p-3 rounded-2xl hover:bg-[var(--bg-secondary)] transition-colors border border-transparent hover:border-[var(--border-subtle)]">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                        item.color === 'blue' ? "bg-blue-500/10 text-blue-500" :
                                            item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
                                                item.color === 'violet' ? "bg-violet-500/10 text-violet-500" :
                                                    "bg-amber-500/10 text-amber-500"
                                    )}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{item.action}</p>
                                            <span className="text-[10px] font-medium text-[var(--text-muted)]">{item.time}</span>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] truncate">{item.details}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
