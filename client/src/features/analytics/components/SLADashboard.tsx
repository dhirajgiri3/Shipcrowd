/**
 * SLADashboard Component
 * 
 * Dashboard for tracking Service Level Agreement (SLA) compliance.
 * Shows Pickup, Delivery, NDR, and COD metrics.
 */

'use client';

import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    StatusBadge
} from '@/src/components/ui';
import { DateRangeFilter } from './DateRangeFilter';
import { useAnalyticsParams, useSLAData } from '@/src/hooks';
import { SLAMetric } from '@/src/types/analytics.types';
import { ArrowDownRight, ArrowUpRight, Clock, Truck, ShieldAlert, IndianRupee } from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';

export function SLADashboard() {
    const { timeRange, setTimeRange, dateRange } = useAnalyticsParams();
    const { data: slaData, isLoading } = useSLAData(dateRange);

    if (isLoading || !slaData) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="h-40 animate-pulse bg-[var(--bg-secondary)]" />
                ))}
            </div>
        );
    }

    const metrics: { key: keyof typeof slaData; icon: any; color: string }[] = [
        { key: 'pickupCompliance', icon: Truck, color: '#3B82F6' },
        { key: 'deliveryCompliance', icon: Clock, color: '#10B981' },
        { key: 'ndrResponseTime', icon: ShieldAlert, color: '#F59E0B' },
        { key: 'codSettlementTime', icon: IndianRupee, color: '#8B5CF6' },
    ];

    const SLACard = ({ metric, icon: Icon, color }: { metric: SLAMetric; icon: any; color: string }) => {
        const isPositive = metric.trend >= 0;

        return (
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 rounded-lg bg-opacity-10" style={{ backgroundColor: `${color}20` }}>
                                <Icon className="w-5 h-5" style={{ color }} />
                            </div>
                            <StatusBadge
                                domain="webhook" // reusing webhook status styles for simplicity or custom
                                status={metric.status === 'compliant' ? 'active' : metric.status === 'breached' ? 'error' : 'inactive'}
                                size="sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm font-medium text-[var(--text-muted)]">{metric.label}</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                                    {metric.type === 'ndr' || metric.type === 'cod'
                                        ? metric.actual
                                        : `${metric.compliance}%`
                                    }
                                    <span className="text-xs font-normal text-[var(--text-tertiary)] ml-1">
                                        {metric.type === 'ndr' ? 'hours' : metric.type === 'cod' ? 'days' : ''}
                                    </span>
                                </h3>
                                <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                    {Math.abs(metric.trend)}%
                                </span>
                            </div>
                            <p className="text-xs text-[var(--text-tertiary)] mt-2">
                                Target: {metric.type === 'ndr' || metric.type === 'cod' ? `< ${metric.target}` : `> ${metric.target}%`}
                            </p>
                        </div>
                    </div>

                    {/* Mini Sparkline Area Chart */}
                    <div className="h-16 w-full opacity-50">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metric.history}>
                                <defs>
                                    <linearGradient id={`gradient-${metric.type}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={color}
                                    fill={`url(#gradient-${metric.type})`}
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">SLA Performance</h2>
                    <p className="text-sm text-[var(--text-muted)]">Track your operational compliance against targets</p>
                </div>
                <DateRangeFilter value={timeRange} onChange={setTimeRange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map(({ key, icon, color }) => (
                    <SLACard
                        key={key}
                        metric={slaData[key]}
                        icon={icon}
                        color={color}
                    />
                ))}
            </div>

            {/* Detailed Chart Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Compliance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={slaData.deliveryCompliance.history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <Tooltip />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    name="Delivery Compliance (%)"
                                    stroke="#10B981"
                                    fillOpacity={1}
                                    fill="url(#colorCompliance)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
