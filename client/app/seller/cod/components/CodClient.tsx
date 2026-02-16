"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
    FileOutput,
    RefreshCw,
    IndianRupee,
    CheckCircle,
    Clock,
    TrendingUp,
    Calendar,
    Banknote,
} from 'lucide-react';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { EmptyState, NoSearchResults } from '@/src/components/ui/feedback/EmptyState';
import { CardSkeleton, TableSkeleton } from '@/src/components/ui/data/Skeleton';
import { DateRangePicker } from '@/src/components/ui/form/DateRangePicker';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { cn, formatCurrency, parsePaginationQuery, syncPaginationQuery } from '@/src/lib/utils';
import type { DateRange } from '@/src/lib/data';
import { useUrlDateRange } from '@/src/hooks';
import {
    useCODRemittances,
    useCODStats,
    useEligibleCODShipments,
} from '@/src/core/api/hooks/finance';
import { useSellerExport } from '@/src/core/api/hooks/seller/useSellerExports';
import type { RemittanceStatus } from '@/src/types/api/finance';

// Tabs matching actual backend status values:
// Backend model uses: draft | pending_approval | approved | paid | settled | cancelled | failed
const REMITTANCE_TABS = [
    { key: 'all', label: 'All' },
    { key: 'pending_approval', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'paid', label: 'Paid' },
    { key: 'settled', label: 'Settled' },
    { key: 'failed', label: 'Failed' },
    { key: 'pending', label: 'Pending COD' }, // For eligible shipments tab (not a backend status)
] as const;
const DEFAULT_LIMIT = 20;

type RemittanceTabKey = (typeof REMITTANCE_TABS)[number]['key'];

// Status badge variant mapping (matching backend status values)
const statusVariantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    'draft': 'neutral',
    'pending_approval': 'warning',
    'approved': 'info',
    'paid': 'success',
    'settled': 'success',
    'failed': 'error',
    'cancelled': 'neutral',
};

export function CodClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { addToast } = useToast();

    // State
    const [activeTab, setActiveTab] = useState<RemittanceTabKey>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | RemittanceStatus>('all');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [page, setPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const hasInitializedFilterReset = useRef(false);
    const {
        range: selectedDateRange,
        startDateIso,
        endDateIso,
        setRange,
    } = useUrlDateRange();
    const { limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const exportSellerData = useSellerExport();

    // Sync from URL params (for deep linking)
    useEffect(() => {
        const statusParam = searchParams.get('status');
        const validTabs: RemittanceTabKey[] = ['all', 'pending_approval', 'approved', 'paid', 'settled', 'failed', 'pending'];
        const nextTab = statusParam && validTabs.includes(statusParam as RemittanceTabKey)
            ? (statusParam as RemittanceTabKey)
            : 'all';
        setActiveTab(nextTab);
        setStatusFilter(nextTab === 'all' || nextTab === 'pending' ? 'all' : nextTab);
        const nextSearch = searchParams.get('search') || '';
        setSearch((currentSearch) => (currentSearch === nextSearch ? currentSearch : nextSearch));

        const { page: nextPage } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
        setPage((currentPage) => (currentPage === nextPage ? currentPage : nextPage));

        setIsUrlHydrated(true);
    }, [searchParams]);

    // Reset page on filter change
    useEffect(() => {
        if (!isUrlHydrated) return;
        if (!hasInitializedFilterReset.current) {
            hasInitializedFilterReset.current = true;
            return;
        }
        setPage(1);
    }, [debouncedSearch, statusFilter, startDateIso, endDateIso, isUrlHydrated]);

    // Sync URL from local filters
    useEffect(() => {
        if (!isUrlHydrated) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set('status', activeTab);
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
    }, [activeTab, debouncedSearch, page, limit, isUrlHydrated, searchParams, pathname, router]);

    // API Hooks - Real data only, no mock fallbacks
    const {
        data: remittancesResponse,
        isLoading: isLoadingRemittances,
        error: remittancesError,
        refetch: refetchRemittances,
    } = useCODRemittances({
        page,
        limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedSearch || undefined,
        startDate: startDateIso,
        endDate: endDateIso,
    });

    const { data: stats, isLoading: isLoadingStats } = useCODStats({
        startDate: startDateIso,
        endDate: endDateIso,
    });

    // For Pending COD tab - use far future date as cutoff to get all eligible shipments
    const futureDate = useMemo(() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 10);
        return date.toISOString().split('T')[0];
    }, []);

    const { data: eligibleShipmentsData, isLoading: isLoadingEligible } = useEligibleCODShipments(
        activeTab === 'pending' ? futureDate : undefined,
        {
            enabled: activeTab === 'pending',
        }
    );

    const remittances = remittancesResponse?.remittances || [];
    const pagination = remittancesResponse?.pagination;
    const eligibleShipments = eligibleShipmentsData?.shipments || [];
    const eligibleSummary = eligibleShipmentsData?.summary;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetchRemittances();
        setIsRefreshing(false);
    };

    const handleDateRangeChange = (range: DateRange) => {
        setRange(range);
    };

    const handleTabChange = (tabKey: RemittanceTabKey) => {
        setActiveTab(tabKey);
        setStatusFilter(tabKey === 'all' || tabKey === 'pending' ? 'all' : tabKey);
        setPage(1);
    };

    const handleViewRemittance = (id: string) => {
        router.push(`/seller/cod/remittance/${id}`);
    };

    const handleExportReport = () => {
        exportSellerData.mutate({
            module: activeTab === 'pending' ? 'cod_remittance_pending' : 'cod_remittance_history',
            filters: {
                status: statusFilter !== 'all' ? statusFilter : undefined,
                search: debouncedSearch || undefined,
                startDate: startDateIso || undefined,
                endDate: endDateIso || undefined,
            },
        });
    };

    const handleRequestPayout = () => {
        router.push('/seller/cod/remittance');
    };

    // Loading state
    if (isLoadingStats && !stats) {
        return (
            <div className="min-h-screen space-y-8 pb-20">
                <PageHeader
                    title="COD Remittance"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/seller/dashboard' },
                        { label: 'COD Remittance', active: true },
                    ]}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <CardSkeleton key={i} />
                    ))}
                </div>
                <TableSkeleton rows={10} columns={8} />
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            {/* Page Header */}
            <PageHeader
                title="COD Remittance"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'COD Remittance', active: true },
                ]}
                actions={
                    <div className="flex items-center gap-3">
                        <DateRangePicker value={selectedDateRange} onRangeChange={handleDateRangeChange} />
                        <Button
                            onClick={handleRefresh}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm",
                                isRefreshing && "animate-spin"
                            )}
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExportReport}
                            className="h-10 px-4 rounded-xl"
                        >
                            <FileOutput className="w-4 h-4 mr-2" />
                            Export Report
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleRequestPayout}
                            className="h-10 px-5 rounded-xl"
                        >
                            <Banknote className="w-4 h-4 mr-2" />
                            Request Payout
                        </Button>
                    </div>
                }
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Pending Collection"
                    value={formatCurrency(stats?.pendingCollection?.amount || 0)}
                    icon={IndianRupee}
                    iconColor="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                    description={`${stats?.pendingCollection?.orders || 0} shipments`}
                    delay={0}
                    onClick={() => handleTabChange('pending')}
                    isActive={activeTab === 'pending'}
                />
                <StatsCard
                    title="In Settlement"
                    value={formatCurrency(stats?.inSettlement?.amount || 0)}
                    icon={Clock}
                    variant="warning"
                    iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                    description={`${stats?.inSettlement?.orders || 0} shipments processing`}
                    delay={1}
                    onClick={() => handleTabChange('pending_approval')}
                    isActive={activeTab === 'pending_approval'}
                />
                <StatsCard
                    title="Available for Payout"
                    value={formatCurrency(stats?.available?.amount || 0)}
                    icon={CheckCircle}
                    variant="success"
                    iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                    delay={2}
                    onClick={() => handleTabChange('approved')}
                    isActive={activeTab === 'approved'}
                />
                <StatsCard
                    title="This Month Received"
                    value={formatCurrency(stats?.thisMonth?.received || 0)}
                    icon={TrendingUp}
                    variant="info"
                    iconColor="text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400"
                    description={`${formatCurrency(stats?.thisMonth?.deducted || 0, 'INR')} deducted`}
                    delay={3}
                />
            </div>

            {/* Tabs & Search */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <PillTabs
                        tabs={REMITTANCE_TABS}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />

                    <SearchInput
                        placeholder="Search by batch ID or UTR..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Remittance History Table */}
                {activeTab !== 'pending' && (
                    <>
                        {isLoadingRemittances ? (
                            <TableSkeleton rows={10} columns={8} />
                        ) : remittancesError ? (
                            <div className="flex flex-col items-center justify-center py-12 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-default)]">
                                <div className="text-center space-y-4">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--error-bg)]">
                                        <Clock className="w-8 h-8 text-[var(--error)]" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                        Failed to Load Remittances
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)] max-w-md">
                                        We couldn't load your remittance data. Please try again.
                                    </p>
                                    <Button onClick={handleRefresh}>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Retry
                                    </Button>
                                </div>
                            </div>
                        ) : remittances.length === 0 ? (
                            debouncedSearch ? (
                                <NoSearchResults onClear={() => setSearch('')} />
                            ) : (
                                <EmptyState
                                    variant="noData"
                                    title="No Remittances Found"
                                    description={
                                        statusFilter === 'all'
                                            ? "You don't have any COD remittances yet. Remittances will appear here once your COD shipments are delivered."
                                            : `No ${REMITTANCE_TABS.find(t => t.key === statusFilter)?.label.toLowerCase()} remittances found.`
                                    }
                                    icon={<Banknote className="w-12 h-12" />}
                                />
                            )
                        ) : (
                            <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Remit ID</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Total COD</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Deductions</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Net Amount</th>
                                                <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Shipments</th>
                                                <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-subtle)]">
                                            {remittances.map((remittance) => (
                                                <tr
                                                    key={remittance._id}
                                                    className="hover:bg-[var(--bg-secondary)] transition-colors"
                                                >
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                                                            <span className="text-sm text-[var(--text-primary)]">
                                                                {format(new Date(remittance.createdAt), 'MMM dd, yyyy')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <code className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                                                            {remittance.remittanceId}
                                                        </code>
                                                        {remittance.payout?.utr && (
                                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                                UTR: {remittance.payout.utr}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                                            {formatCurrency(remittance.batch.totalCODCollected)}
                                                        </p>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <p className="text-sm text-[var(--error)]">
                                                            -{formatCurrency(remittance.deductions.total)}
                                                        </p>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <p className="text-sm font-bold text-[var(--success)]">
                                                            {formatCurrency(remittance.finalPayable)}
                                                        </p>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="text-sm text-[var(--text-primary)]">
                                                            {remittance.batch.shipmentsCount}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Badge
                                                            variant={statusVariantMap[remittance.status] || 'neutral'}
                                                            className="gap-1 capitalize"
                                                        >
                                                            {(remittance.status === 'paid' || remittance.status === 'settled') && <CheckCircle className="h-3 w-3" />}
                                                            {remittance.status === 'pending_approval' && <Clock className="h-3 w-3" />}
                                                            {remittance.status.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex justify-end">
                                                            <ViewActionButton
                                                                onClick={() => handleViewRemittance(remittance._id)}
                                                                label="View"
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {pagination && pagination.pages > 1 && (
                                    <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)]">
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} results
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={!pagination.hasPrev}
                                            >
                                                Previous
                                            </Button>
                                            <span className="text-sm text-[var(--text-secondary)] px-3">
                                                Page {page} of {pagination.pages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPage(p => p + 1)}
                                                disabled={!pagination.hasNext}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Pending COD Shipments Tab */}
                {activeTab === 'pending' && (
                    <>
                        {isLoadingEligible ? (
                            <TableSkeleton rows={8} columns={5} />
                        ) : eligibleShipments.length === 0 ? (
                            <EmptyState
                                variant="noData"
                                title="No Pending COD Shipments"
                                description="All your COD shipments have been included in remittances. New eligible shipments will appear here after delivery."
                                icon={<Banknote className="w-12 h-12" />}
                            />
                        ) : (
                            <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">AWB Number</th>
                                                <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Order ID</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">COD Amount</th>
                                                <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Delivered</th>
                                                <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Shipping Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-subtle)]">
                                            {eligibleShipments.map((shipment) => (
                                                <tr key={shipment.awb} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                                    <td className="p-4">
                                                        <code className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                                                            {shipment.awb}
                                                        </code>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-sm text-[var(--text-primary)]">
                                                            {shipment.orderId}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <p className="text-sm font-bold text-[var(--text-primary)]">
                                                            {formatCurrency(shipment.codAmount)}
                                                        </p>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <p className="text-sm text-[var(--text-secondary)]">
                                                            {format(new Date(shipment.deliveredAt), 'MMM dd, yyyy')}
                                                        </p>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <p className="text-sm text-[var(--text-secondary)]">
                                                            {formatCurrency(shipment.shippingCost)}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {eligibleSummary && (
                                            <tfoot className="bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)]">
                                                <tr>
                                                    <td className="p-4 font-medium text-[var(--text-primary)]" colSpan={2}>
                                                        Total ({eligibleSummary.totalShipments} shipments)
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-[var(--text-primary)]">
                                                        {formatCurrency(eligibleSummary.totalCODAmount)}
                                                    </td>
                                                    <td className="p-4"></td>
                                                    <td className="p-4 text-right font-medium text-[var(--text-secondary)]">
                                                        {formatCurrency(eligibleSummary.totalShippingCost)}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colSpan={5} className="p-4 text-center">
                                                        <p className="text-sm text-[var(--text-muted)]">
                                                            Estimated Payable: <span className="font-bold text-[var(--success)]">
                                                                {formatCurrency(eligibleSummary.estimatedPayable)}
                                                            </span>
                                                        </p>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
