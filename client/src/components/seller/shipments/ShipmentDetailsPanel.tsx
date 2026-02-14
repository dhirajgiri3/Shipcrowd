"use client";

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DetailPanel } from '@/src/components/ui/layout/DetailPanel';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { useShipmentPOD, useUploadShipmentPOD } from '@/src/core/api/hooks/logistics/usePod';
import { useGenerateLabel } from '@/src/core/api/hooks/seller/useShipment';
import {
    Package, MapPin, User, Phone, Truck, Calendar,
    IndianRupee, Copy, ExternalLink, FileText, Upload, Loader2
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency, formatDate } from '@/src/lib/utils';

interface Shipment {
    id?: string;
    _id?: string;
    trackingNumber?: string;
    awb?: string;
    orderNumber?: string;
    orderId?: any;
    status?: string;
    currentStatus?: string;
    courier?: string;
    carrier?: string;
    serviceType?: string;
    weight?: number;
    codAmount?: number;
    customer?: any;
    deliveryDetails?: any;
    pickupDetails?: any;
    packageDetails?: any;
    paymentDetails?: any;
    origin?: any;
    destination?: any;
    createdAt?: string;
    quoteSnapshot?: {
        provider?: string;
        serviceName?: string;
        quotedSellAmount?: number;
        expectedCostAmount?: number;
        expectedMarginAmount?: number;
        confidence?: 'high' | 'medium' | 'low';
    };
}

interface ShipmentDetailsPanelProps {
    shipment: Shipment | null;
    onClose: () => void;
}

export const ShipmentDetailsPanel = React.memo(ShipmentDetailsPanelComponent);

function ShipmentDetailsPanelComponent({ shipment, onClose }: ShipmentDetailsPanelProps) {
    const { addToast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const shipmentId = shipment ? ((shipment as any)._id || shipment.id) : '';
    const trackingNumber = shipment ? ((shipment as any).trackingNumber || (shipment as any).awb || shipment.awb) : '';

    const { data: pod, isLoading: isPodLoading } = useShipmentPOD(shipmentId, {
        queryKey: ['shipment-pod', shipmentId],
        enabled: !!shipment && !!shipmentId,
    });
    const { mutate: uploadPod, isPending: isUploading } = useUploadShipmentPOD();
    const { mutate: generateLabel, isPending: isGeneratingLabel } = useGenerateLabel();

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

    const handleDownloadLabel = () => {
        if (!shipmentId) return;
        generateLabel(shipmentId, {
            onSuccess: (data) => {
                if (data?.labelUrl) {
                    const a = document.createElement('a');
                    a.href = data.labelUrl;
                    a.download = `label-${trackingNumber || shipmentId}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(data.labelUrl);
                }
            },
        });
    };

    const handleTrack = () => {
        if (!trackingNumber) {
            addToast('Tracking number not available', 'error');
            return;
        }
        router.push(`/seller/tracking?awb=${trackingNumber}`);
    };

    const footer = (
        <div className="flex gap-3">
            <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownloadLabel}
                disabled={isGeneratingLabel || !shipmentId}
            >
                {isGeneratingLabel ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <FileText className="w-4 h-4 mr-2" />
                )}
                Download Label
            </Button>
            <Button
                variant="outline"
                className="flex-1"
                onClick={handleTrack}
                disabled={!trackingNumber}
            >
                <ExternalLink className="w-4 h-4 mr-2" /> Track
            </Button>
        </div>
    );

    return (
        <DetailPanel
            isOpen={!!shipment}
            onClose={onClose}
            title={`AWB: ${trackingNumber || 'N/A'}`}
            subtitle={`Order: ${(shipment as any).orderId?.orderNumber || shipment.orderNumber || 'N/A'}`}
            footer={footer}
            width="lg"
        >
            <div className="space-y-6">
                {/* Status & AWB Section */}
                <div className="flex items-center justify-between bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-subtle)]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">AWB Number</p>
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-lg text-[var(--text-primary)]">{trackingNumber || 'N/A'}</span>
                            {trackingNumber && (
                                <button
                                    onClick={() => handleCopy(trackingNumber, 'AWB')}
                                    className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                                >
                                    <Copy className="h-3.5 w-3.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Status</p>
                        <StatusBadge domain="shipment" status={shipment.status || (shipment as any).currentStatus} />
                    </div>
                </div>

                {/* Customer Details */}
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-[var(--primary-blue)]" /> Customer Details
                    </h3>
                    <div className="space-y-3 pl-6 border-l-2 border-[var(--border-subtle)] py-1">
                        <div>
                            <p className="font-semibold text-[var(--text-primary)]">
                                {(shipment as any).deliveryDetails?.recipientName || (shipment as any).orderId?.customerInfo?.name || shipment.customer?.name || 'N/A'}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-1">
                                <Phone className="w-3.5 h-3.5" />
                                {(shipment as any).deliveryDetails?.recipientPhone || (shipment as any).orderId?.customerInfo?.phone || shipment.customer?.phone || 'N/A'}
                            </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)]/50 p-3 rounded-lg">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                                {(shipment as any).deliveryDetails?.address?.line1 || 'Address not available'}
                                {(shipment as any).deliveryDetails?.address?.city && (
                                    <><br />{(shipment as any).deliveryDetails.address.city}, {(shipment as any).deliveryDetails.address.state} - {(shipment as any).deliveryDetails.address.postalCode}</>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Route Details */}
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[var(--primary-blue)]" /> Route Details
                    </h3>
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

                {/* Shipping Details Grid */}
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-[var(--primary-blue)]" /> Shipping Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2 mb-1">
                                <Truck className="h-4 w-4 text-[var(--text-muted)]" />
                                <p className="text-xs text-[var(--text-muted)]">Courier</p>
                            </div>
                            <p className="font-medium text-[var(--text-primary)]">{shipment.courier || (shipment as any).carrier || 'N/A'}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{(shipment as any).serviceType || ''}</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2 mb-1">
                                <Package className="h-4 w-4 text-[var(--text-muted)]" />
                                <p className="text-xs text-[var(--text-muted)]">Weight</p>
                            </div>
                            <p className="font-medium text-[var(--text-primary)]">{shipment.weight || (shipment as any).packageDetails?.weight || 'N/A'} kg</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2 mb-1">
                                <IndianRupee className="h-4 w-4 text-[var(--text-muted)]" />
                                <p className="text-xs text-[var(--text-muted)]">COD Amount</p>
                            </div>
                            <p className="font-medium text-[var(--text-primary)]">{formatCurrency(shipment.codAmount || (shipment as any).paymentDetails?.codAmount || 0)}</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                                <p className="text-xs text-[var(--text-muted)]">Created</p>
                            </div>
                            <p className="font-medium text-[var(--text-primary)]">{shipment.createdAt ? formatDate(shipment.createdAt) : 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Quote Snapshot */}
                {shipment.quoteSnapshot && (
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-[var(--primary-blue)]" /> Quote Snapshot
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
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
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--primary-blue)]" /> Proof of Delivery
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                        <Button
                            variant="outline"
                            onClick={() => pod?.podUrl && window.open(pod.podUrl, '_blank')}
                            disabled={!pod?.podUrl || isPodLoading}
                        >
                            {isPodLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                            {pod?.podUrl ? 'View POD' : 'POD Not Available'}
                        </Button>
                        <Button
                            variant="outline"
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
            </div>
        </DetailPanel>
    );
}
