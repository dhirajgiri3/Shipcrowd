"use client";
export const dynamic = "force-dynamic";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Input } from '@/src/components/ui/core/Input';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { useUrlDateRange } from '@/src/hooks/analytics/useUrlDateRange';
import { useAdminDashboard } from '@/src/core/api/hooks/analytics/useAnalytics';
import { formatCurrency } from '@/src/lib/utils';
import { IndianRupee, Package, TrendingUp, Ban } from 'lucide-react';

export function ProfitClient() {
    const [search, setSearch] = useState('');
    const { range, startDateIso, endDateIso, setRange } = useUrlDateRange();
    const { data, isLoading } = useAdminDashboard({
        startDate: startDateIso,
        endDate: endDateIso,
    });

    const sellers = useMemo(() => {
        const query = search.trim().toLowerCase();
        return (data?.companiesStats || []).filter((row) =>
            !query ? true : (row.companyName || '').toLowerCase().includes(query)
        );
    }, [data?.companiesStats, search]);

    const stats = useMemo(() => {
        const totalRevenue = data?.totalRevenue || 0;
        const totalOrders = data?.totalOrders || 0;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        return { totalRevenue, totalOrders, avgOrderValue };
    }, [data?.totalOrders, data?.totalRevenue]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Profit Management</h1>
                    <p className="text-sm text-[var(--text-secondary)]">Read-only analytics mode for this release.</p>
                </div>
                <DateRangePicker value={range} onRangeChange={setRange} />
            </div>

            <Card className="border-[var(--warning)]/30 bg-[var(--warning-bg)]/50">
                <CardContent className="py-4 flex items-center gap-3 text-[var(--text-primary)]">
                    <Ban className="h-4 w-4 text-[var(--warning)]" />
                    Import/export actions are temporarily unavailable on Admin Profit. View-only analytics is active.
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={IndianRupee} />
                <StatsCard title="Total Orders" value={stats.totalOrders.toLocaleString()} icon={Package} />
                <StatsCard title="Avg Order Value" value={formatCurrency(stats.avgOrderValue)} icon={TrendingUp} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Seller Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search seller..."
                    />
                    {isLoading ? (
                        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs text-[var(--text-muted)] uppercase">
                                        <th className="py-2">Seller</th>
                                        <th className="py-2 text-right">Orders</th>
                                        <th className="py-2 text-right">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sellers.map((row) => (
                                        <tr key={row.companyId} className="border-t border-[var(--border-subtle)]">
                                            <td className="py-2 text-sm text-[var(--text-primary)]">{row.companyName || 'Unknown'}</td>
                                            <td className="py-2 text-sm text-right">{row.totalOrders.toLocaleString()}</td>
                                            <td className="py-2 text-sm text-right">{formatCurrency(row.totalRevenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
