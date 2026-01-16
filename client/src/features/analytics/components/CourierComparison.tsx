/**
 * CourierComparison Component
 * 
 * Tool for comparing courier performance side-by-side.
 * Visualizes metrics like Delivery %, RTO %, and Avg Cost.
 */

'use client';

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    StatusBadge
} from '@/components/ui';
import { DateRangeFilter } from './DateRangeFilter';
import { useAnalyticsParams, useCourierComparison } from '@/src/hooks';
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
    PolarRadiusAxis
} from 'recharts';
import { useState } from 'react';

export function CourierComparison() {
    const { timeRange, setTimeRange, dateRange } = useAnalyticsParams();
    const { data: couriers, isLoading } = useCourierComparison(dateRange);

    if (isLoading || !couriers) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-[400px] animate-pulse bg-[var(--bg-secondary)]" />
                <Card className="h-[400px] animate-pulse bg-[var(--bg-secondary)]" />
            </div>
        );
    }

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
                {/* Delivery Performance Comparison */}
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
                                    <YAxis dataKey="courierName" type="category" width={100} />
                                    <Tooltip
                                        cursor={{ fill: 'var(--bg-elevated)', opacity: 0.1 }}
                                        contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="metrics.deliverySuccessRate" name="Delivery %" fill="#10B981" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="metrics.rtoRate" name="RTO %" fill="#EF4444" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Radar Chart for Overall Score */}
                <Card>
                    <CardHeader>
                        <CardTitle>Performance Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart outerRadius={150} data={[
                                    { metric: 'Speed', A: 80, B: 90, C: 60, fullMark: 100 },
                                    { metric: 'Reliability', A: 95, B: 85, C: 75, fullMark: 100 },
                                    { metric: 'Cost', A: 60, B: 40, C: 90, fullMark: 100 },
                                    { metric: 'Coverage', A: 70, B: 80, C: 85, fullMark: 100 },
                                    { metric: 'Experience', A: 85, B: 75, C: 65, fullMark: 100 },
                                ]}>
                                    <PolarGrid opacity={0.3} />
                                    <PolarAngleAxis dataKey="metric" />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                    {couriers.slice(0, 3).map((courier, index) => (
                                        <Radar
                                            key={courier.courierId}
                                            name={courier.courierName}
                                            dataKey={String.fromCharCode(65 + index)} // Mapping mock data to A, B, C
                                            stroke={courier.color}
                                            fill={courier.color}
                                            fillOpacity={0.3}
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

            {/* Detailed Table */}
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
                                    <th className="px-4 py-3">Avg Cost/Kg</th>
                                    <th className="px-4 py-3">NDR %</th>
                                    <th className="px-4 py-3 rounded-r-lg">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {couriers.map((courier) => (
                                    <tr key={courier.courierId} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: courier.color }} />
                                            {courier.courierName}
                                        </td>
                                        <td className="px-4 py-3 text-green-600 font-medium">{courier.metrics.deliverySuccessRate}%</td>
                                        <td className="px-4 py-3 text-red-600 font-medium">{courier.metrics.rtoRate}%</td>
                                        <td className="px-4 py-3">{courier.metrics.avgDeliveryTime} days</td>
                                        <td className="px-4 py-3">₹{courier.metrics.avgCostPerKg}</td>
                                        <td className="px-4 py-3 text-orange-600">{courier.metrics.ndrRate}%</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge
                                                domain="return" // reusing for style
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
