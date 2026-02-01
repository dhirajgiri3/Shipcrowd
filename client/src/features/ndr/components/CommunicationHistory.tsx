/**
 * Communication History Component
 * 
 * Displays all customer communications for an NDR case:
 * - SMS, Email, WhatsApp messages
 * - Delivery status
 * - Customer responses
 * - Timeline view
 */

'use client';

import React from 'react';
import type { CustomerCommunication } from '@/src/types/api/orders';
import { formatDate } from '@/src/lib/utils';

interface CommunicationHistoryProps {
    communications: CustomerCommunication[];
}

const CHANNEL_CONFIG = {
    sms: { icon: '📱', label: 'SMS', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
    email: { icon: '📧', label: 'Email', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
    whatsapp: { icon: '💬', label: 'WhatsApp', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    call: { icon: '📞', label: 'Call', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
};

export function CommunicationHistory({ communications }: CommunicationHistoryProps) {
    if (!communications || communications.length === 0) {
        return (
            <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 mt-2">No communications sent yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {communications.map((comm, idx) => {
                const config = CHANNEL_CONFIG[comm.channel];
                const hasResponse = !!comm.customerResponse;
                const isDelivered = !!comm.deliveredAt;
                const isRead = !!comm.readAt;

                return (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
                                    {config.icon} {config.label}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(comm.sentAt)}
                                </span>
                            </div>

                            {/* Status Indicators */}
                            <div className="flex items-center gap-2">
                                {isDelivered && (
                                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Delivered
                                    </span>
                                )}
                                {isRead && (
                                    <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                        Read
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Template/Content */}
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 bg-white dark:bg-gray-800 p-3 rounded">
                            <p className="font-medium mb-1">Template: {comm.template}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Standard NDR notification sent to customer
                            </p>
                        </div>

                        {/* Customer Response */}
                        {hasResponse && (
                            <div className="mt-3 border-l-4 border-primary-500 pl-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                                        Customer Response
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatDate(comm.responseReceivedAt!)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {comm.customerResponse}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
