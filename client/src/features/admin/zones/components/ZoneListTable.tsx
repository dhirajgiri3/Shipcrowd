'use client';

import Link from 'next/link';
import { Button } from '@/src/components/ui/core/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import type { ShippingZone as Zone, ZoneType } from '@/src/types/api/zones.types';
import { MapPin, Trash2, Eye } from 'lucide-react';

interface ZoneListTableProps {
    zones?: Zone[];
    isLoading: boolean;
    pagination?: {
        page: number;
        totalPages: number;
        total: number;
    };
    onDelete: (id: string, name: string) => void;
    page: number;
    setPage: (value: number | ((prev: number) => number)) => void;
}

export function ZoneListTable({
    zones,
    isLoading,
    pagination,
    onDelete,
    page,
    setPage,
}: ZoneListTableProps) {
    const getZoneTypeBadge = (type: ZoneType) => {
        const variants: Record<ZoneType, 'default' | 'secondary' | 'outline'> = {
            LOCAL: 'default',
            REGIONAL: 'secondary',
            NATIONAL: 'outline',
        };
        return <Badge variant={variants[type]}>{type}</Badge>;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>All Zones</CardTitle>
                <CardDescription>{pagination?.total || 0} total zones</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading zones...</div>
                ) : !zones?.length ? (
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
                                    {zones.map((zone: Zone) => (
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
                                            <td className="py-4 font-mono">
                                                {zone.pincodeCount || zone.pincodes.length}
                                            </td>
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
                                                        onClick={() => onDelete(zone._id, zone.name)}
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
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                    Page {pagination.page} of {pagination.totalPages}
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
                                        disabled={page === pagination.totalPages}
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
    );
}
