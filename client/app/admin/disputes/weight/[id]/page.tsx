/**
 * Admin Dispute Review Page
 * 
 * Comprehensive admin view for reviewing and resolving disputes:
 * - Side-by-side evidence comparison
 * - Weight discrepancy analysis
 * - Financial impact
 * - Resolution actions (4 outcomes)
 * - Quick resolution buttons
 * 
 * Route: /admin/disputes/weight/[id]
 */

'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWeightDispute, useResolveDispute } from '@/src/core/api/hooks';
import { formatCurrency, formatDate, formatDateTime } from '@/src/lib/utils';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { Button } from '@/src/components/ui/core/Button';
import { DisputeTimeline } from '@/src/features/disputes';
import type { ResolutionOutcome } from '@/src/types/api/returns';

const RESOLUTION_OUTCOMES = [
    {
        value: 'seller_favor' as ResolutionOutcome,
        label: 'Seller Favor',
        description: 'Accept seller evidence, refund the difference',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
        icon: '✓'
    },
    {
        value: 'Shipcrowd_favor' as ResolutionOutcome,
        label: 'Shipcrowd Favor',
        description: 'Carrier weight is accurate, deduct from seller wallet',
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
        icon: '×'
    },
    {
        value: 'split' as ResolutionOutcome,
        label: 'Split',
        description: 'Partial adjustment for both parties',
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
        icon: '÷'
    },
    {
        value: 'waived' as ResolutionOutcome,
        label: 'Waived',
        description: 'No financial adjustment, dispute closed',
        color: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
        icon: '○'
    },
];

const REASON_CODES = [
    'SELLER_PROVIDED_VALID_PROOF',
    'CARRIER_SCAN_ERROR',
    'PACKAGING_ERROR',
    'DIMENSION_VS_WEIGHT_MISMATCH',
    'SCALE_CALIBRATION_ISSUE',
    'INSUFFICIENT_EVIDENCE',
    'SELLER_DID_NOT_RESPOND',
    'GOODWILL_WAIVER',
    'TECHNICAL_ERROR',
    'OTHER',
];

export default function AdminDisputeReviewPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: dispute, isLoading, isError } = useWeightDispute(id);
    const resolveDispute = useResolveDispute();

    const [selectedOutcome, setSelectedOutcome] = useState<ResolutionOutcome | null>(null);
    const [reasonCode, setReasonCode] = useState('');
    const [notes, setNotes] = useState('');
    const [refundAmount, setRefundAmount] = useState('');
    const [deductionAmount, setDeductionAmount] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-10 bg-[var(--bg-tertiary)] rounded w-1/3"></div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="h-96 bg-[var(--bg-tertiary)] rounded"></div>
                            <div className="h-96 bg-[var(--bg-tertiary)] rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !dispute) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6">
                        <p className="text-[var(--error)]">Failed to load dispute</p>
                        <Button variant="outline" onClick={() => router.back()} className="mt-4">← Back</Button>
                    </div>
                </div>
            </div>
        );
    }

    const shipment = typeof dispute.shipmentId === 'object' ? dispute.shipmentId : null;
    const isResolved = ['auto_resolved', 'manual_resolved', 'closed'].includes(dispute.status);

    const handleResolve = async () => {
        if (!selectedOutcome || !reasonCode || !notes) return;

        try {
            await resolveDispute.mutateAsync({
                disputeId: id,
                resolution: {
                    outcome: selectedOutcome,
                    reasonCode,
                    notes,
                    refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
                    deductionAmount: deductionAmount ? parseFloat(deductionAmount) : undefined,
                },
            });
            router.push('/admin/disputes/weight');
        } catch (error) {
            console.error('Failed to resolve dispute:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
            <div className="max-w-7xl mx-auto">
                <PageHeader
                    title={dispute.disputeId}
                    breadcrumbs={[
                        { label: 'Admin', href: '/admin' },
                        { label: 'Disputes', href: '/admin/disputes/weight' },
                        { label: dispute.disputeId, active: true },
                    ]}
                    backUrl="/admin/disputes/weight"
                    description={`AWB: ${shipment?.trackingNumber || 'N/A'} | Detected: ${formatDate(dispute.detectedAt)}`}
                    actions={
                        !isResolved && (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedOutcome('seller_favor');
                                        setReasonCode('SELLER_PROVIDED_VALID_PROOF');
                                        setRefundAmount(dispute.financialImpact.difference.toString());
                                    }}
                                    className="border-[var(--success)]/50 text-[var(--success)] hover:bg-[var(--success-bg)]"
                                >
                                    Quick: Seller Favor
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedOutcome('Shipcrowd_favor');
                                        setReasonCode('INSUFFICIENT_EVIDENCE');
                                        setDeductionAmount(dispute.financialImpact.difference.toString());
                                    }}
                                    className="border-[var(--error)]/50 text-[var(--error)] hover:bg-[var(--error-bg)]"
                                >
                                    Quick: Shipcrowd Favor
                                </Button>
                            </div>
                        )
                    }
                />

                <div className="flex items-center gap-3 mb-6">
                    <StatusBadge domain="dispute" status={dispute.status} className="text-base" />
                </div>

                {/* Quick Stats Bar */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                    <div className="bg-[var(--bg-primary)] rounded-lg shadow p-4 text-center">
                        <p className="text-sm text-[var(--text-muted)]">Declared</p>
                        <p className="text-xl font-bold text-[var(--text-primary)]">{dispute.declaredWeight.value} {dispute.declaredWeight.unit}</p>
                    </div>
                    <div className="bg-[var(--bg-primary)] rounded-lg shadow p-4 text-center">
                        <p className="text-sm text-[var(--text-muted)]">Actual</p>
                        <p className="text-xl font-bold text-[var(--warning)]">{dispute.actualWeight.value} {dispute.actualWeight.unit}</p>
                    </div>
                    <div className="bg-[var(--bg-primary)] rounded-lg shadow p-4 text-center">
                        <p className="text-sm text-[var(--text-muted)]">Discrepancy</p>
                        <p className={`text-xl font-bold ${dispute.discrepancy.thresholdExceeded ? 'text-[var(--error)]' : 'text-[var(--warning)]'}`}>
                            {dispute.discrepancy.percentage.toFixed(1)}%
                        </p>
                    </div>
                    <div className="bg-[var(--bg-primary)] rounded-lg shadow p-4 text-center">
                        <p className="text-sm text-[var(--text-muted)]">Impact</p>
                        <p className={`text-xl font-bold ${dispute.financialImpact.chargeDirection === 'debit' ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                            {formatCurrency(dispute.financialImpact.difference)}
                        </p>
                    </div>
                    <div className="bg-[var(--bg-primary)] rounded-lg shadow p-4 text-center">
                        <p className="text-sm text-[var(--text-muted)]">Carrier</p>
                        <p className="text-xl font-bold text-[var(--text-primary)]">{shipment?.carrier || 'N/A'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Evidence Comparison */}
                    <div className="space-y-6">
                        {/* Carrier Evidence */}
                        <div className="bg-[var(--bg-primary)] rounded-lg shadow">
                            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Carrier Evidence</h2>
                                <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-1 rounded">
                                    {dispute.detectedBy}
                                </span>
                            </div>
                            <div className="p-4">
                                {dispute.carrierEvidence?.scanPhoto ? (
                                    <img
                                        src={dispute.carrierEvidence.scanPhoto}
                                        alt="Carrier scan"
                                        className="w-full rounded-lg mb-4"
                                    />
                                ) : (
                                    <div className="bg-[var(--bg-secondary)] rounded-lg p-8 text-center mb-4">
                                        <svg className="w-12 h-12 text-[var(--text-muted)] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-sm text-[var(--text-muted)] mt-2">No scan photo available</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-[var(--text-muted)]">Location</p>
                                        <p className="font-medium text-[var(--text-primary)]">{dispute.carrierEvidence?.scanLocation || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[var(--text-muted)]">Scan Time</p>
                                        <p className="font-medium text-[var(--text-primary)]">{dispute.carrierEvidence?.scanTimestamp ? formatDateTime(dispute.carrierEvidence.scanTimestamp) : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Seller Evidence */}
                        <div className="bg-[var(--bg-primary)] rounded-lg shadow">
                            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Seller Evidence</h2>
                                {dispute.evidence?.submittedAt && (
                                    <span className="text-xs text-[var(--text-muted)]">
                                        Submitted: {formatDateTime(dispute.evidence.submittedAt)}
                                    </span>
                                )}
                            </div>
                            <div className="p-4">
                                {dispute.evidence ? (
                                    <div className="space-y-4">
                                        {dispute.evidence.sellerPhotos && dispute.evidence.sellerPhotos.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Photos ({dispute.evidence.sellerPhotos.length})</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {dispute.evidence.sellerPhotos.map((photo, idx) => (
                                                        <img key={idx} src={photo} alt={`Evidence ${idx + 1}`} className="w-full rounded-lg" />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {dispute.evidence.sellerDocuments && dispute.evidence.sellerDocuments.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Documents</p>
                                                <div className="space-y-2">
                                                    {dispute.evidence.sellerDocuments.map((doc, idx) => (
                                                        <a key={idx} href={doc} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded hover:bg-[var(--bg-tertiary)]">
                                                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                                            </svg>
                                                            <span className="text-sm text-[var(--text-primary)]">Document {idx + 1}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {dispute.evidence.notes && (
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Seller Notes</p>
                                                <p className="text-sm text-[var(--text-muted)] p-3 bg-[var(--bg-secondary)] rounded italic">
                                                    "{dispute.evidence.notes}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <svg className="w-12 h-12 text-[var(--text-muted)] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm text-[var(--text-muted)] mt-2">No evidence submitted by seller</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-[var(--bg-primary)] rounded-lg shadow p-4">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Timeline</h2>
                            <DisputeTimeline timeline={dispute.timeline} />
                        </div>
                    </div>

                    {/* Right: Resolution Panel */}
                    <div className="space-y-6">
                        {!isResolved ? (
                            <>
                                {/* Resolution Form */}
                                <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6">
                                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Resolution</h2>

                                    {/* Outcome Selection */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Outcome</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {RESOLUTION_OUTCOMES.map((outcome) => (
                                                <button
                                                    key={outcome.value}
                                                    onClick={() => setSelectedOutcome(outcome.value)}
                                                    className={`p-3 rounded-lg border-2 text-left transition-all ${selectedOutcome === outcome.value
                                                        ? `${outcome.color} border-current`
                                                        : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">{outcome.icon}</span>
                                                        <span className="font-medium">{outcome.label}</span>
                                                    </div>
                                                    <p className="text-xs mt-1 opacity-75">{outcome.description}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Amount Fields */}
                                    {selectedOutcome && (
                                        <div className="mb-6 grid grid-cols-2 gap-4">
                                            {(selectedOutcome === 'seller_favor' || selectedOutcome === 'split') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Refund Amount</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                                        <input
                                                            type="number"
                                                            value={refundAmount}
                                                            onChange={(e) => setRefundAmount(e.target.value)}
                                                            className="w-full pl-8 pr-4 py-2 border border-[var(--border-subtle)] rounded-lg bg-white dark:bg-gray-700 text-[var(--text-primary)]"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {(selectedOutcome === 'Shipcrowd_favor' || selectedOutcome === 'split') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Deduction Amount</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                                        <input
                                                            type="number"
                                                            value={deductionAmount}
                                                            onChange={(e) => setDeductionAmount(e.target.value)}
                                                            className="w-full pl-8 pr-4 py-2 border border-[var(--border-subtle)] rounded-lg bg-white dark:bg-gray-700 text-[var(--text-primary)]"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Reason Code */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Reason Code</label>
                                        <select
                                            value={reasonCode}
                                            onChange={(e) => setReasonCode(e.target.value)}
                                            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg bg-white dark:bg-gray-700 text-[var(--text-primary)]"
                                        >
                                            <option value="">Select reason...</option>
                                            {REASON_CODES.map((code) => (
                                                <option key={code} value={code}>{code.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Notes */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Resolution Notes</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg bg-white dark:bg-gray-700 text-[var(--text-primary)]"
                                            placeholder="Explain the resolution decision..."
                                        />
                                    </div>

                                    {/* Submit */}
                                    <Button
                                        variant="primary"
                                        className="w-full"
                                        onClick={handleResolve}
                                        disabled={!selectedOutcome || !reasonCode || !notes || resolveDispute.isPending}
                                        isLoading={resolveDispute.isPending}
                                    >
                                        {resolveDispute.isPending ? 'Resolving...' : 'Resolve Dispute'}
                                    </Button>
                                </div>

                                {/* Financial Summary */}
                                <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Financial Summary</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">Original Charge</span>
                                            <span className="font-medium text-[var(--text-primary)]">{formatCurrency(dispute.financialImpact.originalCharge)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">Revised Charge</span>
                                            <span className="font-medium text-[var(--text-primary)]">{formatCurrency(dispute.financialImpact.revisedCharge)}</span>
                                        </div>
                                        <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-between">
                                            <span className="font-semibold text-[var(--text-primary)]">Difference</span>
                                            <span className={`font-bold ${dispute.financialImpact.chargeDirection === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                                                {formatCurrency(dispute.financialImpact.difference)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Already Resolved */
                            <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Resolution Details</h2>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[var(--text-muted)]">Outcome</span>
                                        <StatusBadge domain="dispute" status={dispute.resolution?.outcome || 'unknown'} />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[var(--text-muted)]">Resolved By</span>
                                        <span className="font-medium text-[var(--text-primary)] capitalize">{dispute.resolution?.resolvedBy}</span>
                                    </div>
                                    {dispute.resolution?.refundAmount && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[var(--text-muted)]">Refund</span>
                                            <span className="font-medium text-green-600">+{formatCurrency(dispute.resolution.refundAmount)}</span>
                                        </div>
                                    )}
                                    {dispute.resolution?.deductionAmount && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[var(--text-muted)]">Deduction</span>
                                            <span className="font-medium text-red-600">-{formatCurrency(dispute.resolution.deductionAmount)}</span>
                                        </div>
                                    )}
                                    <div className="pt-4 border-t border-[var(--border-subtle)]">
                                        <p className="text-sm text-[var(--text-muted)] mb-2">Notes</p>
                                        <p className="text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] p-3 rounded">{dispute.resolution?.notes}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
