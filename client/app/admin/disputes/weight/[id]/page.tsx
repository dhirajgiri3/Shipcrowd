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
import { StatusBadge } from '@/src/components/shared/StatusBadge';
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
        value: 'shipcrowd_favor' as ResolutionOutcome,
        label: 'ShipCrowd Favor',
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
        color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
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
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !dispute) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <p className="text-red-600 dark:text-red-400">Failed to load dispute</p>
                        <button onClick={() => router.back()} className="mt-4 text-primary-600">← Back</button>
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Disputes
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {dispute.disputeId}
                                </h1>
                                <StatusBadge status={dispute.status} className="text-base" />
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mt-1 font-mono">
                                AWB: {shipment?.trackingNumber || 'N/A'} | Detected: {formatDate(dispute.detectedAt)}
                            </p>
                        </div>
                        {!isResolved && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedOutcome('seller_favor');
                                        setReasonCode('SELLER_PROVIDED_VALID_PROOF');
                                        setRefundAmount(dispute.financialImpact.difference.toString());
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                    Quick: Seller Favor
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedOutcome('shipcrowd_favor');
                                        setReasonCode('INSUFFICIENT_EVIDENCE');
                                        setDeductionAmount(dispute.financialImpact.difference.toString());
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                >
                                    Quick: ShipCrowd Favor
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Declared</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{dispute.declaredWeight.value} {dispute.declaredWeight.unit}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Actual</p>
                        <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{dispute.actualWeight.value} {dispute.actualWeight.unit}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Discrepancy</p>
                        <p className={`text-xl font-bold ${dispute.discrepancy.thresholdExceeded ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                            {dispute.discrepancy.percentage.toFixed(1)}%
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Impact</p>
                        <p className={`text-xl font-bold ${dispute.financialImpact.chargeDirection === 'debit' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {formatCurrency(dispute.financialImpact.difference)}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Carrier</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{shipment?.carrier || 'N/A'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Evidence Comparison */}
                    <div className="space-y-6">
                        {/* Carrier Evidence */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Carrier Evidence</h2>
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
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
                                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center mb-4">
                                        <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No scan photo available</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400">Location</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{dispute.carrierEvidence?.scanLocation || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400">Scan Time</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{dispute.carrierEvidence?.scanTimestamp ? formatDateTime(dispute.carrierEvidence.scanTimestamp) : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Seller Evidence */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Seller Evidence</h2>
                                {dispute.evidence?.submittedAt && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Submitted: {formatDateTime(dispute.evidence.submittedAt)}
                                    </span>
                                )}
                            </div>
                            <div className="p-4">
                                {dispute.evidence ? (
                                    <div className="space-y-4">
                                        {dispute.evidence.sellerPhotos && dispute.evidence.sellerPhotos.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photos ({dispute.evidence.sellerPhotos.length})</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {dispute.evidence.sellerPhotos.map((photo, idx) => (
                                                        <img key={idx} src={photo} alt={`Evidence ${idx + 1}`} className="w-full rounded-lg" />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {dispute.evidence.sellerDocuments && dispute.evidence.sellerDocuments.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Documents</p>
                                                <div className="space-y-2">
                                                    {dispute.evidence.sellerDocuments.map((doc, idx) => (
                                                        <a key={idx} href={doc} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
                                                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                                            </svg>
                                                            <span className="text-sm text-gray-900 dark:text-white">Document {idx + 1}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {dispute.evidence.notes && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seller Notes</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700 rounded italic">
                                                    "{dispute.evidence.notes}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No evidence submitted by seller</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timeline</h2>
                            <DisputeTimeline timeline={dispute.timeline} />
                        </div>
                    </div>

                    {/* Right: Resolution Panel */}
                    <div className="space-y-6">
                        {!isResolved ? (
                            <>
                                {/* Resolution Form */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resolution</h2>

                                    {/* Outcome Selection */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Outcome</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {RESOLUTION_OUTCOMES.map((outcome) => (
                                                <button
                                                    key={outcome.value}
                                                    onClick={() => setSelectedOutcome(outcome.value)}
                                                    className={`p-3 rounded-lg border-2 text-left transition-all ${selectedOutcome === outcome.value
                                                            ? `${outcome.color} border-current`
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Refund Amount</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                                        <input
                                                            type="number"
                                                            value={refundAmount}
                                                            onChange={(e) => setRefundAmount(e.target.value)}
                                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {(selectedOutcome === 'shipcrowd_favor' || selectedOutcome === 'split') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Deduction Amount</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                                        <input
                                                            type="number"
                                                            value={deductionAmount}
                                                            onChange={(e) => setDeductionAmount(e.target.value)}
                                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Reason Code */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason Code</label>
                                        <select
                                            value={reasonCode}
                                            onChange={(e) => setReasonCode(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="">Select reason...</option>
                                            {REASON_CODES.map((code) => (
                                                <option key={code} value={code}>{code.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Notes */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resolution Notes</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Explain the resolution decision..."
                                        />
                                    </div>

                                    {/* Submit */}
                                    <button
                                        onClick={handleResolve}
                                        disabled={!selectedOutcome || !reasonCode || !notes || resolveDispute.isPending}
                                        className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                    >
                                        {resolveDispute.isPending ? 'Resolving...' : 'Resolve Dispute'}
                                    </button>
                                </div>

                                {/* Financial Summary */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Summary</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Original Charge</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(dispute.financialImpact.originalCharge)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Revised Charge</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(dispute.financialImpact.revisedCharge)}</span>
                                        </div>
                                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                                            <span className="font-semibold text-gray-900 dark:text-white">Difference</span>
                                            <span className={`font-bold ${dispute.financialImpact.chargeDirection === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                                                {formatCurrency(dispute.financialImpact.difference)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Already Resolved */
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resolution Details</h2>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 dark:text-gray-400">Outcome</span>
                                        <StatusBadge status={dispute.resolution?.outcome || 'unknown'} />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 dark:text-gray-400">Resolved By</span>
                                        <span className="font-medium text-gray-900 dark:text-white capitalize">{dispute.resolution?.resolvedBy}</span>
                                    </div>
                                    {dispute.resolution?.refundAmount && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 dark:text-gray-400">Refund</span>
                                            <span className="font-medium text-green-600">+{formatCurrency(dispute.resolution.refundAmount)}</span>
                                        </div>
                                    )}
                                    {dispute.resolution?.deductionAmount && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 dark:text-gray-400">Deduction</span>
                                            <span className="font-medium text-red-600">-{formatCurrency(dispute.resolution.deductionAmount)}</span>
                                        </div>
                                    )}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Notes</p>
                                        <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded">{dispute.resolution?.notes}</p>
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
