'use client';

import React, { useState, useMemo } from 'react';
import {
    Filter, RefreshCw, RotateCcw, Package,
    CheckCircle2, AlertCircle, Clock, Search, Download
} from 'lucide-react';

import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { ReturnsTable } from '@/src/features/returns/components/ReturnsTable';
import { Button } from '@/src/components/ui/core/Button';
import { ReturnDetailsPanel } from '@/src/components/seller/returns/ReturnDetailsPanel';
import { EmptyState, NoSearchResults } from '@/src/components/ui/feedback/EmptyState';

import { useReturns, useReturnMetrics } from '@/src/core/api/hooks';
import { useDebouncedValue } from '@/src/hooks/data';
import { formatCurrency, cn } from '@/src/lib/utils';
import type { ReturnRequest, ReturnStatus } from '@/src/types/api/returns/returns.types';

const STATUS_TABS: { id: ReturnStatus | 'all'; label: string }[] = [
    { id: 'all', label: 'All Returns' },
    { id: 'requested', label: 'Requested' },
    { id: 'pickup_scheduled', label: 'Pickup Scheduled' },
    { id: 'in_transit', label: 'In Transit' },
    { id: 'qc_pending', label: 'QC Pending' },
    { id: 'refunding', label: 'Refunding' },
    { id: 'completed', label: 'Completed' },
    { id: 'rejected', label: 'Rejected/Cancelled' },
];

export function ReturnsClient() {
    // State
    const [activeTab, setActiveTab] = useState<ReturnStatus | 'all'>('all');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 500);
    const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 10 });
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Queries
    const { data: metrics } = useReturnMetrics();

    // Filters logic
    const filters = useMemo(() => ({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        status: activeTab === 'all' ? undefined : activeTab,
    }), [pagination.page, pagination.limit, debouncedSearch, activeTab]);

    const { data, isLoading, isError, refetch } = useReturns(filters);

    const handleRefetch = async () => {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    };

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            <PageHeader
                title="Returns Management"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Returns', active: true },
                ]}
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleRefetch}
                            variant="ghost"
                            size="sm"
                            className={cn("h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm", isRefreshing && "animate-spin")}
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                        <Button size="sm" className="h-10 px-5 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-sm font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                }
            />

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Returns"
                    value={metrics?.total || 0}
                    icon={RotateCcw}
                    iconColor="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                    trend={{ value: 0, label: 'vs last month', positive: true }}
                />
                <StatsCard
                    title="Pending Request"
                    value={metrics?.requested || 0}
                    icon={Clock}
                    iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                    trend={{ value: 0, label: 'awaiting approval', positive: false }}
                />
                <StatsCard
                    title="QC Pending"
                    value={metrics?.qcPending || 0}
                    icon={Package}
                    iconColor="text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
                />
                <StatsCard
                    title="Refunded Amount"
                    value={formatCurrency(metrics?.totalRefundAmount || 0)}
                    icon={CheckCircle2}
                    iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                />
            </div>

            {/* Main Content Area */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    {/* Tabs */}
                    <div className="flex p-1.5 rounded-xl bg-[var(--bg-secondary)] w-fit border border-[var(--border-subtle)] overflow-x-auto">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as ReturnStatus | 'all');
                                    setPagination(p => ({ ...p, page: 1 }));
                                }}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap",
                                    activeTab === tab.id
                                        ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Filters & Search */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search by Return ID, Order # or Customer..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2.5 h-11 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)] text-sm w-80 transition-all placeholder:text-[var(--text-muted)] shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Error State */}
                {isError && (
                    <div className="bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-sm py-20 text-center">
                        <div className="w-20 h-20 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-[var(--error)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Failed to load returns</h3>
                        <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">An unexpected error occurred while fetching your returns. Please try again.</p>
                        <Button
                            variant="primary"
                            onClick={() => refetch()}
                            className="mx-auto"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
                        </Button>
                    </div>
                )}

                {/* Table */}
                {!isError && (
                    <ReturnsTable
                        data={data?.returns || []}
                        isLoading={isLoading}
                        onRefresh={refetch}
                        pagination={{
                            total: data?.pagination?.total || 0,
                            page: pagination.page,
                            limit: pagination.limit,
                            totalPages: data?.pagination?.totalPages || 1
                        }}
                        onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                        onRowClick={(returnReq) => setSelectedReturn(returnReq)}
                        emptyState={
                            search ? (
                                <NoSearchResults
                                    searchTerm={search}
                                    onClear={() => setSearch('')}
                                />
                            ) : activeTab !== 'all' ? (
                                <EmptyState
                                    variant="noData"
                                    title={`No ${activeTab.replace(/_/g, ' ')} returns`}
                                    description="There are no return requests with this status."
                                    action={{
                                        label: "Clear Filters",
                                        onClick: () => setActiveTab('all'),
                                        icon: <Filter className="w-4 h-4" />
                                    }}
                                />
                            ) : undefined
                        }
                    />
                )}
            </div>

            {/* Sidebar Details Panel */}
            <ReturnDetailsPanel
                returnReq={selectedReturn}
                onClose={() => setSelectedReturn(null)}
            />
        </div>
    );
}
