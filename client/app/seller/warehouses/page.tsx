"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from '@/src/core/api/hooks/useWarehouses';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/shared/components/card';
import { Button } from '@/src/shared/components/button';
import { Badge } from '@/src/shared/components/badge';
import { Warehouse, MapPin, Package, Plus, Settings, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/src/shared/components/Toast';

export default function WarehousesPage() {
    const { addToast } = useToast();
    const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);

    // Fetch warehouses from API
    const { data: warehouses, isLoading, error, refetch } = useWarehouses();
    const updateWarehouse = useUpdateWarehouse();
    const deleteWarehouse = useDeleteWarehouse();

    const handleSetDefault = (warehouseId: string) => {
        updateWarehouse.mutate(
            { warehouseId, data: { isDefault: true } },
            {
                onSuccess: () => {
                    addToast('Default warehouse updated!', 'success');
                    refetch();
                }
            }
        );
    };

    const handleDelete = (warehouseId: string) => {
        if (confirm('Are you sure you want to delete this warehouse?')) {
            deleteWarehouse.mutate(warehouseId, {
                onSuccess: () => refetch()
            });
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Warehouse Management</h2>
                </div>
                <Card>
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-[var(--primary-blue)] mb-4" />
                            <p className="text-[var(--text-muted)]">Loading warehouses...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Warehouse Management</h2>
                </div>
                <Card>
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="text-red-500 mb-4">
                                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-[var(--text-primary)] font-semibold mb-2">Failed to load warehouses</p>
                            <p className="text-[var(--text-muted)] text-sm mb-4">{error.message || 'An error occurred'}</p>
                            <Button onClick={() => refetch()}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const warehouseList = warehouses || [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Warehouse className="h-6 w-6 text-indigo-600" />
                        Warehouse Management
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage pickup locations • {warehouseList.length} warehouse{warehouseList.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => addToast('Add warehouse form coming soon!', 'info')}>
                        <Plus className="h-4 w-4 mr-2" /> Add Warehouse
                    </Button>
                </div>
            </div>

            {/* Warehouse List */}
            {warehouseList.length === 0 ? (
                <Card>
                    <CardContent className="p-12">
                        <div className="flex flex-col items-center justify-center">
                            <Warehouse className="h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-[var(--text-primary)] font-semibold mb-1">No warehouses found</p>
                            <p className="text-[var(--text-muted)] text-sm mb-4">Create your first warehouse to start shipping</p>
                            <Button onClick={() => addToast('Add warehouse form coming soon!', 'info')}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Warehouse
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {warehouseList.map((wh: any) => (
                        <Card key={wh._id} className={`hover:shadow-md transition-shadow ${wh.isDefault ? 'ring-2 ring-indigo-500' : ''}`}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        <Warehouse className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <Badge variant={wh.isDefault ? 'default' : 'neutral'}>
                                        {wh.isDefault ? 'Default' : 'Active'}
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg mt-3">{wh.name}</CardTitle>
                                <div className="flex items-start text-xs text-gray-500 mt-1">
                                    <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2">
                                        {wh.address.line1}, {wh.address.city}, {wh.address.state} - {wh.address.postalCode}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="pt-3 border-t border-gray-100 flex gap-2">
                                        {!wh.isDefault && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-xs"
                                                onClick={() => handleSetDefault(wh._id)}
                                                disabled={updateWarehouse.isPending}
                                            >
                                                Set as Default
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-8 px-0"
                                            onClick={() => addToast('Edit coming soon!', 'info')}
                                        >
                                            <Edit className="h-4 w-4 text-gray-400" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-8 px-0"
                                            onClick={() => handleDelete(wh._id)}
                                            disabled={wh.isDefault || deleteWarehouse.isPending}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-400" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Note about inventory - not implemented yet */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-blue-900">Inventory Management</p>
                            <p className="text-xs text-blue-700 mt-1">
                                Track stock levels across warehouses (Coming soon)
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
