/**
 * Weight Dispute Detail Page
 * 
 * Comprehensive dispute detail view showing:
 * - Weight comparison (declared vs actual vs discrepancy)
 * - Financial impact breakdown
 * - Carrier evidence (scan photos, location)
 * - Seller evidence (photos, documents, notes)
 * - Timeline with visual indicators
 * - Resolution details (if resolved)
 * - Action buttons (Submit Evidence)
 * 
 * Route: /seller/disputes/weight/[id]
 */

'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWeightDispute } from '@/src/core/api/hooks';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { DisputeTimeline, SubmitEvidenceModal } from '@/src/features/disputes';

export default function DisputeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: dispute, isLoading, isError } = useWeightDispute(id);
    const [showEvidenceModal, setShowEvidenceModal] = useState(false);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                        <div className="grid grid-cols-3 gap-6">
                            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !dispute) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <p className="text-red-600 dark:text-red-400">Failed to load dispute details</p>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                            ← Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const shipment = typeof dispute.shipmentId === 'object' ? dispute.shipmentId : null;
    const awb = shipment?.trackingNumber || 'N/A';
    const canSubmitEvidence = dispute.status === 'pending' && !dispute.evidence;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-5xl mx-auto">
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
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {dispute.disputeId}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1 font-mono">
                                AWB: {awb}
                            </p>
                        </div>
                        <StatusBadge status={dispute.status} className="text-base px-4 py-2" />
                    </div>
                </div>

                {/* Weight Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Declared Weight */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Declared Weight
                        </h3>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {dispute.declaredWeight.value}
                            <span className="text-lg text-gray-500 dark:text-gray-400 ml-1">
                                {dispute.declaredWeight.unit}
                            </span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Your declared weight
                        </p>
                    </div>

                    {/* Actual Weight */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Actual Weight (Carrier)
                        </h3>
                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                            {dispute.actualWeight.value}
                            <span className="text-lg text-orange-500 dark:text-orange-500 ml-1">
                                {dispute.actualWeight.unit}
                            </span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Scanned by carrier
                        </p>
                    </div>

                    {/* Discrepancy */}
                    <div className={`rounded-lg shadow p-6 ${dispute.discrepancy.thresholdExceeded
                        ? 'bg-gradient-to-br from-red-600 to-red-700 text-white'
                        : 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white'
                        }`}>
                        <h3 className="text-sm font-medium text-white/80 mb-2">
                            Discrepancy
                        </h3>
                        <p className="text-3xl font-bold">
                            {dispute.discrepancy.percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-white/80 mt-2">
                            {dispute.discrepancy.value.toFixed(2)} kg difference
                        </p>
                        {dispute.discrepancy.thresholdExceeded && (
                            <div className="mt-3 flex items-center gap-1 text-sm">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Exceeds 5% threshold
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Financial Impact */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Financial Impact
                            </h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Original Charge</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(dispute.financialImpact.originalCharge)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Revised Charge</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(dispute.financialImpact.revisedCharge)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                                        {dispute.financialImpact.chargeDirection === 'debit' ? 'You Owe' : 'Refund Due'}
                                    </span>
                                    <span className={`text-base font-bold ${dispute.financialImpact.chargeDirection === 'debit'
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-green-600 dark:text-green-400'
                                        }`}>
                                        {dispute.financialImpact.chargeDirection === 'debit' ? '-' : '+'}
                                        {formatCurrency(dispute.financialImpact.difference)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Carrier Evidence */}
                        {dispute.carrierEvidence && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Carrier Evidence
                                </h2>
                                <div className="space-y-3">
                                    {dispute.carrierEvidence.scanPhoto && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Scan Photo</p>
                                            <img
                                                src={dispute.carrierEvidence.scanPhoto}
                                                alt="Carrier scan"
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                                            />
                                        </div>
                                    )}
                                    {dispute.carrierEvidence.scanLocation && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {dispute.carrierEvidence.scanLocation}
                                            </p>
                                        </div>
                                    )}
                                    {dispute.carrierEvidence.scanTimestamp && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Scan Time</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {formatDate(dispute.carrierEvidence.scanTimestamp)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Seller Evidence */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Your Evidence
                                </h2>
                                {canSubmitEvidence && (
                                    <button
                                        onClick={() => setShowEvidenceModal(true)}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Submit Evidence
                                    </button>
                                )}
                            </div>

                            {dispute.evidence ? (
                                <div className="space-y-4">
                                    {dispute.evidence.sellerPhotos && dispute.evidence.sellerPhotos.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Photos ({dispute.evidence.sellerPhotos.length})
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {dispute.evidence.sellerPhotos.map((photo, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={photo}
                                                        alt={`Evidence ${idx + 1}`}
                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {dispute.evidence.sellerDocuments && dispute.evidence.sellerDocuments.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Documents ({dispute.evidence.sellerDocuments.length})
                                            </p>
                                            <div className="space-y-2">
                                                {dispute.evidence.sellerDocuments.map((doc, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={doc}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                        </svg>
                                                        <span className="text-sm text-gray-900 dark:text-white">Document {idx + 1}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {dispute.evidence.notes && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                                {dispute.evidence.notes}
                                            </p>
                                        </div>
                                    )}
                                    {dispute.evidence.submittedAt && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Submitted on {formatDate(dispute.evidence.submittedAt)}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <svg className="mx-auto w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                                        {canSubmitEvidence
                                            ? 'No evidence submitted yet'
                                            : 'Evidence can only be submitted for pending disputes'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Resolution */}
                        {dispute.resolution && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Resolution
                                </h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Outcome</span>
                                        <StatusBadge status={dispute.resolution.outcome} />
                                    </div>
                                    {dispute.resolution.refundAmount && dispute.resolution.refundAmount > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Refund Amount</span>
                                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                                +{formatCurrency(dispute.resolution.refundAmount)}
                                            </span>
                                        </div>
                                    )}
                                    {dispute.resolution.deductionAmount && dispute.resolution.deductionAmount > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Deduction Amount</span>
                                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                                -{formatCurrency(dispute.resolution.deductionAmount)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution Notes</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                            {dispute.resolution.notes}
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Resolved on {formatDate(dispute.resolution.resolvedAt)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Timeline */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Timeline
                            </h2>
                            <DisputeTimeline timeline={dispute.timeline} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Evidence Submission Modal */}
            <SubmitEvidenceModal
                isOpen={showEvidenceModal}
                onClose={() => setShowEvidenceModal(false)}
                disputeId={dispute._id}
            />
        </div>
    );
}
