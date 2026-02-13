/**
 * Manifests Dashboard Page
 * 
 * Main page for manifest management with:
 * - Stats cards (Total, Pending Pickup, Today's)
 * - Create manifest button
 * - Manifests table with filters
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    useShipmentManifestsList,
    useShipmentManifestStats,
    useDownloadManifestPDF,
} from '@/src/core/api/hooks/logistics/useManifest';
import { ManifestTable } from '@/src/features/manifests/components/ManifestTable';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { Pagination } from '@/src/components/ui/data/Pagination';
import {
    Plus,
    FileText,
    Clock,
    Package,
    CheckCircle2,
    Search,
    Filter,
    Calendar,
    Truck,
    RefreshCw,
} from 'lucide-react';
import type { ManifestStatus, CourierPartner, ManifestListFilters, Manifest, ManifestListResponse } from '@/src/types/api/orders';

// ==================== Status Options ====================

const statusOptions: { value: ManifestStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
    { value: 'handed_over', label: 'Handed Over' },
];

const courierOptions: { value: CourierPartner | ''; label: string }[] = [
    { value: '', label: 'All Couriers' },
    { value: 'velocity', label: 'Velocity' },
    { value: 'delhivery', label: 'Delhivery' },
    { value: 'ekart', label: 'Ekart' },

];

// ==================== Component ====================

export default function ManifestsPage() {
    const router = useRouter();

    // Filters state
    const [filters, setFilters] = useState<ManifestListFilters>({
        page: 1,
        limit: 10,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ManifestStatus | ''>('');
    const [courierFilter, setCourierFilter] = useState<CourierPartner | ''>('');

    // Build filter object
    const buildFilters = (): ManifestListFilters => ({
        ...filters,
        status: statusFilter || undefined,
        carrier: courierFilter || undefined,
        search: searchQuery || undefined,
    });

    // API hooks
    const { data, isLoading, refetch } = useShipmentManifestsList(buildFilters());
    const manifestsData = data as ManifestListResponse | undefined;

    const { data: stats, isLoading: isStatsLoading } = useShipmentManifestStats();
    const { mutateAsync: downloadPdf } = useDownloadManifestPDF();

    // Handlers
    const handleManifestClick = (manifest: Manifest) => {
        router.push(`/seller/manifests/${manifest._id}`);
    };

    const handleDownloadPdf = async (manifestId: string) => {
        const url = await downloadPdf(manifestId);
        window.open(url, '_blank');
    };

    const handleCreateManifest = () => {
        router.push('/seller/manifests/create');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, page: 1 }));
    };

    const handleRefresh = () => {
        refetch();
    };

    const handlePageChange = (page: number) => {
        setFilters(prev => ({ ...prev, page }));
    };

    // Check if we have active filters
    const hasActiveFilters = !!searchQuery || !!statusFilter || !!courierFilter;

    // Loading overlay for table
    const renderTableContent = () => {
        if (isLoading && (!manifestsData?.manifests || manifestsData.manifests.length === 0)) {
            return (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader size="lg" variant="spinner" className="text-[var(--primary-blue)] mb-4" />
                    <p className="text-[var(--text-muted)]">Loading manifests...</p>
                </div>
            );
        }

        if (!isLoading && (!manifestsData?.manifests || manifestsData.manifests.length === 0)) {
            return (
                <div className="py-12">
                    <EmptyState
                        icon={<FileText className="w-12 h-12" />}
                        title={hasActiveFilters ? "No manifests found" : "No manifests created yet"}
                        description={hasActiveFilters
                            ? "Try adjusting your search or filters to find what you're looking for."
                            : "Create your first manifest to start grouping shipments for pickup."}
                        action={!hasActiveFilters ? {
                            label: "Create Manifest",
                            onClick: handleCreateManifest,
                            icon: <Plus className="w-4 h-4 mr-2" />
                        } : {
                            label: "Clear Filters",
                            onClick: () => {
                                setSearchQuery('');
                                setStatusFilter('');
                                setCourierFilter('');
                                setFilters(prev => ({ ...prev, page: 1 }));
                            },
                            variant: "outline"
                        }}
                    />
                </div>
            );
        }

        return (
            <>
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-[var(--bg-primary)]/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                            <Loader size="md" variant="spinner" />
                        </div>
                    )}
                    <ManifestTable
                        manifests={manifestsData?.manifests ?? []}
                        isLoading={false} // We handle loading state above
                        onManifestClick={handleManifestClick}
                        onDownloadPdf={handleDownloadPdf}
                    />
                </div>

                {manifestsData && (
                    <Pagination
                        currentPage={filters.page || 1}
                        totalPages={manifestsData.pages}
                        totalItems={manifestsData.total}
                        pageSize={filters.limit || 10}
                        onPageChange={handlePageChange}
                        className="bg-transparent border-t border-[var(--border-subtle)]"
                    />
                )}
            </>
        );
    };

    return (
        <div className="min-h-screen space-y-8 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] text-xs font-bold uppercase tracking-wider mb-2 border border-[var(--primary-blue-light)]/20">
                        <span className="w-2 h-2 rounded-full bg-[var(--primary-blue)] animate-pulse" />
                        Logistics Management
                    </div>
                    <h1 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight">
                        Manifests
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Manage pickup manifests and coordinate with courier partners
                    </p>
                </div>
                <Button
                    onClick={handleCreateManifest}
                    className="h-12 px-6 rounded-xl shadow-brand-lg font-semibold"
                    variant="primary"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Manifest
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isStatsLoading ? (
                    // Loading skeletons for stats
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="h-32 bg-[var(--bg-elevated)] rounded-2xl animate-pulse border border-[var(--border-subtle)]" />
                    ))
                ) : (
                    <>
                        <StatsCard
                            title="Total Manifests"
                            value={stats?.totalManifests ?? 0}
                            icon={FileText}
                            variant="default"
                            delay={0}
                        />
                        <StatsCard
                            title="Pending Pickup"
                            value={stats?.pendingPickup ?? 0}
                            icon={Clock}
                            variant="warning"
                            delay={1}
                        />
                        <StatsCard
                            title="Scheduled Today"
                            value={stats?.scheduledToday ?? 0}
                            icon={Calendar}
                            variant="info"
                            delay={2}
                        />
                        <StatsCard
                            title="Picked Up Today"
                            value={stats?.pickedUpToday ?? 0}
                            icon={CheckCircle2}
                            variant="success"
                            delay={3}
                        />
                    </>
                )}
            </div>

            {/* Filters & Table Section */}
            <div className="bg-[var(--bg-elevated)] rounded-3xl border border-[var(--border-subtle)] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <form onSubmit={handleSearch} className="flex-1">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by manifest ID..."
                                icon={<Search className="w-4 h-4 text-[var(--text-muted)]" />}
                                className="h-10 bg-[var(--bg-tertiary)]"
                            />
                        </form>

                        {/* Status Filter */}
                        <div className="w-full md:w-48">
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none z-10" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value as ManifestStatus | '');
                                        setFilters(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className="w-full h-10 pl-9 pr-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm focus:ring-1 focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)] appearance-none cursor-pointer"
                                >
                                    {statusOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Courier Filter */}
                        <div className="w-full md:w-48">
                            <div className="relative">
                                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none z-10" />
                                <select
                                    value={courierFilter}
                                    onChange={(e) => {
                                        setCourierFilter(e.target.value as CourierPartner | '');
                                        setFilters(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className="w-full h-10 pl-9 pr-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm focus:ring-1 focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)] appearance-none cursor-pointer"
                                >
                                    {courierOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Refresh Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefresh}
                            className="h-10 w-10 text-[var(--text-secondary)] hover:text-[var(--primary-blue)]"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Table Content */}
                {renderTableContent()}
            </div>
        </div>
    );
}
