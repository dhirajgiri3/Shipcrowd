'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/core/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/core/Card';
import { Input } from '@/components/ui/core/Input';
import { Badge } from '@/components/ui/core/Badge';
import { useZones, useDeleteZone } from '@/src/core/api/hooks/useZones';
import type { Zone, ZoneType } from '@/src/types/api/zones.types';
import { Plus, Search, MapPin, Trash2, Edit, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function ZonesPage() {
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
        }
    };

    const getZoneTypeBadge = (type: ZoneType) => {
        const variants: Record<ZoneType, 'default' | 'secondary' | 'outline'> = {
            LOCAL: 'default',
            REGIONAL: 'secondary',
            NATIONAL: 'outline',
        };
        return <Badge variant={variants[type]}>{type}</Badge>;
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Total Zones</CardDescription>
                        <CardTitle className="text-3xl">{data?.pagination.total || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Local Zones</CardDescription>
                        <CardTitle className="text-3xl">
                            {data?.data.filter((z: Zone) => z.type === 'LOCAL').length || 0}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Regional Zones</CardDescription>
                        <CardTitle className="text-3xl">
                            {data?.data.filter((z: Zone) => z.type === 'REGIONAL').length || 0}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>National Zones</CardDescription>
                        <CardTitle className="text-3xl">
                            {data?.data.filter((z: Zone) => z.type === 'NATIONAL').length || 0}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filters */}
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

            {/* Zones Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Zones</CardTitle>
                    <CardDescription>
                        {data?.pagination.total || 0} total zones
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading zones...</div>
                    ) : !data?.data.length ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No zones found</p>
                            <Link href="/admin/zones/create">
                                <Button variant="outline" className="mt-4">
                                    Create Your First Zone
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b">
                                        <tr className="text-left text-sm text-muted-foreground">
                                            <th className="pb-3 font-medium">Name</th>
                                            <th className="pb-3 font-medium">Type</th>
                                            <th className="pb-3 font-medium">Pincodes</th>
                                            <th className="pb-3 font-medium">Transit Days</th>
                                            <th className="pb-3 font-medium">Status</th>
                                            <th className="pb-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {data.data.map((zone: Zone) => (
                                            <tr key={zone._id} className="text-sm">
                                                <td className="py-4">
                                                    <div>
                                                        <div className="font-medium">{zone.name}</div>
                                                        {zone.description && (
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {zone.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4">{getZoneTypeBadge(zone.type)}</td>
                                                <td className="py-4 font-mono">{zone.pincodeCount || zone.pincodes.length}</td>
                                                <td className="py-4">{zone.transitDays} days</td>
                                                <td className="py-4">
                                                    <Badge variant={zone.isActive ? 'default' : 'outline'}>
                                                        {zone.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Link href={`/admin/zones/${zone._id}`}>
                                                            <Button variant="ghost" size="sm">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(zone._id, zone.name)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {data.pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                    <p className="text-sm text-muted-foreground">
                                        Page {data.pagination.page} of {data.pagination.totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page === 1}
                                            onClick={() => setPage((p) => p - 1)}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page === data.pagination.totalPages}
                                            onClick={() => setPage((p) => p + 1)}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
