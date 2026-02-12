'use client';

import { use, useState } from 'react';
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
import { Loader } from '@/src/components/ui/feedback/Loader';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { useCourier, useCourierPerformance } from '@/src/core/api/hooks/admin/couriers/useCouriers';
import type { PerformanceFilters } from '@/src/types/api/logistics';
import {
    ChevronLeft,
    TrendingUp,
    TrendingDown,
    Package,
    Clock,
    DollarSign,
    Award,
    MapPin,
    BarChart2,
} from 'lucide-react';
import { Input } from '@/src/components/ui/core/Input';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { Select } from '@/src/components/ui/form/Select';
import { Label } from '@/src/components/ui/core/Label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/src/components/ui/core/Table';
import { formatCurrency, formatDate } from '@/src/lib/utils';

export default function CourierPerformancePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [filters, setFilters] = useState<PerformanceFilters>({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });

    const { data: courier } = useCourier(id);
    const { data: performance, isLoading } = useCourierPerformance(id, filters);
    const serviceTypeOptions = Array.from(
        new Set(
            (courier?.services || [])
                .map((service) => String(service.type || '').toUpperCase())
                .filter(Boolean)
        )
    );

    if (isLoading) {
        return <Loader variant="spinner" size="lg" message="Loading performance analytics..." centered />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/admin/couriers/${id}`)}
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

            {/* Filters Bar */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center">
                        <div className="w-full lg:w-auto flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground ml-1">Date Range</Label>
                            <DateRangePicker
                                className="w-full"
                                onRangeChange={(range) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        startDate: range.from.toISOString().split('T')[0],
                                        endDate: range.to.toISOString().split('T')[0],
                                    }))
                                }
                            />
                        </div>
                        <div className="w-full lg:w-auto flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground ml-1">Zone</Label>
                            <Select
                                value={filters.zone || 'all'}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        zone: e.target.value === 'all' ? undefined : e.target.value,
                                    }))
                                }
                                options={[
                                    { label: 'All Zones', value: 'all' },
                                    { label: 'Local', value: 'LOCAL' },
                                    { label: 'Regional', value: 'REGIONAL' },
                                    { label: 'National', value: 'NATIONAL' },
                                ]}
                            />
                        </div>
                        <div className="w-full lg:w-auto flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground ml-1">Service Type</Label>
                            <Select
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
                                options={[
                                    { label: 'All Services', value: 'all' },
                                    ...(serviceTypeOptions.length
                                        ? serviceTypeOptions
                                        : ['EXPRESS', 'SURFACE', 'STANDARD']
                                    ).map((serviceType) => ({
                                        label: serviceType.charAt(0) + serviceType.slice(1).toLowerCase(),
                                        value: serviceType,
                                    })),
                                ]}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {performance && performance.totalShipments > 0 ? (
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
                                    {formatCurrency(performance.costPerShipment)}
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
                                    <div className="text-4xl font-bold text-[var(--primary-blue)]">
                                        #{performance.ranking}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        out of {performance.totalCouriers} couriers
                                    </p>
                                </div>
                                <div className="flex-1">
                                    <div className="h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--primary-blue)]"
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
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--bg-subtle)]">
                                    <span className="text-sm text-muted-foreground">
                                        Total Shipments
                                    </span>
                                    <span className="font-medium">
                                        {performance.totalShipments.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--bg-subtle)]">
                                    <span className="text-sm text-muted-foreground">
                                        Delivered
                                    </span>
                                    <span className="font-medium text-[var(--success)]">
                                        {performance.deliveredShipments.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--bg-subtle)]">
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
                                <div className="space-y-3">
                                    {performance.timeSeriesData.slice(-7).map((point, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground w-20">
                                                {formatDate(point.date)}
                                            </span>
                                            <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[var(--primary-blue)]"
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
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableHead className="text-[var(--text-muted)] font-medium">Zone</TableHead>
                                        <TableHead className="text-[var(--text-muted)] font-medium">Shipments</TableHead>
                                        <TableHead className="text-[var(--text-muted)] font-medium">Delivered</TableHead>
                                        <TableHead className="text-[var(--text-muted)] font-medium">Success Rate</TableHead>
                                        <TableHead className="text-[var(--text-muted)] font-medium">Avg Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {performance.zonePerformance.map((zone) => (
                                        <TableRow key={zone.zone} className="border-none hover:bg-[var(--bg-subtle)]">
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                                                >
                                                    {zone.zone}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {zone.totalShipments.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {zone.deliveredShipments.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${zone.successRate >= 90
                                                                ? 'bg-[var(--success)]'
                                                                : zone.successRate >= 75
                                                                    ? 'bg-[var(--warning)]'
                                                                    : 'bg-[var(--error)]'
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
                                            </TableCell>
                                            <TableCell>
                                                {zone.avgDeliveryTime.toFixed(1)}h
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <EmptyState
                    icon={<BarChart2 className="w-12 h-12" />}
                    title="No performance data found"
                    description="No shipment data available for the selected period"
                />
            )}
        </div>
    );
}
