"use client";

import { useState } from 'react';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { CourierServiceItem } from '@/src/core/api/hooks/admin';
import { Badge } from '@/src/components/ui/core/Badge';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Button } from '@/src/components/ui/core/Button';
import { Switch } from '@/src/components/ui/core/Switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/src/components/ui/feedback/DropdownMenu';
import { Edit2, Trash2, Eye, MoreVertical } from 'lucide-react';


interface ServicesTableProps {
    services: CourierServiceItem[];
    isLoading: boolean;
    onEdit: (service: CourierServiceItem) => void;
    onDelete: (service: CourierServiceItem) => void;
    onToggleStatus: (service: CourierServiceItem) => void;
}

export function ServicesTable({ services, isLoading, onEdit, onDelete, onToggleStatus }: ServicesTableProps) {
    const [search, setSearch] = useState('');

    const filteredServices = services.filter((service) => {
        const query = search.toLowerCase();
        return (
            service.displayName.toLowerCase().includes(query) ||
            service.serviceCode.toLowerCase().includes(query) ||
            service.provider.toLowerCase().includes(query)
        );
    });

    const columns = [
        {
            header: 'Service',
            accessorKey: 'displayName',
            cell: (row: CourierServiceItem) => (
                <div className="py-1">
                    <div className="font-semibold text-[var(--text-primary)]">{row.displayName}</div>
                    <div className="text-xs text-[var(--text-muted)] font-mono">{row.serviceCode}</div>
                    {row.providerServiceId && (
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            Provider: {row.providerServiceId}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: 'Provider',
            accessorKey: 'provider',
            cell: (row: CourierServiceItem) => (
                <Badge variant="outline" className="capitalize text-xs font-medium">
                    {row.provider}
                </Badge>
            ),
        },
        {
            header: 'Type',
            accessorKey: 'serviceType',
            cell: (row: CourierServiceItem) => (
                <Badge variant="secondary" className="capitalize text-xs font-medium">
                    {row.serviceType}
                </Badge>
            ),
        },
        {
            header: 'Zones',
            accessorKey: 'zoneSupport',
            cell: (row: CourierServiceItem) => (
                <div className="text-xs text-[var(--text-secondary)] max-w-[150px] truncate" title={row.zoneSupport?.join(', ')}>
                    {row.zoneSupport?.length ? row.zoneSupport.join(', ') : '-'}
                </div>
            ),
        },
        {
            header: 'ETA (Days)',
            accessorKey: 'sla',
            cell: (row: CourierServiceItem) => {
                const min = row.sla?.eddMinDays;
                const max = row.sla?.eddMaxDays;
                if (!min && !max) return <span className="text-[var(--text-muted)]">-</span>;
                return <span className="text-sm font-medium">{min}-{max} days</span>;
            },
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row: CourierServiceItem) => (
                <StatusBadge domain="courier" status={row.status} size="sm" />
            ),
        },
        {
            header: 'Actions',
            accessorKey: 'actions',
            cell: (row: CourierServiceItem) => (
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                        checked={row.status === 'active'}
                        onCheckedChange={() => onToggleStatus(row)}
                        aria-label="Toggle active status"
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4 text-[var(--text-secondary)]" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(row)}>
                                <Edit2 className="h-4 w-4" />
                                Edit Service
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`/admin/courier-services/${row._id}`, '_blank')}>
                                <Eye className="h-4 w-4" />
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                destructive
                                onClick={() => {
                                    if (confirm(`Are you sure you want to delete "${row.displayName}"?`)) {
                                        onDelete(row);
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete Service
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
            width: '140px'
        },
    ];

    return (
        <DataTable
            columns={columns}
            data={filteredServices}
            searchKey="displayName"
            onSearch={setSearch}
            isLoading={isLoading}
        />
    );
}
