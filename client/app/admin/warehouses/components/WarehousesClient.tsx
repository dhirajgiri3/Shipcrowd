'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    Search,
    Building2,
    Package,
    Filter,
    FileOutput,
    CheckSquare,
    MapPin,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAdminWarehouses, useAdminDeleteWarehouse } from '@/src/core/api/hooks/logistics/useAdminWarehouses';
import { Card } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/src/components/ui/feedback/Dialog';
import { toast } from 'sonner';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { WarehouseCard } from './WarehouseCard';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { parsePaginationQuery, syncPaginationQuery, formatPaginationRange } from '@/src/lib/utils';

const DEFAULT_LIMIT = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function WarehousesClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { page: urlPage, limit: urlLimit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });

    const [page, setPage] = useState(urlPage);
    const [limit, setLimit] = useState(urlLimit);
    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [isUrlHydrated, setIsUrlHydrated] = useState(false);
    const hasInitializedFilterReset = useRef(false);

    const debouncedSearch = useDebouncedValue(searchInput, 300);

    useEffect(() => {
        const { page: nextPage, limit: nextLimit } = parsePaginationQuery(searchParams, { defaultLimit: DEFAULT_LIMIT });
        const nextSearch = searchParams.get('search') || '';
        setPage((p) => (p === nextPage ? p : nextPage));
        setLimit((l) => (l === nextLimit ? l : nextLimit));
        setSearchInput((s) => (s === nextSearch ? s : nextSearch));
        setIsUrlHydrated(true);
    }, [searchParams]);

    useEffect(() => {
        if (!isUrlHydrated || !hasInitializedFilterReset.current) {
            if (isUrlHydrated) hasInitializedFilterReset.current = true;
            return;
        }
        setPage(1);
    }, [debouncedSearch, isUrlHydrated]);

    useEffect(() => {
        if (!isUrlHydrated) return;
        const params = new URLSearchParams(searchParams.toString());
        if (debouncedSearch) params.set('search', debouncedSearch);
        else params.delete('search');
        syncPaginationQuery(params, { page, limit }, { defaultLimit: DEFAULT_LIMIT });
        const nextQuery = params.toString();
        const currentQuery = searchParams.toString();
        if (nextQuery !== currentQuery) {
            router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
        }
    }, [page, limit, debouncedSearch, isUrlHydrated, searchParams, pathname, router]);

    const { data, isLoading, isFetching, isError, error } = useAdminWarehouses({
        search: debouncedSearch || undefined,
        page,
        limit,
    });

    const warehouses = data?.warehouses ?? [];
    const pagination = data?.pagination;

    const { mutate: deleteWarehouse, isPending: isDeleting } = useAdminDeleteWarehouse();

    const totalCount = pagination?.total ?? warehouses.length;
    const stats = {
        total: totalCount,
        capacity: warehouses.reduce((acc, w) => acc + (w.capacity?.storageCapacity || 10000), 0),
        active: warehouses.filter(w => w.isActive).length,
        default: warehouses.find(w => w.isDefault)?.name || '—'
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <PageHeader
                title="Warehouses"
                description="Manage network fulfillment centers"
                showBack={true}
                backUrl="/admin"
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Warehouses', active: true }]}
                actions={
                    <>
                        <Button variant="outline" className="gap-2">
                            <FileOutput className="w-4 h-4" />
                            <span>Export</span>
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => router.push('/admin/warehouses/new')}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Warehouse</span>
                        </Button>
                    </>
                }
            />

            {/* Stats Cards - Flat Design */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Hubs"
                    value={stats.total}
                    icon={Building2}
                    iconColor="text-[var(--primary-blue)] bg-[var(--primary-blue-soft)]"
                    variant="default"
                />
                <StatsCard
                    title="Active Hubs"
                    value={stats.active}
                    icon={CheckSquare}
                    variant="success"
                />
                <StatsCard
                    title="Total Capacity"
                    value={`${stats.capacity > 0 ? stats.capacity.toLocaleString() : 'N/A'}`}
                    icon={Package}
                    iconColor="text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]"
                    variant="default"
                />
                <StatsCard
                    title="Default Hub"
                    value={stats.default}
                    icon={MapPin}
                    iconColor="text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]"
                    variant="default"
                />
            </div>

            {/* Controls */}
            <Card className="border-[var(--border-subtle)] overflow-hidden">
                <div className="p-1">
                    <div className="flex flex-col lg:flex-row gap-3 p-2">
                        <div className="flex-1">
                            <SearchInput
                                placeholder="Search warehouses by name, city, or pincode..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                widthClass="w-full"
                            />
                        </div>
                        <Button variant="ghost" className="gap-2">
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Content Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
                {isLoading || (isFetching && warehouses.length === 0) ? (
                    // Skeleton loading - show when loading or fetching with no data yet
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="h-48 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
                    ))
                ) : isError ? (
                    <div className="col-span-full py-20 text-center bg-[var(--bg-secondary)] rounded-2xl border-2 border-dashed border-[var(--border-subtle)]">
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">Failed to load warehouses</h3>
                        <p className="mt-1 text-[var(--text-secondary)]">{error?.message ?? 'Please try again later.'}</p>
                    </div>
                ) : warehouses.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-[var(--bg-secondary)] rounded-2xl border-2 border-dashed border-[var(--border-subtle)]">
                        <div className="h-16 w-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4 mx-auto">
                            <Search className="h-8 w-8 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No warehouses found</h3>
                        <p className="mt-1 text-[var(--text-secondary)]">
                            Try adjusting your search or filters.
                        </p>
                    </div>
                ) : (
                    warehouses.map((wh) => (
                        <motion.div
                            key={wh._id}
                            variants={itemVariants}
                        >
                            <WarehouseCard
                                warehouse={wh}
                                onDelete={(id, name) => setDeleteTarget({ id, name })}
                                isDeleting={isDeleting && deleteTarget?.id === wh._id}
                            />
                        </motion.div>
                    ))
                )}
            </motion.div>

            {/* Pagination */}
            {pagination && totalCount > 0 && (
                <Card className="border-[var(--border-subtle)] overflow-hidden">
                    <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 text-sm">
                            <p className="text-[var(--text-muted)]">
                                {formatPaginationRange(pagination.page, pagination.limit, pagination.total, 'warehouses')}
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--text-secondary)] hidden sm:inline">Per page:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        const newLimit = Number(e.target.value);
                                        setLimit(newLimit);
                                        setPage(1);
                                    }}
                                    className="h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm px-2 focus:ring-1 focus:ring-[var(--primary-blue)] cursor-pointer"
                                >
                                    {PAGE_SIZE_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={pagination.page <= 1 || isFetching}
                                className="h-9 px-4"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Previous
                            </Button>
                            <span className="text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                                Page {pagination.page} / {pagination.totalPages}
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                disabled={pagination.page >= pagination.totalPages || isFetching}
                                className="h-9 px-4"
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete warehouse</DialogTitle>
                        <DialogDescription>
                            {deleteTarget
                                ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
                                : 'Are you sure you want to delete this warehouse?'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                if (!deleteTarget) return;
                                deleteWarehouse(deleteTarget.id, {
                                    onSuccess: () => {
                                        toast.success(`Successfully deleted "${deleteTarget.name}"`);
                                        setDeleteTarget(null);
                                    },
                                    onError: (err) => {
                                        toast.error(`Failed to delete: ${err.message}`);
                                    }
                                });
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
