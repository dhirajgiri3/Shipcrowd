"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Package,
    Search,
    Filter,
    ArrowUpFromLine,
    MoveLeft,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { useInventory } from '@/src/core/api/hooks/logistics/useInventory';
import { InventoryImportDialog } from './InventoryImportDialog';

interface InventoryListClientProps {
    warehouseId: string;
}

export function InventoryListClient({ warehouseId }: InventoryListClientProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isImportOpen, setIsImportOpen] = useState(false);

    const { data, isLoading, isError, error } = useInventory({
        warehouseId,
        search: searchQuery || undefined,
    });

    return (
        <div className="min-h-screen space-y-6 pb-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 rounded-full"
                        onClick={() => router.back()}
                    >
                        <MoveLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                            Warehouse Inventory
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Manage stock levels and items
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setIsImportOpen(true)}
                    >
                        <ArrowUpFromLine className="h-4 w-4" />
                        Import CSV
                    </Button>
                </div>
            </header>

            {/* Filters */}
            <Card className="border-[var(--border-default)]">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <Input
                            placeholder="Search by SKU or Product Name..."
                            className="pl-9 bg-[var(--bg-primary)]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {/* Add more filters here later if needed */}
                </CardContent>
            </Card>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-blue)]" />
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-[var(--error-bg)] rounded-xl">
                    <AlertCircle className="h-12 w-12 text-[var(--error)] mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--error)]">Failed to load inventory</h3>
                    <p className="text-[var(--text-muted)] mt-2">{error?.message || "Something went wrong"}</p>
                </div>
            ) : !data?.data || data.data.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="p-12 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                            <Package className="h-8 w-8 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                            No Inventory Items
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            This warehouse has no inventory yet. Import a CSV to get started.
                        </p>
                        <Button variant="primary" onClick={() => setIsImportOpen(true)}>
                            Import Items
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-[var(--border-default)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-subtle)]">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)]">SKU / Product</th>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Location</th>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)] text-right">Available</th>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)] text-right">Reserved</th>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)] text-right">Total</th>
                                    <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {data.data.map((item) => (
                                    <tr key={item._id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                                        <td className="px-4 py-3 text-[var(--text-primary)]">
                                            <div>
                                                <p className="font-medium">{item.sku}</p>
                                                {item.productName && (
                                                    <p className="text-xs text-[var(--text-secondary)]">{item.productName}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">
                                            {/* Assuming item.location exists or implemented later */}
                                            {item.location || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                                            {item.quantity - (item.reservedQuantity || 0) - (item.damagedQuantity || 0)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                            {item.reservedQuantity || 0}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">
                                            {item.quantity}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={item.quantity > 0 ? 'success' : 'error'}
                                                className="h-5 px-1.5"
                                            >
                                                {item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <InventoryImportDialog
                warehouseId={warehouseId}
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
            />
        </div>
    );
}
