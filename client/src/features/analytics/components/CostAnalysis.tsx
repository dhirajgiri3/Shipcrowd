'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui';
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
import { IndianRupee, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function CostAnalysis() {
    const { timeRange, setTimeRange, apiFilters } = useAnalyticsParams();
    const { data: costs, isLoading } = useCostAnalysis(apiFilters);

    if (isLoading || !costs) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="h-32 animate-pulse bg-[var(--bg-secondary)]" />
                    <Card className="h-32 animate-pulse bg-[var(--bg-secondary)]" />
                    <Card className="h-32 animate-pulse bg-[var(--bg-secondary)]" />
                </div>
                <Card className="h-[400px] animate-pulse bg-[var(--bg-secondary)]" />
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
        rto: costs.current.breakdown.rtoCharges,
    }));

    const SummaryCard = ({ title, value, subtext, icon: Icon }: { title: string; value: string; subtext: string; icon: LucideIcon }) => (
        <Card>
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
                        <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-2">{value}</h3>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">{subtext}</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <Icon className="w-5 h-5 text-[var(--primary-blue)]" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const codCost = costs.current.byPaymentMethod.cod.cost;
    const prepaidCost = costs.current.byPaymentMethod.prepaid.cost;
    const codShare = codCost + prepaidCost > 0 ? Math.round((codCost / (codCost + prepaidCost)) * 100) : 0;
    const totalShipments = costs.current.byPaymentMethod.cod.count + costs.current.byPaymentMethod.prepaid.count;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Cost Analysis</h2>
                    <p className="text-sm text-[var(--text-muted)]">Analyze shipping spend and financial efficiency</p>
                </div>
                <DateRangeFilter value={timeRange} onChange={setTimeRange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard
                    title="Total Spend"
                    value={formatCurrency(costs.current.totalCost)}
                    subtext="Total shipping expenditure"
                    icon={IndianRupee}
                />
                <SummaryCard
                    title="Avg Cost / Order"
                    value={formatCurrency(costs.current.totalCost / Math.max(1, totalShipments))}
                    subtext="Average cost per shipment"
                    icon={TrendingUp}
                />
                <SummaryCard
                    title="COD Volume"
                    value={formatCompactCurrency(codCost)}
                    subtext={`${codShare}% of total cost`}
                    icon={Wallet}
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
                                    <linearGradient id="colorRTO" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                                <Legend />
                                <Area type="monotone" dataKey="shipping" name="Shipping" stroke="#3B82F6" fillOpacity={1} fill="url(#colorShipping)" />
                                <Area type="monotone" dataKey="rto" name="RTO Charges" stroke="#EF4444" fillOpacity={1} fill="url(#colorRTO)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
