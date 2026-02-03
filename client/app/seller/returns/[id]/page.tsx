/**
 * Return Detail Page
 * 
 * Complete view of a return request with:
 * - Return information
 * - Items details
 * - QC results
 * - Refund processing
 * - Timeline
 * 
 * Route: /seller/returns/[id]
 */

'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReturn, useApproveReturn, useProcessRefund } from '@/src/core/api/hooks';
import { QualityCheckModal, ReturnLabelModal, RefundModal } from '@/src/features/returns/components';
import { ConfirmationModal } from '@/src/components/ui/ConfirmationModal';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import { showSuccessToast } from '@/src/lib/error';
import { handleApiError } from '@/src/lib/error';

const STATUS_COLORS = {
    requested: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    approved: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]',
    rejected: 'bg-[var(--error-bg)] text-[var(--error)]',
    pickup_scheduled: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]',
    in_transit: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    received: 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]',
    qc_pending: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    qc_passed: 'bg-[var(--success-bg)] text-[var(--success)]',
    qc_failed: 'bg-[var(--error-bg)] text-[var(--error)]',
    refund_initiated: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
    refund_completed: 'bg-[var(--success-bg)] text-[var(--success)]',
    closed: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
};

export default function ReturnDetailPage() {
    const params = useParams();
    const router = useRouter();
    const returnId = params.id as string;

    const [showQCModal, setShowQCModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [refundMethod, setRefundMethod] = useState<'wallet' | 'original_payment' | 'bank_transfer'>('wallet');

    const { data: returnReq, isLoading } = useReturn(returnId);
    const approveReturn = useApproveReturn();
    const processRefund = useProcessRefund();

    const handleApprove = async () => {
        try {
            await approveReturn.mutateAsync({
                returnId,
                payload: { approved: true },
            });
            showSuccessToast('Return request approved successfully!');
            setShowApproveModal(false);
        } catch (error) {
            handleApiError(error, 'Failed to approve return');
        }
    };

    const handleReject = async (reason?: string) => {
        if (!reason) return;

        try {
            await approveReturn.mutateAsync({
                returnId,
                payload: { approved: false, rejectionReason: reason },
            });
            showSuccessToast('Return request rejected');
            setShowRejectModal(false);
        } catch (error) {
            handleApiError(error, 'Failed to reject return');
        }
    };

    const handleProcessRefund = async () => {
        if (!returnReq?.qualityCheck) return;

        try {
            await processRefund.mutateAsync({
                returnId,
                payload: {
                    refundAmount: returnReq.qualityCheck.refundAmount,
                    refundMethod: refundMethod,
                },
            });
            showSuccessToast('Refund processed successfully!');
            setShowRefundModal(false);
        } catch (error) {
            handleApiError(error, 'Failed to process refund');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-tertiary)] p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-[var(--bg-secondary)] rounded w-1/4"></div>
                        <div className="h-64 bg-[var(--bg-secondary)] rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!returnReq) {
        return (
            <div className="min-h-screen bg-[var(--bg-tertiary)] p-6">
                <div className="max-w-7xl mx-auto text-center">
                    <p className="text-[var(--text-muted)]">Return not found</p>
                </div>
            </div>
        );
    }

    const order = typeof returnReq.orderId === 'object' ? returnReq.orderId : null;
    const canApprove = returnReq.status === 'requested';
    const canQC = returnReq.status === 'received' || returnReq.status === 'qc_pending';
    const canRefund = returnReq.status === 'qc_passed' && !returnReq.refundDetails?.completedAt;

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-[var(--bg-hover)] rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div>
                            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{returnReq.returnId}</h1>
                            <p className="text-[var(--text-secondary)] mt-1">
                                Order: {order?.orderNumber || 'N/A'}
                            </p>
                        </div>
                    </div>
                    <span className={`px-4 py-2 rounded-lg text-sm font-medium ${STATUS_COLORS[returnReq.status as keyof typeof STATUS_COLORS]}`}>
                        {returnReq.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Return Information */}
                        <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Return Information</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Customer</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1">{returnReq.customerName}</p>
                                    <p className="text-xs text-[var(--text-secondary)]">{returnReq.customerPhone}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Requested</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1">{formatDate(returnReq.requestedAt)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Primary Reason</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1 capitalize">
                                        {returnReq.primaryReason.replace(/_/g, ' ')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Estimated Refund</p>
                                    <p className="text-sm font-semibold text-[var(--success)] mt-1">
                                        {formatCurrency(returnReq.estimatedRefund)}
                                    </p>
                                </div>
                            </div>
                            {returnReq.customerNotes && (
                                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                                    <p className="text-sm text-[var(--text-secondary)] mb-1">Customer Notes</p>
                                    <p className="text-sm text-[var(--text-primary)]">{returnReq.customerNotes}</p>
                                </div>
                            )}
                        </div>

                        {/* Items */}
                        <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Return Items</h2>
                            <div className="space-y-4">
                                {returnReq.items.map((item, idx) => (
                                    <div key={idx} className="border border-[var(--border-default)] rounded-lg p-4">
                                        <div className="flex justify-between">
                                            <div>
                                                <h3 className="font-medium text-[var(--text-primary)]">{item.productName}</h3>
                                                <p className="text-sm text-[var(--text-secondary)]">SKU: {item.sku}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-[var(--text-primary)]">
                                                    {formatCurrency(item.sellingPrice)}
                                                </p>
                                                <p className="text-sm text-[var(--text-secondary)]">
                                                    Qty: {item.returnQuantity}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-sm text-[var(--text-primary)] capitalize">
                                                Reason: {item.returnReason.replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* QC Results */}
                        {returnReq.qualityCheck && (
                            <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quality Check Results</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg">
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">
                                                Status: {returnReq.qualityCheck.status.toUpperCase()}
                                            </p>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                Performed by {returnReq.qualityCheck.performedBy} on {formatDate(returnReq.qualityCheck.performedAt)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-[var(--success)]">
                                                {formatCurrency(returnReq.qualityCheck.refundAmount)}
                                            </p>
                                            <p className="text-sm text-[var(--text-secondary)]">Refund Amount</p>
                                        </div>
                                    </div>
                                    {returnReq.qualityCheck.overallNotes && (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{returnReq.qualityCheck.overallNotes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        {(canApprove || canQC || canRefund) && (
                            <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Actions</h2>
                                <div className="flex flex-wrap gap-3">
                                    {canApprove && (
                                        <>
                                            <button
                                                onClick={() => setShowApproveModal(true)}
                                                disabled={approveReturn.isPending}
                                                className="px-4 py-2 bg-[var(--success)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                                            >
                                                Approve Return
                                            </button>
                                            <button
                                                onClick={() => setShowRejectModal(true)}
                                                disabled={approveReturn.isPending}
                                                className="px-4 py-2 bg-[var(--error)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                                            >
                                                Reject Return
                                            </button>
                                        </>
                                    )}
                                    {canQC && (
                                        <button
                                            onClick={() => setShowQCModal(true)}
                                            className="px-4 py-2 bg-[var(--primary-blue)] text-white rounded-lg hover:bg-[var(--primary-blue-deep)]"
                                        >
                                            Perform Quality Check
                                        </button>
                                    )}
                                    {canRefund && (
                                        <button
                                            onClick={() => setShowRefundModal(true)}
                                            disabled={processRefund.isPending}
                                            className="px-4 py-2 bg-[var(--success)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                                        >
                                            Process Refund
                                        </button>
                                    )}
                                    {/* Generate Return Label - available after approval */}
                                    {returnReq.status !== 'requested' && returnReq.status !== 'rejected' && (
                                        <button
                                            onClick={() => setShowLabelModal(true)}
                                            className="px-4 py-2 bg-[var(--primary-blue)] text-white rounded-lg hover:bg-[var(--primary-blue-deep)] flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            Generate Label
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Timeline */}
                        <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Timeline</h3>
                            <div className="space-y-4">
                                {returnReq.timeline.map((event, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-[var(--primary-blue)]"></div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                                                {event.status.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)]">{formatDate(event.timestamp)}</p>
                                            {event.notes && <p className="text-xs text-[var(--text-muted)] mt-1">{event.notes}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* QC Modal */}
            <QualityCheckModal
                returnId={returnId}
                items={returnReq.items}
                isOpen={showQCModal}
                onClose={() => setShowQCModal(false)}
            />

            {/* Approve Confirmation Modal */}
            <ConfirmationModal
                isOpen={showApproveModal}
                title="Approve Return Request"
                message="Are you sure you want to approve this return request? The customer will be notified and pickup will be scheduled."
                variant="info"
                confirmText="Approve"
                onConfirm={handleApprove}
                onCancel={() => setShowApproveModal(false)}
                isLoading={approveReturn.isPending}
            />

            {/* Reject Confirmation Modal */}
            <ConfirmationModal
                isOpen={showRejectModal}
                title="Reject Return Request"
                message="Please provide a reason for rejecting this return. The customer will be notified."
                variant="danger"
                confirmText="Reject"
                requireReason={true}
                reasonLabel="Rejection Reason"
                reasonPlaceholder="E.g., Return request is outside the return window, item is not eligible for return..."
                onConfirm={handleReject}
                onCancel={() => setShowRejectModal(false)}
                isLoading={approveReturn.isPending}
            />

            {/* Refund Modal */}
            {
                returnReq?.qualityCheck && (
                    <RefundModal
                        isOpen={showRefundModal}
                        onClose={() => setShowRefundModal(false)}
                        onConfirm={handleProcessRefund}
                        amount={returnReq.qualityCheck.refundAmount}
                        refundMethod={refundMethod}
                        onMethodChange={setRefundMethod}
                        isLoading={processRefund.isPending}
                    />
                )
            }

            {/* Return Label Modal */}
            {
                returnReq && (
                    <ReturnLabelModal
                        isOpen={showLabelModal}
                        onClose={() => setShowLabelModal(false)}
                        returnRequest={returnReq}
                    />
                )
            }
        </div >
    );
}
