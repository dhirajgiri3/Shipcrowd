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
    useManifests,
    useManifestStats,
    useDownloadManifestPdf,
} from '@/src/core/api/hooks/orders/useManifests';
import { ManifestTable } from '@/src/features/manifests/components/ManifestTable';
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
    Loader2,
    RefreshCw,
} from 'lucide-react';
import type { ManifestStatus, CourierPartner, ManifestListFilters, Manifest } from '@/src/types/api/orders';

// ==================== Status Options ====================

const statusOptions: { value: ManifestStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'CREATED', label: 'Created' },
    { value: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled' },
    { value: 'PICKUP_IN_PROGRESS', label: 'Pickup In Progress' },
    { value: 'PICKED_UP', label: 'Picked Up' },
    { value: 'PARTIALLY_PICKED', label: 'Partially Picked' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

const courierOptions: { value: CourierPartner | ''; label: string }[] = [
    { value: '', label: 'All Couriers' },
    { value: 'velocity', label: 'Velocity' },
    { value: 'delhivery', label: 'Delhivery' },
    { value: 'ekart', label: 'Ekart' },
    { value: 'xpressbees', label: 'XpressBees' },
    { value: 'bluedart', label: 'BlueDart' },
    { value: 'shadowfax', label: 'Shadowfax' },
    { value: 'ecom_express', label: 'Ecom Express' },
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
        courierPartner: courierFilter || undefined,
        search: searchQuery || undefined,
    });

    // API hooks
    const { data: manifestsData, isLoading, refetch } = useManifests(buildFilters());
    const { data: stats, isLoading: isStatsLoading } = useManifestStats();
    const { mutate: downloadPdf, isPending: isDownloading } = useDownloadManifestPdf();

    // Handlers
    const handleManifestClick = (manifest: Manifest) => {
        router.push(`/seller/manifests/${manifest._id}`);
    };

    const handleDownloadPdf = (manifestId: string) => {
        downloadPdf(manifestId);
    };

    const handleReconcile = (manifestId: string) => {
        router.push(`/seller/manifests/reconciliation?id=${manifestId}`);
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

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                            Manifests
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            Manage pickup manifests and coordinate with courier partners
                        </p>
                    </div>
                    <button
                        onClick={handleCreateManifest}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white font-medium rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Create Manifest
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Total Manifests */}
                    <div className="bg-[var(--bg-elevated)] rounded-xl shadow-sm border border-[var(--border-default)] p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Total Manifests</p>
                                {isStatsLoading ? (
                                    <div className="h-8 w-16 bg-[var(--bg-secondary)] rounded animate-pulse mt-1" />
                                ) : (
                                    <p className="text-3xl font-bold text-[var(--text-primary)]">
                                        {stats?.totalManifests ?? 0}
                                    </p>
                                )}
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                <FileText className="w-6 h-6 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </div>

                    {/* Pending Pickup */}
                    <div className="bg-[var(--bg-elevated)] rounded-xl shadow-sm border border-[var(--border-default)] p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Pending Pickup</p>
                                {isStatsLoading ? (
                                    <div className="h-8 w-16 bg-[var(--bg-secondary)] rounded animate-pulse mt-1" />
                                ) : (
                                    <p className="text-3xl font-bold text-[var(--warning)]">
                                        {stats?.pendingPickup ?? 0}
                                    </p>
                                )}
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center">
                                <Clock className="w-6 h-6 text-[var(--warning)]" />
                            </div>
                        </div>
                    </div>

                    {/* Scheduled Today */}
                    <div className="bg-[var(--bg-elevated)] rounded-xl shadow-sm border border-[var(--border-default)] p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Scheduled Today</p>
                                {isStatsLoading ? (
                                    <div className="h-8 w-16 bg-[var(--bg-secondary)] rounded animate-pulse mt-1" />
                                ) : (
                                    <p className="text-3xl font-bold text-[var(--primary-blue)]">
                                        {stats?.scheduledToday ?? 0}
                                    </p>
                                )}
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </div>

                    {/* Picked Up Today */}
                    <div className="bg-[var(--bg-elevated)] rounded-xl shadow-sm border border-[var(--border-default)] p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Picked Up Today</p>
                                {isStatsLoading ? (
                                    <div className="h-8 w-16 bg-[var(--bg-secondary)] rounded animate-pulse mt-1" />
                                ) : (
                                    <p className="text-3xl font-bold text-[var(--success)]">
                                        {stats?.pickedUpToday ?? 0}
                                    </p>
                                )}
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-[var(--success-bg)] flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-[var(--bg-elevated)] rounded-xl shadow-sm border border-[var(--border-default)] p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <form onSubmit={handleSearch} className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by manifest ID..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] placeholder:text-[var(--text-muted)]"
                                />
                            </div>
                        </form>

                        {/* Status Filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value as ManifestStatus | '');
                                    setFilters(prev => ({ ...prev, page: 1 }));
                                }}
                                className="pl-9 pr-8 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] appearance-none min-w-[160px]"
                            >
                                {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Courier Filter */}
                        <div className="relative">
                            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <select
                                value={courierFilter}
                                onChange={(e) => {
                                    setCourierFilter(e.target.value as CourierPartner | '');
                                    setFilters(prev => ({ ...prev, page: 1 }));
                                }}
                                className="pl-9 pr-8 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] appearance-none min-w-[140px]"
                            >
                                {courierOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-blue)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Manifests Table */}
                <ManifestTable
                    manifests={manifestsData?.manifests ?? []}
                    isLoading={isLoading}
                    onManifestClick={handleManifestClick}
                    onDownloadPdf={handleDownloadPdf}
                    onReconcile={handleReconcile}
                />

                {/* Pagination */}
                {manifestsData?.pagination && manifestsData.pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                        <p className="text-sm text-[var(--text-secondary)]">
                            Showing {((filters.page! - 1) * filters.limit!) + 1} to {Math.min(filters.page! * filters.limit!, manifestsData.pagination.total)} of {manifestsData.pagination.total} manifests
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
                                disabled={!manifestsData.pagination.hasPrevPage}
                                className="px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
                                disabled={!manifestsData.pagination.hasNextPage}
                                className="px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
