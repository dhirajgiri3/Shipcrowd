'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAnalytics } from '@/src/core/api/hooks';
import { AnalyticsSection } from '@/src/components/seller/dashboard/AnalyticsSection';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { Button } from '@/src/components/ui/core/Button';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { SpinnerLoader, EmptyState } from '@/src/components/ui';
import { formatCurrency, cn } from '@/src/lib/utils';
import {
    FileOutput,
    Package,
    TrendingUp,
    CheckCircle2,
    Clock,
    RefreshCw,
    FileText,
    Gauge,
    IndianRupee,
    Truck,
} from 'lucide-react';
import { differenceInCalendarDays, endOfDay, isSameDay, startOfDay, subDays, subYears } from 'date-fns';
import { useUrlDateRange } from '@/src/hooks';
import { useSellerExport } from '@/src/core/api/hooks/seller/useSellerExports';

// Expected shape for AnalyticsSection
interface AnalyticsDisplayData {
    orderTrend: { labels: string[]; values: number[] };
    topCouriers: Array<{ name: string; orders: number; avgCost: number }>;
    zoneDistribution: Array<{ zone: string; percentage: number; orders: number }>;
}

// Backend API response shape (seller dashboard)
interface SellerDashboardResponse {
    totalOrders?: number;
    totalRevenue?: number;
    successRate?: number;
    codPending?: { amount?: number; count?: number };
    deltas?: { revenue?: number; profit?: number; orders?: number };
    weeklyTrend?: Array<{ _id: string; orders: number; revenue?: number; profit?: number }>;
    noCompany?: boolean;
    topCouriers?: Array<{ name: string; orders?: number; count?: number; avgCost?: number }>;
    zoneDistribution?: Array<{ zone: string; percentage?: number; value?: number; orders?: number }>;
}

const PERIOD_TABS = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '1y', label: '1 Year' },
] as const;

type PeriodKey = (typeof PERIOD_TABS)[number]['key'];
type PeriodState = PeriodKey | 'custom';

const PERIOD_TO_DAYS: Record<PeriodKey, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
};

const getRangeForPeriod = (period: PeriodKey) => {
    const today = new Date();
    const to = endOfDay(today);
    if (period === '1y') {
        const from = startOfDay(subYears(today, 1));
        return { from, to, label: 'Last 1 Year' };
    }
    const days = PERIOD_TO_DAYS[period];
    const from = startOfDay(subDays(today, days - 1));
    return { from, to, label: `Last ${days} Days` };
};

// Mock data for fallback when API returns incompatible or empty data for charts
const MOCK_ANALYTICS_DATA: AnalyticsDisplayData = {
    orderTrend: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        values: [120, 145, 165, 180, 195, 210]
    },
    topCouriers: [
        { name: 'Delhivery', orders: 450, avgCost: 45 },
        { name: 'BlueDart', orders: 320, avgCost: 65 },
        { name: 'Ecom Express', orders: 280, avgCost: 40 }
    ],
    zoneDistribution: [
        { zone: 'North', percentage: 35, orders: 420 },
        { zone: 'South', percentage: 30, orders: 360 },
        { zone: 'West', percentage: 20, orders: 240 },
        { zone: 'East', percentage: 15, orders: 180 }
    ]
};

/**
 * Normalize API response to AnalyticsSection expected format.
 * Backend /analytics/dashboard/seller returns: weeklyTrend, totalOrders, etc.
 * AnalyticsSection expects: orderTrend { labels, values }, topCouriers, zoneDistribution.
 */
function normalizeToDisplayData(apiData: SellerDashboardResponse | null | undefined): AnalyticsDisplayData {
    if (!apiData) return MOCK_ANALYTICS_DATA;

    const weeklyTrend = apiData.weeklyTrend ?? (apiData as any).orderTrend;
    let orderTrend: { labels: string[]; values: number[] };
    if (Array.isArray(weeklyTrend) && weeklyTrend.length > 0) {
        orderTrend = {
            labels: weeklyTrend.map((d: any) => d._id ?? d.date ?? d.label ?? ''),
            values: weeklyTrend.map((d: any) => d.orders ?? d.value ?? 0)
        };
    } else if ((apiData as any).orderTrend && typeof (apiData as any).orderTrend === 'object') {
        const ot = (apiData as any).orderTrend;
        orderTrend = {
            labels: Array.isArray(ot.labels) ? ot.labels : [],
            values: Array.isArray(ot.values) ? ot.values : []
        };
    } else {
        orderTrend = MOCK_ANALYTICS_DATA.orderTrend;
    }

    let topCouriers: Array<{ name: string; orders: number; avgCost: number }>;
    if (Array.isArray(apiData.topCouriers) && apiData.topCouriers.length > 0) {
        topCouriers = apiData.topCouriers.map((c: any) => ({
            name: c.name ?? c.carrier ?? 'Unknown',
            orders: c.orders ?? c.count ?? 0,
            avgCost: c.avgCost ?? c.avg_cost ?? 0
        }));
    } else {
        topCouriers = MOCK_ANALYTICS_DATA.topCouriers;
    }

    let zoneDistribution: Array<{ zone: string; percentage: number; orders: number }>;
    if (Array.isArray(apiData.zoneDistribution) && apiData.zoneDistribution.length > 0) {
        zoneDistribution = apiData.zoneDistribution.map((z: any) => ({
            zone: z.zone ?? z.name ?? 'Unknown',
            percentage: z.percentage ?? z.value ?? 0,
            orders: z.orders ?? 0
        }));
    } else {
        zoneDistribution = MOCK_ANALYTICS_DATA.zoneDistribution;
    }

    return { orderTrend, topCouriers, zoneDistribution };
}

export function AnalyticsClient() {
    const router = useRouter();
    const [period, setPeriod] = useState<PeriodState>('30d');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const exportSellerData = useSellerExport();
    const {
        range: dateRange,
        startDateIso,
        endDateIso,
        setRange,
    } = useUrlDateRange();

    useEffect(() => {
        const from = startOfDay(dateRange.from);
        const to = endOfDay(dateRange.to);
        const today = endOfDay(new Date());
        const days = differenceInCalendarDays(to, from) + 1;
        const isCurrentRange = isSameDay(to, today);

        if (isCurrentRange && days === 7) {
            setPeriod('7d');
            return;
        }
        if (isCurrentRange && days === 30) {
            setPeriod('30d');
            return;
        }
        if (isCurrentRange && days === 90) {
            setPeriod('90d');
            return;
        }
        if (days >= 365 && days <= 366) {
            setPeriod('1y');
            return;
        }

        setPeriod('custom');
    }, [dateRange.from, dateRange.to]);

    const handlePeriodChange = useCallback((nextPeriod: PeriodKey) => {
        setPeriod(nextPeriod);
        setRange(getRangeForPeriod(nextPeriod));
    }, [setRange]);

    const { data: analyticsData, isLoading, refetch } = useAnalytics({
        period: period === 'custom' ? undefined : period,
        startDate: startDateIso,
        endDate: endDateIso,
    });

    const apiData = analyticsData as SellerDashboardResponse | undefined;
    const displayData = useMemo(
        () => normalizeToDisplayData(apiData),
        [apiData]
    );
    const showEmptyState = !isLoading && (!analyticsData || apiData?.noCompany);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    };

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Analytics"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Analytics', active: true },
                ]}
                description="Deep dive into your business metrics and shipping performance"
                backUrl="/seller/dashboard"
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <DateRangePicker value={dateRange} onRangeChange={setRange} />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={cn(
                                'h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm',
                                isRefreshing && 'animate-spin'
                            )}
                            aria-label="Refresh analytics"
                        >
                            <RefreshCw className="h-4 w-4 text-[var(--text-secondary)]" />
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                            onClick={() => exportSellerData.mutate({
                                module: 'analytics_dashboard',
                                filters: {
                                    startDate: startDateIso || undefined,
                                    endDate: endDateIso || undefined,
                                },
                            })}
                        >
                            <FileOutput className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                        <Link href="/seller/analytics/reports">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Reports
                            </Button>
                        </Link>
                        <Link href="/seller/analytics/sla">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                            >
                                <Gauge className="w-4 h-4 mr-2" />
                                SLA
                            </Button>
                        </Link>
                        <Link href="/seller/analytics/costs">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                            >
                                <IndianRupee className="w-4 h-4 mr-2" />
                                Costs
                            </Button>
                        </Link>
                        <Link href="/seller/analytics/courier-comparison">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                            >
                                <Truck className="w-4 h-4 mr-2" />
                                Courier Comparison
                            </Button>
                        </Link>
                    </div>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Orders"
                    value={apiData?.totalOrders ?? 0}
                    icon={Package}
                    iconColor="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                    trend={apiData?.deltas?.orders !== undefined ? { value: apiData.deltas.orders, label: 'vs previous period', positive: apiData.deltas.orders >= 0 } : undefined}
                    delay={0}
                />
                <StatsCard
                    title="Revenue"
                    value={formatCurrency(apiData?.totalRevenue ?? 0)}
                    icon={TrendingUp}
                    iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                    trend={apiData?.deltas?.revenue !== undefined ? { value: apiData.deltas.revenue, label: 'vs previous period', positive: apiData.deltas.revenue >= 0 } : undefined}
                    delay={1}
                />
                <StatsCard
                    title="Success Rate"
                    value={`${apiData?.successRate ?? 0}%`}
                    icon={CheckCircle2}
                    variant="success"
                    delay={2}
                />
                <StatsCard
                    title="COD Pending"
                    value={formatCurrency(apiData?.codPending?.amount ?? 0)}
                    icon={Clock}
                    iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                    description={apiData?.codPending?.count ? `${apiData.codPending.count} orders` : undefined}
                    delay={3}
                />
            </div>

            {/* Period Filter & Content */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <PillTabs
                        tabs={PERIOD_TABS}
                        activeTab={period === 'custom' ? undefined : period}
                        onTabChange={(key) => handlePeriodChange(key as PeriodKey)}
                    />
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <SpinnerLoader size="lg" />
                    </div>
                ) : showEmptyState ? (
                    <EmptyState
                        variant="noData"
                        title="No analytics data yet"
                        description="Complete company setup and create orders to see your metrics."
                        action={{
                            label: 'Go to Dashboard',
                            onClick: () => router.push('/seller/dashboard'),
                        }}
                    />
                ) : (
                    <AnalyticsSection data={displayData} />
                )}
            </div>
        </div>
    );
}
