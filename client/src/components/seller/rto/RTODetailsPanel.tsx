"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { DetailPanel } from '@/src/components/ui/layout/DetailPanel';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import {
    Package, MapPin, User, Phone, Truck, Calendar,
    AlertTriangle, ClipboardCheck, ArrowRight, Clock,
    Info, ExternalLink, RefreshCw
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/src/lib/utils';
import type { RTOEventDetail, RTOShipmentRef, RTOOrderRef, RTOWarehouseRef } from '@/src/types/api/rto.types';
import { RTO_REASON_LABELS } from '@/src/types/api/rto.types';

interface RTODetailsPanelProps {
    rto: RTOEventDetail | null;
    onClose: () => void;
}

export const RTODetailsPanel = React.memo(RTODetailsPanelComponent);

function RTODetailsPanelComponent({ rto, onClose }: RTODetailsPanelProps) {
    const router = useRouter();

    if (!rto) return null;

    // Helper to safely access nested properties
    const getShipment = () => {
        if (!rto.shipment || typeof rto.shipment !== 'object') return null;
        return rto.shipment as RTOShipmentRef;
    };

    const getOrder = () => {
        if (!rto.order || typeof rto.order !== 'object') return null;
        return rto.order as RTOOrderRef;
    };

    const getWarehouse = () => {
        if (!rto.warehouse || typeof rto.warehouse !== 'object') return null;
        return rto.warehouse as RTOWarehouseRef;
    };

    const shipment = getShipment();
    const order = getOrder();
    const warehouse = getWarehouse();

    // Derived values
    const awb = shipment?.awb || shipment?.trackingNumber || 'N/A';
    const orderNumber = order?.orderNumber || 'N/A';
    const customerName = shipment?.deliveryDetails?.recipientName || 'N/A';
    const customerPhone = shipment?.deliveryDetails?.recipientPhone || 'N/A';
    const warehouseName = warehouse?.name || 'N/A';
    const isQCPending = rto.returnStatus === 'qc_pending';
    const isQCFailed = rto.qcResult && !rto.qcResult.passed;

    const footer = (
        <div className="flex gap-3">
            <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/seller/shipments?search=${awb}`)}
            >
                <Truck className="w-4 h-4 mr-2" /> View Shipment
            </Button>
            {isQCPending && (
                <Button
                    className="flex-1 bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)]"
                    onClick={() => router.push(`/seller/rto/${rto._id}/qc`)}
                >
                    <ClipboardCheck className="w-4 h-4 mr-2" /> Record QC
                </Button>
            )}
            {!isQCPending && (
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`/seller/rto/${rto._id}`)}
                >
                    <ExternalLink className="w-4 h-4 mr-2" /> Full Details
                </Button>
            )}
        </div>
    );

    return (
        <DetailPanel
            isOpen={!!rto}
            onClose={onClose}
            title={`RTO #${rto._id.slice(-8).toUpperCase()}`}
            subtitle={`AWB: ${awb}`}
            footer={footer}
            width="lg"
        >
            <div className="space-y-6">
                {/* Status Section */}
                <div className="flex items-center justify-between bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-subtle)]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Current Status</p>
                        <StatusBadge domain="rto" status={rto.returnStatus} />
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">RTO Reason</p>
                        <div className="font-medium text-[var(--text-primary)]">
                            {RTO_REASON_LABELS[rto.rtoReason] || rto.rtoReason}
                        </div>
                    </div>
                </div>

                {/* Critical Alerts (if any) */}
                {isQCFailed && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3 text-red-800 dark:text-red-200">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div>
                            <h4 className="font-bold text-sm">QC Failed</h4>
                            <p className="text-xs mt-1">Item failed quality check. Please review remarks and images.</p>
                        </div>
                    </div>
                )}

                {/* Customer Details */}
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-[var(--primary-blue)]" /> Customer Details
                    </h3>
                    <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] p-4 space-y-3 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-[var(--text-primary)]">{customerName}</p>
                                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-1">
                                    <Phone className="w-3.5 h-3.5" /> {customerPhone}
                                </div>
                            </div>
                            {orderNumber !== 'N/A' && (
                                <div className="text-right">
                                    <span className="text-xs text-[var(--text-muted)]">Order #</span>
                                    <p className="font-mono text-sm font-medium">{orderNumber}</p>
                                </div>
                            )}
                        </div>

                        {shipment?.deliveryDetails?.address && (
                            <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)]/50 p-3 rounded-lg">
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>
                                    {shipment.deliveryDetails.address.city && (
                                        <>{shipment.deliveryDetails.address.city} - {shipment.deliveryDetails.address.postalCode}</>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Return Journey */}
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[var(--primary-blue)]" /> Return Journey
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">Initiated</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                <p className="font-medium text-[var(--text-primary)]">{formatDate(rto.triggeredAt)}</p>
                            </div>
                        </div>
                        <div className="flex items-center text-[var(--border-strong)]">
                            <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
                        </div>
                        <div className="flex-1 p-3 bg-[var(--primary-blue-soft)]/50 rounded-xl border border-[var(--primary-blue)]/10">
                            <p className="text-xs text-[var(--primary-blue)]">Return To</p>
                            <p className="font-medium text-[var(--text-primary)] truncate" title={warehouseName}>{warehouseName}</p>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--text-secondary)]">
                                <Clock className="w-3 h-3" />
                                <span>ETA: {rto.expectedReturnDate ? formatDate(rto.expectedReturnDate) : 'Pending'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QC Details (if available) */}
                {rto.qcResult && (
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4 text-[var(--primary-blue)]" /> QC Results
                        </h3>
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">QC Status</span>
                                <StatusBadge
                                    domain="rto"
                                    status={rto.qcResult.passed ? 'qc_completed' : 'qc_pending'}
                                />
                            </div>

                            {rto.qcResult.remarks && (
                                <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Remarks</p>
                                    <p className="text-sm text-[var(--text-secondary)]">{rto.qcResult.remarks}</p>
                                </div>
                            )}

                            {rto.qcResult.images && rto.qcResult.images.length > 0 && (
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-2">Attached Images</p>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {rto.qcResult.images.map((img, idx) => (
                                            <div key={idx} className="w-16 h-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] shrink-0 overflow-hidden">
                                                <img src={img} alt={`QC ${idx + 1}`} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Financial Impact */}
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-[var(--primary-blue)]" /> Financial Impact
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">RTO Charges</p>
                            <p className="font-medium text-[var(--text-primary)] mt-1">{formatCurrency(rto.rtoCharges || 0)}</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">Package Weight</p>
                            <p className="font-medium text-[var(--text-primary)] mt-1">{shipment?.packageDetails?.weight || 0} kg</p>
                        </div>
                    </div>
                </div>
            </div>
        </DetailPanel>
    );
}
