'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AddWarehouseForm } from '@/src/features/warehouse/components/AddWarehouseForm';
import { useAdminWarehouse } from '@/src/core/api/hooks/logistics/useAdminWarehouses';
import { useUpdateWarehouse } from '@/src/core/api/hooks/logistics/useWarehouses';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/src/components/ui/data/Skeleton';

interface EditWarehousePageProps {
    params: Promise<{ id: string }>;
}

export default function EditWarehousePage({ params }: EditWarehousePageProps) {
    // Unwrapping params is required in Next.js 15+ but for now typical access pattern
    // If strict we'd await, but client components receive params as prop usually
    const { id } = React.use(params);
    const router = useRouter();

    const { data: warehouse, isLoading } = useAdminWarehouse(id);
    const updateWarehouse = useUpdateWarehouse();

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!warehouse) {
        return <div>Warehouse not found</div>;
    }

    const handleUpdate = async (data: any) => {
        try {
            await updateWarehouse.mutateAsync({
                warehouseId: id,
                data
            });
            // Success toast is handled by the hook
            router.push(`/admin/warehouses/${id}`);
        } catch (error) {
            console.error("Failed to update warehouse", error);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Edit Warehouse</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Update warehouse details, address, and contact information.</p>
                </div>
            </div>

            <Card className="border-[var(--border-subtle)] shadow-sm bg-[var(--bg-primary)] overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                <CardContent className="p-8">
                    <AddWarehouseForm
                        mode="edit"
                        initialData={warehouse}
                        onSubmit={handleUpdate}
                        onCancel={() => router.back()}
                        isLoading={updateWarehouse.isPending}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
