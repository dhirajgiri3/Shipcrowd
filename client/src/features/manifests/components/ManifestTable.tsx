/**
 * Manifest Table Component
 *
 * Displays manifests in a table aligned with OrderTable/DataTable patterns.
 * Uses Table components, TableSkeleton for loading, StatusBadge, ViewActionButton.
 */

'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/src/components/ui/core/Table';
import { TableSkeleton } from '@/src/components/ui/data/Skeleton';
import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { cn } from '@/src/lib/utils';
import { FileText, Truck, Download, Clock, Package } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { Manifest, CourierPartner } from '@/src/types/api/orders';

const courierDisplayNames: Record<CourierPartner, string> = {
    velocity: 'Velocity',
    delhivery: 'Delhivery',
    ekart: 'Ekart',
};

interface ManifestTableProps {
    manifests: Manifest[];
    isLoading: boolean;
    onManifestClick?: (manifest: Manifest) => void;
    onDownloadPdf?: (manifestId: string) => void;
    className?: string;
}

export function ManifestTable({
    manifests,
    isLoading,
    onManifestClick,
    onDownloadPdf,
    className,
}: ManifestTableProps) {
    if (isLoading && manifests.length === 0) {
        return (
            <div className={className}>
                <TableSkeleton rows={10} columns={6} />
            </div>
        );
    }

    if (!isLoading && manifests.length === 0) {
        return null; // Parent handles empty state
    }

    return (
        <div className={cn('overflow-hidden flex flex-col', className)}>
            <div className="overflow-auto flex-1">
                <Table>
                    <TableHeader className="bg-[var(--bg-secondary)] sticky top-0 z-10">
                        <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                            <TableHead className="w-[200px] text-[var(--text-secondary)]">Manifest</TableHead>
                            <TableHead className="text-[var(--text-secondary)]">Courier</TableHead>
                            <TableHead className="text-[var(--text-secondary)]">Pickup Date</TableHead>
                            <TableHead className="text-[var(--text-secondary)]">Shipments</TableHead>
                            <TableHead className="text-[var(--text-secondary)]">Status</TableHead>
                            <TableHead className="text-right text-[var(--text-secondary)]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {manifests.map((manifest) => (
                            <TableRow
                                key={manifest._id}
                                className="group hover:bg-[var(--bg-hover)] transition-colors cursor-pointer border-b last:border-0 border-[var(--border-subtle)]"
                                onClick={() => onManifestClick?.(manifest)}
                            >
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-[var(--primary-blue)]" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-[var(--text-primary)]">{manifest.manifestNumber}</div>
                                            <div className="text-xs text-[var(--text-tertiary)]">
                                                {formatDistanceToNow(new Date(manifest.createdAt), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-[var(--text-muted)]" />
                                        <span className="text-[var(--text-secondary)]">{courierDisplayNames[manifest.carrier]}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div>
                                        <div className="text-[var(--text-primary)] font-medium">
                                            {format(new Date(manifest.pickup.scheduledDate), 'MMM d, yyyy')}
                                        </div>
                                        {manifest.pickup?.timeSlot && (
                                            <div className="text-xs text-[var(--text-tertiary)]">{manifest.pickup.timeSlot}</div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div>
                                        <div className="font-medium text-[var(--text-primary)]">{manifest.summary.totalShipments}</div>
                                        <div className="text-xs text-[var(--text-tertiary)]">
                                            {manifest.summary.totalWeight.toFixed(2)} kg • ₹{manifest.summary.totalCODAmount.toLocaleString()} COD
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge domain="manifest" status={manifest.status} size="sm" />
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end items-center gap-2">
                                        <ViewActionButton onClick={() => onManifestClick?.(manifest)} />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDownloadPdf?.(manifest._id)}
                                            className="h-8 w-8 rounded-md text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--bg-hover)]"
                                            title="Download PDF"
                                            aria-label="Download manifest PDF"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default ManifestTable;
