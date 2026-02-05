'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { codAnalyticsApi } from '@/src/core/api/clients/finance/codAnalyticsApi';
import { Card } from '@/src/components/ui/core/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/core/Select';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/src/components/utils/format'; // Assuming this exists, I'll allow fallback

// Fallback formatter if utility not found
const formatMoney = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export default function CODHealthDashboard() {
    const [period, setPeriod] = useState<string>('30');
    const [forecastDays, setForecastDays] = useState<string>('7');

    // 1. Fetch Health Metrics
    const { data: health, isLoading: healthLoading } = useQuery({
        queryKey: ['cod-health', period],
        queryFn: () => codAnalyticsApi.getHealthMetrics(Number(period))
    });

    // 2. Fetch Forecast
    const { data: forecast, isLoading: forecastLoading } = useQuery({
        queryKey: ['cod-forecast', forecastDays],
        queryFn: () => codAnalyticsApi.getForecast(Number(forecastDays))
    });

    // 3. Fetch Carrier Performance
    const { data: carrierPerf, isLoading: carrierLoading } = useQuery({
        queryKey: ['cod-carrier-perf', period],
        queryFn: () => codAnalyticsApi.getCarrierPerformance(Number(period))
    });

    const isLoading = healthLoading || forecastLoading || carrierLoading;

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">COD Intelligence</h1>
                    <p className="text-muted-foreground">Real-time health metrics and cash flow forecasting</p>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="15">Last 15 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                    </select>
                </div>
            </div>

            {/* Health Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-6">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium text-muted-foreground">Total COD Orders</p>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{health?.totalOrders || 0}</div>
                    <p className="text-xs text-muted-foreground">In selected period</p>
                </Card>
                <Card className="p-6">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium text-muted-foreground">RTO Rate</p>
                        {health?.rtoRate && health.rtoRate > 20 ?
                            <AlertCircle className="h-4 w-4 text-red-500" /> :
                            <TrendingDown className="h-4 w-4 text-green-500" />
                        }
                    </div>
                    <div className={`text-2xl font-bold ${health?.rtoRate && health.rtoRate > 20 ? 'text-red-500' : ''}`}>
                        {health?.rtoRate || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Target: &lt;15%</p>
                </Card>
                <Card className="p-6">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium text-muted-foreground">Dispute Rate</p>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{health?.disputeRate || 0}%</div>
                    <p className="text-xs text-muted-foreground">Payment mismatches</p>
                </Card>
                <Card className="p-6">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium text-muted-foreground">Collection Efficiency</p>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{health?.collectionRate || 0}%</div>
                    <p className="text-xs text-muted-foreground">Delivered vs Remitted</p>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Cash Flow Forecast */}
                <Card className="col-span-4 p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium">Cash Flow Forecast</h3>
                            <p className="text-sm text-muted-foreground">
                                Expected remittance based on T+3 delivery logic
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                                {formatMoney(forecast?.total.riskAdjusted || 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">Next {forecastDays} Days (Risk Adj.)</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={forecast?.daily}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    fontSize={12}
                                />
                                <YAxis
                                    tickFormatter={(val) => `₹${val / 1000}k`}
                                    fontSize={12}
                                />
                                <Tooltip formatter={(val: number) => formatMoney(val)} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="expectedCOD"
                                    name="Potential"
                                    stroke="#94a3b8"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="riskAdjusted"
                                    name="Projected (Risk Adj.)"
                                    stroke="#16a34a"
                                    strokeWidth={2}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Carrier Performance */}
                <Card className="col-span-3 p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-medium">Carrier Performance</h3>
                        <p className="text-sm text-muted-foreground">
                            Settlement speed & reliability ({period} days)
                        </p>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={carrierPerf} margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="carrier"
                                    type="category"
                                    width={80}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <span className="font-bold">{data.carrier}</span>
                                                        <span className="text-right text-muted-foreground text-xs">Score</span>
                                                        <span className="text-xs">Remit Time:</span>
                                                        <span className="text-right text-xs font-mono">{data.metrics.avgRemittanceTime.toFixed(1)}d</span>
                                                        <span className="text-xs">RTO Rate:</span>
                                                        <span className="text-right text-xs font-mono">{data.metrics.rtoRate}%</span>
                                                        <span className="text-xs">Disputes:</span>
                                                        <span className="text-right text-xs font-mono">{data.metrics.disputeRate}%</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar
                                    dataKey="metrics.avgRemittanceTime"
                                    name="Avg Remittance Days"
                                    fill="#3b82f6"
                                    radius={[0, 4, 4, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}
