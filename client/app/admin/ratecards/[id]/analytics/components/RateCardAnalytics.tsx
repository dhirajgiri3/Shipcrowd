"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    BarChart3,
    TrendingUp,
    Package,
    IndianRupee,
    MapPin,
    Truck,
    Calendar,
    Download,
    ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/src/lib/utils';
import { useRateCardAnalytics, useRateCardRevenueSeries } from '@/src/hooks/shipping/use-rate-card-analytics';

interface RateCardAnalyticsProps {
    rateCardId: string;
}

export function RateCardAnalytics({ rateCardId }: RateCardAnalyticsProps) {
    const router = useRouter();
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: new Date()
    });
    const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');

    const { data: stats, isLoading: statsLoading } = useRateCardAnalytics({
        rateCardId,
        startDate: dateRange.start,
        endDate: dateRange.end
    });

    const { data: timeSeries, isLoading: seriesLoading } = useRateCardRevenueSeries({
        rateCardId,
        startDate: dateRange.start,
        endDate: dateRange.end,
        granularity
    });

    const isLoading = statsLoading || seriesLoading;

    const handleExportPDF = () => {
        // TODO: Implement PDF export functionality
        console.log('Export PDF functionality to be implemented');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-blue)]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <BarChart3 className="h-6 w-6 text-[var(--primary-blue)]" />
                            Rate Card Analytics
                        </h2>
                        <p className="text-[var(--text-muted)] text-sm mt-1">
                            Usage statistics and revenue insights
                        </p>
                    </div>
                </div>
                <Button onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                </Button>
            </div>

            {/* Date Range Filter */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                            <span className="text-sm font-medium">Date Range:</span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={dateRange.start.getTime() === new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime() ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => setDateRange({
                                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                                    end: new Date()
                                })}
                            >
                                Last 7 Days
                            </Button>
                            <Button
                                variant={dateRange.start.getTime() === new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime() ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => setDateRange({
                                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                                    end: new Date()
                                })}
                            >
                                Last 30 Days
                            </Button>
                            <Button
                                variant={dateRange.start.getTime() === new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).getTime() ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => setDateRange({
                                    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                                    end: new Date()
                                })}
                            >
                                Last 90 Days
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-sm font-medium">Granularity:</span>
                            <div className="flex gap-2">
                                <Button
                                    variant={granularity === 'day' ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setGranularity('day')}
                                >
                                    Day
                                </Button>
                                <Button
                                    variant={granularity === 'week' ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setGranularity('week')}
                                >
                                    Week
                                </Button>
                                <Button
                                    variant={granularity === 'month' ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setGranularity('month')}
                                >
                                    Month
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-[var(--text-muted)]">Total Shipments</p>
                                <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                                    {stats?.totalShipments || 0}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <Package className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-[var(--text-muted)]">Total Revenue</p>
                                <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                                    {formatCurrency(stats?.totalRevenue || 0)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <IndianRupee className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-[var(--text-muted)]">Average Cost</p>
                                <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                                    {formatCurrency(stats?.averageCost || 0)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Time Series Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-[var(--primary-blue)]" />
                        Revenue Trend
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {timeSeries && timeSeries.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-64 flex items-end gap-2">
                                {timeSeries.map((point: any, idx: number) => {
                                    const maxRevenue = Math.max(...timeSeries.map((p: any) => p.revenue));
                                    const heightPercent = (point.revenue / maxRevenue) * 100;
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                            <div
                                                className="w-full bg-[var(--primary-blue)] rounded-t hover:bg-[var(--primary-blue-deep)] transition-colors cursor-pointer relative group"
                                                style={{ height: `${heightPercent}%` }}
                                                title={`${point.date}: ${formatCurrency(point.revenue)} (${point.count} shipments)`}
                                            >
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {formatCurrency(point.revenue)}
                                                </div>
                                            </div>
                                            <span className="text-xs text-[var(--text-muted)] rotate-45 origin-left">
                                                {new Date(point.date).toLocaleDateString('en-IN', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
                            No revenue data available for the selected period
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Zone Distribution & Top Carriers */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Zone Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-[var(--primary-blue)]" />
                            Zone Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.zoneDistribution && Object.keys(stats.zoneDistribution).length > 0 ? (
                            <div className="space-y-3">
                                {Object.entries(stats.zoneDistribution)
                                    .sort(([, a], [, b]) => (b as number) - (a as number))
                                    .map(([zone, count]) => {
                                        const total = Object.values(stats.zoneDistribution).reduce((sum: number, val: any) => sum + (val as number), 0);
                                        const percentage = (((count as number) / total) * 100).toFixed(1);
                                        return (
                                            <div key={zone} className="space-y-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="font-medium text-[var(--text-primary)]">
                                                        {zone.toUpperCase()}
                                                    </span>
                                                    <span className="text-[var(--text-muted)]">
                                                        {count as number} shipments ({percentage}%)
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-[var(--primary-blue)] h-2 rounded-full transition-all"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-32 text-[var(--text-muted)]">
                                No zone data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Carriers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-[var(--primary-blue)]" />
                            Top Carriers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.topCarriers && stats.topCarriers.length > 0 ? (
                            <div className="space-y-3">
                                {stats.topCarriers.slice(0, 5).map((carrier: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)]">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="default" className="w-8 h-8 flex items-center justify-center">
                                                {idx + 1}
                                            </Badge>
                                            <span className="font-medium text-[var(--text-primary)]">
                                                {carrier.carrier}
                                            </span>
                                        </div>
                                        <span className="text-sm text-[var(--text-muted)]">
                                            {carrier.count} shipments
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-32 text-[var(--text-muted)]">
                                No carrier data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Info Note */}
            <Card className="bg-[var(--info-bg)] border-[var(--info)]/20">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <BarChart3 className="h-5 w-5 text-[var(--info)] mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-[var(--info)]">Analytics Information</p>
                            <p className="text-xs text-[var(--info)] mt-1">
                                These statistics are calculated based on shipments that used this rate card within the selected date range.
                                Revenue figures include all applicable charges (base rate, weight charges, zone charges, COD, and GST).
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
