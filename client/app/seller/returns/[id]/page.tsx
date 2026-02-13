'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReturn, useReviewReturn } from '@/src/core/api/hooks';
import { ConfirmationModal } from '@/src/components/ui/ConfirmationModal';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import { showSuccessToast, handleApiError } from '@/src/lib/error';

export default function ReturnDetailPage() {
    const params = useParams();
    const router = useRouter();
    const returnId = params.id as string;

    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);

    const { data: returnReq, isLoading } = useReturn(returnId);
    const reviewReturn = useReviewReturn();

    const canReview =
        !!returnReq &&
        returnReq.status === 'requested' &&
        (returnReq.sellerReview?.status || 'pending') === 'pending';

    const handleApprove = async () => {
        try {
            await reviewReturn.mutateAsync({
                returnId,
                payload: { decision: 'approved' },
            });
            showSuccessToast('Return request approved');
            setShowApproveModal(false);
        } catch (error) {
            handleApiError(error, 'Failed to approve return');
        }
    };

    const handleReject = async (reason?: string) => {
        if (!reason) return;

        try {
            await reviewReturn.mutateAsync({
                returnId,
                payload: { decision: 'rejected', reason },
            });
            showSuccessToast('Return request rejected');
            setShowRejectModal(false);
        } catch (error) {
            handleApiError(error, 'Failed to reject return');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-tertiary)] p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-[var(--bg-secondary)] rounded w-1/4" />
                        <div className="h-64 bg-[var(--bg-secondary)] rounded" />
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
    const reason = returnReq.primaryReason || returnReq.returnReason || 'other';

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-[var(--bg-hover)] rounded-lg" aria-label="Go back">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div>
                            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{returnReq.returnId}</h1>
                            <p className="text-[var(--text-secondary)] mt-1">Order: {order?.orderNumber || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge domain="return" status={returnReq.status} />
                        {returnReq.sellerReview?.status && (
                            <span className="px-2 py-1 text-xs rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)]">
                                Seller Review: {returnReq.sellerReview.status.replace(/_/g, ' ')}
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
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
                                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1 capitalize">{reason.replace(/_/g, ' ')}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Estimated Refund</p>
                                    <p className="text-sm font-semibold text-[var(--success)] mt-1">{formatCurrency(returnReq.estimatedRefund)}</p>
                                </div>
                            </div>
                            {returnReq.customerNotes && (
                                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                                    <p className="text-sm text-[var(--text-secondary)] mb-1">Customer Notes</p>
                                    <p className="text-sm text-[var(--text-primary)]">{returnReq.customerNotes}</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Return Items</h2>
                            <div className="space-y-4">
                                {returnReq.items.map((item, idx) => (
                                    <div key={idx} className="border border-[var(--border-default)] rounded-lg p-4">
                                        <div className="flex justify-between">
                                            <div>
                                                <h3 className="font-medium text-[var(--text-primary)]">{item.productName}</h3>
                                                <p className="text-sm text-[var(--text-secondary)]">SKU: {item.sku || 'N/A'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(item.sellingPrice || 0)}</p>
                                                <p className="text-sm text-[var(--text-secondary)]">Qty: {item.returnQuantity}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {canReview && (
                            <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Seller Review</h2>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => setShowApproveModal(true)}
                                        disabled={reviewReturn.isPending}
                                        className="px-4 py-2 bg-[var(--success)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                                    >
                                        Approve Return
                                    </button>
                                    <button
                                        onClick={() => setShowRejectModal(true)}
                                        disabled={reviewReturn.isPending}
                                        className="px-4 py-2 bg-[var(--error)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                                    >
                                        Reject Return
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Timeline</h3>
                            <div className="space-y-4">
                                {returnReq.timeline.map((event, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-[var(--primary-blue)]" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{event.status.replace(/_/g, ' ')}</p>
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

            <ConfirmationModal
                isOpen={showApproveModal}
                title="Approve Return Request"
                message="Approve this return request for reverse pickup and processing."
                variant="info"
                confirmText="Approve"
                onConfirm={handleApprove}
                onCancel={() => setShowApproveModal(false)}
                isLoading={reviewReturn.isPending}
            />

            <ConfirmationModal
                isOpen={showRejectModal}
                title="Reject Return Request"
                message="Provide a reason for rejecting this return request."
                variant="danger"
                confirmText="Reject"
                requireReason
                reasonLabel="Rejection Reason"
                reasonPlaceholder="Explain why the return is being rejected"
                onConfirm={handleReject}
                onCancel={() => setShowRejectModal(false)}
                isLoading={reviewReturn.isPending}
            />
        </div>
    );
}
