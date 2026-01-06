"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/hooks/useCountUp';
import {
    Activity,
    ArrowUpRight,
    CheckCircle2,
    DollarSign,
    Package,
    TrendingUp,
    TrendingDown,
    Truck,
    Wallet,
    Target
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
import { useRouter } from 'next/navigation';
import { cn } from '@/src/shared/utils';
import { DateRangePicker } from '@/components/ui/form/DateRangePicker';
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
const revenueDataDaily = [
    { name: 'Mon', revenue: 12000, orders: 45 },
    { name: 'Tue', revenue: 15200, orders: 58 },
    { name: 'Wed', revenue: 13800, orders: 52 },
    { name: 'Thu', revenue: 18500, orders: 68 },
    { name: 'Fri', revenue: 16200, orders: 61 },
    { name: 'Sat', revenue: 21000, orders: 82 },
    { name: 'Sun', revenue: 23500, orders: 95 },
];

const revenueDataWeekly = [
    { name: 'Week 1', revenue: 85000, orders: 320 },
    { name: 'Week 2', revenue: 92000, orders: 345 },
    { name: 'Week 3', revenue: 88000, orders: 310 },
    { name: 'Week 4', revenue: 105000, orders: 410 },
];

const revenueDataMonthly = [
    { name: 'Jan', revenue: 320000, orders: 1200 },
    { name: 'Feb', revenue: 350000, orders: 1350 },
    { name: 'Mar', revenue: 420000, orders: 1500 },
    { name: 'Apr', revenue: 380000, orders: 1400 },
    { name: 'May', revenue: 450000, orders: 1650 },
    { name: 'Jun', revenue: 480000, orders: 1800 },
];

const orderStatusData = [
    { name: 'Delivered', value: 1250, color: 'var(--success)' },
    { name: 'In Transit', value: 380, color: 'var(--primary-blue)' },
    { name: 'Pending', value: 210, color: 'var(--warning)' },
    { name: 'RTO', value: 85, color: 'var(--error)' },
];

// 1. Stat Card - Clean & Professional
function StatCard({ title, value, subtext, icon: Icon, trend, trendValue, color, data, onClick }: any) {
    const Component = onClick ? motion.button : motion.div;

    return (
        <Component
            variants={itemVariants}
            onClick={onClick}
            className={cn(
                "group relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-6 text-left transition-all duration-200 w-full",
                onClick && "hover:border-[var(--border-focus)] cursor-pointer"
            )}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={cn(
                    "p-2.5 rounded-lg transition-colors",
                    color === 'blue' ? "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]" :
                        color === 'emerald' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                            color === 'violet' ? "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]" :
                                "bg-[var(--warning-bg)] text-[var(--warning)]"
                )}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                        trend === 'up' ? "text-[var(--success)] bg-[var(--success-bg)]" : "text-[var(--error)] bg-[var(--error-bg)]"
                    )}>
                        <TrendingUp className={cn("w-3 h-3", trend === 'down' && "rotate-180")} />
                        {trendValue}
                    </div>
                )}
            </div>

            <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                        <AnimatedNumber value={value} />
                    </h3>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">{subtext}</p>
            </div>

            {/* Micro-Chart: Minimalist */}
            <div className="h-10 mt-4 -mx-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data || revenueDataDaily}>
                        <defs>
                            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={
                                    color === 'blue' ? 'var(--primary-blue)' :
                                        color === 'emerald' ? 'var(--success)' :
                                            color === 'violet' ? 'var(--primary-blue)' : 'var(--warning)'
                                } stopOpacity={0.1} />
                                <stop offset="100%" stopColor="transparent" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={
                                color === 'blue' ? 'var(--primary-blue)' :
                                    color === 'emerald' ? 'var(--success)' :
                                        color === 'violet' ? 'var(--primary-blue)' : 'var(--warning)'
                            }
                            fill={`url(#gradient-${title})`}
                            strokeWidth={1.5}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Component>
    );
}

export default function SellerDashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

    // Fetch seller actionable items
    const { data: actionsData, isLoading: actionsLoading } = useSellerActions();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Simulated API Data
    const metricsRaw = {
        revenue: 120300,
        orders: 1925,
        activeShipments: 342,
        deliveryRate: 94.5
    };

    // Derived State based on Filter
    const chartData = useMemo(() => {
        switch (timeFilter) {
            case 'daily': return revenueDataDaily;
            case 'monthly': return revenueDataMonthly;
            case 'weekly':
            default: return revenueDataWeekly;
        }
    }, [timeFilter]);

    const displayMetrics = useMemo(() => {
        // Just simulating data changes based on filter for effect
        let multiplier = 1;
        if (timeFilter === 'daily') multiplier = 0.15;
        if (timeFilter === 'monthly') multiplier = 4.2;

        return {
            ...metricsRaw,
            revenue: Math.floor(metricsRaw.revenue * multiplier),
            orders: Math.floor(metricsRaw.orders * multiplier)
        };
    }, [timeFilter]);

    // Get greeting based on time
    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const totalActions = actionsData?.totalActions || 0;

    return (
        <div className="min-h-screen space-y-8 pb-10">
            {/* 1. Enhanced Welcome Header */}
            <header
                className="relative rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-6"
            >
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="px-2.5 py-1 rounded-md bg-[var(--success-bg)] border border-[var(--success)]/20 flex items-center gap-2"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--success)]">Live System</span>
                            </motion.div>
                            <span className="text-xs text-[var(--text-muted)] font-medium">
                                {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <h1
                            className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-1"
                        >
                            {getGreeting()}, {user?.name?.split(' ')[0] || 'Seller'}
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Here's what's happening with your shipments today.
                        </p>
                    </motion.div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        <DateRangePicker />
                        <Link href="/seller/orders/create">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-4 py-2 rounded-lg bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] transition-colors flex items-center gap-2 font-medium text-sm shadow-sm"
                            >
                                <Package className="w-4 h-4" />
                                <span>Create Order</span>
                            </motion.button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* 🎯 ACTIONS REQUIRED */}
            {totalActions > 0 && (
                <ActionsRequired
                    actions={actionsData?.items || []}
                    isLoading={actionsLoading}
                />
            )}

            {/* ⚡ QUICK CREATE */}
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
                    value={displayMetrics.revenue}
                    subtext="vs prev. period"
                    icon={DollarSign}
                    trend="up"
                    trendValue="+14.5%"
                    color="emerald"
                    data={chartData.map(d => ({ value: d.revenue }))}
                    onClick={() => router.push('/seller/analytics?tab=revenue')}
                />
                <StatCard
                    title="Total Orders"
                    value={displayMetrics.orders}
                    subtext="vs prev. period"
                    icon={Package}
                    trend="up"
                    trendValue="+8.2%"
                    color="blue"
                    data={chartData.map(d => ({ value: d.orders }))}
                    onClick={() => router.push('/seller/orders')}
                />
                <StatCard
                    title="Active Shipments"
                    value={displayMetrics.activeShipments}
                    subtext="Currently in transit"
                    icon={Truck}
                    trend="up"
                    trendValue="+12"
                    color="violet"
                    data={[
                        { value: 320 }, { value: 325 }, { value: 332 }, { value: 340 }, { value: 338 }, { value: 342 }
                    ]}
                    onClick={() => router.push('/seller/shipments?status=in_transit')}
                />
                <StatCard
                    title="Delivery Rate"
                    value={98.2}
                    subtext="Success Rate"
                    icon={Target}
                    trend="up"
                    trendValue="+0.8%"
                    color="amber"
                    data={[
                        { value: 97 }, { value: 97.5 }, { value: 98 }, { value: 97.8 }, { value: 98 }, { value: 98.2 }
                    ]}
                    onClick={() => router.push('/seller/analytics?tab=performance')}
                />
            </motion.section>

            {/* 3. Main Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN (2/3) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Revenue Analytics Chart - Enhanced */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 rounded-xl bg-[var(--primary-blue-soft)]">
                                        <TrendingUp className="w-5 h-5 text-[var(--primary-blue)]" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Revenue Analytics</h3>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] ml-12">Track your income and order trends</p>
                            </div>
                            <div className="flex gap-2 ml-12 sm:ml-0 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                                {['daily', 'weekly', 'monthly'].map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setTimeFilter(filter as any)}
                                        className={cn(
                                            "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize",
                                            timeFilter === filter
                                                ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]"
                                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        )}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary-blue)" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="var(--primary-blue)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
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
                                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="var(--primary-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                    <Area yAxisId="right" type="monotone" dataKey="orders" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Shipping Cost Analysis */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 rounded-xl bg-[var(--success-bg)]">
                                        <DollarSign className="w-5 h-5 text-[var(--success)]" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Shipping Cost Analysis</h3>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] ml-12">Track costs and optimize shipping expenses</p>
                            </div>
                            <Link href="/seller/financials">
                                <button className="text-sm font-semibold text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--primary-blue-soft)]/20">
                                    View Details
                                    <ArrowUpRight className="w-4 h-4" />
                                </button>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)]">
                                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Total Cost (30d)</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">₹45,200</p>
                                    <span className="text-xs font-bold text-[var(--success)] flex items-center gap-0.5">
                                        <TrendingUp className="w-3 h-3 rotate-180" />
                                        12%
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1">vs last month</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)]">
                                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Cost per Order</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">₹23.50</p>
                                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                                        <TrendingUp className="w-3 h-3 rotate-180" />
                                        8%
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Average shipping cost</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)]">
                                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Cost % Revenue</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">8.2%</p>
                                    <span className="text-xs font-bold text-[var(--success)] flex items-center gap-0.5">
                                        <TrendingUp className="w-3 h-3 rotate-180" />
                                        1.2%
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1">of total revenue</p>
                            </div>
                        </div>

                        {/* Cost Optimization Opportunity */}
                        <div className="p-4 rounded-2xl bg-[var(--success-bg)] border border-[var(--success)]/20">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-[var(--success)]/20">
                                    <TrendingDown className="w-5 h-5 text-[var(--success)]" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-[var(--text-primary)] mb-1">Cost Savings Opportunity</p>
                                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                                        Switch 15 orders to Delhivery for Zone B to save ₹1,200 this month
                                    </p>
                                    <Link href="/seller/orders?optimize=true">
                                        <button className="text-sm font-semibold text-[var(--success)] hover:text-[var(--success)]/80 flex items-center gap-1 transition-colors">
                                            Optimize Now
                                            <ArrowUpRight className="w-4 h-4" />
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                </div>

                {/* RIGHT COLUMN (1/3) */}
                <div className="space-y-8">

                    {/* Order Status Distribution */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-[var(--text-primary)]">Order Status</h3>
                            <Link href="/seller/orders">
                                <button className="text-xs font-semibold text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] flex items-center gap-1 transition-colors">
                                    View All
                                    <ArrowUpRight className="w-3 h-3" />
                                </button>
                            </Link>
                        </div>
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
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                strokeWidth={0}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => router.push(`/seller/orders?status=${entry.name.toLowerCase().replace(' ', '_')}`)}
                                            />
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
                                <button
                                    key={status.name}
                                    onClick={() => router.push(`/seller/orders?status=${status.name.toLowerCase().replace(' ', '_')}`)}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-left group"
                                >
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                                    <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{status.name}</span>
                                    <span className="ml-auto text-xs font-bold text-[var(--text-muted)]">{status.value}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Activity className="w-5 h-5 text-[var(--primary-blue)]" />
                                Recent Activity
                            </h3>
                            <Link href="/seller/orders">
                                <button className="text-xs font-semibold text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] flex items-center gap-1 transition-colors">
                                    View All
                                    <ArrowUpRight className="w-3 h-3" />
                                </button>
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {[
                                { action: 'Order Placed', details: 'Order #ORD-892 placed', time: 'Just now', icon: Package, color: 'blue', link: '/seller/orders/ORD-892' },
                                { action: 'Payment Received', details: '₹1,299 received via UPI', time: '2 min ago', icon: Wallet, color: 'emerald', link: '/seller/financials' },
                                { action: 'Shipment Created', details: 'AWB generated for order', time: '12 min ago', icon: Truck, color: 'violet', link: '/seller/shipments' },
                                { action: 'Order Delivered', details: 'Successfully delivered', time: '40 min ago', icon: CheckCircle2, color: 'emerald', link: '/seller/orders?status=delivered' },
                            ].map((item, i) => (
                                <Link key={i} href={item.link || '#'}>
                                    <div className="flex gap-3 p-3 rounded-2xl hover:bg-[var(--bg-secondary)] transition-colors border border-transparent hover:border-[var(--border-subtle)] cursor-pointer group">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                            item.color === 'blue' ? "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]" :
                                                item.color === 'emerald' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                                                    item.color === 'violet' ? "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]" :
                                                        "bg-[var(--warning-bg)] text-[var(--warning)]"
                                        )}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">{item.action}</p>
                                                <span className="text-[10px] font-medium text-[var(--text-muted)]">{item.time}</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)] truncate">{item.details}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </motion.div>


                    {/* Smart Insights */}
                    <div className="mt-8">
                        <SmartInsights />
                    </div>

                </div>
            </div>
        </div>
    );
}
