
"use client";

import React, { useState, useEffect } from 'react';
// Correct import path for admin hook
import { useSellerHealth } from '@/src/core/api/hooks/admin/useSellerHealth';
import { SellerTable } from './SellerTable';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import {
    Users,
    Activity,
    AlertTriangle,
    Search,
    Filter,
    ArrowUpRight,
    TrendingUp,
    Shield,
    Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/src/components/ui/feedback/Toast';

const SellersClient = () => {
    const [statusFilter, setStatusFilter] = useState<'all' | 'excellent' | 'warning' | 'critical'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);

    // Debounce search query
    const [debouncedSearch] = React.useMemo(() => {
        return [searchQuery];
    }, [searchQuery]);

    // Use a custom debounce implementation
    const [debouncedValue, setDebouncedValue] = useState(searchQuery);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(searchQuery);
            setPage(1); // Reset to page 1 on search
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);


    const [sortBy, setSortBy] = useState<string>('companyName');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Query hook
    const {
        data: healthData,
        isLoading: isHealthLoading,
        isError,
        refetch,
        isFetching
    } = useSellerHealth({
        status: statusFilter === 'all' ? undefined : statusFilter as any,
        search: debouncedValue,
        page,
        limit,
        sortBy,
        sortOrder,
    });

    // Reset pagination when filter changes
    React.useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    // Refresh data when filters change
    useEffect(() => {
        refetch();
    }, [statusFilter, debouncedValue, page, sortBy, sortOrder, refetch]);

    const handleSort = (key: string) => {
        if (sortBy === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('asc'); // Default to asc for new key
        }
        setPage(1); // Reset to first page on sort change
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= (healthData?.pagination?.totalPages || 1)) {
            setPage(newPage);
        }
    };

    const [isExporting, setIsExporting] = useState(false);
    const { addToast } = useToast();

    const handleExport = async () => {
        try {
            setIsExporting(true);
            // Dynamic import of the API to ensure no circular deps
            const { sellerHealthApi } = await import('@/src/core/api/clients/analytics/sellerHealthApi');

            const blob = await sellerHealthApi.exportSellers({
                status: statusFilter,
                search: debouncedValue
            });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sellers_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export failed:', error);
            addToast('Failed to export sellers. Please try again.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    // Calculate dynamic stats
    const totalSellers = healthData?.summary?.total || 0;
    const avgHealth = healthData?.summary?.avgHealthScore || 0;
    const criticalRisk = healthData?.summary?.byStatus?.critical || 0;
    const healthySellers = (healthData?.summary?.byStatus?.excellent || 0) + (healthData?.summary?.byStatus?.good || 0);

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[var(--bg-secondary)] min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Seller Management</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Monitor seller health, performance, and risk metrics across the platform.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-50"
                    >
                        <Activity size={16} className={isFetching ? "animate-spin" : ""} />
                        Refresh Data
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-50"
                    >
                        {isExporting ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                            <ArrowUpRight size={16} />
                        )}
                        {isExporting ? 'Exporting...' : 'Export Report'}
                    </button>
                </div>
            </div>

            {/* Stats Grid - Bento Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Sellers"
                    value={totalSellers}
                    icon={Users}
                    iconColor="bg-blue-600 text-white"
                    trend={{ value: 12, label: "this week", positive: true }}
                    delay={0}
                />
                <StatsCard
                    title="Healthy Sellers"
                    value={healthySellers}
                    icon={Shield}
                    iconColor="bg-emerald-500 text-white"
                    description={`${((healthySellers / (totalSellers || 1)) * 100).toFixed(0)}% of total base`}
                    delay={1}
                />
                <StatsCard
                    title="Critical Risk"
                    value={criticalRisk}
                    icon={AlertTriangle}
                    iconColor="bg-red-500 text-white"
                    trend={healthData?.summary?.trends?.criticalRisk ? {
                        value: healthData.summary.trends.criticalRisk.value,
                        label: healthData.summary.trends.criticalRisk.label,
                        // If risk INCREASED (isIncrease=true), it's BAD (positive=false)
                        // If risk DECREASED (isIncrease=false), it's GOOD (positive=true)
                        positive: !healthData.summary.trends.criticalRisk.isIncrease
                    } : undefined}
                    delay={2}
                />
                <StatsCard
                    title="Avg Health Score"
                    value={`${avgHealth.toFixed(0)}%`}
                    icon={TrendingUp}
                    iconColor="bg-violet-600 text-white"
                    description="Platform-wide average"
                    delay={3}
                />
            </div>

            {/* Controls & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-default)]">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search sellers by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm focus:outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                    {(['all', 'excellent', 'warning', 'critical'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${statusFilter === status
                                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Table */}
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
                    onPageChange={setPage}
                    onSort={handleSort}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                />
            </motion.div>
        </div>
    );
};

export default SellersClient;
