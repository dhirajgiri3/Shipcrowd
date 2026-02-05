'use client';

import type { RTOEventDetail } from '@/src/types/api/rto.types';
import { RTO_STATUS_LABELS } from '@/src/types/api/rto.types';

function formatDateTime(val: string | undefined): string {
    if (!val) return '—';
    try {
        return new Date(val).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '—';
    }
}

interface RTOTimelineProps {
    rto: RTOEventDetail;
}

export function RTOTimeline({ rto }: RTOTimelineProps) {
    const steps: { status: string; label: string; timestamp: string | undefined; done: boolean }[] = [
        {
            status: 'initiated',
            label: 'RTO Initiated',
            timestamp: rto.triggeredAt,
            done: true,
        },
        {
            status: 'in_transit',
            label: 'In Transit (Reverse)',
            timestamp: rto.returnStatus !== 'initiated' ? rto.updatedAt : undefined,
            done: !['initiated'].includes(rto.returnStatus),
        },
        {
            status: 'delivered_to_warehouse',
            label: 'Delivered to Warehouse',
            timestamp: rto.actualReturnDate,
            done: ['delivered_to_warehouse', 'qc_pending', 'qc_completed', 'restocked', 'disposed'].includes(rto.returnStatus),
        },
        {
            status: 'qc_pending',
            label: 'QC Pending',
            timestamp: undefined,
            done: ['qc_pending', 'qc_completed', 'restocked', 'disposed'].includes(rto.returnStatus),
        },
        {
            status: 'qc_completed',
            label: 'QC Completed',
            timestamp: rto.qcResult?.inspectedAt,
            done: ['qc_completed', 'restocked', 'disposed'].includes(rto.returnStatus),
        },
        {
            status: 'restocked',
            label: 'Disposition (Restock / Refurb / Dispose / Claim)',
            timestamp: ['restocked', 'disposed', 'refurbishing', 'claim_filed'].includes(rto.returnStatus) ? rto.updatedAt : undefined,
            done: ['restocked', 'disposed', 'refurbishing', 'claim_filed'].includes(rto.returnStatus),
        },
    ];

    const currentIndex = steps.findIndex((s) => s.status === rto.returnStatus);
    const displaySteps = steps.map((step, idx) => ({
        ...step,
        isCurrent: step.status === rto.returnStatus,
        isPast: currentIndex >= 0 && idx < currentIndex,
    }));

    return (
        <div className="space-y-0">
            {displaySteps.map((step, idx) => (
                <div key={step.status} className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-3 h-3 rounded-full shrink-0 ${
                                step.done ? 'bg-[var(--success)]' : step.isCurrent ? 'bg-[var(--primary-blue)]' : 'bg-[var(--border-default)]'
                            }`}
                        />
                        {idx < displaySteps.length - 1 && (
                            <div
                                className={`w-0.5 flex-1 min-h-[24px] ${step.done ? 'bg-[var(--success)]' : 'bg-[var(--border-subtle)]'}`}
                            />
                        )}
                    </div>
                    <div className="pb-6">
                        <p className="font-medium text-[var(--text-primary)]">{step.label}</p>
                        {step.timestamp && (
                            <p className="text-sm text-[var(--text-muted)]">{formatDateTime(step.timestamp)}</p>
                        )}
                        {step.isCurrent && step.status === 'qc_completed' && rto.qcResult && (
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                Result: {rto.qcResult.passed ? 'Passed' : 'Failed'}
                                {rto.qcResult.remarks && ` — ${rto.qcResult.remarks}`}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
