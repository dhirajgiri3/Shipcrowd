"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { DetailPanel } from '@/src/components/ui/layout/DetailPanel';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import {
    Package, MapPin, User, Phone, Truck, Calendar,
    AlertTriangle, ClipboardCheck, ArrowRight, Clock,
    Info, ExternalLink, CreditCard, RotateCcw, FileText
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/src/lib/utils';
import type { ReturnRequest, ReturnItem } from '@/src/types/api/returns/returns.types';

interface ReturnDetailsPanelProps {
    returnReq: ReturnRequest | null;
    onClose: () => void;
}

export const ReturnDetailsPanel = React.memo(ReturnDetailsPanelComponent);

function ReturnDetailsPanelComponent({ returnReq, onClose }: ReturnDetailsPanelProps) {
    const router = useRouter();

    if (!returnReq) return null;

    // Derived values
    const returnId = returnReq.returnId || returnReq._id;
    const orderNumber = typeof returnReq.orderId === 'object' ? returnReq.orderId.orderNumber : returnReq.orderId;
    const customerName = returnReq.customerName || 'N/A';
    const customerPhone = returnReq.customerPhone || 'N/A';
    const warehouseLocation = returnReq.warehouseLocation || 'Default Warehouse';

    // Status checks
    const isRequested = returnReq.status === 'requested';
    const isQCPending = returnReq.status === 'qc_pending' || returnReq.status === 'qc_in_progress' || returnReq.status === 'received';
    const isRefundPending = returnReq.status === 'qc_passed' || returnReq.status === 'refund_initiated' || returnReq.status === 'approved';
    const isQCFailed = returnReq.qualityCheck?.status === 'fail' || returnReq.status === 'rejected';

    const renderFooter = () => (
        <div className="flex gap-3">
            <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/seller/returns/${returnReq._id}`)}
            >
                <ExternalLink className="w-4 h-4 mr-2" /> Full Details
            </Button>

            {isRequested && (
                <Button
                    className="flex-1 bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue-deep)]"
                    onClick={() => router.push(`/seller/returns/${returnReq._id}`)}
                >
                    <FileText className="w-4 h-4 mr-2" /> Review Request
                </Button>
            )}

            {isQCPending && (
                <Button
                    className="flex-1 bg-[var(--warning)] text-white hover:bg-[var(--warning)]/90"
                    onClick={() => router.push(`/seller/returns/${returnReq._id}/qc`)}
                >
                    <ClipboardCheck className="w-4 h-4 mr-2" /> Record QC
                </Button>
            )}

            {isRefundPending && !isQCPending && (
                <Button
                    className="flex-1 bg-[var(--success)] text-white hover:bg-[var(--success)]/90"
                    onClick={() => router.push(`/seller/returns/${returnReq._id}`)}
                >
                    <CreditCard className="w-4 h-4 mr-2" /> Process Refund
                </Button>
            )}
        </div>
    );

    return (
        <DetailPanel
            isOpen={!!returnReq}
            onClose={onClose}
            title={`Return #${returnId}`}
            subtitle={`Order: ${orderNumber}`}
            footer={renderFooter()}
            width="lg"
        >
            <div className="space-y-6">
                {/* Status Section */}
                <div className="flex items-center justify-between bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-subtle)]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Current Status</p>
                        <StatusBadge domain="return" status={returnReq.status} />
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Return Reason</p>
                        <div className="font-medium text-[var(--text-primary)] capitalize">
                            {(returnReq.primaryReason || returnReq.returnReason || 'N/A').replace(/_/g, ' ')}
                        </div>
                    </div>
                </div>

                {/* Critical Alerts */}
                {isQCFailed && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3 text-red-800 dark:text-red-200">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div>
                            <h4 className="font-bold text-sm">QC Failed / Rejected</h4>
                            <p className="text-xs mt-1">
                                {returnReq.rejectionReason || returnReq.qualityCheck?.overallNotes || 'Return request was rejected or failed quality check.'}
                            </p>
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
                        </div>

                        {returnReq.pickupAddress && (
                            <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)]/50 p-3 rounded-lg">
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{returnReq.pickupAddress}</span>
                            </div>
                        )}

                        {returnReq.customerNotes && (
                            <div className="bg-[var(--bg-secondary)]/50 p-3 rounded-lg border border-[var(--border-subtle)]/50">
                                <p className="text-xs text-[var(--text-muted)] mb-1">Customer Notes</p>
                                <p className="text-sm text-[var(--text-secondary)] italic">"{returnReq.customerNotes}"</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Return Items */}
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-[var(--primary-blue)]" /> Return Items
                    </h3>
                    <div className="space-y-3">
                        {returnReq.items.map((item: ReturnItem, idx: number) => (
                            <div key={idx} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] p-3 flex gap-4">
                                <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] flex items-center justify-center shrink-0 overflow-hidden">
                                    {item.images?.[0] ? (
                                        <img src={item.images[0]} alt={item.productName} className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="w-8 h-8 text-[var(--text-tertiary)]" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[var(--text-primary)] text-sm line-clamp-1">{item.productName}</p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">SKU: {item.sku || 'N/A'}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                            Qty: {item.returnQuantity}
                                        </span>
                                        <span className="text-xs text-[var(--text-muted)] capitalize">
                                            {item.returnReason.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Return Journey Timeline */}
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-[var(--primary-blue)]" /> Return Journey
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">Requested</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                <p className="font-medium text-[var(--text-primary)]">{formatDate(returnReq.requestedAt)}</p>
                            </div>
                        </div>
                        <div className="flex items-center text-[var(--border-strong)]">
                            <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
                        </div>
                        <div className="flex-1 p-3 bg-[var(--primary-blue-soft)]/50 rounded-xl border border-[var(--primary-blue)]/10">
                            <p className="text-xs text-[var(--primary-blue)]">Return Location</p>
                            <p className="font-medium text-[var(--text-primary)] truncate" title={warehouseLocation}>{warehouseLocation}</p>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--text-secondary)]">
                                <Truck className="w-3 h-3" />
                                <span>
                                    {returnReq.pickup?.status || 'Pickup Pending'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QC Info (If available) */}
                {returnReq.qualityCheck && (
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4 text-[var(--primary-blue)]" /> QC Results
                        </h3>
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Status</span>
                                <StatusBadge
                                    domain="return"
                                    status={returnReq.qualityCheck.status === 'pass' ? 'qc_passed' : returnReq.qualityCheck.status === 'fail' ? 'qc_failed' : 'qc_pending'}
                                />
                            </div>
                            {returnReq.qualityCheck.overallNotes && (
                                <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Notes</p>
                                    <p className="text-sm text-[var(--text-secondary)]">{returnReq.qualityCheck.overallNotes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Financials */}
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-[var(--primary-blue)]" /> Financial Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">Refund Amount</p>
                            <p className="font-medium text-[var(--success)] mt-1">
                                {formatCurrency(returnReq.refundDetails?.totalRefund ?? returnReq.estimatedRefund ?? 0)}
                            </p>
                        </div>
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                            <p className="text-xs text-[var(--text-muted)]">Refund Method</p>
                            <p className="font-medium text-[var(--text-primary)] mt-1 capitalize">
                                {returnReq.refundDetails?.method?.replace(/_/g, ' ') || returnReq.refund?.status || 'Pending'}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </DetailPanel>
    );
}
