/**
 * NDR Case Detail Page
 * 
 * Complete view of a single NDR case with:
 * - Case information and status
 * - Delivery attempts history
 * - Quick action buttons
 * - Communication history
 * - Timeline
 * - Address details
 * 
 * Route: /seller/ndr/[id]
 */

'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useNDRCase, useEscalateNDR } from '@/src/core/api/hooks';
import { TakeActionModal } from '@/src/features/ndr/components/TakeActionModal';
import { CommunicationHistory } from '@/src/features/ndr/components/CommunicationHistory';
import { NDRTimeline } from '@/src/features/ndr/components/NDRTimeline';
import { formatDate } from '@/src/lib/utils';
import type { NDRAction } from '@/src/types/api/orders';

const STATUS_COLORS = {
    open: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    detected: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    in_progress: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    in_resolution: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    customer_action: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    reattempt_scheduled: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    resolved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    escalated: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    converted_to_rto: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    rto_triggered: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const QUICK_ACTIONS: { action: NDRAction; label: string; icon: string; color: string }[] = [
    { action: 'reattempt_delivery', label: 'Reattempt', icon: '🔄', color: 'bg-blue-600 hover:bg-blue-700' },
    { action: 'address_correction', label: 'Correct Address', icon: '📍', color: 'bg-purple-600 hover:bg-purple-700' },
    { action: 'reschedule_delivery', label: 'Reschedule', icon: '📅', color: 'bg-indigo-600 hover:bg-indigo-700' },
    { action: 'contact_customer', label: 'Contact Customer', icon: '📞', color: 'bg-yellow-600 hover:bg-yellow-700' },
];

export default function NDRDetailPage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.id as string;

    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedAction, setSelectedAction] = useState<NDRAction | undefined>();

    const { data: ndrCase, isLoading } = useNDRCase(caseId);
    const escalate = useEscalateNDR();

    const handleQuickAction = (action: NDRAction) => {
        setSelectedAction(action);
        setShowActionModal(true);
    };

    const handleEscalate = async () => {
        const reason = prompt('Please provide escalation reason:');
        if (reason) {
            await escalate.mutateAsync({ caseId, reason });
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

    if (!ndrCase) {
        return (
            <div className="min-h-screen bg-[var(--bg-tertiary)] p-6">
                <div className="max-w-7xl mx-auto text-center">
                    <p className="text-[var(--text-muted)]">NDR case not found</p>
                </div>
            </div>
        );
    }

    const shipment = typeof ndrCase.shipmentId === 'object' ? ndrCase.shipmentId : null;
    const order = typeof ndrCase.orderId === 'object' ? ndrCase.orderId : null;
    const isResolved = ndrCase.status === 'resolved' || ndrCase.status === 'converted_to_rto';

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                                {ndrCase.ndrId}
                            </h1>
                            <p className="text-[var(--text-secondary)] mt-1">
                                AWB: {shipment?.trackingNumber || 'N/A'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-lg text-sm font-medium ${STATUS_COLORS[ndrCase.status]}`}>
                            {ndrCase.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {ndrCase.slaBreach && (
                            <span className="px-4 py-2 bg-[var(--error-bg)] text-[var(--error)] rounded-lg text-sm font-medium flex items-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                SLA BREACH
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Case Information */}
                        <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Case Information</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Customer Name</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
                                        {ndrCase.customerName}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Customer Phone</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
                                        {ndrCase.customerPhone}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Primary Reason</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1 capitalize">
                                        {ndrCase.primaryReason.replace(/_/g, ' ')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Days Since Reported</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
                                        {ndrCase.daysSinceReported} days
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Carrier</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
                                        {shipment?.carrier || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Payment Method</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
                                        {order?.paymentMethod || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Delivery Address */}
                            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                                <p className="text-sm text-[var(--text-secondary)] mb-2">Delivery Address</p>
                                <p className="text-sm text-[var(--text-primary)]">
                                    {ndrCase.deliveryAddress}
                                </p>
                            </div>

                            {/* Address Correction if exists */}
                            {ndrCase.addressCorrection && (
                                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                                Address Corrected
                                            </p>
                                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                                {ndrCase.addressCorrection.correctedAddress.addressLine1}, {ndrCase.addressCorrection.correctedAddress.city}, {ndrCase.addressCorrection.correctedAddress.state} - {ndrCase.addressCorrection.correctedAddress.pincode}
                                            </p>
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                Corrected by {ndrCase.addressCorrection.correctedBy} on {formatDate(ndrCase.addressCorrection.correctedAt)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        {!isResolved && (
                            <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {QUICK_ACTIONS.map((qa) => (
                                        <button
                                            key={qa.action}
                                            onClick={() => handleQuickAction(qa.action)}
                                            className={`px-4 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 ${qa.color}`}
                                        >
                                            <span className="text-xl">{qa.icon}</span>
                                            {qa.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-3 flex gap-3">
                                    <button
                                        onClick={() => setShowActionModal(true)}
                                        className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)]"
                                    >
                                        More Actions
                                    </button>
                                    <button
                                        onClick={handleEscalate}
                                        className="px-4 py-2 border-2 border-[var(--warning)] text-[var(--warning)] rounded-lg hover:bg-[var(--warning-bg)]"
                                        disabled={escalate.isPending}
                                    >
                                        Escalate to Admin
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Communication History */}
                        <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                                Communication History
                            </h2>
                            <CommunicationHistory communications={ndrCase.communications} />
                        </div>

                        {/* Resolution Details */}
                        {ndrCase.resolution && (
                            <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                                    Resolution Details
                                </h2>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary)]">Action Taken</p>
                                        <p className="text-sm font-medium text-[var(--text-primary)] mt-1 capitalize">
                                            {ndrCase.resolution.action.replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary)]">Outcome</p>
                                        <p className="text-sm font-medium text-[var(--text-primary)] mt-1 capitalize">
                                            {ndrCase.resolution.outcome}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary)]">Resolved By</p>
                                        <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
                                            {ndrCase.resolution.resolvedBy}
                                        </p>
                                    </div>
                                    {ndrCase.resolution.notes && (
                                        <div>
                                            <p className="text-sm text-[var(--text-secondary)]">Notes</p>
                                            <p className="text-sm text-[var(--text-primary)] mt-1">
                                                {ndrCase.resolution.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Attempt Summary */}
                        <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                                Delivery Attempts
                            </h3>
                            <div className="text-center">
                                <p className="text-4xl font-bold text-[var(--primary-blue)]">
                                    {ndrCase.allAttempts.length}
                                </p>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">Total Attempts</p>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-[var(--bg-elevated)] rounded-lg shadow p-6 border border-[var(--border-default)]">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                                Timeline
                            </h3>
                            <NDRTimeline
                                attempts={ndrCase.allAttempts}
                                actions={ndrCase.resolutionActions || ndrCase.automatedActions}
                                communications={ndrCase.communications}
                                magicLinkClicked={ndrCase.magicLinkClicked}
                                magicLinkClickedAt={ndrCase.magicLinkClickedAt}
                                createdAt={ndrCase.createdAt}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Modal */}
            <TakeActionModal
                caseId={caseId}
                isOpen={showActionModal}
                onClose={() => {
                    setShowActionModal(false);
                    setSelectedAction(undefined);
                }}
                defaultAction={selectedAction}
            />
        </div>
    );
}
