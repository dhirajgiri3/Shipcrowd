/**
 * Webhook Management Page
 * 
 * Configure and manage webhooks for real-time event notifications.
 */

'use client';

import { useState } from 'react';
import { useWebhooks, useCreateWebhook, useTestWebhook, useDeleteWebhook } from '@/src/core/api/hooks/useSettings';
import { Plus, Play, Trash2, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { CreateWebhookPayload, WebhookEvent, Webhook } from '@/src/types/api/settings.types';

const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; description: string }[] = [
    { value: 'shipment.created', label: 'Shipment Created', description: 'When a new shipment is created' },
    { value: 'shipment.updated', label: 'Shipment Updated', description: 'When shipment status changes' },
    { value: 'shipment.delivered', label: 'Shipment Delivered', description: 'When shipment is delivered' },
    { value: 'shipment.rto', label: 'Shipment RTO', description: 'When shipment is returned' },
    { value: 'shipment.ndr', label: 'Shipment NDR', description: 'When NDR is raised' },
    { value: 'order.created', label: 'Order Created', description: 'When a new order is placed' },
    { value: 'order.cancelled', label: 'Order Cancelled', description: 'When order is cancelled' },
    { value: 'manifest.created', label: 'Manifest Created', description: 'When manifest is generated' },
    { value: 'payment.received', label: 'Payment Received', description: 'When payment is confirmed' },
    { value: 'dispute.created', label: 'Dispute Created', description: 'When dispute is raised' },
];

export default function WebhooksPage() {
    const [showAddModal, setShowAddModal] = useState(false);

    const { data: webhooks, isLoading } = useWebhooks();
    const { mutate: createWebhook, isPending: isCreating } = useCreateWebhook();
    const { mutate: testWebhook } = useTestWebhook();
    const { mutate: deleteWebhook } = useDeleteWebhook();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Webhooks</h1>
                        <p className="text-gray-600 dark:text-gray-400">Configure real-time event notifications</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Webhook
                    </button>
                </div>

                {/* Webhooks List */}
                <div className="grid grid-cols-1 gap-4">
                    {webhooks?.map((webhook) => (
                        <WebhookCard
                            key={webhook.id}
                            webhook={webhook}
                            onTest={() => testWebhook({ webhookId: webhook.id, event: webhook.events[0] })}
                            onDelete={() => deleteWebhook(webhook.id)}
                        />
                    ))}
                </div>

                {webhooks?.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No webhooks configured</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by adding your first webhook</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
                        >
                            Add Webhook
                        </button>
                    </div>
                )}

                {/* Add Webhook Modal */}
                {showAddModal && (
                    <AddWebhookModal
                        onClose={() => setShowAddModal(false)}
                        onCreate={(payload) => {
                            createWebhook(payload);
                            setShowAddModal(false);
                        }}
                        isCreating={isCreating}
                    />
                )}
            </div>
        </div>
    );
}

// ==================== Components ====================

function WebhookCard({ webhook, onTest, onDelete }: {
    webhook: Webhook;
    onTest: () => void;
    onDelete: () => void;
}) {
    const statusColors = {
        active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };

    const statusIcons = {
        active: CheckCircle,
        inactive: AlertCircle,
        error: XCircle,
    };

    const StatusIcon = statusIcons[webhook.status];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{webhook.url}</h3>
                        <span className={cn('px-2 py-1 rounded text-xs font-medium flex items-center gap-1', statusColors[webhook.status])}>
                            <StatusIcon className="w-3 h-3" />
                            {webhook.status}
                        </span>
                    </div>
                    {webhook.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{webhook.description}</p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onTest}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Test Webhook"
                    >
                        <Play className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Webhook"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Events */}
            <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Events:</p>
                <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event) => (
                        <span
                            key={event}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                        >
                            {event}
                        </span>
                    ))}
                </div>
            </div>

            {/* Stats */}
            {webhook.stats && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total Calls</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{webhook.stats.totalCalls}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Successful</p>
                        <p className="text-lg font-semibold text-green-600">{webhook.stats.successfulCalls}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Failed</p>
                        <p className="text-lg font-semibold text-red-600">{webhook.stats.failedCalls}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function AddWebhookModal({ onClose, onCreate, isCreating }: {
    onClose: () => void;
    onCreate: (payload: CreateWebhookPayload) => void;
    isCreating: boolean;
}) {
    const [url, setUrl] = useState('');
    const [description, setDescription] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);

    const toggleEvent = (event: WebhookEvent) => {
        setSelectedEvents(prev =>
            prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
        );
    };

    const handleSubmit = () => {
        if (!url || selectedEvents.length === 0) return;
        onCreate({ url, events: selectedEvents, description: description || undefined });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Webhook</h2>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Webhook URL *
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://your-domain.com/webhook"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description (Optional)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this webhook"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Events * (Select at least one)
                        </label>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {WEBHOOK_EVENTS.map((event) => (
                                <label
                                    key={event.value}
                                    className={cn(
                                        'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                                        selectedEvents.includes(event.value)
                                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300'
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedEvents.includes(event.value)}
                                        onChange={() => toggleEvent(event.value)}
                                        className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{event.label}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isCreating}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!url || selectedEvents.length === 0 || isCreating}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isCreating ? 'Creating...' : 'Create Webhook'}
                    </button>
                </div>
            </div>
        </div>
    );
}
