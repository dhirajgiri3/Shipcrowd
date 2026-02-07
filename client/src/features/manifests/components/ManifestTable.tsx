/**
 * Manifest Table Component
 * 
 * Displays manifests in a sortable, filterable table.
 * Features:
 * - Status badges with colors
 * - Courier partner logos
 * - Quick actions (View, Download PDF, Reconcile)
 * - Loading skeletons
 * - Empty states
 */

'use client';

import {
    FileText,
    Truck,
    Download,
    Eye,
    Clock,
    Package,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Manifest, ManifestStatus, CourierPartner } from '@/src/types/api/orders';

// ==================== Status Badge Config ====================

import { ViewActionButton } from '@/src/components/ui/core/ViewActionButton';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';

const courierDisplayNames: Record<CourierPartner, string> = {
    velocity: 'Velocity',
    delhivery: 'Delhivery',
    ekart: 'Ekart',
    xpressbees: 'XpressBees',
    india_post: 'India Post',
};

// ==================== Props ====================

interface ManifestTableProps {
    manifests: Manifest[];
    isLoading: boolean;
    onManifestClick?: (manifest: Manifest) => void;
    onDownloadPdf?: (manifestId: string) => void;
}

// ==================== Component ====================

export function ManifestTable({
    manifests,
    isLoading,
    onManifestClick,
    onDownloadPdf,
}: ManifestTableProps) {
    // Loading skeleton
    if (isLoading) {
        return (
            <div className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]">
                <table className="w-full">
                    <thead className="bg-[var(--bg-secondary)]">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Manifest</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Courier</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Shipments</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <tr key={idx} className="animate-pulse">
                                <td className="px-4 py-4"><div className="h-4 bg-[var(--bg-tertiary)] rounded w-24" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-[var(--bg-tertiary)] rounded w-20" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-[var(--bg-tertiary)] rounded w-28" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-[var(--bg-tertiary)] rounded w-12" /></td>
                                <td className="px-4 py-4"><div className="h-6 bg-[var(--bg-tertiary)] rounded w-24" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-[var(--bg-tertiary)] rounded w-8 ml-auto" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    // Empty state
    if (manifests.length === 0) {
        return (
            <div className="text-center py-12 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-default)]">
                <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    No Manifests Found
                </h3>
                <p className="text-[var(--text-secondary)]">
                    Create a manifest to group shipments for pickup
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[var(--bg-secondary)]">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                Manifest
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                Courier
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                Pickup Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                Shipments
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                Status
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                        {manifests.map((manifest) => (
                            <tr
                                key={manifest._id}
                                className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                                onClick={() => onManifestClick?.(manifest)}
                            >
                                {/* Manifest ID */}
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-[var(--primary-blue)]" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">
                                                {manifest.manifestNumber}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                Created {formatDistanceToNow(new Date(manifest.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                {/* Courier */}
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-[var(--text-muted)]" />
                                        <span className="text-sm text-[var(--text-secondary)]">
                                            {courierDisplayNames[manifest.carrier]}
                                        </span>
                                    </div>
                                </td>

                                {/* Pickup Date */}
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                        <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                                        <span>
                                            {new Date(manifest.pickup.scheduledDate).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                        {manifest.pickup?.timeSlot && (
                                            <span className="text-xs text-[var(--text-muted)]">
                                                {manifest.pickup.timeSlot}
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Shipments */}
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-[var(--text-muted)]" />
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {manifest.summary.totalShipments}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        {manifest.summary.totalWeight.toFixed(2)} kg • ₹{manifest.summary.totalCODAmount.toLocaleString()} COD
                                    </p>
                                </td>

                                {/* Status */}
                                <td className="px-4 py-4">
                                    <StatusBadge domain="manifest" status={manifest.status} />
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <ViewActionButton
                                            onClick={() => onManifestClick?.(manifest)}
                                        />
                                        <button
                                            onClick={() => onDownloadPdf?.(manifest._id)}
                                            className="p-2 text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                                            title="Download PDF"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ManifestTable;
