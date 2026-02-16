'use client';

import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Building2,
    MapPin,
    Phone,
    Package,
    Truck,
    Edit2,
    Trash2,
    BarChart3,
    Copy
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import Link from 'next/link';
import { Warehouse } from '@/src/core/api/hooks/logistics/useWarehouses';

interface WarehouseCardProps {
    warehouse: Warehouse;
    onDelete: (id: string, name: string) => void;
    isDeleting?: boolean;
}

export function WarehouseCard({
    warehouse,
    onDelete,
    isDeleting = false,
}: WarehouseCardProps) {
    const capacity = warehouse.capacity?.storageCapacity?.toLocaleString() || '10,000';
    const unit = warehouse.capacity?.storageUnit || 'units';
    const partner = warehouse.carrierDetails?.velocityWarehouseId ? 'Velocity' : 'Standard';
    const address = warehouse.address ?? { city: '', state: '' };
    const contactInfo = warehouse.contactInfo ?? { name: '', phone: '' };

    return (
        <Card
            className={cn(
                "relative overflow-hidden border-[var(--border-default)] bg-[var(--bg-primary)] shadow-sm hover:shadow-md hover:border-[var(--primary-blue)] transition-all group"
            )}
        >
            <CardContent className="p-8">
                <div className="flex items-start justify-between gap-6">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--primary-blue-soft)] flex items-center justify-center">
                            <Building2 className="w-7 h-7 text-[var(--primary-blue)]" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] line-clamp-2">
                                {warehouse.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-secondary)]">
                                <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                                <span>{address.city}, {address.state}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                {warehouse.isDefault && (
                                    <Badge variant="secondary" size="sm" className="bg-blue-50 text-blue-700 border-blue-200">Default</Badge>
                                )}
                                <Badge variant="outline" size="sm">{partner}</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <StatusBadge
                            // @ts-ignore
                            domain="warehouse"
                            status={warehouse.isActive ? 'active' : 'inactive'}
                            showIcon
                            size="sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Package className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Capacity</p>
                        </div>
                        <p className="text-lg font-mono font-semibold text-[var(--text-primary)]">
                            {capacity} <span className="text-xs font-normal text-[var(--text-secondary)]">{unit}</span>
                        </p>
                    </div>
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Contact</p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate mt-1">
                            {contactInfo.phone}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                            {contactInfo.name}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-6">
                    <Link href={`/admin/warehouses/${warehouse._id}`}>
                        <Button size="md" className="min-w-[140px]">
                            View Details
                        </Button>
                    </Link>
                    <Link href={`/admin/warehouses/${warehouse._id}/edit`}>
                        <Button variant="outline" size="md">
                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </Button>
                    </Link>

                    <div className="flex items-center gap-1 ml-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(warehouse._id, warehouse.name)}
                            disabled={isDeleting}
                            aria-label="Delete warehouse"
                        >
                            <Trash2 className="w-4 h-4 text-[var(--error)]" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
