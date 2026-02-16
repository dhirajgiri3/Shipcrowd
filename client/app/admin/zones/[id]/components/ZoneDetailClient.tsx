'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/core/Button';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { useZone, useDeleteZone } from '@/src/core/api/hooks/logistics/useZones';
import { ZoneDetailCard, PincodeManager } from '@/src/features/admin/zones';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';

export function ZoneDetailClient({ id }: { id: string }) {
    const router = useRouter();
    const { data: zone, isLoading } = useZone(id);
    const { mutate: deleteZone } = useDeleteZone();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDelete = () => {
        if (!zone) return;
        setShowDeleteDialog(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-[var(--text-secondary)]">Loading zone details...</p>
            </div>
        );
    }

    if (!zone) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-[var(--text-secondary)] mb-4">Zone not found</p>
                    <Button onClick={() => router.push('/admin/zones')}>Back to Zones</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={zone.name}
                description="Zone Details"
                showBack={true}
                backUrl="/admin/zones"
                breadcrumbs={[
                    { label: 'Admin', href: '/admin' },
                    { label: 'Zones', href: '/admin/zones' },
                    { label: zone.name, active: true }
                ]}
                actions={
                    <Button variant="danger" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                }
            />

            <div className="grid gap-6">
                <ZoneDetailCard zone={zone} />
                <PincodeManager zoneId={id} pincodes={zone.pincodes} />
            </div>

            <ConfirmDialog
                open={showDeleteDialog}
                title="Delete zone"
                description={zone ? `Are you sure you want to delete zone "${zone.name}"? This action cannot be undone.` : undefined}
                confirmText="Delete"
                confirmVariant="danger"
                onCancel={() => setShowDeleteDialog(false)}
                onConfirm={() => {
                    if (!zone) return;
                    deleteZone(id, {
                        onSuccess: () => {
                            setShowDeleteDialog(false);
                            router.push('/admin/zones');
                        },
                    });
                }}
            />
        </div>
    );
}
