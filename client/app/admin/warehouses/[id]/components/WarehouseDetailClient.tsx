'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminWarehouse } from '@/src/core/api/hooks/logistics/useAdminWarehouses';
import { useDeleteWarehouse } from '@/src/core/api/hooks/logistics/useWarehouses';
import { Button } from '@/src/components/ui/core/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { ArrowLeft, Edit2, Trash2, MapPin, Phone, Mail, Package, Building2, Truck, Box, AlertTriangle, Clock } from 'lucide-react';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/core/Tabs';
import { Badge } from '@/src/components/ui/core/Badge';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/src/components/ui/feedback/Dialog";
import { showSuccessToast, showErrorToast } from '@/src/lib/error';

interface WarehouseDetailClientProps {
    warehouseId: string;
}

export function WarehouseDetailClient({ warehouseId }: WarehouseDetailClientProps) {
    const router = useRouter();
    const { data: warehouse, isLoading, error } = useAdminWarehouse(warehouseId);
    const deleteWarehouse = useDeleteWarehouse();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    if (isLoading) {
        return <WarehouseDetailSkeleton />;
    }

    if (error || !warehouse) {
        return (
            <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
                <EmptyState
                    variant="error"
                    title="Warehouse Not Found"
                    description="The warehouse you are looking for does not exist or you do not have permission to view it."
                    action={{
                        label: 'Go Back',
                        onClick: () => router.back(),
                        variant: 'outline'
                    }}
                />
            </div>
        );
    }

    const handleDelete = async () => {
        try {
            await deleteWarehouse.mutateAsync(warehouseId);
            showSuccessToast('Warehouse deleted successfully');
            router.push('/admin/warehouses');
        } catch (err) {
            // Error handling is managed by the hook/global handler usually, but we can show toast here if needed
            console.error(err);
        }
    };

    const partner = warehouse.carrierDetails?.velocityWarehouseId ? 'Velocity' : 'Standard';
    const capacity = warehouse.capacity?.storageCapacity
        ? warehouse.capacity.storageCapacity.toLocaleString()
        : null;
    const unit = warehouse.capacity?.storageUnit || 'units';

    // Fallback helpers for optional fields
    const contactName = warehouse.contactInfo?.name || 'N/A';
    const contactPhone = warehouse.contactInfo?.phone || 'N/A';
    const contactEmail = warehouse.contactInfo?.email || 'N/A';
    const contactAltPhone = warehouse.contactInfo?.alternatePhone;

    // Address formatting
    const address = warehouse.address;
    const fullAddress = [
        address.line1,
        address.line2,
        address.city,
        address.state,
        address.country !== 'India' ? address.country : null,
        address.postalCode
    ].filter(Boolean).join(', ');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
                        <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{warehouse.name}</h1>
                            <StatusBadge
                                // @ts-ignore
                                domain="warehouse"
                                status={warehouse.isActive ? 'active' : 'inactive'}
                                size="sm"
                            />
                            {warehouse.isDefault && (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">Default</Badge>
                            )}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-2">
                            <span className="font-mono text-xs bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-[var(--text-tertiary)]">ID: {warehouse._id}</span>
                            <span>•</span>
                            <span>{partner} Warehouse</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => router.push(`/admin/warehouses/${warehouse._id}/edit`)}>
                        <Edit2 className="w-4 h-4" />
                        <span>Edit</span>
                    </Button>

                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-red-600">
                                    <AlertTriangle className="w-5 h-5" />
                                    Delete Warehouse
                                </DialogTitle>
                                <DialogDescription className="pt-2">
                                    Are you sure you want to delete <span className="font-semibold text-[var(--text-primary)]">{warehouse.name}</span>?
                                    This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsDeleteDialogOpen(false)}
                                    disabled={deleteWarehouse.isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleDelete}
                                    isLoading={deleteWarehouse.isPending}
                                >
                                    Delete Warehouse
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start border-b border-[var(--border-subtle)] bg-transparent p-0 h-auto rounded-none space-x-6">
                    <TabTrigger value="overview">Overview</TabTrigger>
                    <TabTrigger value="inventory">Inventory</TabTrigger>
                    <TabTrigger value="shipments">Shipments</TabTrigger>
                    <TabTrigger value="settings">Settings</TabTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {/* Key Stats Grid - Only show if data is relevant/available */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-secondary)]">Total Capacity</p>
                                        <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                                            {capacity ? (
                                                <>
                                                    {capacity} <span className="text-sm font-normal text-[var(--text-secondary)]">{unit}</span>
                                                </>
                                            ) : (
                                                <span className="text-lg font-normal text-[var(--text-muted)]">Not Set</span>
                                            )}
                                        </h3>
                                    </div>
                                </CardContent>
                            </Card>
                            {/* 
                                Placeholder cards removed to avoid "N/A" or "0" clutter until data is real.
                                Can re-enable when Inventory/Shipment counts are simulated or fetched.
                            */}
                            <Card className="opacity-60 grayscale-[0.5]">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                        <Box className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-secondary)]">Inventory Items</p>
                                        <h3 className="text-lg font-medium text-[var(--text-muted)]">Coming Soon</h3>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="opacity-60 grayscale-[0.5]">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-secondary)]">Active Shipments</p>
                                        <h3 className="text-lg font-medium text-[var(--text-muted)]">Coming Soon</h3>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Info Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Left Column: Address & Contact */}
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-[var(--primary-blue)]" />
                                            Location Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label>Address</Label>
                                                <p className="text-sm text-[var(--text-primary)] mt-1 leading-relaxed">{fullAddress}</p>
                                            </div>
                                            <div>
                                                <Label>Coordinates</Label>
                                                {address.coordinates ? (
                                                    <p className="text-sm font-mono text-[var(--text-secondary)] mt-1">
                                                        {address.coordinates.latitude.toFixed(6)}, {address.coordinates.longitude.toFixed(6)}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-[var(--text-muted)] mt-1 italic">Not available</p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-[var(--primary-blue)]" />
                                            Contact Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <Label>Contact Person</Label>
                                                <p className="text-sm font-medium text-[var(--text-primary)] mt-1">{contactName}</p>
                                            </div>
                                            <div>
                                                <Label>Phone Number</Label>
                                                <p className="text-sm text-[var(--text-primary)] mt-1">{contactPhone}</p>
                                                {contactAltPhone && (
                                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{contactAltPhone}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label>Email Address</Label>
                                                <p className="text-sm text-[var(--text-primary)] mt-1 truncate" title={contactEmail}>{contactEmail}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column: Metadata & System Info */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base font-semibold">System Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label>Created At</Label>
                                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                                {new Date(warehouse.createdAt).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className="h-px bg-[var(--border-subtle)] my-2" />
                                        <div>
                                            <Label>Last Updated</Label>
                                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                                {new Date(warehouse.updatedAt).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className="h-px bg-[var(--border-subtle)] my-2" />
                                        <div>
                                            <Label>Type</Label>
                                            <p className="text-sm text-[var(--text-primary)] mt-1 capitalize">{warehouse.type || 'General'}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {warehouse.formattedHours ? (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-[var(--primary-blue)]" />
                                                Operating Hours
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {Object.entries(warehouse.formattedHours).map(([day, hours]) => (
                                                    <div key={day} className="flex justify-between items-center text-sm">
                                                        <span className="capitalize text-[var(--text-secondary)] w-24">{day}</span>
                                                        <span className="text-[var(--text-primary)] font-medium text-right flex-1">{hours}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base font-semibold">Operating Hours</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-[var(--text-muted)] italic">
                                                No operating hours configured.
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>

                    </TabsContent>

                    <TabsContent value="inventory">
                        <EmptyState
                            variant="noItems"
                            title="Inventory Management"
                            description="Live inventory tracking for this warehouse will be available in a future update."
                        />
                    </TabsContent>

                    <TabsContent value="shipments">
                        <EmptyState
                            variant="noItems"
                            title="Warehouse Shipments"
                            description="Detailed shipment history for this warehouse will be available in a future update."
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

// Sub-components
function Label({ children }: { children: React.ReactNode }) {
    return <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{children}</p>;
}

function TabTrigger({ value, children }: { value: string, children: React.ReactNode }) {
    return (
        <TabsTrigger
            value={value}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--primary-blue)] data-[state=active]:text-[var(--primary-blue)] data-[state=active]:shadow-none px-2 py-3 mr-2"
        >
            {children}
        </TabsTrigger>
    );
}

function WarehouseDetailSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-48" />
                </div>
                <div className="col-span-1 space-y-6">
                    <Skeleton className="h-40" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        </div>
    );
}
