/**
 * Manifest Detail Page
 * 
 * Displays manifest details with shipments list, actions, and PDF download.
 */

'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
    useShipmentManifest,
    useDownloadManifestPDF,
    useCloseManifest,
    useHandoverManifest,
} from '@/src/core/api/hooks/logistics/useManifest';
import {
    ArrowLeft,
    FileText,
    Truck,
    Package,
    Download,
    Calendar,
    Clock,
    MapPin,
    Loader2,
    AlertCircle,
    RefreshCw,
    Check,
} from 'lucide-react';
import Link from 'next/link';
import type { ManifestStatus } from '@/src/types/api/orders';
import { ConfirmationModal } from '@/src/components/ui/ConfirmationModal';
import { formatCurrency } from '@/src/lib/utils';

// ==================== Status Config ====================

const statusConfig: Record<ManifestStatus, { label: string; className: string }> = {
    open: { label: 'Open', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    closed: { label: 'Closed', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    handed_over: { label: 'Handed Over', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

const courierDisplayNames: Record<string, string> = {
    velocity: 'Velocity',
    delhivery: 'Delhivery',
    ekart: 'Ekart',

};

// ==================== Component ====================

export default function ManifestDetailPage() {
    const params = useParams();
    const manifestId = params.id as string;
    const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

    // API hooks
    const { data: manifest, isLoading, isError, refetch } = useShipmentManifest(manifestId);
    const { mutateAsync: downloadPdf, isPending: isDownloading } = useDownloadManifestPDF();
    const { mutate: closeManifest, isPending: isClosing } = useCloseManifest();
    const { mutate: handoverManifest, isPending: isHandingOver } = useHandoverManifest();

    // Handlers
    const handleDownloadPdf = async () => {
        if (manifest) {
            const url = await downloadPdf(manifest._id);
            window.open(url, '_blank');
        }
    };

    const handleCloseManifest = () => {
        if (!manifest) return;
        setIsCloseConfirmOpen(true);
    };

    const handleHandoverManifest = () => {
        if (!manifest) return;
        handoverManifest(manifest._id, {
            onSuccess: () => {
                toast.success('Manifest marked as handed over');
            }
        });
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--primary-blue)] animate-spin" />
            </div>
        );
    }

    // Error state
    if (isError || !manifest) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[var(--error)]" />
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                        Manifest Not Found
                    </h2>
                    <p className="text-[var(--text-secondary)] mb-4">
                        The manifest you're looking for doesn't exist or has been deleted.
                    </p>
                    <Link
                        href="/seller/manifests"
                        className="text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] font-medium"
                    >
                        Back to Manifests
                    </Link>
                </div>
            </div>
        );
    }

    const warehouse = typeof manifest.warehouseId === 'string' ? null : manifest.warehouseId;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <ConfirmationModal
                isOpen={isCloseConfirmOpen}
                title="Close Manifest?"
                message="This will close the manifest and attempt to schedule pickup with the courier. You can still mark handover later."
                confirmText="Close Manifest"
                cancelText="Cancel"
                variant="warning"
                isLoading={isClosing}
                onConfirm={() => {
                    closeManifest(manifest._id, {
                        onSuccess: () => {
                            toast.success('Manifest closed and pickup scheduled');
                        }
                    });
                    setIsCloseConfirmOpen(false);
                }}
                onCancel={() => setIsCloseConfirmOpen(false)}
            />
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/seller/manifests"
                        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary-blue)] mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Manifests
                    </Link>

                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                <FileText className="w-7 h-7 text-[var(--primary-blue)]" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                                    {manifest.manifestNumber}
                                </h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[manifest.status].className}`}>
                                        {statusConfig[manifest.status].label}
                                    </span>
                                    <span className="text-sm text-[var(--text-muted)]">
                                        Created {new Date(manifest.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => refetch()}
                                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleDownloadPdf}
                                disabled={isDownloading}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--success)] hover:opacity-90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
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
                    <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--info-bg)] flex items-center justify-center">
                                <Truck className="w-5 h-5 text-[var(--info)]" />
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Courier</p>
                                <p className="font-semibold text-[var(--text-primary)]">
                                    {courierDisplayNames[manifest.carrier] || manifest.carrier}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Shipments */}
                    <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                <Package className="w-5 h-5 text-[var(--primary-blue)]" />
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Shipments</p>
                                <p className="font-semibold text-[var(--text-primary)]">
                                    {manifest.summary.totalShipments} shipments
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Pickup Date */}
                    <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-[var(--warning)]" />
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Pickup Date</p>
                                <p className="font-semibold text-[var(--text-primary)]">
                                    {new Date(manifest.pickup.scheduledDate).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Weight & COD */}
                    <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--success-bg)] flex items-center justify-center">
                                <Package className="w-5 h-5 text-[var(--success)]" />
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Weight / COD</p>
                                <p className="font-semibold text-[var(--text-primary)]">
                                    {manifest.summary.totalWeight.toFixed(2)} kg / {formatCurrency(manifest.summary.totalCODAmount, 'INR')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pickup Warehouse */}
                <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] p-6 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-[var(--text-muted)]" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                                Pickup Warehouse
                            </h3>
                            <p className="text-[var(--text-secondary)]">
                                {warehouse?.name || 'Warehouse'}
                            </p>
                            {warehouse?.address && (
                                <>
                                    <p className="text-[var(--text-secondary)]">
                                        {warehouse.address.line1}{warehouse.address.line2 ? `, ${warehouse.address.line2}` : ''}
                                    </p>
                                    <p className="text-[var(--text-secondary)]">
                                        {warehouse.address.city}, {warehouse.address.state} - {warehouse.address.postalCode}
                                    </p>
                                </>
                            )}
                            <p className="text-[var(--text-muted)] text-sm mt-1">
                                Contact: {manifest.pickup.contactPerson} ({manifest.pickup.contactPhone})
                            </p>
                            {manifest.pickup?.timeSlot && (
                                <p className="text-sm text-[var(--primary-blue)] mt-2 flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    Slot: {manifest.pickup.timeSlot}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions Bar */}
                {(manifest.status === 'open' || manifest.status === 'closed') && (
                    <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] p-4 mb-6 flex items-center justify-between">
                        <p className="text-[var(--text-secondary)]">
                            {manifest.status === 'open'
                                ? 'Manifest is open. Close it to schedule pickup.'
                                : 'Manifest is closed. Mark handover once pickup is complete.'}
                        </p>
                        <div className="flex gap-3">
                            {manifest.status === 'open' && (
                                <button
                                    onClick={handleCloseManifest}
                                    disabled={isClosing}
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isClosing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    Close Manifest
                                </button>
                            )}
                            {manifest.status === 'closed' && (
                                <button
                                    onClick={handleHandoverManifest}
                                    disabled={isHandingOver}
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--success)] hover:opacity-90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isHandingOver ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    Mark Handed Over
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Shipments Table */}
                <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                        <h3 className="font-semibold text-[var(--text-primary)]">
                            Shipments ({manifest.shipments.length})
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-secondary)]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">AWB</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Destination</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Weight</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Packages</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">COD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {manifest.shipments.map((shipment) => (
                                    <tr key={shipment.shipmentId} className="hover:bg-[var(--bg-hover)]">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-[var(--text-primary)]">
                                                {shipment.awb}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                            {(shipment as any).shipmentId?.deliveryDetails?.address?.city || 'N/A'},
                                            {' '}
                                            {(shipment as any).shipmentId?.deliveryDetails?.address?.state || 'N/A'}
                                            <br />
                                            <span className="text-xs text-[var(--text-muted)]">
                                                {(shipment as any).shipmentId?.deliveryDetails?.address?.postalCode || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                                            {shipment.weight} kg
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                                            {shipment.packages}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                                            {formatCurrency(shipment.codAmount || 0, 'INR')}
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
