"use client";
export const dynamic = "force-dynamic";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { useUrlDateRange } from '@/src/hooks/analytics/useUrlDateRange';
import { useAdminDashboard } from '@/src/core/api/hooks/analytics/useAnalytics';
import { formatCurrency } from '@/src/lib/utils';
import { IndianRupee, Package, TrendingUp, Ban, BarChart3 } from 'lucide-react';

type SellerRow = {
    _id: string;
    companyId: string;
    companyName: string;
    totalOrders: number;
    totalRevenue: number;
};

const columns = [
    { header: 'Seller', accessorKey: 'companyName' as const },
    { header: 'Orders', accessorKey: 'totalOrders' as const, cell: (row: SellerRow) => row.totalOrders.toLocaleString() },
    { header: 'Revenue', accessorKey: 'totalRevenue' as const, cell: (row: SellerRow) => formatCurrency(row.totalRevenue) },
];

export function ProfitClient() {
    const [search, setSearch] = useState('');
    const { range, startDateIso, endDateIso, setRange } = useUrlDateRange();
    const { data, isLoading } = useAdminDashboard({
        startDate: startDateIso,
        endDate: endDateIso,
    });

    const sellers = useMemo(() => {
        const query = search.trim().toLowerCase();
        const stats = data?.companiesStats || [];
        return stats
            .filter((row) => !query || (row.companyName || '').toLowerCase().includes(query))
            .map((row) => ({
                ...row,
                _id: row.companyId || String(Math.random()),
            })) as SellerRow[];
    }, [data?.companiesStats, search]);

    const stats = useMemo(() => {
        const totalRevenue = data?.totalRevenue || 0;
        const totalOrders = data?.totalOrders || 0;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        return { totalRevenue, totalOrders, avgOrderValue };
    }, [data?.totalOrders, data?.totalRevenue]);

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto bg-[var(--bg-secondary)] min-h-screen pb-20 space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Profit Management"
                description="Read-only analytics mode for this release."
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Profit', active: true }]}
                actions={<DateRangePicker value={range} onRangeChange={setRange} />}
            />

            <Card className="border-[var(--border-subtle)] bg-[var(--warning-bg)]/50">
                <CardContent className="py-4 flex items-center gap-3 text-[var(--text-primary)]">
                    <Ban className="h-4 w-4 text-[var(--warning)]" />
                    Import/export actions are temporarily unavailable on Admin Profit. View-only analytics is active.
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={IndianRupee} variant="success" />
                <StatsCard title="Total Orders" value={stats.totalOrders.toLocaleString()} icon={Package} variant="info" />
                <StatsCard title="Avg Order Value" value={formatCurrency(stats.avgOrderValue)} icon={TrendingUp} variant="default" />
            </div>

            <Card className="border-[var(--border-subtle)]">
                <CardHeader>
                    <CardTitle>Seller Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SearchInput
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search seller..."
                        widthClass="w-full max-w-sm"
                    />
                    {!isLoading && sellers.length === 0 ? (
                        <EmptyState
                            icon={<BarChart3 className="w-12 h-12" />}
                            variant="noData"
                            title="No seller data"
                            description="No revenue data for the selected date range. Try adjusting the date filter."
                        />
                    ) : (
                        <DataTable
                            columns={columns}
                            data={sellers}
                            isLoading={isLoading}
                            disablePagination
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
