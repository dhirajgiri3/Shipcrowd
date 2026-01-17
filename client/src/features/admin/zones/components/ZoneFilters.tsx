'use client';

import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Input } from '@/src/components/ui/core/Input';
import type { ZoneType } from '@/src/types/api/zones.types';
import { Search } from 'lucide-react';

interface ZoneFiltersProps {
    search: string;
    setSearch: (value: string) => void;
    typeFilter: ZoneType | 'all';
    setTypeFilter: (value: ZoneType | 'all') => void;
    activeFilter: 'all' | 'active' | 'inactive';
    setActiveFilter: (value: 'all' | 'active' | 'inactive') => void;
}

export function ZoneFilters({
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    activeFilter,
    setActiveFilter,
}: ZoneFiltersProps) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search zones by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="relative w-full md:w-[180px]">
                        <select
                            className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                        >
                            <option value="all">All Types</option>
                            <option value="LOCAL">Local</option>
                            <option value="REGIONAL">Regional</option>
                            <option value="NATIONAL">National</option>
                        </select>
                    </div>
                    <div className="relative w-full md:w-[180px]">
                        <select
                            className="w-full h-10 px-3 py-2 text-sm border rounded-md"
                            value={activeFilter}
                            onChange={(e) => setActiveFilter(e.target.value as any)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
