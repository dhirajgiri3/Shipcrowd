/**
 * Manifests Dashboard Page
 *
 * Main page for manifest management with:
 * - Stats cards (Total, Pending Pickup, Today's)
 * - Create manifest button
 * - Status tabs + search + courier filter (aligned with OrdersClient/ShipmentsClient)
 * - Table with pagination
 * - Error state, empty state, loading states
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    useShipmentManifestsList,
    useShipmentManifestStats,
    useDownloadManifestPDF,
} from '@/src/core/api/hooks/logistics/useManifest';
import { ManifestTable } from '@/src/features/manifests/components/ManifestTable';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Button } from '@/src/components/ui/core/Button';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { cn } from '@/src/lib/utils';
import {
    Plus,
    FileText,
    Clock,
    CheckCircle2,
    Search,
    Calendar,
    Truck,
    RefreshCw,
    AlertCircle,
    ChevronDown,
    Package,
} from 'lucide-react';
import type { ManifestStatus, CourierPartner, ManifestListFilters, Manifest, ManifestListResponse } from '@/src/types/api/orders';

// ==================== Filter Options ====================

const STATUS_TABS: { value: ManifestStatus | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
    { value: 'handed_over', label: 'Handed Over' },
];

const COURIER_OPTIONS: { value: CourierPartner | ''; label: string }[] = [
    { value: '', label: 'All Couriers' },
    { value: 'velocity', label: 'Velocity' },
    { value: 'delhivery', label: 'Delhivery' },
    { value: 'ekart', label: 'Ekart' },
];

// ==================== Component ====================

export default function ManifestsPage() {
    const router = useRouter();
    const { addToast } = useToast();

    const limit = 20;
    const [page, setPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [statusTab, setStatusTab] = useState<ManifestStatus | ''>('');
    const [courierFilter, setCourierFilter] = useState<CourierPartner | ''>('');

    // Build filter object (debounced search for list API)
    const listFilters = useMemo<ManifestListFilters>(
        () => ({
            page,
            limit,
            status: statusTab || undefined,
            carrier: courierFilter || undefined,
            search: debouncedSearch.trim() || undefined,
        }),
        [page, statusTab, courierFilter, debouncedSearch]
    );

    // API hooks
    const { data, isLoading, error, refetch } = useShipmentManifestsList(listFilters);
    const manifestsData = data as ManifestListResponse | undefined;

    const { data: stats, isLoading: isStatsLoading } = useShipmentManifestStats();
    const { mutateAsync: downloadPdf } = useDownloadManifestPDF();

    // Handlers
    const handleManifestClick = (manifest: Manifest) => {
        router.push(`/seller/manifests/${manifest._id}`);
    };

    const handleDownloadPdf = async (manifestId: string) => {
        try {
            const url = await downloadPdf(manifestId);
            window.open(url, '_blank');
            addToast('Manifest PDF is ready', 'success');
        } catch {
            addToast('Failed to download manifest PDF. Please try again.', 'error');
        }
    };

    const handleCreateManifest = () => {
        router.push('/seller/manifests/create');
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    };

    const clearFilters = () => {
        setSearch('');
        setStatusTab('');
        setCourierFilter('');
        setPage(1);
    };

    const hasActiveFilters = !!search || !!statusTab || !!courierFilter;

    // Reset to page 1 when search or filters change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusTab, courierFilter]);

    const manifests = manifestsData?.manifests ?? [];
    const pagination = manifestsData
        ? { total: manifestsData.total, pages: manifestsData.pages }
        : null;

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Manifests"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Manifests', active: true },
                ]}
                description="Manage pickup manifests and coordinate with courier partners"
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleRefresh}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'h-10 w-10 p-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] shadow-sm',
                                isRefreshing && 'animate-spin'
                            )}
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Button>
                        <Button
                            onClick={handleCreateManifest}
                            size="sm"
                            className="h-10 px-5 rounded-xl bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)] text-sm font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Manifest
                        </Button>
                    </div>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isStatsLoading ? (
                    Array(4)
                        .fill(0)
                        .map((_, i) => (
                            <div
                                key={i}
                                className="h-32 rounded-2xl animate-pulse border border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
                            />
                        ))
                ) : (
                    <>
                        <StatsCard
                            title="Total Manifests"
                            value={stats?.totalManifests ?? 0}
                            icon={FileText}
                            iconColor="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                            delay={0}
                        />
                        <StatsCard
                            title="Pending Pickup"
                            value={stats?.pendingPickup ?? 0}
                            icon={Clock}
                            iconColor="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                            delay={1}
                        />
                        <StatsCard
                            title="Scheduled Today"
                            value={stats?.scheduledToday ?? 0}
                            icon={Calendar}
                            iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                            delay={2}
                        />
                        <StatsCard
                            title="Picked Up Today"
                            value={stats?.pickedUpToday ?? 0}
                            icon={CheckCircle2}
                            iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                            delay={3}
                        />
                    </>
                )}
            </div>

            {/* Table & Controls (aligned with OrdersClient) */}
            <div className="space-y-4">
                {/* Tabs + Search + Filter row */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    {/* Status tabs */}
                    <div className="flex p-1.5 rounded-xl bg-[var(--bg-secondary)] w-fit border border-[var(--border-subtle)] overflow-x-auto">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.value || 'all'}
                                onClick={() => setStatusTab(tab.value)}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                                    statusTab === tab.value
                                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search + Courier filter */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search by manifest ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2.5 h-11 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)] text-sm w-72 transition-all placeholder:text-[var(--text-muted)] shadow-sm"
                            />
                        </div>
                        <div className="relative group">
                            <button
                                type="button"
                                className="h-11 px-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-sm font-medium flex items-center gap-2 hover:bg-[var(--bg-secondary)] transition-colors shadow-sm"
                            >
                                <Truck className="w-4 h-4" />
                                <span>{courierFilter ? COURIER_OPTIONS.find((o) => o.value === courierFilter)?.label : 'All Couriers'}</span>
                                <ChevronDown className="w-4 h-4 opacity-50" />
                            </button>
                            <div className="absolute top-full right-0 mt-2 w-48 p-1.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                {COURIER_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value || 'all'}
                                        type="button"
                                        onClick={() => setCourierFilter(opt.value)}
                                        className={cn(
                                            'w-full text-left px-3 py-2 text-sm rounded-lg capitalize transition-colors flex items-center justify-between',
                                            courierFilter === opt.value
                                                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium'
                                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                                        )}
                                    >
                                        {opt.label}
                                        {courierFilter === opt.value && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary-blue)]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error state */}
                {error && (
                    <div className="bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-sm py-20 text-center">
                        <div className="w-20 h-20 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-[var(--error)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Failed to load manifests</h3>
                        <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">
                            {(error as { message?: string })?.message ?? 'An unexpected error occurred. Please try again.'}
                        </p>
                        <Button variant="primary" onClick={() => refetch()} className="mx-auto">
                            <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
                        </Button>
                    </div>
                )}

                {/* Table (show when loading or has data) */}
                {!error && (isLoading || manifests.length > 0) && (
                    <ManifestTable
                        manifests={manifests}
                        isLoading={isLoading}
                        onManifestClick={handleManifestClick}
                        onDownloadPdf={handleDownloadPdf}
                        className="bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] overflow-hidden shadow-sm"
                    />
                )}

                {/* Empty state (when no error, not loading, no data) */}
                {!isLoading && !error && manifests.length === 0 && (
                    <div className="py-24 text-center bg-[var(--bg-primary)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)]">
                        <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
                            <Package className="w-10 h-10 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">
                            {hasActiveFilters ? 'No manifests found' : 'No manifests created yet'}
                        </h3>
                        <p className="text-[var(--text-muted)] text-sm mt-2 mb-6">
                            {hasActiveFilters
                                ? 'No manifests match your current filters'
                                : 'Create your first manifest to start grouping shipments for pickup'}
                        </p>
                        {hasActiveFilters ? (
                            <Button
                                variant="outline"
                                onClick={clearFilters}
                                className="text-[var(--primary-blue)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
                            >
                                Clear all filters
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                onClick={handleCreateManifest}
                                className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Manifest
                            </Button>
                        )}
                    </div>
                )}

                {/* Pagination (OrdersClient style) */}
                {pagination && pagination.pages > 1 && manifests.length > 0 && (
                    <div className="flex items-center justify-between px-2 pt-4">
                        <p className="text-sm text-[var(--text-muted)]">
                            Showing{' '}
                            <span className="font-bold text-[var(--text-primary)]">{(page - 1) * limit + 1}</span> to{' '}
                            <span className="font-bold text-[var(--text-primary)]">
                                {Math.min(page * limit, pagination.total)}
                            </span>{' '}
                            of <span className="font-bold text-[var(--text-primary)]">{pagination.total}</span> results
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="h-9 px-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-sm disabled:opacity-50"
                            >
                                Previous
                            </Button>
                            <span className="text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                                Page {page} / {pagination.pages}
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                                disabled={page === pagination.pages}
                                className="h-9 px-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-sm disabled:opacity-50"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
