'use client';

import { Card, CardContent, CardHeader, CardTitle, Button } from '@/src/components/ui';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { CardSkeleton, ChartSkeleton } from '@/src/components/ui/data/Skeleton';
import { DateRangeFilter } from './DateRangeFilter';
import { useAnalyticsParams } from '@/src/hooks';
import { useCostAnalysis } from '@/src/core/api/hooks/analytics/useAnalytics';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import { formatCompactCurrency, formatCurrency } from '@/src/lib/utils';
import { IndianRupee, TrendingUp, Wallet, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/src/lib/utils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function CostAnalysis() {
    const { timeRange, setTimeRange, apiFilters } = useAnalyticsParams();
    const { data: costs, isLoading, refetch, isFetching } = useCostAnalysis(apiFilters);

    const handleRefresh = () => {
        refetch();
    };

    if (isLoading || !costs) {
        return (
            <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
                <PageHeader
                    title="Cost Analysis"
                    description="Deep dive into your shipping expenses and identify cost-saving opportunities."
                    breadcrumbs={[
                        { label: 'Analytics', href: '/seller/analytics' },
                        { label: 'Cost Analysis', active: true },
                    ]}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton height={300} />
                    <ChartSkeleton height={300} />
                </div>
                <ChartSkeleton height={400} />
            </div>
        );
    }

    const zoneData = costs.current.byZone.map((zone) => ({
        category: zone.zoneName,
        amount: zone.cost,
    }));

    const courierData = costs.current.byCourier.map((courier) => ({
        category: courier.courierName,
        amount: courier.cost,
    }));

    const trendData = costs.current.timeSeries.map((item) => ({
        date: item.date,
        shipping: item.shippingCost,
        cod: item.codCharges,
    }));

    const codCost = costs.current.byPaymentMethod.cod.cost;
    const prepaidCost = costs.current.byPaymentMethod.prepaid.cost;
    const codShare = codCost + prepaidCost > 0 ? Math.round((codCost / (codCost + prepaidCost)) * 100) : 0;
    const totalShipments = costs.current.byPaymentMethod.cod.count + costs.current.byPaymentMethod.prepaid.count;

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Cost Analysis"
                description="Deep dive into your shipping expenses and identify cost-saving opportunities."
                breadcrumbs={[
                    { label: 'Analytics', href: '/seller/analytics' },
                    { label: 'Cost Analysis', active: true },
                ]}
                backUrl="/seller/analytics"
                actions={
                    <div className="flex items-center gap-3">
                        <DateRangeFilter value={timeRange} onChange={setTimeRange} />
                        <Button
                            onClick={handleRefresh}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm',
                                isFetching && 'animate-spin'
                            )}
                            title="Refresh"
                            aria-label="Refresh cost analysis"
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    title="Total Spend"
                    value={formatCurrency(costs.current.totalCost)}
                    icon={IndianRupee}
                    description="Total shipping expenditure"
                    iconColor="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                />
                <StatsCard
                    title="Avg Cost / Order"
                    value={formatCurrency(costs.current.totalCost / Math.max(1, totalShipments))}
                    icon={TrendingUp}
                    description="Average cost per shipment"
                    iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                />
                <StatsCard
                    title="COD Volume"
                    value={formatCompactCurrency(codCost)}
                    icon={Wallet}
                    description={`${codShare}% of total cost`}
                    iconColor="text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Spend by Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={zoneData} nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="amount">
                                        {zoneData.map((entry, index) => (
                                            <Cell key={`${entry.category}-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Spend by Courier</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={courierData} nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="amount">
                                        {courierData.map((entry, index) => (
                                            <Cell key={`${entry.category}-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Shipping Spend Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorShipping" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCOD" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => {
                                        try {
                                            return format(parseISO(value), 'MMM d');
                                        } catch {
                                            return value;
                                        }
                                    }}
                                />
                                <YAxis tickFormatter={(value) => formatCurrency(Number(value) || 0)} />
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                                <Legend />
                                <Area type="monotone" dataKey="shipping" name="Shipping" stroke="#3B82F6" fillOpacity={1} fill="url(#colorShipping)" />
                                <Area type="monotone" dataKey="cod" name="COD Charges" stroke="#EF4444" fillOpacity={1} fill="url(#colorCOD)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
