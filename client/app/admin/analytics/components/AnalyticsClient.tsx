"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Select } from '@/src/components/ui/form/Select';
import { Button } from '@/src/components/ui/core/Button';
import { ChartCard } from '@/src/components/admin/ChartCard';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { useAnalyticsPage } from '@/src/core/api/hooks/admin/analytics/useAnalytics';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import {
    LazyAreaChart as AreaChart,
    LazyArea as Area,
    LazyXAxis as XAxis,
    LazyYAxis as YAxis,
    LazyCartesianGrid as CartesianGrid,
    LazyTooltip as Tooltip,
    LazyResponsiveContainer as ResponsiveContainer,
    LazyBarChart as BarChart,
    LazyBar as Bar,
    LazyLegend as Legend,
    LazyPieChart as PieChart,
    LazyPie as Pie,
    LazyCell as Cell
} from '@/src/components/features/charts/LazyCharts';
import { ChartSkeleton } from '@/src/components/ui/data/Skeleton';
import { FileOutput, IndianRupee, Package, TrendingUp, Percent, MapPin, Truck } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils'; // Ensure this utility exists or import relevant one

const COLORS = ['var(--primary-blue)', '#4338CA', 'var(--success)', 'var(--warning)', 'var(--error)'];

export function AnalyticsClient() {
    const {
        dateRange,
        handleDateRangeChange,
        deliveryPerformanceData,
        zoneDistribution,
        profitStats,
        isLoadingDelivery,
        isLoadingZones,
        isLoadingProfit
    } = useAnalyticsPage();

    const columns = [
        {
            header: "Date",
            accessorKey: "date",
            cell: (row: any) => new Date(row.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        },
        {
            header: "Total Orders",
            accessorKey: "total",
            cell: (row: any) => row.delivered + row.ndr + row.rto
        },
        {
            header: "Delivered",
            accessorKey: "delivered",
            cell: (row: any) => <span className="text-[var(--success)] font-medium">{row.delivered}</span>
        },
        {
            header: "RTO",
            accessorKey: "rto",
            cell: (row: any) => {
                const total = row.delivered + row.ndr + row.rto;
                const percentage = total > 0 ? ((row.rto / total) * 100).toFixed(1) : "0.0";
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--error)] font-medium">{row.rto}</span>
                        <span className="text-xs text-[var(--text-muted)]">({percentage}%)</span>
                    </div>
                );
            }
        },
        {
            header: "NDR",
            accessorKey: "ndr",
            cell: (row: any) => <span className="text-[var(--warning)] font-medium">{row.ndr}</span>
        },
        {
            header: "Revenue",
            accessorKey: "revenue",
            cell: (row: any) => row.revenue ? formatCurrency(row.revenue) : '-'
        }
    ];

    // Stats Configuration
    const stats = [
        {
            title: "Total Revenue",
            value: formatCurrency(profitStats.totalCharged),
            icon: IndianRupee,
            variant: "default" as const,
            description: "Gross shipping charges collected"
        },
        {
            title: "Total Shipments",
            value: profitStats.totalShipments.toLocaleString(),
            icon: Package,
            variant: "info" as const,
            description: "Total orders processed"
        },
        {
            title: "Total Profit",
            value: formatCurrency(profitStats.totalProfit),
            icon: TrendingUp,
            variant: profitStats.totalProfit >= 0 ? "success" as const : "critical" as const,
            description: "Net profit after costs"
        },
        {
            title: "Avg Margin",
            value: `${profitStats.avgMargin.toFixed(1)}%`,
            icon: Percent,
            variant: profitStats.avgMargin > 15 ? "success" as const : "warning" as const,
            description: "Average profit margin per order"
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Analytics & Reports</h2>
                    <p className="text-[var(--text-secondary)]">Overview of platform performance and financials.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={dateRange}
                        onChange={(e) => handleDateRangeChange(e.target.value)}
                        options={[
                            { label: 'Last 7 Days', value: '7d' },
                            { label: 'Last 30 Days', value: '30d' },
                            { label: 'This Month', value: 'month' },
                        ]}
                        className="w-40"
                    />
                    <Button variant="outline">
                        <FileOutput className="h-4 w-4 mr-2" /> Export PDF
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <StatsCard
                        key={stat.title}
                        {...stat}
                        delay={i}
                        isActive={false}
                    />
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard title="Delivery Performance Trend" height={350}>
                    {isLoadingDelivery ? (
                        <ChartSkeleton height={300} />
                    ) : (
                        <AreaChart data={deliveryPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary-blue)" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="var(--primary-blue)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                dy={10}
                                tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-subtle)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    backgroundColor: 'var(--bg-popover)',
                                    padding: '12px',
                                    color: 'var(--text-primary)'
                                }}
                                labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                                itemStyle={{ color: 'var(--text-primary)', fontSize: '14px' }}
                                labelFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            <Area type="monotone" dataKey="delivered" stroke="var(--primary-blue)" fillOpacity={1} fill="url(#colorDelivered)" name="Delivered" />
                            <Area type="monotone" dataKey="ndr" stroke="var(--warning)" fill="none" name="NDR" />
                            <Area type="monotone" dataKey="rto" stroke="var(--error)" fill="none" name="RTO" />
                        </AreaChart>
                    )}
                </ChartCard>

                <ChartCard title="Zone-wise Distribution" height={350}>
                    {isLoadingZones ? (
                        <div className="flex items-center justify-center h-full">
                            <ChartSkeleton height={300} />
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <PieChart>
                                <Pie
                                    data={zoneDistribution as any[]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {zoneDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-subtle)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        backgroundColor: 'var(--bg-popover)',
                                        padding: '12px',
                                        color: 'var(--text-primary)'
                                    }}
                                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                                    itemStyle={{ color: 'var(--text-primary)', fontSize: '14px' }}
                                />
                                <Legend layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </div>
                    )}
                </ChartCard>
            </div>

            {/* Detailed Table */}
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Report Table</CardTitle>
                        <CardDescription>Comprehensive breakdown of delivery metrics over time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={columns}
                            data={deliveryPerformanceData}
                            isLoading={isLoadingDelivery}
                            searchKey="date"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
