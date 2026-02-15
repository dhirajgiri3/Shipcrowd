"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
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
import { IndianRupee, Package, Truck, Percent } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

const COLORS = ['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AnalyticsClient() {
    const { dateRange, setDateRange, trendData, sellerDistribution, summary, isLoading } = useAnalyticsPage();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Analytics & Reports</h2>
                    <p className="text-[var(--text-secondary)]">Platform trend and seller distribution based on live admin dashboard data.</p>
                </div>
                <DateRangePicker value={dateRange} onRangeChange={setDateRange} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Total Revenue" value={formatCurrency(summary.totalRevenue)} icon={IndianRupee} />
                <StatsCard title="Total Orders" value={summary.totalOrders.toLocaleString()} icon={Package} />
                <StatsCard title="Total Shipments" value={summary.totalShipments.toLocaleString()} icon={Truck} />
                <StatsCard title="Success Rate" value={`${summary.successRate.toFixed(1)}%`} icon={Percent} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Orders & Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[320px]">
                        {isLoading ? (
                            <ChartSkeleton height={300} />
                        ) : (
                            <AreaChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="orders" stroke="#2563eb" fill="#2563eb22" />
                                <Area type="monotone" dataKey="revenue" stroke="#14b8a6" fill="#14b8a622" />
                            </AreaChart>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Seller Order Share</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[320px]">
                        {isLoading ? (
                            <ChartSkeleton height={300} />
                        ) : (
                            <PieChart>
                                <Pie data={sellerDistribution} dataKey="value" nameKey="name" outerRadius={110}>
                                    {sellerDistribution.map((entry, index) => (
                                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
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
