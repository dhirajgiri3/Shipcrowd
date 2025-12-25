"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/hooks/useCountUp';
import {
    Activity,
    ArrowUpRight,
    CheckCircle2,
    DollarSign,
    Package,
    Settings,
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

// Removed topProducts - replaced with Shipping Cost Analysis (more valuable for sellers)

// --- COMPONENTS ---

// 1. Stat Card with Sparkline - Enhanced with clickability
function StatCard({ title, value, subtext, icon: Icon, trend, trendValue, color, data, onClick }: any) {
    const Component = onClick ? motion.button : motion.div;
    
    return (
        <Component
            variants={itemVariants}
            onClick={onClick}
            className={cn(
                "relative overflow-hidden p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] group transition-all duration-300 w-full text-left",
                onClick && "hover:border-[var(--primary-blue)]/50 hover:shadow-md cursor-pointer"
            )}
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
        </Component>
    );
}

export default function SellerDashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
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
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary-blue-soft)]/30 via-[var(--bg-primary)] to-[var(--bg-primary)] border border-[var(--border-subtle)] p-6 sm:p-8"
            >
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-blue)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--primary-blue)]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--primary-blue)]/20 flex items-center gap-2 shadow-sm"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
                            </motion.div>
                            <span className="text-xs text-[var(--text-muted)] font-medium">
                                {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </span>
                            {totalActions > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20"
                                >
                                    {totalActions} Action{totalActions !== 1 ? 's' : ''} Required
                                </motion.span>
                            )}
                        </div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] tracking-tight mb-2"
                        >
                            {getGreeting()}, {user?.name?.split(' ')[0] || 'Seller'}! 👋
                        </motion.h1>
                        <p className="text-base text-[var(--text-secondary)] max-w-2xl">
                            {totalActions > 0 
                                ? `You have ${totalActions} pending ${totalActions === 1 ? 'action' : 'actions'} that need your attention.`
                                : "Everything looks great! Ready to ship some orders?"
                            }
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        <DateRangePicker />
                        <button 
                            className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all hover:shadow-sm"
                            aria-label="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <Link href="/seller/orders/create">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-deep)] text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2 font-medium"
                            >
                                <Package className="w-5 h-5" />
                                <span>Create Order</span>
                            </motion.button>
                        </Link>
                    </div>
                </div>
            </motion.header>

            {/* 🎯 ACTIONS REQUIRED - Priority Section */}
            {totalActions > 0 && (
                <ActionsRequired
                    actions={actionsData?.items || []}
                    isLoading={actionsLoading}
                />
            )}

            {/* ⚡ QUICK CREATE - Fast Order Creation */}
            <QuickCreate />

            {/* 2. Key Metrics Grid - Enhanced with better visual hierarchy */}
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
                    onClick={() => router.push('/seller/analytics?tab=revenue')}
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
                    onClick={() => router.push('/seller/orders')}
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

            {/* 3. Main Dashboard Content - Grid Layout */}
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
                            <div className="flex gap-2 ml-12 sm:ml-0">
                                <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors border border-[var(--border-subtle)]">Daily</button>
                                <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary-blue)] text-white shadow-sm shadow-blue-500/20">Weekly</button>
                                <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors border border-[var(--border-subtle)]">Monthly</button>
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

                    {/* Shipping Cost Analysis - More Valuable than Top Products */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 rounded-xl bg-emerald-500/10">
                                        <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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
                                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
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
                                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                                        <TrendingUp className="w-3 h-3 rotate-180" />
                                        1.2%
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1">of total revenue</p>
                            </div>
                        </div>

                        {/* Cost Optimization Opportunity */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-emerald-500/20">
                                    <TrendingDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-[var(--text-primary)] mb-1">Cost Savings Opportunity</p>
                                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                                        Switch 15 orders to Delhivery for Zone B to save ₹1,200 this month
                                    </p>
                                    <Link href="/seller/orders?optimize=true">
                                        <button className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors">
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

                    {/* 💡 SMART INSIGHTS - Moved here for better flow */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <SmartInsights />
                    </motion.div>

                    {/* Order Status Distribution (Donut Chart) - Clickable */}
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

                    {/* Recent Activity - Enhanced with clickability */}
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
                                            item.color === 'blue' ? "bg-blue-500/10 text-blue-500" :
                                                item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
                                                    item.color === 'violet' ? "bg-violet-500/10 text-violet-500" :
                                                        "bg-amber-500/10 text-amber-500"
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

                </div>
            </div>
        </div>
    );
}
