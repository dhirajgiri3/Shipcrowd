"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedNumber } from '@/hooks/useCountUp';
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    Box,
    BrainCircuit,
    Calendar,
    CheckCircle2,
    ChevronDown,
    Clock,
    CreditCard,
    DollarSign,
    FileText,
    Globe,
    LayoutDashboard,
    Map,
    MapPin,
    MoreHorizontal,
    Package,
    PieChart,
    Search,
    Server,
    Settings,
    TrendingUp,
    Truck,
    Users,
    Wallet,
    X,
    Zap
} from 'lucide-react';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { SellerHealthDashboard } from '@/components/admin/SellerHealthDashboard';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart as RechartsPieChart,
    Pie,
    Cell
} from 'recharts';
import { useAuth } from '@/src/features/auth';
import { useToast } from '@/src/shared/components/Toast';
import { formatCurrency, cn } from '@/src/shared/utils';
import { DateRangePicker } from '@/src/shared/components/DateRangePicker';
import { TopSellers } from '@/components/admin/TopSellers';

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
    { name: 'Mon', revenue: 45000, orders: 120 },
    { name: 'Tue', revenue: 52000, orders: 145 },
    { name: 'Wed', revenue: 49000, orders: 132 },
    { name: 'Thu', revenue: 62000, orders: 180 },
    { name: 'Fri', revenue: 58000, orders: 160 },
    { name: 'Sat', revenue: 75000, orders: 210 },
    { name: 'Sun', revenue: 82000, orders: 245 },
];

const orderStatusData = [
    { name: 'Delivered', value: 4500, color: '#10B981' },
    { name: 'In Transit', value: 1200, color: '#3B82F6' },
    { name: 'Pending', value: 800, color: '#F59E0B' },
    { name: 'RTO', value: 300, color: '#EF4444' },
];

const aiInsights = [
    {
        id: 1,
        title: "Growth Opportunity",
        description: "High demand detected in Tier-2 cities. Recommend activating 'Express' logistics for Nagpur region.",
        type: "opportunity",
        impact: "+12% Revenue",
        icon: TrendingUp,
        color: "emerald"
    },
    {
        id: 2,
        title: "SLA Breach Risk",
        description: "Weather alert in North India may delay Delhivery shipments by 24h.",
        type: "risk",
        impact: "High Impact",
        icon: AlertTriangle,
        color: "amber"
    },
    {
        id: 3,
        title: "Inventory Optimization",
        description: "Seller 'TechGadgets' has 3 slow-moving SKUs. Recommend markdown campaign.",
        type: "optimization",
        impact: "Cost Saving",
        icon: Box,
        color: "blue"
    }
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

// 2. AI Insight Card
function AIInsightCard({ insight }: { insight: any }) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 transition-colors cursor-pointer"
        >
            <div className="flex gap-4">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    insight.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
                        insight.color === 'amber' ? "bg-amber-500/10 text-amber-500" :
                            "bg-blue-500/10 text-blue-500"
                )}>
                    <insight.icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        {insight.title}
                        <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                            insight.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
                                insight.color === 'amber' ? "bg-amber-500/10 text-amber-500" :
                                    "bg-blue-500/10 text-blue-500"
                        )}>
                            {insight.impact}
                        </span>
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {insight.description}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Simulated API Data
    const metrics = {
        gmv: 1250000,
        orders: 4520,
        activeSellers: 142,
        avgSla: 94.5
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
                        Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
                    </motion.h1>
                </div>

                <div className="flex items-center gap-3">
                    <DateRangePicker />
                    <button className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                    <button className="p-2.5 rounded-xl bg-[var(--primary-blue)] text-white shadow-lg shadow-blue-500/20 hover:bg-[var(--primary-blue-deep)] transition-colors">
                        <ArrowUpRight className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* 2. Key Metrics Grid */}
            <motion.section
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                <StatCard
                    title="Total Revenue"
                    value={metrics.gmv}
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
                    title="Active Sellers"
                    value={metrics.activeSellers}
                    subtext="4 pending approval"
                    icon={Users}
                    trend="up"
                    trendValue="+12"
                    color="violet"
                    data={[
                        { value: 120 }, { value: 125 }, { value: 132 }, { value: 140 }, { value: 138 }, { value: 142 }
                    ]}
                />
                <StatCard
                    title="Avg. SLA"
                    value={98.2}
                    subtext="Delivery Success Rate"
                    icon={Zap}
                    trend="down"
                    trendValue="-0.4%"
                    color="amber"
                    data={[
                        { value: 99 }, { value: 98 }, { value: 98.5 }, { value: 97 }, { value: 98 }, { value: 98.2 }
                    ]}
                />
            </motion.section>

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

                    {/* Live Operations Feed */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-hidden flex flex-col h-[400px]"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-[var(--primary-blue)]" />
                                    Live Operations
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)]">Real-time platform activity</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">Live</span>
                            </div>
                        </div>

                        {/* Scrolling Activity Feed */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                            {[
                                { action: 'Order Placed', details: 'Order #ORD-2024-892 placed by Rahul Kumar', time: 'Just now', icon: Package, color: 'blue' },
                                { action: 'Payment Received', details: '₹1,299 received via UPI for #ORD-890', time: '2 min ago', icon: Wallet, color: 'emerald' },
                                { action: 'Seller Verified', details: 'Kyra Fashion KYC approved automatically', time: '5 min ago', icon: CheckCircle2, color: 'violet' },
                                { action: 'Shipment Created', details: 'AWB generated for 12 orders (Batch #B-102)', time: '12 min ago', icon: Truck, color: 'amber' },
                                { action: 'High Value Order', details: '₹45,000 order detected from Bangalore', time: '18 min ago', icon: AlertTriangle, color: 'rose' },
                                { action: 'New Seller Signup', details: 'TechStore India started onboarding', time: '25 min ago', icon: Users, color: 'blue' },
                                { action: 'RTO Initiated', details: 'Shipment #SHP-992 marked as RTO (Customer Refused)', time: '32 min ago', icon: X, color: 'red' },
                                { action: 'Order Delivered', details: 'Successfully delivered to Mumbai Hub', time: '40 min ago', icon: CheckCircle2, color: 'emerald' },
                                { action: 'Stock Alert', details: 'Low inventory warning for SKU-902', time: '45 min ago', icon: Box, color: 'amber' },
                                { action: 'System Backup', details: 'Daily database backup completed', time: '1 hr ago', icon: Server, color: 'slate' },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-3 rounded-2xl hover:bg-[var(--bg-secondary)] transition-colors border border-transparent hover:border-[var(--border-subtle)] group">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-current opacity-80",
                                        item.color === 'blue' ? "bg-blue-500/10 text-blue-500" :
                                            item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
                                                item.color === 'violet' ? "bg-violet-500/10 text-violet-500" :
                                                    item.color === 'amber' ? "bg-amber-500/10 text-amber-500" :
                                                        item.color === 'rose' || item.color === 'red' ? "bg-rose-500/10 text-rose-500" :
                                                            "bg-slate-500/10 text-slate-500"
                                    )}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{item.action}</p>
                                            <span className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full group-hover:bg-white/50">{item.time}</span>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed truncate">{item.details}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Top Sellers Table */}
                    <TopSellers />

                </div>

                {/* RIGHT COLUMN (1/3) */}
                <div className="space-y-8">

                    {/* AI Smart Insights Widget */}
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] border border-[var(--border-subtle)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-blue)]/10 blur-3xl rounded-full pointer-events-none" />

                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-[var(--primary-blue)] text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <BrainCircuit className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-primary)]">AI Insights</h3>
                                <p className="text-xs text-[var(--primary-blue)] font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-blue)] animate-pulse" />
                                    Analyzing Live Data...
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            {aiInsights.map((insight) => (
                                <AIInsightCard key={insight.id} insight={insight} />
                            ))}
                        </div>

                        <button className="w-full mt-6 py-3 rounded-xl border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors">
                            View All Predictions
                        </button>
                    </div>

                    {/* Order Status Distribution (Donut Chart) */}
                    <div className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
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
                                <span className="text-3xl font-bold text-[var(--text-primary)]">4.5k</span>
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
                    </div>

                    {/* System Health Compact */}
                    <div className="p-6 rounded-3xl bg-[#0f172a] text-white border border-slate-800 shadow-xl overflow-hidden relative">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Server className="w-4 h-4 text-emerald-400" />
                                    System Status
                                </h3>
                                <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">
                                    Healthy
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>API Latency</span>
                                        <span className="text-emerald-400">45ms</span>
                                    </div>
                                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: "25%" }}
                                            className="h-full bg-emerald-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Error Rate</span>
                                        <span className="text-emerald-400">0.01%</span>
                                    </div>
                                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: "2%" }}
                                            className="h-full bg-emerald-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Database Load</span>
                                        <span className="text-blue-400">32%</span>
                                    </div>
                                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: "32%" }}
                                            className="h-full bg-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
