"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { endOfDay, startOfDay, startOfMonth, subDays, isSameDay } from 'date-fns';

import { motion } from 'framer-motion';
import { Button } from '@/src/components/ui/core/Button';
import { AnimatedNumber } from '@/src/hooks/utility/useCountUp';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import {
    AlertTriangle,
    ArrowUpRight,
    BrainCircuit,
    CheckCircle2,
    Clock,
    DollarSign,
    Package,
    PackageX,
    RefreshCw,
    RotateCcw,
    Settings,
    Shield,
    ShoppingCart,
    Target,
    Truck,
    TrendingDown,
    Users,
    X,
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
import { useAdminPlatformDisputeMetrics } from '@/src/core/api/hooks/admin/disputes/useAdminDisputes';
import { type DateRange } from '@/src/lib/data';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import type { SmartInsight } from '@/src/core/api/hooks/analytics/useSmartInsights';
import type { AdminDashboard } from '@/src/types/api/analytics';
import { useUrlDateRange } from '@/src/hooks/analytics/useUrlDateRange';
import { toEndOfDayIso, toStartOfDayIso } from '@/src/lib/utils/date';

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

/** Sleek donut palette (order: Pending, Delivered, RTO, In Transit) — indigo, teal, slate, violet */
const ORDER_PIPELINE_DONUT_PALETTE = ['#6366f1', '#0d9488', '#64748b', '#a78bfa'];

// --- COMPONENTS ---

const buildPresetRange = (type: '7d' | '30d' | '90d' | 'mtd'): DateRange => {
    const now = new Date();
    const to = endOfDay(now);
    if (type === 'mtd') {
        return { from: startOfMonth(now), to, label: 'This Month' };
    }

    const days = type === '7d' ? 7 : type === '30d' ? 30 : 90;
    return {
        from: startOfDay(subDays(to, days - 1)),
        to,
        label: `Last ${days} Days`,
    };
};

const CSV_QUOTE = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** Build well-structured CSV from dashboard data (UTF-8 with BOM for Excel). */
function buildDashboardCsv(
    adminData: AdminDashboard | undefined,
    revenueGraph: Array<{ _id: string; revenue?: number; orders?: number }>,
    topSellersData: Array<{ companyName: string; totalOrders: number; totalRevenue: number; companyId: string }>,
    orderStatusData: Array<{ name: string; value: number }>,
    adminInsights: Array<{ title: string; description: string; impact?: { formatted: string }; action?: { label: string; endpoint?: string }; confidence?: number }>,
    dateLabel: string,
    exportedAt: string
): string {
    const rows: string[] = [];
    const nl = '\r\n';

    // UTF-8 BOM for Excel and other tools
    rows.push('\uFEFF');

    // ---- Meta ----
    rows.push('Admin Dashboard Export');
    rows.push(CSV_QUOTE('Exported at') + ',' + CSV_QUOTE(exportedAt));
    rows.push(CSV_QUOTE('Date range') + ',' + CSV_QUOTE(dateLabel));
    rows.push('');
    rows.push('---');
    rows.push('');

    // ---- 1. Summary ----
    rows.push(CSV_QUOTE('SECTION: Summary'));
    rows.push(CSV_QUOTE('Metric') + ',' + CSV_QUOTE('Value') + ',' + CSV_QUOTE('Unit'));
    if (adminData) {
        rows.push(CSV_QUOTE('Total Revenue') + ',' + (adminData.totalRevenue ?? 0) + ',' + CSV_QUOTE('INR'));
        rows.push(CSV_QUOTE('Total Orders') + ',' + (adminData.totalOrders ?? 0) + ',' + CSV_QUOTE('count'));
        rows.push(CSV_QUOTE('Active Sellers') + ',' + (adminData.totalRegisteredSellers ?? 0) + ',' + CSV_QUOTE('count'));
        const sr = adminData.successRateBasedOnAttempts && adminData.globalSuccessRate != null
            ? `${Number(adminData.globalSuccessRate).toFixed(1)}%`
            : 'N/A';
        rows.push(CSV_QUOTE('Success Rate') + ',' + CSV_QUOTE(sr) + ',' + CSV_QUOTE('percent'));
        rows.push(CSV_QUOTE('Orders to Ship') + ',' + (adminData.pendingOrders ?? 0) + ',' + CSV_QUOTE('count'));
        rows.push(CSV_QUOTE('Delivered Orders') + ',' + (adminData.deliveredOrders ?? 0) + ',' + CSV_QUOTE('count'));
        rows.push(CSV_QUOTE('Attempted Deliveries') + ',' + (adminData.attemptedDeliveries ?? 0) + ',' + CSV_QUOTE('count'));
    } else {
        rows.push(CSV_QUOTE('No data'));
    }
    rows.push('');
    rows.push('---');
    rows.push('');

    // ---- 2. Revenue & Orders by Date ----
    rows.push(CSV_QUOTE('SECTION: Revenue & Orders by Date'));
    rows.push(CSV_QUOTE('Date') + ',' + CSV_QUOTE('Revenue (INR)') + ',' + CSV_QUOTE('Orders'));
    if (revenueGraph.length > 0) {
        revenueGraph.forEach((d) => {
            const dateFormatted = d._id ? new Date(d._id).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : d._id;
            rows.push(CSV_QUOTE(dateFormatted) + ',' + (d.revenue ?? 0) + ',' + (d.orders ?? 0));
        });
    } else {
        rows.push(CSV_QUOTE('No data'));
    }
    rows.push('');
    rows.push('---');
    rows.push('');

    // ---- 3. Top Sellers ----
    rows.push(CSV_QUOTE('SECTION: Top Sellers'));
    rows.push(CSV_QUOTE('Rank') + ',' + CSV_QUOTE('Company') + ',' + CSV_QUOTE('Orders') + ',' + CSV_QUOTE('Revenue (INR)'));
    if (topSellersData.length > 0) {
        topSellersData.forEach((d, i) => {
            rows.push((i + 1) + ',' + CSV_QUOTE(d.companyName) + ',' + d.totalOrders + ',' + (d.totalRevenue ?? 0));
        });
    } else {
        rows.push(CSV_QUOTE('No data'));
    }
    rows.push('');
    rows.push('---');
    rows.push('');

    // ---- 4. Order Status ----
    rows.push(CSV_QUOTE('SECTION: Order Status'));
    const totalOrders = adminData?.totalOrders ?? 0;
    rows.push(CSV_QUOTE('Status') + ',' + CSV_QUOTE('Count') + ',' + CSV_QUOTE('Percentage'));
    if (orderStatusData.length > 0 && totalOrders > 0) {
        orderStatusData.forEach((d) => {
            const pct = ((d.value / totalOrders) * 100).toFixed(1);
            rows.push(CSV_QUOTE(d.name) + ',' + d.value + ',' + CSV_QUOTE(pct + '%'));
        });
    } else if (orderStatusData.length > 0) {
        orderStatusData.forEach((d) => rows.push(CSV_QUOTE(d.name) + ',' + d.value + ',' + CSV_QUOTE('')));
    } else {
        rows.push(CSV_QUOTE('No data'));
    }
    rows.push('');
    rows.push('---');
    rows.push('');

    // ---- 5. AI Insights ----
    rows.push(CSV_QUOTE('SECTION: AI Insights (platform-level, last 30 days)'));
    rows.push(CSV_QUOTE('Title') + ',' + CSV_QUOTE('Description') + ',' + CSV_QUOTE('Impact') + ',' + CSV_QUOTE('Action') + ',' + CSV_QUOTE('Confidence %'));
    if (adminInsights.length > 0) {
        adminInsights.forEach((i) => {
            rows.push(
                CSV_QUOTE(i.title) + ',' +
                CSV_QUOTE(i.description) + ',' +
                CSV_QUOTE(i.impact?.formatted ?? '') + ',' +
                CSV_QUOTE((i.action?.label ?? '') + (i.action?.endpoint ? ` (${i.action.endpoint})` : '')) + ',' +
                (i.confidence ?? '')
            );
        });
    } else {
        rows.push(CSV_QUOTE('No insights in this period'));
    }

    return rows.join(nl);
}

function formatTimeAgo(date: Date): string {
    const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    return hr === 1 ? '1 hr ago' : `${hr} hrs ago`;
}

export function DashboardClient() {
    const router = useRouter();
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [exporting, setExporting] = useState(false);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [alertBannerDismissed, setAlertBannerDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return sessionStorage.getItem('admin_dashboard_alert_dismissed') === '1';
    });
    const {
        range: dateRange,
        startDateIso,
        endDateIso,
        setRange: setDateRange,
    } = useUrlDateRange();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Date range for admin dashboard API (ISO date strings)
    const adminFilters = useMemo(
        () => ({
            startDate: startDateIso,
            endDate: endDateIso,
        }),
        [endDateIso, startDateIso]
    );

    // --- API HOOKS ---
    const { data: adminData, isLoading: adminLoading, error: adminError, refetch: refetchAdmin } = useAdminDashboard(adminFilters);
    const { data: adminInsights = [], isLoading: insightsLoading } = useAdminInsights();
    const { data: disputeMetrics } = useAdminPlatformDisputeMetrics(adminFilters);

    useEffect(() => {
        if (adminData && !adminLoading) setLastRefreshedAt(new Date());
    }, [adminData, adminLoading]);

    // --- DATA TRANSFORMATION ---

    const revenueTrendData = useMemo(() => {
        if (!adminData?.revenueGraph?.length) return [];
        return adminData.revenueGraph.map((point) => ({
            name: new Date(point._id).toLocaleDateString('en-US', { weekday: 'short' }),
            fullDate: point._id,
            revenue: point.revenue ?? 0,
            orders: point.orders ?? 0,
        }));
    }, [adminData]);

    const handleRevenuePointClick = useCallback(
        (payload?: { fullDate?: string }) => {
            if (!payload?.fullDate) return;
            const pointDate = new Date(payload.fullDate);
            if (Number.isNaN(pointDate.getTime())) return;
            router.push(
                `/admin/orders?startDate=${encodeURIComponent(toStartOfDayIso(pointDate))}&endDate=${encodeURIComponent(toEndOfDayIso(pointDate))}&page=1`
            );
        },
        [router]
    );

    /** Order status breakdown: To Ship primary, Delivered secondary, then RTO and In Transit. */
    const orderStatusData = useMemo(() => {
        if (!adminData) return [];
        const { totalOrders, pendingOrders, deliveredOrders, rtoCount } = adminData;
        const delivered = deliveredOrders ?? 0;
        const pending = pendingOrders ?? 0;
        const rto = rtoCount ?? 0;
        const other = Math.max(0, (totalOrders ?? 0) - pending - delivered - rto);
        return [
            { name: 'To Ship', value: pending, color: 'var(--warning)' },
            { name: 'Delivered', value: delivered, color: 'var(--success)' },
            { name: 'RTO', value: rto, color: 'var(--error)' },
            { name: 'In Transit / Other', value: other, color: 'var(--primary-blue)' },
        ];
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
        const pending = orderStatusData.find((s) => s.name === 'To Ship')?.value ?? 0;
        if (delivered >= pending && delivered > 0) return 'Most orders delivered';
        if (pending > delivered) return 'High to-ship share';
        return null;
    }, [orderStatusData, adminData?.totalOrders]);

    /** Order status segments with percentage and orders URL filter for drill-down. All four statuses for accurate display. */
    const orderStatusSegments = useMemo(() => {
        const total = adminData?.totalOrders ?? 0;
        if (!orderStatusData.length) return [];
        return orderStatusData.map((s) => ({
            ...s,
            pct: total > 0 ? (s.value / total) * 100 : 0,
            statusKey: s.name === 'Delivered' ? 'delivered' : s.name === 'To Ship' ? 'unshipped' : s.name === 'RTO' ? 'rto' : 'shipped',
        }));
    }, [orderStatusData, adminData?.totalOrders]);

    /** Date range query params for drill-down links (align orders list with dashboard period) */
    const orderDrillDownParams = useMemo(() => {
        const start = adminFilters.startDate ?? '';
        const end = adminFilters.endDate ?? '';
        if (!start || !end) return '';
        return `&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
    }, [adminFilters.startDate, adminFilters.endDate]);

    /** Segments with value > 0 for donut and stacked bar (avoid zero-width slices) */
    const orderStatusSegmentsWithVolume = useMemo(
        () => orderStatusSegments.filter((s) => s.value > 0),
        [orderStatusSegments]
    );

    const criticalInsight = useMemo(
        () => adminInsights.find((i) => i.priority === 'high'),
        [adminInsights]
    );
    const showCriticalBanner = criticalInsight && !alertBannerDismissed;
    const dismissAlertBanner = useCallback(() => {
        setAlertBannerDismissed(true);
        if (typeof window !== 'undefined') sessionStorage.setItem('admin_dashboard_alert_dismissed', '1');
    }, []);

    const prev = adminData?.previousPeriod;
    const trendRevenue = useMemo(() => {
        if (!prev || prev.totalRevenue === 0) return undefined;
        const pct = (((adminData?.totalRevenue ?? 0) - prev.totalRevenue) / prev.totalRevenue) * 100;
        return { value: Math.round(pct * 10) / 10, label: 'vs previous period', positive: pct >= 0 };
    }, [adminData?.totalRevenue, prev?.totalRevenue]);
    const trendOrders = useMemo(() => {
        if (!prev || prev.totalOrders === 0) return undefined;
        const pct = (((adminData?.totalOrders ?? 0) - prev.totalOrders) / prev.totalOrders) * 100;
        return { value: Math.round(pct * 10) / 10, label: 'vs previous period', positive: pct >= 0 };
    }, [adminData?.totalOrders, prev?.totalOrders]);
    const trendSuccessRate = useMemo(() => {
        if (!prev || !adminData?.successRateBasedOnAttempts || adminData?.globalSuccessRate == null) return undefined;
        const curr = adminData.globalSuccessRate;
        const pct = curr - prev.globalSuccessRate;
        return { value: Math.round(pct * 10) / 10, label: 'vs previous period', positive: pct >= 0 };
    }, [adminData?.successRateBasedOnAttempts, adminData?.globalSuccessRate, prev?.globalSuccessRate]);

    const avgOrderValue = useMemo(() => {
        const orders = adminData?.totalOrders ?? 0;
        const revenue = adminData?.totalRevenue ?? 0;
        if (orders <= 0) return null;
        return revenue / orders;
    }, [adminData?.totalOrders, adminData?.totalRevenue]);

    const needsAttentionSep1 = (adminData?.pendingOrders ?? 0) > 0 && ((adminData?.ndrCases ?? 0) > 0 || ((disputeMetrics?.pending ?? 0) + (disputeMetrics?.underReview ?? 0) > 0));

    const dateLabel = useMemo(
        () => `${dateRange.from.toLocaleDateString()} – ${dateRange.to.toLocaleDateString()}`,
        [dateRange.from, dateRange.to]
    );
    const presetChips = useMemo(
        () => [
            { short: '7D', range: buildPresetRange('7d') },
            { short: '30D', range: buildPresetRange('30d') },
            { short: '90D', range: buildPresetRange('90d') },
            { short: 'MTD', range: buildPresetRange('mtd') },
        ],
        []
    );

    const handleExportDashboard = useCallback(() => {
        setExporting(true);
        try {
            const exportedAt = new Date().toISOString();
            const revenueGraph = adminData?.revenueGraph ?? [];
            const csv = buildDashboardCsv(
                adminData,
                revenueGraph,
                topSellersData,
                orderStatusData,
                adminInsights,
                dateLabel,
                exportedAt
            );
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
    }, [adminData, topSellersData, orderStatusData, adminInsights, dateLabel, dateRange.from, dateRange.to]);

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5].map((i) => (
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
            {/* Skip to Needs attention (when there are items) - first focusable for a11y */}
            {adminData && ((adminData.pendingOrders ?? 0) > 0 || (adminData.ndrCases ?? 0) > 0 || ((disputeMetrics?.pending ?? 0) + (disputeMetrics?.underReview ?? 0) > 0)) && (
                <a
                    href="#needs-attention-block"
                    className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--primary-blue)] focus:text-white focus:outline-none"
                >
                    Skip to Needs attention
                </a>
            )}
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
                        {lastRefreshedAt && (
                            <>
                                <span className="text-[var(--text-muted)]">•</span>
                                <span className="text-[var(--text-muted)]" title={lastRefreshedAt.toLocaleString()}>
                                    Data: {formatTimeAgo(lastRefreshedAt)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => refetchAdmin()}
                                    className="ml-1 p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    title="Refresh dashboard data"
                                    aria-label="Refresh dashboard data"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                    <h1
                        className="text-4xl font-bold text-[var(--text-primary)] tracking-tight"
                    >
                        Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
                    </h1>
                </motion.div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        {presetChips.map((preset) => {
                            const isActive =
                                isSameDay(preset.range.from, dateRange.from) &&
                                isSameDay(preset.range.to, dateRange.to);
                            return (
                                <button
                                    key={preset.short}
                                    type="button"
                                    onClick={() => setDateRange(preset.range)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-[var(--primary-blue)] text-white'
                                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                                    )}
                                    aria-pressed={isActive}
                                    aria-label={`Set period to ${preset.range.label}`}
                                >
                                    {preset.short}
                                </button>
                            );
                        })}
                    </div>
                    <DateRangePicker value={dateRange} onRangeChange={setDateRange} />
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

            {/* Critical alert banner (high-priority AI insight) */}
            {showCriticalBanner && (
                <motion.section
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-[var(--error)]/30 bg-[var(--error-bg)]"
                    role="alert"
                    aria-live="assertive"
                >
                    <AlertTriangle className="w-5 h-5 shrink-0 text-[var(--error)]" aria-hidden />
                    <p className="text-sm font-medium text-[var(--text-primary)] flex-1 min-w-0">
                        {criticalInsight.title}
                        {' — '}
                        <Link
                            href="#admin-insights-heading"
                            className="text-[var(--primary-blue)] hover:underline"
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('admin-insights-heading')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            Review AI Insights
                        </Link>
                        {' · '}
                        <Link href="/admin/sellers" className="text-[var(--primary-blue)] hover:underline">
                            Seller Health
                        </Link>
                    </p>
                    <button
                        type="button"
                        onClick={dismissAlertBanner}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Dismiss alert"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </motion.section>
            )}

            {/* 2. Key Metrics Grid */}
            <motion.section
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
            >
                <StatsCard
                    title="Total Revenue"
                    value={formatCurrency(adminData?.totalRevenue ?? 0)}
                    icon={DollarSign}
                    variant="success"
                    description={avgOrderValue != null ? `Selected period · Avg ${formatCurrency(avgOrderValue)}/order` : 'Selected period'}
                    trend={trendRevenue}
                    delay={0}
                />
                <StatsCard
                    title="Total Orders"
                    value={adminData?.totalOrders ?? 0}
                    icon={Package}
                    variant="info"
                    description="Selected period"
                    trend={trendOrders}
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
                    trend={trendSuccessRate}
                    delay={3}
                />
                <StatsCard
                    title="RTO Rate"
                    value={adminData?.successRateBasedOnAttempts && adminData?.rtoRate != null
                        ? `${Number(adminData.rtoRate).toFixed(1)}%`
                        : 'N/A'}
                    icon={RotateCcw}
                    variant={
                        !adminData?.successRateBasedOnAttempts
                            ? 'default'
                            : (adminData?.rtoRate ?? 0) <= 10
                                ? 'default'
                                : (adminData?.rtoRate ?? 0) <= 20
                                    ? 'warning'
                                    : 'critical'
                    }
                    description={
                        !adminData?.successRateBasedOnAttempts
                            ? 'No delivery outcomes in period'
                            : `Return to origin (${adminData?.rtoCount ?? 0} orders)`
                    }
                    delay={4}
                />
            </motion.section>

            {/* Quick links & Needs attention */}
            <motion.section
                id="needs-attention-block"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-col gap-3"
                aria-label="Quick links and items needing attention"
            >
                <div
                    className="sr-only"
                    aria-live="polite"
                    aria-atomic="true"
                    role="status"
                >
                    {adminData && ((adminData.pendingOrders ?? 0) > 0 || (adminData.ndrCases ?? 0) > 0 || ((disputeMetrics?.pending ?? 0) + (disputeMetrics?.underReview ?? 0) > 0))
                        ? `${(adminData.pendingOrders ?? 0) + (adminData.ndrCases ?? 0) + (disputeMetrics?.pending ?? 0) + (disputeMetrics?.underReview ?? 0)} items need attention.`
                        : 'No items need attention.'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href="/admin/orders"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-default)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-2"
                    >
                        <ShoppingCart className="w-4 h-4 text-[var(--text-muted)]" />
                        Orders
                        {adminData?.pendingOrders != null && adminData.pendingOrders > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[var(--warning-bg)] text-[var(--warning)] text-xs font-semibold">
                                {adminData.pendingOrders} to ship
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/admin/sellers"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-default)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-2"
                    >
                        <Users className="w-4 h-4 text-[var(--text-muted)]" />
                        Sellers
                    </Link>
                    <Link
                        href="/admin/returns"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-default)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-2"
                    >
                        <PackageX className="w-4 h-4 text-[var(--text-muted)]" />
                        Returns & NDR
                        {adminData?.ndrCases != null && adminData.ndrCases > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[var(--error-bg)] text-[var(--error)] text-xs font-semibold">
                                {adminData.ndrCases} NDR
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/admin/ndr"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-default)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-2"
                    >
                        NDR
                    </Link>
                </div>
                {(adminData && ((adminData.pendingOrders ?? 0) > 0 || (adminData.ndrCases ?? 0) > 0 || ((disputeMetrics?.pending ?? 0) + (disputeMetrics?.underReview ?? 0) > 0))) && (
                    <p className="text-xs text-[var(--text-muted)]">
                        Needs attention: {(adminData.pendingOrders ?? 0) > 0 && (
                            <Link href="/admin/orders" className="text-[var(--primary-blue)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-1 rounded">
                                {(adminData.pendingOrders ?? 0)} orders to ship
                            </Link>
                        )}
                        {needsAttentionSep1 ? ' \u2022 ' : null}
                        {(adminData.ndrCases ?? 0) > 0 && (
                            <Link href="/admin/returns" className="text-[var(--primary-blue)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-1 rounded">
                                {(adminData.ndrCases ?? 0)} NDR cases
                            </Link>
                        )}
                        {(disputeMetrics?.pending ?? 0) + (disputeMetrics?.underReview ?? 0) > 0 && (
                            <>
                                {((adminData.pendingOrders ?? 0) > 0 || (adminData.ndrCases ?? 0) > 0) ? ' \u2022 ' : null}
                                <Link href="/admin/disputes/weight" className="text-[var(--primary-blue)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-1 rounded">
                                    {(disputeMetrics?.pending ?? 0) + (disputeMetrics?.underReview ?? 0)} weight disputes
                                </Link>
                            </>
                        )}
                    </p>
                )}
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
                            <p className="text-sm text-[var(--text-secondary)]">Income vs orders (selected date range). Click a point to view that day&apos;s orders.</p>
                        </div>
                        <div className="h-[350px] w-full">
                            {revenueTrendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={revenueTrendData}
                                        onClick={(e: Record<string, unknown>) => {
                                            const payload = (e?.activePayload as Array<{ payload?: { fullDate?: string } }>)?.[0]?.payload;
                                            handleRevenuePointClick(payload);
                                        }}
                                    >
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
                                        <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="var(--primary-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" cursor="pointer" />
                                        <Area yAxisId="right" type="monotone" dataKey="orders" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" cursor="pointer" />
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

                    {/* Order pipeline — To Ship primary, Delivered secondary; relaxed spacing & responsive */}
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="relative rounded-3xl overflow-hidden border border-[var(--border-subtle)] flex flex-col min-h-[400px] max-h-[480px] bg-[var(--bg-primary)] shadow-sm"
                        aria-labelledby="order-status-heading"
                    >
                        {/* Ambient blobs — kept subtle */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.5]" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -5%, var(--primary-blue) 0%, transparent 50%)' }} />
                        <div className="absolute bottom-0 right-0 w-48 h-32 pointer-events-none opacity-[0.35]" style={{ background: 'radial-gradient(circle at 100% 100%, var(--success) 0%, transparent 55%)' }} />

                        <div className="relative z-10 flex flex-col h-full overflow-hidden">
                            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--border-subtle)] shrink-0">
                                <h3 id="order-status-heading" className="font-bold text-[var(--text-primary)] text-lg">Order pipeline</h3>
                                <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">Outcome mix · click to drill into orders</p>
                            </div>

                            {adminData && adminData.totalOrders === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
                                    <Package className="w-10 h-10 text-[var(--text-secondary)] mb-3 opacity-80" aria-hidden />
                                    <p className="text-sm font-semibold text-[var(--text-secondary)]">No orders in period</p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">Select a date range with orders</p>
                                </div>
                            ) : adminData ? (
                                <div className="flex-1 overflow-auto px-4 sm:px-6 py-5 sm:py-6">
                                    {/* Hero: To Ship primary, Delivered secondary */}
                                    {(() => {
                                        const total = adminData?.totalOrders ?? 0;
                                        const pending = orderStatusData.find((s) => s.name === 'To Ship')?.value ?? 0;
                                        const delivered = orderStatusData.find((s) => s.name === 'Delivered')?.value ?? 0;
                                        const pendingPct = total > 0 ? (pending / total) * 100 : 0;
                                        const deliveredPct = total > 0 ? (delivered / total) * 100 : 0;
                                        return (
                                            <div className="flex flex-wrap items-baseline gap-4 sm:gap-5 mb-4 sm:mb-5">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tabular-nums"><AnimatedNumber value={pending} /></span>
                                                    <span className="text-sm font-medium text-[var(--text-secondary)]">to ship</span>
                                                </div>
                                                <span className="text-[var(--text-muted)]">·</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tabular-nums"><AnimatedNumber value={delivered} /></span>
                                                    <span className="text-sm font-medium text-[var(--text-secondary)]">delivered</span>
                                                </div>
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    {total > 0 && (
                                                        <span className="tabular-nums">{pendingPct.toFixed(1)}% to ship · {deliveredPct.toFixed(1)}% delivered</span>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })()}

                                    {/* Donut — medium, centered */}
                                    <div className="flex justify-center my-4 sm:my-6">
                                        <div className="relative w-[160px] h-[160px] sm:w-[180px] sm:h-[180px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsPieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                                    <defs>
                                                        {orderStatusSegmentsWithVolume.map((seg, i) => {
                                                            const fullIndex = orderStatusSegments.findIndex((s) => s.name === seg.name);
                                                            const donutColor = ORDER_PIPELINE_DONUT_PALETTE[fullIndex] ?? ORDER_PIPELINE_DONUT_PALETTE[i];
                                                            return (
                                                                <linearGradient key={seg.name} id={`order-donut-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                                                                    <stop offset="0%" stopColor={donutColor} stopOpacity={1} />
                                                                    <stop offset="100%" stopColor={donutColor} stopOpacity={0.7} />
                                                                </linearGradient>
                                                            );
                                                        })}
                                                    </defs>
                                                    <Pie
                                                        data={orderStatusSegmentsWithVolume}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={52}
                                                        outerRadius={72}
                                                        paddingAngle={3}
                                                        stroke="var(--bg-primary)"
                                                        strokeWidth={4}
                                                        animationDuration={800}
                                                        animationBegin={200}
                                                        onClick={(data: { name: string }) => {
                                                            const seg = orderStatusSegments.find((s) => s.name === data.name);
                                                            if (seg) router.push(`/admin/orders?status=${seg.statusKey}&page=1${orderDrillDownParams}`);
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        {orderStatusSegmentsWithVolume.map((seg, i) => (
                                                            <Cell key={seg.name} fill={`url(#order-donut-grad-${i})`} className="cursor-pointer hover:opacity-90 transition-opacity" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                                        formatter={(value, name, props) => {
                                                            const num = typeof value === 'number' ? value : Number(value);
                                                            const pct = (props?.payload as { pct?: number } | undefined)?.pct ?? 0;
                                                            return [`${num.toLocaleString()} (${pct.toFixed(1)}%)`, String(name)];
                                                        }}
                                                    />
                                                </RechartsPieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-hidden>
                                                <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                                                    <AnimatedNumber value={adminData?.totalOrders ? Math.round(((orderStatusData.find((s) => s.name === 'To Ship')?.value ?? 0) / adminData.totalOrders) * 100) : 0} />
                                                    %
                                                </span>
                                                <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">To Ship</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4 status cards — below donut, 2 columns × 2 rows */}
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        {orderStatusSegments.map((seg, i) => {
                                            const Icon = seg.name === 'Delivered' ? CheckCircle2 : seg.name === 'To Ship' ? Clock : seg.name === 'RTO' ? RotateCcw : Truck;
                                            const isPrimary = seg.name === 'To Ship';
                                            return (
                                                <Link
                                                    key={seg.name}
                                                    href={`/admin/orders?status=${seg.statusKey}&page=1${orderDrillDownParams}`}
                                                    className={cn(
                                                        'group flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-200',
                                                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-1',
                                                        'hover:bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]',
                                                        isPrimary && 'ring-1 ring-[var(--warning)]/30 bg-[var(--warning)]/5'
                                                    )}
                                                    style={{ borderLeftWidth: '4px', borderLeftColor: seg.color }}
                                                >
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${seg.color}20`, color: seg.color }}>
                                                        <Icon className="w-5 h-5" strokeWidth={2.25} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn('text-xs font-semibold text-[var(--text-primary)] truncate', isPrimary && 'font-bold')}>{seg.name}</p>
                                                        <p className={cn('tabular-nums text-[var(--text-primary)]', isPrimary ? 'text-lg font-bold' : 'text-sm font-bold')}><AnimatedNumber value={seg.value} /></p>
                                                        <p className="text-xs text-[var(--text-secondary)]">{seg.pct.toFixed(1)}%</p>
                                                        <div className="mt-2 h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                                                            <motion.div className="h-full rounded-full" style={{ backgroundColor: seg.color }} initial={{ width: 0 }} animate={{ width: `${seg.pct}%` }} transition={{ duration: 0.5, delay: i * 0.05 }} />
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>

                                    {orderStatusHint != null && (
                                        <p className="text-xs text-[var(--text-secondary)] mt-3 sm:mt-4 italic">{orderStatusHint}</p>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </motion.section>

                </div>
            </div>
        </div>
    );
}
