'use client';

import { Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@/src/components/ui';
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

const PALETTE = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444'];

export function CourierComparison() {
    const { timeRange, setTimeRange, apiFilters } = useAnalyticsParams();
    const { data: comparison, isLoading } = useCourierComparison(apiFilters);

    if (isLoading || !comparison) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-[400px] animate-pulse bg-[var(--bg-secondary)]" />
                <Card className="h-[400px] animate-pulse bg-[var(--bg-secondary)]" />
            </div>
        );
    }

    const couriers = comparison.couriers.map((courier, index) => ({
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

    const radarData = [
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
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Courier Comparison</h2>
                    <p className="text-sm text-[var(--text-muted)]">Benchmark courier partners against each other</p>
                </div>
                <DateRangeFilter value={timeRange} onChange={setTimeRange} />
            </div>

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
