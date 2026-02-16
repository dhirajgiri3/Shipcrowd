"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSellerHealth } from '@/src/core/api/hooks/admin/useSellerHealth';
import { SellerTable } from './SellerTable';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { Button } from '@/src/components/ui/core/Button';
import {
    Users,
    Activity,
    AlertTriangle,
    ArrowUpRight,
    TrendingUp,
    Shield,
    Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { showSuccessToast, showErrorToast } from '@/src/lib/error';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { cn, parsePaginationQuery, syncPaginationQuery } from '@/src/lib/utils';

const SELLER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'excellent', label: 'Excellent' },
    { key: 'warning', label: 'Warning' },
    { key: 'critical', label: 'Critical' },
] as const;

const DEFAULT_LIMIT = 10;

const SellersClient = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { page: urlPage, limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const [page, setPage] = useState(urlPage);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery, 300);
    const [statusFilter, setStatusFilter] = useState<'all' | 'excellent' | 'warning' | 'critical'>('all');
    const [sortBy, setSortBy] = useState<string>('companyName');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const hasInitializedFilterReset = useRef(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const nextStatus = (searchParams.get('status') || 'all') as typeof statusFilter;
        setStatusFilter((current) => (current === nextStatus ? current : nextStatus));

        const nextSearch = searchParams.get('search') || '';
        setSearchQuery((current) => (current === nextSearch ? current : nextSearch));

        const { page: nextPage } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
        setPage((current) => (current === nextPage ? current : nextPage));
        setIsUrlHydrated(true);
    }, [searchParams]);

    useEffect(() => {
        if (!isUrlHydrated) return;
        if (!hasInitializedFilterReset.current) {
            hasInitializedFilterReset.current = true;
            return;
        }
        setPage(1);
    }, [debouncedSearch, statusFilter, isUrlHydrated]);

    useEffect(() => {
        if (!isUrlHydrated) return;

        const params = new URLSearchParams(searchParams.toString());
        if (statusFilter !== 'all') {
            params.set('status', statusFilter);
        } else {
            params.delete('status');
        }
        if (debouncedSearch) {
            params.set('search', debouncedSearch);
        } else {
            params.delete('search');
        }
        syncPaginationQuery(params, { page, limit }, { defaultLimit: DEFAULT_LIMIT });

        const nextQuery = params.toString();
        const currentQuery = searchParams.toString();
        if (nextQuery !== currentQuery) {
            router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
        }
    }, [statusFilter, debouncedSearch, page, limit, isUrlHydrated, searchParams, pathname, router]);

    const {
        data: healthData,
        isLoading: isHealthLoading,
        refetch,
        isFetching,
    } = useSellerHealth({
        status: statusFilter === 'all' ? undefined : (statusFilter as any),
        search: debouncedSearch,
        page,
        limit,
        sortBy,
        sortOrder,
    });

    const handleSort = (key: string) => {
        if (sortBy === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('asc');
        }
        setPage(1);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= (healthData?.pagination?.totalPages || 1)) {
            setPage(newPage);
        }
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const { sellerHealthApi } = await import('@/src/core/api/clients/analytics/sellerHealthApi');

            const blob = await sellerHealthApi.exportSellers({
                status: statusFilter,
                search: debouncedSearch,
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sellers_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showSuccessToast('Sellers exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            showErrorToast('Failed to export sellers. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const totalSellers = healthData?.summary?.total || 0;
    const avgHealth = healthData?.summary?.avgHealthScore || 0;
    const criticalRisk = healthData?.summary?.byStatus?.critical || 0;
    const healthySellers = (healthData?.summary?.byStatus?.excellent || 0) + (healthData?.summary?.byStatus?.good || 0);

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[var(--bg-secondary)] min-h-screen">
            <PageHeader
                title="Seller Management"
                breadcrumbs={[
                    { label: 'Admin', href: '/admin' },
                    { label: 'Sellers', active: true },
                ]}
                description="Monitor seller health, performance, and risk metrics across the platform."
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                        >
                            <Activity size={16} className={cn(isFetching && 'animate-spin')} />
                            Refresh
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            disabled={isExporting}
                            className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm font-medium shadow-sm transition-all"
                        >
                            {isExporting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <ArrowUpRight size={16} className="mr-2" />}
                            {isExporting ? 'Exporting...' : 'Export'}
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Sellers"
                    value={totalSellers}
                    icon={Users}
                    variant="default"
                    trend={{ value: 12, label: 'this week', positive: true }}
                    delay={0}
                />
                <StatsCard
                    title="Healthy Sellers"
                    value={healthySellers}
                    icon={Shield}
                    variant="success"
                    description={`${((healthySellers / (totalSellers || 1)) * 100).toFixed(0)}% of total base`}
                    delay={1}
                />
                <StatsCard
                    title="Critical Risk"
                    value={criticalRisk}
                    icon={AlertTriangle}
                    variant="critical"
                    trend={
                        healthData?.summary?.trends?.criticalRisk
                            ? {
                                  value: healthData.summary.trends.criticalRisk.value,
                                  label: healthData.summary.trends.criticalRisk.label,
                                  positive: !healthData.summary.trends.criticalRisk.isIncrease,
                              }
                            : undefined
                    }
                    delay={2}
                />
                <StatsCard
                    title="Avg Health Score"
                    value={`${avgHealth.toFixed(0)}%`}
                    icon={TrendingUp}
                    variant="info"
                    description="Platform-wide average"
                    delay={3}
                />
            </div>

            {/* Controls & Filters - Consistent with admin Orders/Shipments */}
            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <PillTabs
                        tabs={SELLER_TABS}
                        activeTab={statusFilter}
                        onTabChange={(key) => setStatusFilter(key as typeof statusFilter)}
                        className="max-w-full lg:max-w-[500px] overflow-x-auto"
                    />

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <SearchInput
                            widthClass="w-full sm:w-72"
                            placeholder="Search sellers by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <SellerTable
                    data={healthData?.sellers || []}
                    isLoading={isHealthLoading}
                    onRefresh={refetch}
                    pagination={healthData?.pagination}
                    onPageChange={handlePageChange}
                    onSort={handleSort}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    hasActiveFilters={statusFilter !== 'all' || !!debouncedSearch}
                    onClearFilters={() => {
                        setStatusFilter('all');
                        setSearchQuery('');
                        setPage(1);
                    }}
                />
            </motion.div>
        </div>
    );
};

export default SellersClient;
