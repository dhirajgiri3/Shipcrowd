/**
 * NDR Timeline Component
 * 
 * Visual timeline of NDR case lifecycle:
 * - All delivery attempts
 * - Actions taken
 * - Communications sent
 * - Status changes
 */

'use client';

import type { NDRAttempt, AutomatedAction } from '@/src/types/api/orders';
import { formatDate } from '@/src/lib/utils';

interface NDRTimelineProps {
    attempts: NDRAttempt[];
    actions: AutomatedAction[];
    createdAt: string;
}

export function NDRTimeline({ attempts, actions, createdAt }: NDRTimelineProps) {
    // Combine all events into a single timeline
    const timelineEvents = [
        {
            type: 'created',
            timestamp: createdAt,
            title: 'NDR Case Created',
            description: 'Failed delivery attempt reported by carrier',
            icon: '🚀',
            color: 'bg-blue-500',
        },
        ...attempts.map((attempt) => ({
            type: 'attempt',
            timestamp: attempt.attemptDate,
            title: `Delivery Attempt #${attempt.attemptNumber}`,
            description: `${attempt.reason.replace(/_/g, ' ')} - ${attempt.reasonDescription}`,
            icon: '📦',
            color: 'bg-orange-500',
            details: attempt.courierRemarks,
            location: attempt.location,
        })),
        ...actions.map((action) => ({
            type: 'action',
            timestamp: action.triggeredAt,
            title: action.actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: `Action ${action.status}`,
            icon: action.status === 'completed' ? '✅' : action.status === 'failed' ? '❌' : '⏳',
            color: action.status === 'completed' ? 'bg-green-500' : action.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500',
            details: action.notes || action.failureReason,
            triggeredBy: action.triggeredBy,
        })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {timelineEvents.map((event, idx) => (
                    <li key={idx}>
                        <div className="relative pb-8">
                            {/* Connector Line */}
                            {idx !== timelineEvents.length - 1 && (
                                <span
                                    className="absolute top-10 left-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                                    aria-hidden="true"
                                />
                            )}

                            <div className="relative flex space-x-3">
                                {/* Icon */}
                                <div>
                                    <span className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${event.color} text-white`}>
                                        {event.icon}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex min-w-0 flex-1 justify-between space-x-4">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {event.title}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                            {event.description}
                                        </p>

                                        {'location' in event && event.location && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                📍 {event.location}
                                            </p>
                                        )}

                                        {'triggeredBy' in event && event.triggeredBy && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                By: {event.triggeredBy}
                                            </p>
                                        )}

                                        {'details' in event && event.details && (
                                            <div className="mt-2 bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    {event.details}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                                        <time dateTime={event.timestamp}>{formatDate(event.timestamp)}</time>
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
