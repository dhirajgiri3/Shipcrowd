/**
 * WebhooksManager Component
 * 
 * Manages webhook configurations, including listing, creating, testing, and deleting webhooks.
 */

'use client';

import { useState } from 'react';
import { useWebhooks, useCreateWebhook, useTestWebhook, useDeleteWebhook } from '@/src/core/api/hooks/useSettings';
import { Plus, Play, Trash2, Eye, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button, Card, Input, Label, Badge } from '@/components/ui';
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

export function WebhooksManager() {
    const [showAddModal, setShowAddModal] = useState(false);

    const { data: webhooks, isLoading } = useWebhooks();
    const { mutate: createWebhook, isPending: isCreating } = useCreateWebhook();
    const { mutate: testWebhook } = useTestWebhook();
    const { mutate: deleteWebhook } = useDeleteWebhook();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-[var(--primary-blue)] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Webhook
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {webhooks?.map((webhook: Webhook) => (
                    <WebhookCard
                        key={webhook.id}
                        webhook={webhook}
                        onTest={() => testWebhook({ webhookId: webhook.id, event: webhook.events[0] })}
                        onDelete={() => deleteWebhook(webhook.id)}
                    />
                ))}
            </div>

            {webhooks?.length === 0 && (
                <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <AlertCircle className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No webhooks configured</h3>
                    <p className="text-[var(--text-muted)] mb-4">Get started by adding your first webhook</p>
                    <Button onClick={() => setShowAddModal(true)}>
                        Add Webhook
                    </Button>
                </div>
            )}

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
    );
}

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
        <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-[var(--text-primary)]">{webhook.url}</h3>
                        <span className={cn('px-2 py-1 rounded text-xs font-medium flex items-center gap-1', statusColors[webhook.status])}>
                            <StatusIcon className="w-3 h-3" />
                            {webhook.status}
                        </span>
                    </div>
                    {webhook.description && (
                        <p className="text-sm text-[var(--text-muted)]">{webhook.description}</p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onTest}
                        className="text-[var(--primary-blue)] hover:text-[var(--primary-blue-dark)]"
                        title="Test Webhook"
                    >
                        <Play className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete Webhook"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="mb-4">
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Events:</p>
                <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event) => (
                        <Badge
                            key={event}
                            variant="secondary"
                        >
                            {event}
                        </Badge>
                    ))}
                </div>
            </div>

            {webhook.stats && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <div>
                        <p className="text-xs text-[var(--text-muted)]">Total Calls</p>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{webhook.stats.totalCalls}</p>
                    </div>
                    <div>
                        <p className="text-xs text-[var(--text-muted)]">Successful</p>
                        <p className="text-lg font-semibold text-green-600">{webhook.stats.successfulCalls}</p>
                    </div>
                    <div>
                        <p className="text-xs text-[var(--text-muted)]">Failed</p>
                        <p className="text-lg font-semibold text-red-600">{webhook.stats.failedCalls}</p>
                    </div>
                </div>
            )}
        </Card>
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
            <div className="bg-[var(--bg-primary)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-default)] shadow-xl">
                <div className="p-6 border-b border-[var(--border-subtle)]">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Add Webhook</h2>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <Label>Webhook URL *</Label>
                        <Input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://your-domain.com/webhook"
                            className="mt-1.5"
                        />
                    </div>

                    <div>
                        <Label>Description (Optional)</Label>
                        <Input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this webhook"
                            className="mt-1.5"
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Events * (Select at least one)</Label>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {WEBHOOK_EVENTS.map((event) => (
                                <div
                                    key={event.value}
                                    onClick={() => toggleEvent(event.value)}
                                    className={cn(
                                        'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                                        selectedEvents.includes(event.value)
                                            ? 'bg-[var(--bg-secondary)] border-[var(--primary-blue)]'
                                            : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                                    )}
                                >
                                    <div className={cn(
                                        "w-4 h-4 mt-0.5 rounded border flex items-center justify-center",
                                        selectedEvents.includes(event.value)
                                            ? "bg-[var(--primary-blue)] border-[var(--primary-blue)] text-white"
                                            : "border-[var(--border-default)]"
                                    )}>
                                        {selectedEvents.includes(event.value) && <CheckCircle className="w-3 h-3" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-[var(--text-primary)]">{event.label}</p>
                                        <p className="text-sm text-[var(--text-muted)]">{event.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-[var(--border-subtle)] flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isCreating}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!url || selectedEvents.length === 0 || isCreating}
                    >
                        {isCreating ? 'Creating...' : 'Create Webhook'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
