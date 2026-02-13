"use client";

import { useRef } from 'react';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { useShipmentPOD, useUploadShipmentPOD } from '@/src/core/api/hooks/logistics/usePod';
import {
    Package, MapPin, User, Phone, Truck, Calendar,
    IndianRupee, Copy, ExternalLink, FileText, Upload, Loader2
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import { Shipment } from '@/src/types/domain/admin';

interface ShipmentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    shipment: Shipment | null;
}

export function ShipmentDetailModal({ isOpen, onClose, shipment }: ShipmentDetailModalProps) {
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const shipmentId = shipment ? ((shipment as any)._id || shipment.id) : '';

    const { data: pod, isLoading: isPodLoading } = useShipmentPOD(shipmentId, {
        queryKey: ['shipment-pod', shipmentId],
        enabled: isOpen && !!shipmentId,
    });
    const { mutate: uploadPod, isPending: isUploading } = useUploadShipmentPOD();

    if (!shipment) return null;

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addToast(`${label} copied!`, 'success');
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !shipmentId) return;

        uploadPod({ shipmentId, file });
        event.target.value = '';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Shipment Details" size="lg">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-start justify-between p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-lg text-[var(--text-primary)]">{shipment.awb}</span>
                            <button
                                onClick={() => handleCopy(shipment.awb, 'AWB')}
                                className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                            >
                                <Copy className="h-3 w-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                            </button>
                        </div>
                        <p className="text-sm text-[var(--text-muted)]">Order: {(shipment as any).orderId?.orderNumber || shipment.orderNumber}</p>
                    </div>
                    <StatusBadge domain="shipment" status={shipment.status || (shipment as any).currentStatus} />
                </div>

                {/* Customer Info */}
                <div>
                    <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" /> Customer Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">Name</p>
                            <p className="font-medium text-[var(--text-primary)]">{(shipment as any).deliveryDetails?.recipientName || (shipment as any).orderId?.customerInfo?.name || shipment.customer?.name || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">Phone</p>
                            <p className="font-medium flex items-center gap-2 text-[var(--text-primary)]">
                                {(shipment as any).deliveryDetails?.recipientPhone || (shipment as any).orderId?.customerInfo?.phone || shipment.customer?.phone || 'N/A'}
                                <Phone className="h-3 w-3 text-[var(--text-muted)]" />
                            </p>
                        </div>
                    </div>
                </div>

                {/* Route Info */}
                <div>
                    <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Route Details
                    </h4>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">Origin</p>
                            <p className="font-medium text-[var(--text-primary)]">{(shipment as any).pickupDetails?.warehouseId?.address?.city || shipment.origin?.city || 'N/A'}</p>
                            <p className="text-xs text-[var(--text-muted)]">{(shipment as any).pickupDetails?.warehouseId?.address?.state || shipment.origin?.state || ''}</p>
                        </div>
                        <div className="flex items-center text-[var(--border-strong)]">
                            <div className="w-8 h-0.5 bg-current opacity-30" />
                            <Truck className="h-5 w-5 mx-2 text-[var(--text-muted)]" />
                            <div className="w-8 h-0.5 bg-current opacity-30" />
                        </div>
                        <div className="flex-1 p-3 bg-[var(--primary-blue-soft)]/50 rounded-xl border border-[var(--primary-blue)]/10">
                            <p className="text-xs text-[var(--primary-blue)]">Destination</p>
                            <p className="font-medium text-[var(--text-primary)]">{(shipment as any).deliveryDetails?.address?.city || shipment.destination?.city || 'N/A'}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{(shipment as any).deliveryDetails?.address?.state || shipment.destination?.state || ''}</p>
                        </div>
                    </div>
                </div>

                {/* Shipping Details */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-xl text-center border border-[var(--border-subtle)]">
                        <Truck className="h-4 w-4 mx-auto text-[var(--text-muted)] mb-1" />
                        <p className="text-xs text-[var(--text-muted)]">Courier</p>
                        <p className="font-medium text-sm text-[var(--text-primary)]">{shipment.courier || (shipment as any).carrier}</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-xl text-center border border-[var(--border-subtle)]">
                        <Package className="h-4 w-4 mx-auto text-[var(--text-muted)] mb-1" />
                        <p className="text-xs text-[var(--text-muted)]">Weight</p>
                        <p className="font-medium text-sm text-[var(--text-primary)]">{shipment.weight || (shipment as any).packageDetails?.weight} kg</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-xl text-center border border-[var(--border-subtle)]">
                        <IndianRupee className="h-4 w-4 mx-auto text-[var(--text-muted)] mb-1" />
                        <p className="text-xs text-[var(--text-muted)]">Amount</p>
                        <p className="font-medium text-sm text-[var(--text-primary)]">{formatCurrency(shipment.codAmount || (shipment as any).paymentDetails?.codAmount || 0)}</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-xl text-center border border-[var(--border-subtle)]">
                        <Calendar className="h-4 w-4 mx-auto text-[var(--text-muted)] mb-1" />
                        <p className="text-xs text-[var(--text-muted)]">Created</p>
                        <p className="font-medium text-sm text-[var(--text-primary)]">{formatDate(shipment.createdAt)}</p>
                    </div>
                </div>

                {/* Quote Snapshot */}
                {shipment.quoteSnapshot && (
                    <div>
                        <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                            <Truck className="h-4 w-4" /> Quote Snapshot
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                                <p className="text-xs text-[var(--text-muted)]">Provider</p>
                                <p className="font-medium text-[var(--text-primary)]">{shipment.quoteSnapshot.provider || '-'}</p>
                                <p className="text-xs text-[var(--text-muted)]">{shipment.quoteSnapshot.serviceName || ''}</p>
                            </div>
                            <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                                <p className="text-xs text-[var(--text-muted)]">Quoted Sell</p>
                                <p className="font-medium text-[var(--text-primary)]">{formatCurrency(shipment.quoteSnapshot.quotedSellAmount || 0)}</p>
                            </div>
                            <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                                <p className="text-xs text-[var(--text-muted)]">Expected Cost</p>
                                <p className="font-medium text-[var(--text-primary)]">{formatCurrency(shipment.quoteSnapshot.expectedCostAmount || 0)}</p>
                            </div>
                            <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                                <p className="text-xs text-[var(--text-muted)]">Expected Margin</p>
                                <p className="font-medium text-[var(--text-primary)]">{formatCurrency(shipment.quoteSnapshot.expectedMarginAmount || 0)}</p>
                                {shipment.quoteSnapshot.confidence && (
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Confidence: {shipment.quoteSnapshot.confidence.toUpperCase()}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* POD Section */}
                <div>
                    <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Proof of Delivery (POD)
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                        <Button
                            variant="outline"
                            className="bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                            onClick={() => pod?.podUrl && window.open(pod.podUrl, '_blank')}
                            disabled={!pod?.podUrl || isPodLoading}
                        >
                            {isPodLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                            {pod?.podUrl ? 'View POD' : 'POD Not Available'}
                        </Button>
                        <Button
                            variant="outline"
                            className="bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                            onClick={handleUploadClick}
                            disabled={isUploading}
                        >
                            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                            Upload POD
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {pod?.source && (
                            <span className="text-xs text-[var(--text-muted)]">
                                Source: {pod.source === 'courier_api' ? 'Courier' : 'Manual'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-[var(--border-subtle)]">
                    <Button variant="outline" className="flex-1 bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                        <FileText className="h-4 w-4 mr-2" /> Download Label
                    </Button>
                    <Button variant="outline" className="flex-1 bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                        <ExternalLink className="h-4 w-4 mr-2" /> Track on Courier
                    </Button>
                    <Button className="flex-1 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white">
                        <Phone className="h-4 w-4 mr-2" /> Contact Support
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
