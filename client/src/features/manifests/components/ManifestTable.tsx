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
    CheckSquare,
    Clock,
    Package,
    XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Manifest, ManifestStatus, CourierPartner } from '@/src/types/api/manifest.types';

// ==================== Status Badge Config ====================

const statusConfig: Record<ManifestStatus, { label: string; className: string }> = {
    DRAFT: {
        label: 'Draft',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    },
    CREATED: {
        label: 'Created',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    },
    PICKUP_SCHEDULED: {
        label: 'Pickup Scheduled',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    },
    PICKUP_IN_PROGRESS: {
        label: 'Pickup In Progress',
        className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    },
    PICKED_UP: {
        label: 'Picked Up',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    },
    PARTIALLY_PICKED: {
        label: 'Partially Picked',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    },
    CANCELLED: {
        label: 'Cancelled',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    },
};

const courierDisplayNames: Record<CourierPartner, string> = {
    velocity: 'Velocity',
    delhivery: 'Delhivery',
    ekart: 'Ekart',
    xpressbees: 'XpressBees',
    bluedart: 'BlueDart',
    shadowfax: 'Shadowfax',
    ecom_express: 'Ecom Express',
};

// ==================== Props ====================

interface ManifestTableProps {
    manifests: Manifest[];
    isLoading: boolean;
    onManifestClick?: (manifest: Manifest) => void;
    onDownloadPdf?: (manifestId: string) => void;
    onReconcile?: (manifestId: string) => void;
}

// ==================== Component ====================

export function ManifestTable({
    manifests,
    isLoading,
    onManifestClick,
    onDownloadPdf,
    onReconcile,
}: ManifestTableProps) {
    // Loading skeleton
    if (isLoading) {
        return (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Manifest</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Courier</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Shipments</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <tr key={idx} className="animate-pulse">
                                <td className="px-4 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" /></td>
                                <td className="px-4 py-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24" /></td>
                                <td className="px-4 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 ml-auto" /></td>
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
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Manifests Found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                    Create a manifest to group shipments for pickup
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Manifest
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Courier
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Pickup Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Shipments
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Status
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                        {manifests.map((manifest) => (
                            <tr
                                key={manifest._id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                onClick={() => onManifestClick?.(manifest)}
                            >
                                {/* Manifest ID */}
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {manifest.manifestId}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Created {formatDistanceToNow(new Date(manifest.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                {/* Courier */}
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {manifest.courierDisplayName || courierDisplayNames[manifest.courierPartner]}
                                        </span>
                                    </div>
                                </td>

                                {/* Pickup Date */}
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                            {new Date(manifest.pickupDate).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                        {manifest.pickupSlot && (
                                            <span className="text-xs text-gray-400">
                                                {manifest.pickupSlot.start} - {manifest.pickupSlot.end}
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Shipments */}
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {manifest.totalShipments}
                                        </span>
                                        {manifest.pickedUpCount > 0 && (
                                            <span className="text-xs text-green-600 dark:text-green-400">
                                                ({manifest.pickedUpCount} picked)
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {manifest.totalWeight.toFixed(2)} kg • ₹{manifest.totalCodAmount.toLocaleString()} COD
                                    </p>
                                </td>

                                {/* Status */}
                                <td className="px-4 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[manifest.status].className}`}>
                                        {statusConfig[manifest.status].label}
                                    </span>
                                    {manifest.reconciliationStatus === 'DISCREPANCY' && (
                                        <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <XCircle className="w-3 h-3" />
                                            Needs Review
                                        </span>
                                    )}
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => onManifestClick?.(manifest)}
                                            className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDownloadPdf?.(manifest.manifestId)}
                                            className="p-2 text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                            title="Download PDF"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        {(manifest.status === 'PICKED_UP' || manifest.status === 'PARTIALLY_PICKED') &&
                                            manifest.reconciliationStatus !== 'COMPLETED' && (
                                                <button
                                                    onClick={() => onReconcile?.(manifest.manifestId)}
                                                    className="p-2 text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    title="Reconcile"
                                                >
                                                    <CheckSquare className="w-4 h-4" />
                                                </button>
                                            )}
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
