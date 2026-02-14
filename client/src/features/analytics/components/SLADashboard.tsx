'use client';

import { Card, CardContent, CardHeader, CardTitle, StatusBadge, Button } from '@/src/components/ui';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { CardSkeleton, ChartSkeleton } from '@/src/components/ui/data/Skeleton';
import { DateRangeFilter } from './DateRangeFilter';
import { useAnalyticsParams } from '@/src/hooks';
import { useSLAPerformance } from '@/src/core/api/hooks/analytics/useAnalytics';
import { ArrowDownRight, ArrowUpRight, Clock, Truck, ShieldAlert, IndianRupee, RefreshCw, type LucideIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useMemo } from 'react';
import { cn } from '@/src/lib/utils';

interface UIMetric {
    type: 'pickup' | 'delivery' | 'ndr' | 'cod';
    label: string;
    target: number;
    actual: number;
    compliance: number;
    trend: number;
    status: 'compliant' | 'warning' | 'breached';
    history: { date: string; value: number }[];
}

const toMetricStatus = (status: string): UIMetric['status'] => {
    if (status === 'excellent' || status === 'good') return 'compliant';
    if (status === 'warning') return 'warning';
    return 'breached';
};

export function SLADashboard() {
    const { timeRange, setTimeRange, apiFilters } = useAnalyticsParams();
    const { data: slaData, isLoading, refetch, isFetching } = useSLAPerformance(apiFilters);

    const metrics = useMemo<UIMetric[]>(() => {
        if (!slaData) return [];
        return [
        {
            type: 'pickup',
            label: slaData.pickupSLA.name,
            target: slaData.pickupSLA.target,
            actual: slaData.pickupSLA.actual,
            compliance: slaData.pickupSLA.compliance,
            trend: 0,
            status: toMetricStatus(slaData.pickupSLA.status),
            history: slaData.timeSeries.map((point) => ({ date: point.date, value: point.pickupOnTime })),
        },
        {
            type: 'delivery',
            label: slaData.deliverySLA.name,
            target: slaData.deliverySLA.target,
            actual: slaData.deliverySLA.actual,
            compliance: slaData.deliverySLA.compliance,
            trend: 0,
            status: toMetricStatus(slaData.deliverySLA.status),
            history: slaData.timeSeries.map((point) => ({ date: point.date, value: point.deliveryOnTime })),
        },
        {
            type: 'ndr',
            label: slaData.ndrResponseSLA.name,
            target: slaData.ndrResponseSLA.target,
            actual: slaData.ndrResponseSLA.actual,
            compliance: slaData.ndrResponseSLA.compliance,
            trend: 0,
            status: toMetricStatus(slaData.ndrResponseSLA.status),
            history: slaData.timeSeries.map((point) => ({ date: point.date, value: point.compliance })),
        },
        {
            type: 'cod',
            label: slaData.codSettlementSLA.name,
            target: slaData.codSettlementSLA.target,
            actual: slaData.codSettlementSLA.actual,
            compliance: slaData.codSettlementSLA.compliance,
            trend: 0,
            status: toMetricStatus(slaData.codSettlementSLA.status),
            history: slaData.timeSeries.map((point) => ({ date: point.date, value: point.compliance })),
        },
    ];
    }, [slaData]);

    const metricVisuals: Record<UIMetric['type'], { icon: LucideIcon; color: string }> = {
        pickup: { icon: Truck, color: '#3B82F6' },
        delivery: { icon: Clock, color: '#10B981' },
        ndr: { icon: ShieldAlert, color: '#F59E0B' },
        cod: { icon: IndianRupee, color: '#8B5CF6' },
    };

    const SLACard = ({ metric }: { metric: UIMetric }) => {
        const { icon: Icon, color } = metricVisuals[metric.type];
        const isPositive = metric.trend >= 0;

        return (
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 rounded-lg bg-opacity-10" style={{ backgroundColor: `${color}20` }}>
                                <Icon className="w-5 h-5" style={{ color }} />
                            </div>
                            <StatusBadge
                                domain="webhook"
                                status={metric.status === 'compliant' ? 'active' : metric.status === 'breached' ? 'error' : 'inactive'}
                                size="sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm font-medium text-[var(--text-muted)]">{metric.label}</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                                    {metric.type === 'ndr' || metric.type === 'cod' ? metric.actual : `${metric.actual}%`}
                                    <span className="text-xs font-normal text-[var(--text-tertiary)] ml-1">
                                        {metric.type === 'ndr' ? 'hours' : metric.type === 'cod' ? 'days' : ''}
                                    </span>
                                </h3>
                                <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                    {Math.abs(metric.trend)}%
                                </span>
                            </div>
                            <p className="text-xs text-[var(--text-tertiary)] mt-2">
                                Target: {metric.type === 'ndr' || metric.type === 'cod' ? `< ${metric.target}` : `> ${metric.target}%`}
                            </p>
                        </div>
                    </div>

                    <div className="h-16 w-full opacity-50">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metric.history}>
                                <defs>
                                    <linearGradient id={`gradient-${metric.type}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="value" stroke={color} fill={`url(#gradient-${metric.type})`} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (isLoading || !slaData) {
        return (
            <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
                <PageHeader
                    title="SLA Dashboard"
                    description="Monitor your operational performance and SLA compliance in real-time."
                    breadcrumbs={[
                        { label: 'Analytics', href: '/seller/analytics' },
                        { label: 'SLA Dashboard', active: true },
                    ]}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
                <ChartSkeleton height={300} />
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="SLA Dashboard"
                description="Monitor your operational performance and SLA compliance in real-time."
                breadcrumbs={[
                    { label: 'Analytics', href: '/seller/analytics' },
                    { label: 'SLA Dashboard', active: true },
                ]}
                backUrl="/seller/analytics"
                actions={
                    <div className="flex items-center gap-3">
                        <DateRangeFilter value={timeRange} onChange={setTimeRange} />
                        <Button
                            onClick={() => refetch()}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm',
                                isFetching && 'animate-spin'
                            )}
                            title="Refresh"
                            aria-label="Refresh SLA data"
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric) => (
                    <SLACard key={metric.type} metric={metric} />
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Compliance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={slaData.timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <Tooltip />
                                <Area type="monotone" dataKey="compliance" name="Overall Compliance (%)" stroke="#10B981" fillOpacity={1} fill="url(#colorCompliance)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

