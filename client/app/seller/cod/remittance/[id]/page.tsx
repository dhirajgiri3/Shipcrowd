/**
 * COD Remittance Detail Page
 * 
 * Detailed view of a single remittance batch:
 * - Batch information
 * - Financial summary with deductions
 * - Timeline and status history
 * - Payout information with UTR
 * - List of shipments in batch
 * 
 * Route: /seller/cod/remittance/[id]
 */

'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCODRemittance } from '@/src/core/api/hooks';
import { formatCurrency, formatDate, formatDateTime } from '@/src/lib/utils';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { ShipmentsTable } from '@/src/features/cod';

export default function RemittanceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: remittance, isLoading, isError } = useCODRemittance(id);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-[var(--bg-tertiary)] rounded w-1/3"></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="h-40 bg-[var(--bg-tertiary)] rounded"></div>
                            <div className="h-40 bg-[var(--bg-tertiary)] rounded"></div>
                            <div className="h-40 bg-[var(--bg-tertiary)] rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !remittance) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6">
                        <p className="text-[var(--error)]">Failed to load remittance details</p>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)]"
                        >
                            ← Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Remittances
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                                Batch #{remittance.batch.batchNumber}
                            </h1>
                            <p className="text-[var(--text-secondary)] mt-1">
                                {remittance.remittanceId}
                            </p>
                        </div>
                        <StatusBadge domain="remittance" status={remittance.status} className="text-base px-4 py-2" />
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    {/* Total COD Collected */}
                    <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                            COD Collected
                        </h3>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                            {formatCurrency(remittance.batch.totalCODCollected)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            {remittance.batch.shipmentsCount} shipments
                        </p>
                    </div>

                    {/* Total Deductions */}
                    <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Total Deductions
                        </h3>
                        <p className="text-2xl font-bold text-[var(--error)]">
                            -{formatCurrency(remittance.deductions.total)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            See breakdown below
                        </p>
                    </div>

                    {/* Net Payable */}
                    <div className="bg-gradient-to-br from-[var(--success)] to-[var(--success-hover)] rounded-lg shadow p-6 text-white">
                        <h3 className="text-sm font-medium text-white/90 mb-2">
                            Net Payable
                        </h3>
                        <p className="text-2xl font-bold">
                            {formatCurrency(remittance.finalPayable)}
                        </p>
                        <p className="text-xs text-white/80 mt-1">
                            After all deductions
                        </p>
                    </div>

                    {/* Payout Status */}
                    <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Payout Status
                        </h3>
                        {remittance.payout ? (
                            <>
                                <StatusBadge domain="remittance" status={remittance.payout.status} className="mb-2" />
                                {remittance.payout.utr && (
                                    <p className="text-xs font-mono text-[var(--text-primary)] mt-2">
                                        UTR: {remittance.payout.utr}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-[var(--text-muted)]">Not initiated</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Deduction Breakdown */}
                        <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                                Deduction Breakdown
                            </h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b border-[var(--border-default)]">
                                    <span className="text-sm text-[var(--text-secondary)]">Shipping Cost</span>
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                        {formatCurrency(remittance.batch.totalShippingCost)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-[var(--border-default)]">
                                    <span className="text-sm text-[var(--text-secondary)]">COD Handling Charges</span>
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                        {formatCurrency(remittance.deductions.codHandlingCharges)}
                                    </span>
                                </div>
                                {remittance.deductions.rtoCharges > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-[var(--border-default)]">
                                        <span className="text-sm text-[var(--text-secondary)]">RTO Charges</span>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {formatCurrency(remittance.deductions.rtoCharges)}
                                        </span>
                                    </div>
                                )}
                                {remittance.deductions.weightDiscrepancyCharges > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-[var(--border-default)]">
                                        <span className="text-sm text-[var(--text-secondary)]">Weight Discrepancy</span>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {formatCurrency(remittance.deductions.weightDiscrepancyCharges)}
                                        </span>
                                    </div>
                                )}
                                {remittance.deductions.tds > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-[var(--border-default)]">
                                        <span className="text-sm text-[var(--text-secondary)]">TDS</span>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {formatCurrency(remittance.deductions.tds)}
                                        </span>
                                    </div>
                                )}
                                {remittance.deductions.otherCharges > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-[var(--border-default)]">
                                        <span className="text-sm text-[var(--text-secondary)]">Other Charges</span>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {formatCurrency(remittance.deductions.otherCharges)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-base font-semibold text-[var(--text-primary)]">Total Deductions</span>
                                    <span className="text-base font-bold text-[var(--error)]">
                                        {formatCurrency(remittance.deductions.total)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bank Account Info */}
                        <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                                Bank Account Details
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">Account Holder</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                        {remittance.bankAccount.accountHolderName}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">Bank Name</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                        {remittance.bankAccount.bankName}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">Account Number</p>
                                    <p className="text-sm font-mono font-medium text-[var(--text-primary)]">
                                        ****{remittance.bankAccount.accountNumber.slice(-4)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">IFSC Code</p>
                                    <p className="text-sm font-mono font-medium text-[var(--text-primary)]">
                                        {remittance.bankAccount.ifsc}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Timeline */}
                    <div className="lg:col-span-1">
                        <div className="bg-[var(--bg-primary)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                                Timeline
                            </h2>
                            <div className="space-y-4">
                                {/* Batch Created */}
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                            <svg className="w-4 h-4 text-[var(--primary-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-[var(--text-primary)]">Batch Created</p>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {formatDateTime(remittance.timeline.batchCreated)}
                                        </p>
                                    </div>
                                </div>

                                {/* Approved */}
                                {remittance.timeline.approvedAt && (
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-[var(--success-bg)] flex items-center justify-center">
                                                <svg className="w-4 h-4 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">Approved</p>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {formatDateTime(remittance.timeline.approvedAt)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Payout Initiated */}
                                {remittance.timeline.payoutInitiatedAt && (
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-[var(--warning-soft)] flex items-center justify-center">
                                                <svg className="w-4 h-4 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">Payout Initiated</p>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {formatDateTime(remittance.timeline.payoutInitiatedAt)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Completed */}
                                {remittance.timeline.completedAt && (
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-[var(--success-bg)] flex items-center justify-center">
                                                <svg className="w-4 h-4 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">Completed</p>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {formatDateTime(remittance.timeline.completedAt)}
                                            </p>
                                            {remittance.payout?.utr && (
                                                <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
                                                    UTR: {remittance.payout.utr}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Cancelled */}
                                {remittance.timeline.cancelledAt && (
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-[var(--error-bg)] flex items-center justify-center">
                                                <svg className="w-4 h-4 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">Cancelled</p>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {formatDateTime(remittance.timeline.cancelledAt)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Approval Notes */}
                            {remittance.approvalNotes && (
                                <div className="mt-6 pt-6 border-t border-[var(--border-default)]">
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                                        Approval Notes
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {remittance.approvalNotes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Shipments Table - Full Width */}
                <div className="mt-6">
                    <ShipmentsTable shipments={remittance.shipments} />
                </div>
            </div>
        </div>
    );
}
