/**
 * Warehouses List Client Component
 * 
 * This Client Component handles:
 * - Fetching warehouse data from API
 * - Interactive UI (edit/delete modals, state management)
 * - Loading, error, and empty states
 * - Real-time data updates via React Query
 * 
 * The parent Server Component (page.tsx) simply renders this.
 */

"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Building2,
    Plus,
    MapPin,
    Phone,
    Edit,
    Trash2,
    CheckCircle2,
    Star,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { cn } from '@/src/lib/utils';
import Link from 'next/link';
import { useWarehouses, Warehouse } from '@/src/core/api/hooks/logistics/useWarehouses';
import { EditWarehouseModal, DeleteWarehouseDialog } from '@/src/features/warehouse';

export function WarehousesClient() {
    const { data: warehouses, isLoading, isError, error, refetch } = useWarehouses();
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null);

    // Extract error message from API response
    const errorMessage = error?.message || 'We couldn\'t fetch your warehouses. Please try again.';
    const errorReason = error?.code;

    // Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen space-y-6 pb-10">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                            Warehouses
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-2">
                            Manage your pickup locations and warehouses
                        </p>
                    </div>
                    <Link href="/seller/warehouses/add">
                        <Button variant="primary" className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Warehouse
                        </Button>
                    </Link>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="border-[var(--border-default)]">
                            <CardContent className="p-6 space-y-4">
                                <div className="h-12 w-12 rounded-2xl bg-[var(--bg-tertiary)] animate-pulse" />
                                <div className="space-y-2">
                                    <div className="h-4 bg-[var(--bg-tertiary)] rounded animate-pulse w-3/4" />
                                    <div className="h-3 bg-[var(--bg-tertiary)] rounded animate-pulse w-1/2" />
                                </div>
                                <div className="h-20 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // Error State
    if (isError) {
        return (
            <div className="min-h-screen space-y-6 pb-10">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                            Warehouses
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-2">
                            Manage your pickup locations and warehouses
                        </p>
                    </div>
                </header>

                <Card className="border-[var(--error)]">
                    <CardContent className="p-12 text-center">
                        <AlertCircle className="h-12 w-12 text-[var(--error)] mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                            {errorReason === 'INSUFFICIENT_ACCESS_TIER' ? 'Access Restricted' : 'Failed to Load Warehouses'}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-md mx-auto">
                            {errorMessage}
                        </p>
                        {errorReason === 'INSUFFICIENT_ACCESS_TIER' && (
                            <p className="text-xs text-[var(--text-muted)] mb-4">
                                Please complete your account setup or contact support to access this feature.
                            </p>
                        )}
                        <Button onClick={() => refetch()} variant="outline">
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Empty State
    if (!warehouses || warehouses.length === 0) {
        return (
            <div className="min-h-screen space-y-6 pb-10">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                            Warehouses
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-2">
                            Manage your pickup locations and warehouses
                        </p>
                    </div>
                    <Link href="/seller/warehouses/add">
                        <Button variant="primary" className="shadow-lg shadow-blue-500/20">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Warehouse
                        </Button>
                    </Link>
                </header>

                <Card className="border-dashed border-2">
                    <CardContent className="p-12 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                            <Building2 className="h-8 w-8 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                            No Warehouses Yet
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            Get started by adding your first warehouse.
                        </p>
                        <Link href="/seller/warehouses/add">
                            <Button variant="primary">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Warehouse
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 pb-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl font-bold text-[var(--text-primary)] tracking-tight"
                    >
                        Warehouses
                    </motion.h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                        Manage your pickup locations and warehouses
                    </p>
                </div>

                <Link href="/seller/warehouses/add">
                    <Button variant="primary" className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Warehouse
                    </Button>
                </Link>
            </header>

            {/* Warehouses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {warehouses.map((warehouse, index) => (
                    <motion.div
                        key={warehouse._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="border-[var(--border-default)] hover:border-[var(--primary-blue)]/50 transition-all duration-300 h-full group">
                            <CardContent className="p-5 space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                                            warehouse.isDefault
                                                ? "bg-[var(--primary-blue)] text-white border-[var(--primary-blue)]"
                                                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                                        )}>
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-[var(--text-primary)] leading-tight">
                                                    {warehouse.name}
                                                </h3>
                                                {warehouse.isDefault && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] border border-[var(--primary-blue)]/20">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-wide">
                                                ID: {warehouse._id.slice(-8)}
                                            </p>
                                        </div>
                                    </div>

                                    {warehouse.isActive ? (
                                        <Badge variant="outline" className="bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20 pl-1.5 pr-2 py-0.5 h-6">
                                            <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)] pl-1.5 pr-2 py-0.5 h-6">
                                            Inactive
                                        </Badge>
                                    )}
                                </div>

                                <div className="h-px bg-[var(--border-subtle)]" />

                                {/* Address */}
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 mt-0.5 text-[var(--text-muted)] shrink-0" />
                                        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                            <p className="font-medium text-[var(--text-primary)]">{warehouse.address.line1}</p>
                                            {warehouse.address.line2 && <p>{warehouse.address.line2}</p>}
                                            <p className="text-[var(--text-muted)]">{warehouse.address.city}, {warehouse.address.state} - <span className="font-mono">{warehouse.address.postalCode}</span></p>
                                        </div>
                                    </div>

                                    {/* Contact */}
                                    {warehouse.contactInfo && (warehouse.contactInfo.name || warehouse.contactInfo.phone) && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Phone className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                                            <div className="text-[var(--text-secondary)]">
                                                {warehouse.contactInfo.name && <span className="font-medium text-[var(--text-primary)] mr-1">{warehouse.contactInfo.name}</span>}
                                                {warehouse.contactInfo.name && warehouse.contactInfo.phone && <span className="text-[var(--text-muted)] mx-1">•</span>}
                                                {warehouse.contactInfo.phone && <span className="font-mono text-xs">{warehouse.contactInfo.phone}</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="pt-2 flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-9 bg-[var(--bg-primary)] hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)] transition-colors"
                                        onClick={() => setEditingWarehouse(warehouse)}
                                    >
                                        <Edit className="w-3.5 h-3.5 mr-2" />
                                        Edit Details
                                    </Button>

                                    {!warehouse.isDefault && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-9 px-0 border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error)]/10 hover:border-[var(--error)]"
                                            onClick={() => setDeletingWarehouse(warehouse)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}

                {/* Add New Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: warehouses.length * 0.1 }}
                >
                    <Link href="/seller/warehouses/add">
                        <Card className="border-dashed border-2 border-[var(--border-default)] hover:border-[var(--primary-blue)]/50 hover:bg-[var(--bg-tertiary)]/50 transition-all duration-300 h-full min-h-[280px] cursor-pointer group flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] group-hover:bg-[var(--primary-blue)]/10 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110">
                                <Plus className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)]" />
                            </div>
                            <h3 className="font-semibold text-[var(--text-secondary)] group-hover:text-[var(--primary-blue)] transition-colors">
                                Add New Warehouse
                            </h3>
                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                Set up a new pickup location
                            </p>
                        </Card>
                    </Link>
                </motion.div>
            </div>

            {/* Modals */}
            <EditWarehouseModal
                warehouse={editingWarehouse!}
                isOpen={!!editingWarehouse}
                onClose={() => setEditingWarehouse(null)}
            />

            <DeleteWarehouseDialog
                warehouse={deletingWarehouse}
                isOpen={!!deletingWarehouse}
                onClose={() => setDeletingWarehouse(null)}
            />
        </div>
    );
}
