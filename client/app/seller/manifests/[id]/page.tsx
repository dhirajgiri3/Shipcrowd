/**
 * Manifest Detail Page
 * 
 * Displays manifest details with shipments list, actions, and PDF download.
 */

'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    useManifest,
    useDownloadManifestPdf,
    useMarkPickedUp,
    useCancelManifest,
} from '@/src/core/api/hooks/orders/useManifests';
import {
    ArrowLeft,
    FileText,
    Truck,
    Package,
    Download,
    Calendar,
    Clock,
    MapPin,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
    MoreHorizontal,
    RefreshCw,
    Check,
} from 'lucide-react';
import Link from 'next/link';
import { showInfoToast } from '@/src/lib/error';
import type { ManifestStatus, ManifestShipment } from '@/src/types/api/orders';

// ==================== Status Config ====================

const statusConfig: Record<ManifestStatus, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    CREATED: { label: 'Created', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    PICKUP_SCHEDULED: { label: 'Pickup Scheduled', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    PICKUP_IN_PROGRESS: { label: 'Pickup In Progress', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    PICKED_UP: { label: 'Picked Up', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    PARTIALLY_PICKED: { label: 'Partially Picked', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

// ==================== Component ====================

export default function ManifestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const manifestId = params.id as string;

    // API hooks
    const { data: manifest, isLoading, isError, refetch } = useManifest(manifestId);
    const { mutate: downloadPdf, isPending: isDownloading } = useDownloadManifestPdf();
    const { mutate: markPickedUp, isPending: isMarking } = useMarkPickedUp();
    const { mutate: cancelManifest, isPending: isCancelling } = useCancelManifest();

    // Handlers
    const handleDownloadPdf = () => {
        if (manifest) {
            downloadPdf(manifest.manifestId);
        }
    };

    const handleMarkAllPickedUp = () => {
        if (manifest) {
            const unPickedIds = manifest.shipments
                .filter(s => !s.isPickedUp)
                .map(s => s.shipmentId);

            if (unPickedIds.length === 0) {
                showInfoToast('All shipments already marked as picked up');
                return;
            }

            markPickedUp({
                manifestId: manifest.manifestId,
                shipmentIds: unPickedIds,
            });
        }
    };

    const handleCancelManifest = () => {
        if (manifest && window.confirm('Are you sure you want to cancel this manifest?')) {
            cancelManifest({ manifestId: manifest.manifestId });
        }
    };

    const handleReconcile = () => {
        router.push(`/seller/manifests/reconciliation?id=${manifestId}`);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    // Error state
    if (isError || !manifest) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Manifest Not Found
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        The manifest you're looking for doesn't exist or has been deleted.
                    </p>
                    <Link
                        href="/seller/manifests"
                        className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                        Back to Manifests
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/seller/manifests"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Manifests
                    </Link>

                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <FileText className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {manifest.manifestId}
                                </h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[manifest.status].className}`}>
                                        {statusConfig[manifest.status].label}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Created {new Date(manifest.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => refetch()}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleDownloadPdf}
                                disabled={isDownloading}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isDownloading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Courier */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Courier</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {manifest.courierDisplayName}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Shipments */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Shipments</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {manifest.pickedUpCount}/{manifest.totalShipments} picked
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Pickup Date */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Pickup Date</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {new Date(manifest.pickupDate).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Weight & COD */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Weight / COD</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {manifest.totalWeight.toFixed(2)} kg / ₹{manifest.totalCodAmount.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pickup Address */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                Pickup Address
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {manifest.pickupAddress.name}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                                {manifest.pickupAddress.address}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                                {manifest.pickupAddress.city}, {manifest.pickupAddress.state} - {manifest.pickupAddress.pincode}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                Phone: {manifest.pickupAddress.phone}
                            </p>
                            {manifest.pickupSlot && (
                                <p className="text-sm text-primary-600 dark:text-primary-400 mt-2 flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    Slot: {manifest.pickupSlot.start} - {manifest.pickupSlot.end}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions Bar */}
                {manifest.status !== 'CANCELLED' && manifest.status !== 'PICKED_UP' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 flex items-center justify-between">
                        <p className="text-gray-600 dark:text-gray-400">
                            {manifest.totalShipments - manifest.pickedUpCount} shipments pending pickup
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelManifest}
                                disabled={isCancelling}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isCancelling ? 'Cancelling...' : 'Cancel Manifest'}
                            </button>
                            <button
                                onClick={handleMarkAllPickedUp}
                                disabled={isMarking}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isMarking ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                Mark All Picked Up
                            </button>
                        </div>
                    </div>
                )}

                {/* Shipments Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Shipments ({manifest.shipments.length})
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">AWB</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Destination</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Weight</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {manifest.shipments.map((shipment) => (
                                    <tr key={shipment.shipmentId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {shipment.awbNumber}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Order: {shipment.orderId}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {shipment.destination.city}, {shipment.destination.state}
                                            <br />
                                            <span className="text-xs">{shipment.destination.pincode}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {shipment.weight} kg
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2 py-1 rounded-full ${shipment.paymentMode === 'COD'
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                }`}>
                                                {shipment.paymentMode}
                                                {shipment.paymentMode === 'COD' && shipment.codAmount && (
                                                    <> • ₹{shipment.codAmount}</>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {shipment.isPickedUp ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Picked Up
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm">
                                                    <Clock className="w-4 h-4" />
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
