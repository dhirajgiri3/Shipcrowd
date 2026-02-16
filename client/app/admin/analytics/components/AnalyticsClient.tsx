"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { useAnalyticsPage } from '@/src/core/api/hooks/admin/analytics/useAnalytics';
import {
    LazyAreaChart as AreaChart,
    LazyArea as Area,
    LazyXAxis as XAxis,
    LazyYAxis as YAxis,
    LazyCartesianGrid as CartesianGrid,
    LazyTooltip as Tooltip,
    LazyPieChart as PieChart,
    LazyPie as Pie,
    LazyCell as Cell,
} from '@/src/components/features/charts/LazyCharts';
import { ChartSkeleton } from '@/src/components/ui/data/Skeleton';
import { IndianRupee, Package, Truck, Percent, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

const CHART_COLORS = [
    'var(--primary-blue)',
    'var(--info)',
    'var(--success)',
    'var(--warning)',
    'var(--error)',
    'var(--primary-purple)',
];

export function AnalyticsClient() {
    const { dateRange, setDateRange, trendData, sellerDistribution, summary, isLoading } = useAnalyticsPage();

    const hasTrendData = trendData.length > 0;
    const hasSellerData = sellerDistribution.length > 0;

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[var(--bg-secondary)] min-h-screen">
            <PageHeader
                title="Analytics & Reports"
                description="Platform trend and seller distribution based on live admin dashboard data."
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytics', active: true }]}
                actions={<DateRangePicker value={dateRange} onRangeChange={setDateRange} />}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Total Revenue" value={formatCurrency(summary.totalRevenue)} icon={IndianRupee} />
                <StatsCard title="Total Orders" value={summary.totalOrders.toLocaleString()} icon={Package} />
                <StatsCard title="Total Shipments" value={summary.totalShipments.toLocaleString()} icon={Truck} />
                <StatsCard title="Success Rate" value={`${summary.successRate.toFixed(1)}%`} icon={Percent} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-[var(--border-subtle)]">
                    <CardHeader>
                        <CardTitle>Orders & Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[320px]">
                        {isLoading ? (
                            <ChartSkeleton height={300} />
                        ) : !hasTrendData ? (
                            <EmptyState
                                icon={<BarChart3 className="w-12 h-12" />}
                                variant="noData"
                                title="No trend data"
                                description="No data available for the selected date range."
                            />
                        ) : (
                            <AreaChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="orders" stroke="var(--primary-blue)" fill="var(--primary-blue-soft)" />
                                <Area type="monotone" dataKey="revenue" stroke="var(--success)" fill="var(--success-bg)" />
                            </AreaChart>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-[var(--border-subtle)]">
                    <CardHeader>
                        <CardTitle>Top Seller Order Share</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[320px]">
                        {isLoading ? (
                            <ChartSkeleton height={300} />
                        ) : !hasSellerData ? (
                            <EmptyState
                                icon={<BarChart3 className="w-12 h-12" />}
                                variant="noData"
                                title="No distribution data"
                                description="No seller data available for the selected date range."
                            />
                        ) : (
                            <PieChart>
                                <Pie data={sellerDistribution} dataKey="value" nameKey="name" outerRadius={110}>
                                    {sellerDistribution.map((entry, index) => (
                                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
