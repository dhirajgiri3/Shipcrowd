"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import {
    useCourierServices,
    useCreateCourierService,
    useUpdateCourierService,
    useToggleCourierServiceStatus,
    useDeleteCourierService,
    useSyncProviderServices,
    CourierServiceItem,
} from '@/src/core/api/hooks/admin';
import { RefreshCw, Plus, Settings, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { showErrorToast } from '@/src/lib/error';
import { Skeleton, CardSkeleton, TableSkeleton } from '@/src/components/ui/data/Skeleton';
import { ServicesStats } from './ServicesStats';
import { ServicesTable } from './ServicesTable';
import { ServiceDialog, ServiceForm } from './ServiceDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/src/components/ui/feedback/DropdownMenu';

// Helper to convert comma string to array
const toZoneList = (value: string): string[] =>
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.toUpperCase());

// Helper to convert string to optional number
const toOptionalNumber = (value: string): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export function ServicesClient() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<CourierServiceItem | null>(null);

    const { data: services = [], isLoading } = useCourierServices();
    const createMutation = useCreateCourierService();
    const updateMutation = useUpdateCourierService();
    const toggleMutation = useToggleCourierServiceStatus();
    const deleteMutation = useDeleteCourierService();
    const syncMutation = useSyncProviderServices();

    const handleCreateOpen = useCallback(() => {
        setEditingService(null);
        setIsDialogOpen(true);
    }, []);

    const handleEditOpen = useCallback((service: CourierServiceItem) => {
        setEditingService(service);
        setIsDialogOpen(true);
    }, []);

    const handleSaveService = async (form: ServiceForm) => {
        const minWeightKg = toOptionalNumber(form.minWeightKg);
        const maxWeightKg = toOptionalNumber(form.maxWeightKg);
        const eddMinDays = toOptionalNumber(form.eddMinDays);
        const eddMaxDays = toOptionalNumber(form.eddMaxDays);
        const maxCodValue = toOptionalNumber(form.maxCodValue);
        const maxPrepaidValue = toOptionalNumber(form.maxPrepaidValue);

        if (minWeightKg !== undefined && maxWeightKg !== undefined && minWeightKg > maxWeightKg) {
            showErrorToast('Min weight cannot be greater than max weight');
            return;
        }

        if (eddMinDays !== undefined && eddMaxDays !== undefined && eddMinDays > eddMaxDays) {
            showErrorToast('Min EDD cannot be greater than max EDD');
            return;
        }

        if (!form.paymentModes.length) {
            showErrorToast('Select at least one payment mode');
            return;
        }

        const payload = {
            provider: form.provider,
            displayName: form.displayName.trim(),
            serviceCode: form.serviceCode.trim(),
            providerServiceId: form.providerServiceId.trim() || undefined,
            serviceType: form.serviceType,
            flowType: form.flowType,
            zoneSupport: toZoneList(form.zoneSupport),
            constraints: {
                minWeightKg,
                maxWeightKg,
                maxCodValue,
                maxPrepaidValue,
                paymentModes: form.paymentModes,
            },
            sla: {
                eddMinDays,
                eddMaxDays,
            },
        };

        if (!payload.displayName || !payload.serviceCode) {
            showErrorToast('Display name and service code are required');
            return;
        }

        try {
            if (editingService) {
                await updateMutation.mutateAsync({ id: editingService._id, data: payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
        } catch {
            // handled by mutation hook
            throw new Error('Failed to save service');
        }
    };

    const handleToggleStatus = useCallback(async (service: CourierServiceItem) => {
        try {
            await toggleMutation.mutateAsync(service._id);
        } catch {
            // handled by mutation hook
        }
    }, [toggleMutation]);

    const syncProvider = useCallback(async (provider: 'velocity' | 'delhivery' | 'ekart') => {
        try {
            await syncMutation.mutateAsync({ provider });
        } catch {
            // handled by mutation hook
        }
    }, [syncMutation]);

    const handleDelete = useCallback(async (service: CourierServiceItem) => {
        try {
            await deleteMutation.mutateAsync(service._id);
        } catch {
            // handled by mutation hook
        }
    }, [deleteMutation]);

    if (isLoading) {
        return <ServicesClientSkeleton />;
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Settings className="h-6 w-6 text-[var(--primary-blue)]" />
                        Courier Services
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Manage provider services, sync catalogs, and control availability.
                    </p>
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" disabled={syncMutation.isPending}>
                                <RefreshCw className={cn('h-4 w-4 mr-2', syncMutation.isPending && 'animate-spin')} />
                                Sync Catalogs
                                <ChevronDown className="h-4 w-4 ml-2 text-[var(--text-muted)]" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => syncProvider('velocity')}>
                                Velocity
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => syncProvider('delhivery')}>
                                Delhivery
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => syncProvider('ekart')}>
                                Ekart
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="space-y-6 animate-fade-in">
                <ServicesStats services={services} />

                <div className="flex justify-end">
                    <Button onClick={handleCreateOpen}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                    </Button>
                </div>

                <ServicesTable
                    services={services}
                    isLoading={isLoading}
                    onEdit={handleEditOpen}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                />
            </div>

            <ServiceDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                initialData={editingService}
                onSave={handleSaveService}
                isSaving={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    );
}

function ServicesClientSkeleton() {
    return (
        <div className="space-y-6 pb-20">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-32" />
                </div>
            </div>

            <div className="space-y-6">
                {/* Stats Skeleton */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>

                {/* Toolbar Skeleton */}
                <div className="flex justify-end">
                    <Skeleton className="h-9 w-32" />
                </div>

                {/* Table Skeleton */}
                <TableSkeleton />
            </div>
        </div>
    );
}
