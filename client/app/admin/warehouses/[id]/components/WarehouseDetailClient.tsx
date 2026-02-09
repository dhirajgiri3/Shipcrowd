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
                    <Button variant="outline" className="gap-2" onClick={() => router.push(`/admin/warehouses/${warehouseId}/edit`)}>
                        <Edit2 className="w-4 h-4" />
                        <span>Edit Warehouse</span>
                    </Button>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start border-b border-[var(--border-subtle)] bg-transparent p-0 h-auto rounded-none space-x-6">
                    <TabTrigger value="overview">Overview</TabTrigger>
                    <TabTrigger value="settings">Settings</TabTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {/* Key Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-secondary)]">Total Capacity</p>
                                        <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                                            {/* Matches WarehouseCard fallback for consistency until data is populated */}
                                            {warehouse.capacity?.storageCapacity ? (
                                                <>
                                                    {warehouse.capacity.storageCapacity.toLocaleString()} <span className="text-sm font-normal text-[var(--text-secondary)]">{unit}</span>
                                                </>
                                            ) : (
                                                <span className="text-lg font-normal text-[var(--text-muted)]">10,000 <span className="text-sm text-[var(--text-secondary)]">{unit}</span></span>
                                            )}
                                        </h3>
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
                                    <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
                                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                                            <Building2 className="w-4 h-4" />
                                            System Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-[var(--text-secondary)]">Created At</span>
                                            <span className="text-sm font-medium text-[var(--text-primary)]">
                                                {new Date(warehouse.createdAt).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-[var(--text-secondary)]">Last Updated</span>
                                            <span className="text-sm font-medium text-[var(--text-primary)]">
                                                {new Date(warehouse.updatedAt).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-[var(--text-secondary)]">Warehouse Type</span>
                                            <Badge variant="outline" className="capitalize font-normal text-[var(--text-primary)] bg-[var(--bg-secondary)]">
                                                {warehouse.type || 'General'}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
                                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Operating Hours
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        {warehouse.formattedHours ? (
                                            <div className="space-y-3">
                                                {Object.entries(warehouse.formattedHours).map(([day, hours]) => (
                                                    <div key={day} className="flex justify-between items-center text-sm group">
                                                        <span className="capitalize text-[var(--text-secondary)] font-medium w-24 group-hover:text-[var(--primary-blue)] transition-colors">{day}</span>
                                                        <div className="flex-1 border-b border-dashed border-[var(--border-subtle)] mx-2 relative top-1 opacity-30" />
                                                        <span className={`font-medium ${hours === 'Closed' ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                                                            {hours}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-[var(--text-muted)] italic text-center py-4">
                                                No operating hours configured.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                    </TabsContent>

                    <TabsContent value="settings">
                        <div className="space-y-6 max-w-4xl">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">General Settings</CardTitle>
                                    <CardDescription>Manage general preferences for this warehouse.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                        <div>
                                            <h4 className="font-medium text-[var(--text-primary)]">Warehouse Visibility</h4>
                                            <p className="text-sm text-[var(--text-secondary)]">Enable or disable this warehouse. Disabled warehouses cannot handle shipments.</p>
                                        </div>
                                        <StatusBadge
                                            // @ts-ignore
                                            status={warehouse.isActive ? 'active' : 'inactive'}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 border rounded-lg bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                        <div>
                                            <h4 className="font-medium text-[var(--text-primary)]">Default Warehouse</h4>
                                            <p className="text-sm text-[var(--text-secondary)]">Set this as the default warehouse for your company.</p>
                                        </div>
                                        {warehouse.isDefault ? (
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700">Default</Badge>
                                        ) : (
                                            <Button variant="outline" size="sm" disabled>Set as Default</Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-red-200 bg-red-50/10">
                                <CardHeader>
                                    <CardTitle className="text-lg text-red-600 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        Danger Zone
                                    </CardTitle>
                                    <CardDescription>Destructive actions that cannot be undone.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-white">
                                        <div>
                                            <h4 className="font-medium text-red-900">Delete Warehouse</h4>
                                            <p className="text-sm text-red-700">Permanently remove this warehouse and all its specific data.</p>
                                        </div>
                                        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="danger" className="bg-red-600 hover:bg-red-700 text-white border-none shadow-none">
                                                    Delete Warehouse
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
                                </CardContent>
                            </Card>
                        </div>
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
