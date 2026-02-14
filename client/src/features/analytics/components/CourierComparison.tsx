'use client';

import { Card, CardContent, CardHeader, CardTitle, StatusBadge, Button } from '@/src/components/ui';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { ChartSkeleton } from '@/src/components/ui/data/Skeleton';
import { DateRangeFilter } from './DateRangeFilter';
import { useAnalyticsParams } from '@/src/hooks';
import { useCourierComparison } from '@/src/core/api/hooks/analytics/useAnalytics';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
} from 'recharts';
import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const PALETTE = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444'];
const normalizeCourierId = (value?: string) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

export function CourierComparison() {
    const { timeRange, setTimeRange, apiFilters } = useAnalyticsParams();
    const { data: comparison, isLoading, refetch, isFetching } = useCourierComparison(apiFilters);

    const couriers = useMemo(() => {
        if (!comparison?.couriers?.length) return [];
        const deduped = Array.from(
            new Map(
                comparison.couriers.map((courier) => [
                    normalizeCourierId(courier.courierId || courier.courierName),
                    courier,
                ])
            ).values()
        );

        return deduped.map((courier, index) => ({
            ...courier,
            color: PALETTE[index % PALETTE.length],
            metrics: {
                deliverySuccessRate: courier.successRate,
                avgDeliveryTime: courier.avgDeliveryTime,
                rtoRate: courier.rtoRate,
                ndrRate: courier.ndrRate,
                avgCostPerKg: courier.avgCost,
            },
        }));
    }, [comparison?.couriers]);

    const radarData = useMemo(() => [
        { metric: 'Delivery', fullMark: 100 },
        { metric: 'RTO Control', fullMark: 100 },
        { metric: 'NDR Control', fullMark: 100 },
        { metric: 'On Time', fullMark: 100 },
        { metric: 'Cost Efficiency', fullMark: 100 },
    ].map((base) => {
        const row: Record<string, string | number> = { ...base };
        couriers.slice(0, 3).forEach((courier, index) => {
            const key = String.fromCharCode(65 + index);
            row[key] = base.metric === 'Delivery'
                ? courier.successRate
                : base.metric === 'RTO Control'
                    ? 100 - courier.rtoRate
                    : base.metric === 'NDR Control'
                        ? 100 - courier.ndrRate
                        : base.metric === 'On Time'
                            ? courier.onTimeDelivery
                            : Math.max(0, 100 - courier.avgCost);
        });
        return row;
    }), [couriers]);

    if (isLoading || !comparison) {
        return (
            <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
                <PageHeader
                    title="Courier Comparison"
                    description="Compare courier partners on delivery speed, RTO rates, and costs."
                    breadcrumbs={[
                        { label: 'Analytics', href: '/seller/analytics' },
                        { label: 'Courier Comparison', active: true },
                    ]}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton height={400} />
                    <ChartSkeleton height={400} />
                </div>
                <ChartSkeleton height={300} />
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Courier Comparison"
                description="Compare courier partners on delivery speed, RTO rates, and costs."
                breadcrumbs={[
                    { label: 'Analytics', href: '/seller/analytics' },
                    { label: 'Courier Comparison', active: true },
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
                            aria-label="Refresh courier comparison"
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Delivery & RTO Rates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={couriers} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                    <XAxis type="number" domain={[0, 100]} />
                                    <YAxis dataKey="courierName" type="category" width={120} />
                                    <Tooltip cursor={{ fill: 'var(--bg-elevated)', opacity: 0.1 }} contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                                    <Legend />
                                    <Bar dataKey="metrics.deliverySuccessRate" name="Delivery %" fill="#10B981" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="metrics.rtoRate" name="RTO %" fill="#EF4444" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Performance Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart outerRadius={140} data={radarData}>
                                    <PolarGrid opacity={0.3} />
                                    <PolarAngleAxis dataKey="metric" />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                    {couriers.slice(0, 3).map((courier, index) => (
                                        <Radar
                                            key={`${courier.courierId}-${index}`}
                                            name={courier.courierName}
                                            dataKey={String.fromCharCode(65 + index)}
                                            stroke={courier.color}
                                            fill={courier.color}
                                            fillOpacity={0.2}
                                        />
                                    ))}
                                    <Legend />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detailed Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Courier</th>
                                    <th className="px-4 py-3">Delivery %</th>
                                    <th className="px-4 py-3">RTO %</th>
                                    <th className="px-4 py-3">Avg Time</th>
                                    <th className="px-4 py-3">Avg Cost</th>
                                    <th className="px-4 py-3">NDR %</th>
                                    <th className="px-4 py-3 rounded-r-lg">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {couriers.map((courier, index) => (
                                    <tr key={`${courier.courierId}-${index}`} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: courier.color }} />
                                            {courier.courierName}
                                        </td>
                                        <td className="px-4 py-3 text-green-600 font-medium">{courier.metrics.deliverySuccessRate}%</td>
                                        <td className="px-4 py-3 text-red-600 font-medium">{courier.metrics.rtoRate}%</td>
                                        <td className="px-4 py-3">{courier.metrics.avgDeliveryTime} hours</td>
                                        <td className="px-4 py-3">₹{courier.metrics.avgCostPerKg}</td>
                                        <td className="px-4 py-3 text-orange-600">{courier.metrics.ndrRate}%</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge
                                                domain="return"
                                                status={courier.metrics.deliverySuccessRate > 95 ? 'approved' : courier.metrics.deliverySuccessRate > 90 ? 'requested' : 'rejected'}
                                                size="sm"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

