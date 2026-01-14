/**
 * Dispute Timeline Component
 * 
 * Visual timeline showing dispute lifecycle:
 * - Detected → Evidence Submitted → Under Review → Resolved
 * - Icons for each stage
 * - Timestamps and actors
 * - Notes/actions
 */

'use client';

import React from 'react';
import { formatDateTime } from '@/src/lib/utils';
import type { TimelineEntry } from '@/src/types/api/dispute.types';

interface DisputeTimelineProps {
    timeline: TimelineEntry[];
}

const getStageIcon = (status: string) => {
    switch (status) {
        case 'pending':
            return (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            );
        case 'under_review':
        case 'seller_response':
            return (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            );
        case 'auto_resolved':
        case 'manual_resolved':
            return (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case 'closed':
            return (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            );
        default:
            return (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
    }
};

const getStageColor = (status: string) => {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
        case 'under_review':
        case 'seller_response':
            return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
        case 'auto_resolved':
        case 'manual_resolved':
            return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
        case 'closed':
            return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
        default:
            return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
};

export function DisputeTimeline({ timeline }: DisputeTimelineProps) {
    if (!timeline || timeline.length === 0) {
        return null;
    }

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {timeline.map((entry, idx) => (
                    <li key={idx}>
                        <div className="relative pb-8">
                            {/* Connector Line */}
                            {idx !== timeline.length - 1 && (
                                <span
                                    className="absolute top-10 left-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                                    aria-hidden="true"
                                />
                            )}

                            <div className="relative flex space-x-3">
                                {/* Icon */}
                                <div>
                                    <span className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${getStageColor(entry.status)}`}>
                                        {getStageIcon(entry.status)}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {entry.action}
                                        </p>
                                        {entry.notes && (
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                {entry.notes}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                            {typeof entry.actor === 'string' ? (
                                                <span className="capitalize">{entry.actor}</span>
                                            ) : (
                                                'User action'
                                            )}
                                        </p>
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                                        {formatDateTime(entry.timestamp)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
