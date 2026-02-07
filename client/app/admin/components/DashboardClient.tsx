"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { motion } from 'framer-motion';
import { Button } from '@/src/components/ui/core/Button';
import { AnimatedNumber } from '@/src/hooks/utility/useCountUp';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import {
    ArrowUpRight,
    BrainCircuit,
    DollarSign,
    Package,
    Settings,
    Shield,
    Target,
    TrendingDown,
    Users,
    Zap,
} from 'lucide-react';

import {
    LazyAreaChart as AreaChart,
    LazyArea as Area,
    LazyPieChart as RechartsPieChart,
    LazyPie as Pie,
    LazyXAxis as XAxis,
    LazyYAxis as YAxis,
    LazyCartesianGrid as CartesianGrid,
    LazyTooltip as Tooltip,
    LazyResponsiveContainer as ResponsiveContainer,
    LazyCell as Cell,
} from '@/src/components/features/charts/LazyCharts';
import { formatCurrency } from '@/src/lib/utils';
import { useAuth } from '@/src/features/auth';
import { cn } from '@/src/lib/utils';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { TopSellers } from '@/src/components/admin/TopSellers';
import { useAdminDashboard, useAdminInsights } from '@/src/core/api/hooks/analytics/useAnalytics';
import { useDateRange } from '@/src/lib/data';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import type { SmartInsight } from '@/src/core/api/hooks/analytics/useSmartInsights';
import type { AdminDashboard } from '@/src/types/api/analytics';

// --- ADMIN INSIGHTS CONFIG (stable across renders) ---
const ADMIN_INSIGHTS_TYPE_CONFIG: Record<
    SmartInsight['type'],
    { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; accentColor: string }
> = {
    cost_saving: { icon: TrendingDown, accentColor: 'var(--success)' },
    rto_prevention: { icon: Shield, accentColor: 'var(--error)' },
    efficiency: { icon: Package, accentColor: 'var(--warning)' },
    speed: { icon: Zap, accentColor: 'var(--info)' },
    growth_opportunity: { icon: Target, accentColor: 'var(--primary-blue)' },
};

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

// --- COMPONENTS ---

/** Build CSV content from current dashboard data */
function buildDashboardCsv(
    adminData: AdminDashboard | undefined,
    revenueTrendData: Array<{ name: string; revenue: number; orders: number }>,
    topSellersData: Array<{ companyName: string; totalOrders: number; totalRevenue: number; companyId: string }>,
    orderStatusData: Array<{ name: string; value: number }>,
    dateLabel: string
): string {
    const rows: string[] = [];
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    rows.push('Admin Dashboard Export');
    rows.push(`Date range,${dateLabel}`);
    rows.push('');

    if (adminData) {
        rows.push('Summary');
        rows.push('Metric,Value');
        rows.push(`Total Revenue,${adminData.totalRevenue ?? 0}`);
        rows.push(`Total Orders,${adminData.totalOrders ?? 0}`);
        rows.push(`Active Sellers,${adminData.totalRegisteredSellers ?? 0}`);
        const sr = adminData.successRateBasedOnAttempts && adminData.globalSuccessRate != null
            ? `${Number(adminData.globalSuccessRate).toFixed(1)}%`
            : 'N/A';
        rows.push(`Success Rate,${sr}`);
        rows.push(`Pending Orders,${adminData.pendingOrders ?? 0}`);
        rows.push(`Delivered Orders,${adminData.deliveredOrders ?? 0}`);
        rows.push('');
    }

    if (revenueTrendData.length > 0) {
        rows.push('Revenue & Orders by Date');
        rows.push('Date,Revenue,Orders');
        revenueTrendData.forEach((d) => rows.push([d.name, d.revenue, d.orders].map(escape).join(',')));
        rows.push('');
    }

    if (topSellersData.length > 0) {
        rows.push('Top Sellers');
        rows.push('Company,Orders,Revenue');
        topSellersData.forEach((d) => rows.push([d.companyName, d.totalOrders, d.totalRevenue].map(escape).join(',')));
        rows.push('');
    }

    if (orderStatusData.length > 0) {
        rows.push('Order Status');
        rows.push('Status,Count');
        orderStatusData.forEach((d) => rows.push([d.name, d.value].map(escape).join(',')));
    }

    return rows.join('\r\n');
}

export function DashboardClient() {
    const router = useRouter();
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [exporting, setExporting] = useState(false);
    const { dateRange } = useDateRange();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Date range for admin dashboard API (ISO date strings)
    const adminFilters = useMemo(() => ({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0],
    }), [dateRange.from, dateRange.to]);

    // --- API HOOKS ---
    const { data: adminData, isLoading: adminLoading, error: adminError, refetch: refetchAdmin } = useAdminDashboard(adminFilters);
    const { data: adminInsights = [], isLoading: insightsLoading } = useAdminInsights();

    // --- DATA TRANSFORMATION ---

    const revenueTrendData = useMemo(() => {
        if (!adminData?.revenueGraph?.length) return [];
        return adminData.revenueGraph.map((point) => ({
            name: new Date(point._id).toLocaleDateString('en-US', { weekday: 'short' }),
            revenue: point.revenue ?? 0,
            orders: point.orders ?? 0,
        }));
    }, [adminData]);

    const orderStatusData = useMemo(() => {
        if (!adminData) return [];
        const { totalOrders, pendingOrders, deliveredOrders } = adminData;
        const other = Math.max(0, totalOrders - (pendingOrders ?? 0) - (deliveredOrders ?? 0));
        return [
            { name: 'Delivered', value: deliveredOrders ?? 0, color: 'var(--success)' },
            { name: 'Pending', value: pendingOrders ?? 0, color: 'var(--warning)' },
            ...(other > 0 ? [{ name: 'In Transit / Other', value: other, color: 'var(--primary-blue)' }] : []),
        ].filter((item) => item.value > 0);
    }, [adminData]);

    const activeSellersCount = adminData?.totalRegisteredSellers ?? 0;

    const topSellersData = useMemo(() => {
        if (!adminData?.companiesStats?.length) return [];
        return adminData.companiesStats.map((c) => ({
            companyId: String(c.companyId),
            companyName: c.companyName ?? 'Unknown',
            totalOrders: c.totalOrders ?? 0,
            totalRevenue: c.totalRevenue ?? 0,
            pendingOrders: c.pendingOrders ?? 0,
            deliveredOrders: c.deliveredOrders ?? 0,
        }));
    }, [adminData]);

    const orderStatusHint = useMemo(() => {
        if (!orderStatusData.length || !adminData?.totalOrders) return null;
        const delivered = orderStatusData.find((s) => s.name === 'Delivered')?.value ?? 0;
        const pending = orderStatusData.find((s) => s.name === 'Pending')?.value ?? 0;
        if (delivered >= pending && delivered > 0) return 'Most orders delivered';
        if (pending > delivered) return 'High pending share';
        return null;
    }, [orderStatusData, adminData?.totalOrders]);

    const dateLabel = useMemo(
        () => `${dateRange.from.toLocaleDateString()} – ${dateRange.to.toLocaleDateString()}`,
        [dateRange.from, dateRange.to]
    );

    const handleExportDashboard = useCallback(() => {
        setExporting(true);
        try {
            const csv = buildDashboardCsv(adminData, revenueTrendData, topSellersData, orderStatusData, dateLabel);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin-dashboard-${dateRange.from.toISOString().slice(0, 10)}-to-${dateRange.to.toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    }, [adminData, revenueTrendData, topSellersData, orderStatusData, dateLabel, dateRange.from, dateRange.to]);

    const isLoading = adminLoading;
    const isError = !!adminError;

    if (isLoading) {
        return (
            <div className="min-h-screen space-y-8 pb-10">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <Skeleton className="h-12 w-64" />
                    <div className="flex gap-3">
                        <Skeleton className="h-10 w-40" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-40 rounded-2xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Skeleton className="h-[350px] lg:col-span-2 rounded-3xl" />
                    <Skeleton className="h-[350px] rounded-3xl" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
                <p className="text-[var(--text-secondary)]">Failed to load dashboard data.</p>
                <Button onClick={() => refetchAdmin()} variant="outline">
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-10">
            {/* 1. Top Navigation & Welcome */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div
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
                    </div>
                    <h1
                        className="text-4xl font-bold text-[var(--text-primary)] tracking-tight"
                    >
                        Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
                    </h1>
                </motion.div>

                <div className="flex items-center gap-3">
                    <DateRangePicker />
                    <Button
                        variant="outline"
                        size="icon"
                        className="bg-[var(--bg-primary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                        title="Platform settings"
                        onClick={() => router.push('/admin/settings')}
                    >
                        <Settings className="w-5 h-5" />
                    </Button>
                    <Button
                        className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white border-0"
                        title="Export dashboard data as CSV"
                        onClick={handleExportDashboard}
                        disabled={exporting || !adminData}
                    >
                        {exporting ? (
                            <span className="mr-2">Exporting…</span>
                        ) : (
                            <>
                                <span className="mr-2">Export</span>
                                <ArrowUpRight className="w-4 h-4" />
                            </>
                        )}
                    </Button>
                </div>
            </header>

            {/* 2. Key Metrics Grid */}
            <motion.section
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                <StatsCard
                    title="Total Revenue"
                    value={formatCurrency(adminData?.totalRevenue ?? 0)}
                    icon={DollarSign}
                    variant="success"
                    description="Selected period"
                    delay={0}
                />
                <StatsCard
                    title="Total Orders"
                    value={adminData?.totalOrders ?? 0}
                    icon={Package}
                    variant="info"
                    description="Selected period"
                    delay={1}
                />
                <StatsCard
                    title="Active Sellers"
                    value={activeSellersCount}
                    icon={Users}
                    variant="default"
                    description="Total Sellers"
                    delay={2}
                />
                <StatsCard
                    title="Success Rate"
                    value={adminData?.successRateBasedOnAttempts && adminData?.globalSuccessRate != null
                        ? `${Number(adminData.globalSuccessRate).toFixed(1)}%`
                        : 'N/A'}
                    icon={Zap}
                    variant={
                        !adminData?.successRateBasedOnAttempts
                            ? 'default'
                            : (adminData?.globalSuccessRate ?? 0) >= 85
                                ? 'success'
                                : (adminData?.globalSuccessRate ?? 0) === 0
                                    ? 'critical'
                                    : 'warning'
                    }
                    description={
                        !adminData?.successRateBasedOnAttempts
                            ? 'No delivery outcomes in period'
                            : (adminData?.globalSuccessRate ?? 0) === 0
                                ? 'No delivered orders in period'
                                : 'Delivery Performance'
                    }
                    delay={3}
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
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Revenue Analytics</h3>
                            <p className="text-sm text-[var(--text-secondary)]">Income vs orders (selected date range)</p>
                        </div>
                        <div className="h-[350px] w-full">
                            {revenueTrendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueTrendData}>
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
                            ) : (
                                <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                                    No chart data available
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Top Sellers Table */}
                    <TopSellers data={topSellersData} />

                </div>

                {/* RIGHT COLUMN (1/3) */}
                <div className="space-y-8">

                    {/* Admin AI Insights */}
                    <section
                        className="p-6 rounded-3xl bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] border border-[var(--border-subtle)] relative overflow-hidden"
                        aria-labelledby="admin-insights-heading"
                        aria-busy={insightsLoading}
                        aria-live="polite"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-blue)]/10 blur-3xl rounded-full pointer-events-none" />
                        <div className="flex items-center gap-3 relative z-10 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--primary-blue)] text-white flex items-center justify-center" aria-hidden>
                                <BrainCircuit className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 id="admin-insights-heading" className="font-bold text-[var(--text-primary)]">AI Insights</h3>
                                <p className="text-xs text-[var(--text-muted)]">Platform-level recommendations</p>
                            </div>
                        </div>
                        {insightsLoading ? (
                            <div className="space-y-3 relative z-10" aria-hidden>
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                            </div>
                        ) : adminInsights.length === 0 ? (
                            <p className="text-sm text-[var(--text-muted)] relative z-10">No insights right now. Platform metrics are healthy.</p>
                        ) : (
                            <ul className="space-y-3 relative z-10" role="list">
                                {adminInsights.map((insight, index) => {
                                    const config = ADMIN_INSIGHTS_TYPE_CONFIG[insight.type] ?? ADMIN_INSIGHTS_TYPE_CONFIG.efficiency;
                                    const Icon = config.icon;
                                    const accent = config.accentColor;
                                    return (
                                        <li key={insight.id}>
                                            <motion.article
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--border-default)] transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${accent}20` }} aria-hidden>
                                                        <Icon className="w-4 h-4" style={{ color: accent }} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{insight.title}</h4>
                                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{insight.description}</p>
                                                        {insight.impact?.formatted && (
                                                            <p className="text-xs mt-1.5 font-medium" style={{ color: accent }}>{insight.impact.formatted}</p>
                                                        )}
                                                        {insight.action?.endpoint && (
                                                            <Link
                                                                href={insight.action.endpoint}
                                                                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)]"
                                                                aria-label={`${insight.action.label} for ${insight.title}`}
                                                            >
                                                                {insight.action.label}
                                                                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.article>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {/* Order Status Distribution (Donut Chart) */}
                    <div className="p-6 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                        <h3 className="font-bold text-[var(--text-primary)] mb-2">Order Status</h3>
                        <p className="text-xs text-[var(--text-muted)] mb-4">Delivered, Pending, and In transit / Other (selected period)</p>
                        <div className="h-[250px] relative">
                            {orderStatusData.length > 0 ? (
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
                                            animationDuration={600}
                                            animationBegin={150}
                                            isAnimationActive
                                        >
                                            {orderStatusData.map((entry) => (
                                                <Cell key={entry.name} fill={entry.color} strokeWidth={0} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                            formatter={(value, name) => {
                                                const total = (adminData?.totalOrders ?? 0) || 1;
                                                const num = Number(value);
                                                const pct = ((num / total) * 100).toFixed(1);
                                                return [`${num.toLocaleString()} (${pct}%)`, name];
                                            }}
                                            itemStyle={{ color: 'var(--text-primary)' }}
                                            labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                                        />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                    <p className="text-sm text-[var(--text-muted)]">No orders in period</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Select a date range with orders to see distribution</p>
                                </div>
                            )}
                            {/* Center Text (only when we have data) */}
                            {orderStatusData.length > 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-bold text-[var(--text-primary)]">
                                        <AnimatedNumber value={adminData?.totalOrders ?? 0} />
                                    </span>
                                    <span className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wide">Orders</span>
                                </div>
                            )}
                        </div>
                        {orderStatusData.length > 0 && (
                            <>
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    {orderStatusData.map((status) => {
                                        const total = adminData?.totalOrders ?? 0;
                                        const pct = total > 0 ? ((status.value / total) * 100).toFixed(1) : '0';
                                        return (
                                            <div key={status.name} className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                                                <span className="text-xs font-medium text-[var(--text-secondary)]">
                                                    {status.name} — {status.value.toLocaleString()} ({pct}%)
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {orderStatusHint != null && (
                                    <p className="text-xs text-[var(--text-muted)] mt-3 italic">{orderStatusHint}</p>
                                )}
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
