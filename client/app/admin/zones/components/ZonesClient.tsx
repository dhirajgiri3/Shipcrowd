'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/src/components/ui/core/Button';
import { useZones, useDeleteZone } from '@/src/core/api/hooks/logistics/useZones';
import type { ZoneType } from '@/src/types/api/logistics';
import { ZoneStatsCards, ZoneFilters, ZoneListTable, ZonesSkeleton } from '@/src/features/admin/zones';
import { Plus } from 'lucide-react';
import { showSuccessToast } from '@/src/lib/error';
export function ZonesClient() {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<ZoneType | 'all'>('all');
    const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [page, setPage] = useState(1);

    const filters = {
        search: search || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
        page,
        limit: 20,
    };

    const { data, isLoading } = useZones(filters);
    const { mutate: deleteZone } = useDeleteZone();

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete zone "${name}"? This action cannot be undone.`)) {
            deleteZone(id);
            showSuccessToast('Zone deleted successfully');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Zone Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Configure pricing zones and pincode mappings
                    </p>
                </div>
                <Link href="/admin/zones/create">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Zone
                    </Button>
                </Link>
            </div>

            <Suspense fallback={<ZonesSkeleton />}>
                {/* Stats Cards */}
                <ZoneStatsCards data={data} />

                {/* Filters */}
                <ZoneFilters
                    search={search}
                    setSearch={setSearch}
                    typeFilter={typeFilter}
                    setTypeFilter={setTypeFilter}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                />

                {/* Zones Table */}
                <ZoneListTable
                    zones={data?.data}
                    isLoading={isLoading}
                    pagination={data?.pagination}
                    onDelete={handleDelete}
                    page={page}
                    setPage={setPage}
                />
            </Suspense>
        </div>
    );
}
