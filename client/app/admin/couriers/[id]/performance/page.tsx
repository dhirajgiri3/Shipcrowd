'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/core/Button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { useCourier, useCourierPerformance } from '@/src/core/api/hooks/useCouriers';
import type { PerformanceFilters } from '@/src/types/api/couriers.types';
import {
    ChevronLeft,
    TrendingUp,
    TrendingDown,
    Package,
    Clock,
    DollarSign,
    Award,
    MapPin,
} from 'lucide-react';

export default function CourierPerformancePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [filters, setFilters] = useState<PerformanceFilters>({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });

    const { data: courier } = useCourier(params.id);
    const { data: performance, isLoading } = useCourierPerformance(params.id, filters);

    const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading performance data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/admin/couriers/${params.id}`)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">
                            {courier?.name || 'Courier'} Performance
                        </h1>
                        <p className="text-muted-foreground mt-1">Detailed analytics and metrics</p>
                    </div>
                </div>
            </div>

            {/* Date Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Start Date</label>
                            <input
                                type="date"
                                className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                                value={filters.startDate || ''}
                                onChange={(e) => handleDateChange('startDate', e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">End Date</label>
                            <input
                                type="date"
                                className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                                value={filters.endDate || ''}
                                onChange={(e) => handleDateChange('endDate', e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Zone</label>
                            <select
                                className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                                value={filters.zone || 'all'}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        zone: e.target.value === 'all' ? undefined : e.target.value,
                                    }))
                                }
                            >
                                <option value="all">All Zones</option>
                                <option value="LOCAL">Local</option>
                                <option value="REGIONAL">Regional</option>
                                <option value="NATIONAL">National</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Service Type</label>
                            <select
                                className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                                value={filters.serviceType || 'all'}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        serviceType:
                                            e.target.value === 'all'
                                                ? undefined
                                                : (e.target.value as any),
                                    }))
                                }
                            >
                                <option value="all">All Services</option>
                                <option value="EXPRESS">Express</option>
                                <option value="STANDARD">Standard</option>
                                <option value="ECONOMY">Economy</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {performance && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Success Rate
                                </CardDescription>
                                <CardTitle className="text-3xl">
                                    {performance.successRate.toFixed(1)}%
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    {performance.deliveredShipments} / {performance.totalShipments}{' '}
                                    delivered
                                </p>
                            </CardHeader>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Avg Delivery Time
                                </CardDescription>
                                <CardTitle className="text-3xl">
                                    {performance.avgDeliveryTime.toFixed(1)}h
                                </CardTitle>
                            </CardHeader>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription className="flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4" />
                                    RTO Rate
                                </CardDescription>
                                <CardTitle className="text-3xl">
                                    {performance.rtoPercentage.toFixed(1)}%
                                </CardTitle>
                            </CardHeader>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Cost per Shipment
                                </CardDescription>
                                <CardTitle className="text-3xl">
                                    ₹{performance.costPerShipment.toFixed(2)}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Ranking Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5" />
                                Courier Ranking
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-primary">
                                        #{performance.ranking}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        out of {performance.totalCouriers} couriers
                                    </p>
                                </div>
                                <div className="flex-1">
                                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary"
                                            style={{
                                                width: `${((performance.totalCouriers - performance.ranking + 1) /
                                                        performance.totalCouriers) *
                                                    100
                                                    }%`,
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Performance percentile
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Shipment Volume
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Total Shipments
                                    </span>
                                    <span className="font-medium">
                                        {performance.totalShipments.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Delivered
                                    </span>
                                    <span className="font-medium text-green-600">
                                        {performance.deliveredShipments.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        NDR Rate
                                    </span>
                                    <span className="font-medium">
                                        {performance.ndrPercentage.toFixed(1)}%
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Performance Trend</CardTitle>
                                <CardDescription>Last 7 data points</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {performance.timeSeriesData.slice(-7).map((point, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground w-20">
                                                {new Date(point.date).toLocaleDateString('en-IN', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{ width: `${point.successRate}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium w-12 text-right">
                                                {point.successRate.toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Zone-wise Performance */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Zone-wise Performance
                            </CardTitle>
                            <CardDescription>
                                Performance breakdown by delivery zones
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b">
                                        <tr className="text-left text-sm text-muted-foreground">
                                            <th className="pb-3 font-medium">Zone</th>
                                            <th className="pb-3 font-medium">Shipments</th>
                                            <th className="pb-3 font-medium">Delivered</th>
                                            <th className="pb-3 font-medium">Success Rate</th>
                                            <th className="pb-3 font-medium">Avg Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {performance.zonePerformance.map((zone) => (
                                            <tr key={zone.zone} className="text-sm">
                                                <td className="py-4">
                                                    <Badge variant="outline">{zone.zone}</Badge>
                                                </td>
                                                <td className="py-4">
                                                    {zone.totalShipments.toLocaleString()}
                                                </td>
                                                <td className="py-4">
                                                    {zone.deliveredShipments.toLocaleString()}
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${zone.successRate >= 90
                                                                        ? 'bg-green-500'
                                                                        : zone.successRate >= 75
                                                                            ? 'bg-yellow-500'
                                                                            : 'bg-red-500'
                                                                    }`}
                                                                style={{
                                                                    width: `${zone.successRate}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="font-medium">
                                                            {zone.successRate.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    {zone.avgDeliveryTime.toFixed(1)}h
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {!performance && !isLoading && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                            No performance data available for the selected period
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
