"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedValue } from '@/src/hooks/data';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { Loader } from '@/src/components/ui/feedback/Loader';
import {
    PackageX,
    FileOutput,
    RefreshCw,
    Clock,
    Package,
    TrendingDown,
    CheckCircle2,
} from 'lucide-react';
import { formatCurrency, formatDate, parsePaginationQuery, syncPaginationQuery } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useAdminReturns, useAdminReturnStats } from '@/src/core/api/hooks/logistics/useAdminReturns';

const RETURNS_TABS = [
    { key: 'all', label: 'All' },
    { key: 'requested', label: 'Requested' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'completed', label: 'Completed' },
] as const;

const DEFAULT_LIMIT = 20;

export function ReturnsClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { page: urlPage, limit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
    const [page, setPage] = useState(urlPage);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery, 300);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const hasInitializedFilterReset = useRef(false);
    const { addToast } = useToast();

    useEffect(() => {
        const nextStatus = searchParams.get('status') || 'all';
        setSelectedStatus((current) => (current === nextStatus ? current : nextStatus));

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
    }, [debouncedSearch, selectedStatus, isUrlHydrated]);

    useEffect(() => {
        if (!isUrlHydrated) return;

        const params = new URLSearchParams(searchParams.toString());
        if (selectedStatus !== 'all') {
            params.set('status', selectedStatus);
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
    }, [selectedStatus, debouncedSearch, page, limit, isUrlHydrated, searchParams, pathname, router]);

    const { data: returns = [], isLoading, isError, refetch } = useAdminReturns({
        page,
        limit,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        search: debouncedSearch || undefined,
    });

    const { data: metrics } = useAdminReturnStats();

    const handleRefresh = () => {
        refetch();
        addToast('Refreshed', 'success');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Returns Management"
                breadcrumbs={[
                    { label: 'Admin', href: '/admin' },
                    { label: 'Returns', active: true },
                ]}
                description="Monitor and manage customer returns across all companies"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRefresh}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync
                        </Button>
                        <Button variant="outline" onClick={() => addToast('Feature coming soon', 'info')}>
                            <FileOutput className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Returns"
                    value={metrics?.total || 0}
                    icon={PackageX}
                    iconColor="text-[var(--primary-blue)] bg-[var(--primary-blue-soft)]"
                    variant="default"
                />
                <StatsCard
                    title="Pending Action"
                    value={metrics?.requested || 0}
                    icon={Clock}
                    variant="warning"
                />
                <StatsCard
                    title="QC Pending"
                    value={metrics?.qcPending || 0}
                    icon={CheckCircle2}
                    variant="info"
                />
                <StatsCard
                    title="Total Refunded"
                    value={formatCurrency(metrics?.totalRefundAmount || 0)}
                    icon={TrendingDown}
                    variant="success"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <SearchInput
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Order ID or Return ID..."
                    widthClass="flex-1"
                />
                <PillTabs
                    tabs={RETURNS_TABS}
                    activeTab={selectedStatus}
                    onTabChange={(key) => setSelectedStatus(key)}
                    className="overflow-x-auto"
                />
            </div>

            {/* Returns Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto relative min-h-[300px]">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]/50 z-10">
                                <Loader centered />
                            </div>
                        ) : null}

                        {isError ? (
                            <EmptyState
                                variant="error"
                                title="Failed to load returns"
                                description="An error occurred while fetching returns data."
                                action={{
                                    label: 'Retry',
                                    onClick: () => refetch(),
                                    variant: 'outline',
                                }}
                            />
                        ) : returns.length === 0 ? (
                            <EmptyState
                                variant="noItems"
                                title="No returns found"
                                description={
                                    debouncedSearch || selectedStatus !== 'all'
                                        ? 'Try adjusting your filters or search.'
                                        : 'No returns to display at this time.'
                                }
                            />
                        ) : (
                            <table className="w-full">
                                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                    <tr>
                                        <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Return ID</th>
                                        <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Order / Customer</th>
                                        <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Company</th>
                                        <th className="text-left p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Reason</th>
                                        <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Amount</th>
                                        <th className="text-center p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                                        <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                                        <th className="text-right p-4 text-xs font-medium text-[var(--text-muted)] uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {returns.map((item) => (
                                        <tr key={item._id} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                                            <td className="p-4">
                                                <code className="font-mono text-sm font-semibold text-[var(--text-primary)]">{item.returnId || item._id.substring(0, 8)}</code>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-[var(--text-primary)]">{item.orderId}</span>
                                                    <span className="text-xs text-[var(--text-muted)]">{item.customerName || 'Unknown Customer'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm text-[var(--text-secondary)]">{item.companyName || 'N/A'}</span>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm text-[var(--text-secondary)] max-w-[200px] truncate" title={item.reason}>
                                                    {item.reason}
                                                </p>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-sm font-medium text-[var(--text-primary)]">{formatCurrency(item.refundAmount || 0)}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <StatusBadge domain="return" status={item.status} size="sm" />
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-xs text-[var(--text-muted)]">{formatDate(item.createdAt)}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <ViewActionButton
                                                    onClick={() => router.push(`/admin/returns/${item._id}`)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
