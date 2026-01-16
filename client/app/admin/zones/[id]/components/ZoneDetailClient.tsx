'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/core/Button';
import { useZone, useDeleteZone } from '@/src/core/api/hooks/useZones';
import { ZoneDetailCard, PincodeManager } from '@/src/features/admin/zones';
import { ChevronLeft, Trash2 } from 'lucide-react';

export function ZoneDetailClient({ id }: { id: string }) {
    const router = useRouter();
    const { data: zone, isLoading } = useZone(id);
    const { mutate: deleteZone } = useDeleteZone();

    const handleDelete = () => {
        if (!zone) return;
        if (confirm(`Are you sure you want to delete zone "${zone.name}"? This action cannot be undone.`)) {
            deleteZone(id, {
                onSuccess: () => {
                    router.push('/admin/zones');
                },
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading zone details...</p>
            </div>
        );
    }

    if (!zone) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Zone not found</p>
                    <Button onClick={() => router.push('/admin/zones')}>Back to Zones</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/zones')}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">{zone.name}</h1>
                        <p className="text-muted-foreground mt-1">Zone Details</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="danger" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                <ZoneDetailCard zone={zone} />
                <PincodeManager zoneId={id} pincodes={zone.pincodes} />
            </div>
        </div>
    );
}
