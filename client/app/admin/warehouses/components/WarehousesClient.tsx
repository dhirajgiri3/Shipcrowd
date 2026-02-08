'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    Search,
    Building2,
    Package,
    Filter,
    Download,
    CheckSquare,
    MapPin
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAdminWarehouses, useAdminDeleteWarehouse } from '@/src/core/api/hooks/logistics/useAdminWarehouses';
import { Card } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/src/components/ui/feedback/Dialog';
import { toast } from 'sonner';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { WarehouseCard } from './WarehouseCard'; // Import new component

export function WarehousesClient() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

    // Use the NEW Admin Hook
    const { data: warehouses = [], isLoading } = useAdminWarehouses({
        search: searchQuery
    });

    const { mutate: deleteWarehouse, isPending: isDeleting } = useAdminDeleteWarehouse();

    // Derived stats
    const stats = {
        total: warehouses.length,
        capacity: warehouses.reduce((acc, w) => acc + (w.capacity?.storageCapacity || 10000), 0),
        active: warehouses.filter(w => w.isActive).length,
        default: warehouses.find(w => w.isDefault)?.name || 'None'
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <Building2 className="h-6 w-6 text-[var(--primary-blue)]" />
                        Warehouses
                    </h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">Manage network fulfillment centers</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </Button>
                    <Button
                        onClick={() => router.push('/admin/warehouses/new')}
                        className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/20 gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Warehouse</span>
                    </Button>
                </div>
            </div>

            {/* Stats Cards - Flat Design */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Hubs"
                    value={stats.total}
                    icon={Building2}
                    iconColor="text-[var(--primary-blue)] bg-[var(--primary-blue-soft)]"
                    variant="default"
                />
                <StatsCard
                    title="Active Hubs"
                    value={stats.active}
                    icon={CheckSquare}
                    variant="success"
                />
                <StatsCard
                    title="Total Capacity"
                    value={`${stats.capacity > 0 ? stats.capacity.toLocaleString() : 'N/A'}`}
                    icon={Package}
                    iconColor="text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]"
                    variant="default"
                />
                <StatsCard
                    title="Default Hub"
                    value={stats.default}
                    icon={MapPin}
                    iconColor="text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]"
                    variant="default"
                />
            </div>

            {/* Controls */}
            <Card className="border-[var(--border-subtle)] overflow-hidden">
                <div className="p-1">
                    <div className="flex flex-col lg:flex-row gap-3 p-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search warehouses by name, city, or pincode..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] border border-[var(--border-default)] focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)]/20 transition-all placeholder-[var(--text-muted)]"
                            />
                        </div>
                        <Button variant="ghost" className="gap-2">
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Content Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
                {isLoading ? (
                    // Skeleton loading
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="h-48 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
                    ))
                ) : warehouses.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-[var(--bg-secondary)] rounded-2xl border-2 border-dashed border-[var(--border-subtle)]">
                        <div className="h-16 w-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4 mx-auto">
                            <Search className="h-8 w-8 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No warehouses found</h3>
                        <p className="mt-1 text-[var(--text-secondary)]">
                            Try adjusting your search or filters.
                        </p>
                    </div>
                ) : (
                    warehouses.map((wh) => (
                        <motion.div
                            key={wh._id}
                            variants={itemVariants}
                        >
                            <WarehouseCard
                                warehouse={wh}
                                onDelete={(id, name) => setDeleteTarget({ id, name })}
                                isDeleting={isDeleting && deleteTarget?.id === wh._id}
                            />
                        </motion.div>
                    ))
                )}
            </motion.div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete warehouse</DialogTitle>
                        <DialogDescription>
                            {deleteTarget
                                ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
                                : 'Are you sure you want to delete this warehouse?'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                if (!deleteTarget) return;
                                deleteWarehouse(deleteTarget.id, {
                                    onSuccess: () => {
                                        toast.success(`Successfully deleted "${deleteTarget.name}"`);
                                        setDeleteTarget(null);
                                    },
                                    onError: (err) => {
                                        toast.error(`Failed to delete: ${err.message}`);
                                    }
                                });
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
