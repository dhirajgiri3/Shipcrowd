'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import {
    useIntegration,
    useUpdateIntegration,
    useDeleteIntegration
} from '@/src/core/api/hooks/integrations/useEcommerceIntegrations';
import { IntegrationSettings } from '@/src/types/api/integrations/integrations.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';
import { Switch } from '@/src/components/ui/core/Switch';
import { Select } from '@/src/components/ui/form/Select';
import {
    ArrowLeft,
    Save,
    Loader2,
    AlertCircle,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';

export const dynamic = "force-dynamic";

const syncFrequencyOptions = [
    { value: 'EVERY_5_MIN', label: 'Every 5 minutes' },
    { value: 'EVERY_15_MIN', label: 'Every 15 minutes' },
    { value: 'HOURLY', label: 'Hourly' },
    { value: 'MANUAL', label: 'Manual sync only' },
];

export default function FlipkartSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const { addToast } = useToast();
    const storeId = params.storeId as string;

    const { data: store, isLoading } = useIntegration(storeId, 'FLIPKART');
    const { mutate: updateSettings, isPending: isUpdating } = useUpdateIntegration();
    const { mutate: deleteStore, isPending: isDeleting } = useDeleteIntegration();

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [settings, setSettings] = useState<IntegrationSettings>({
        syncFrequency: 'EVERY_15_MIN',
        autoFulfill: true,
        autoTrackingUpdate: true,
        syncHistoricalOrders: false,
        historicalOrderDays: 7,
        notifications: {
            syncErrors: true,
            connectionIssues: true,
            lowInventory: false
        },
        orderFilters: {
            statusFilters: [],
            excludeStatuses: []
        }
    });

    React.useEffect(() => {
        if (store?.settings) {
            setSettings(prev => ({
                ...prev,
                ...store.settings,
                notifications: {
                    ...prev.notifications,
                    ...(store?.settings?.notifications || {}),
                },
                orderFilters: {
                    ...prev.orderFilters,
                    ...(store?.settings?.orderFilters || {}),
                },
            }));
        }
    }, [store]);

    const handleSaveSettings = () => {
        updateSettings({
            integrationId: storeId,
            type: 'FLIPKART',
            settings
        }, {
            onSuccess: () => {
                addToast('Settings saved successfully', 'success');
            },
            onError: (error: any) => {
                addToast(error.message || 'Failed to save settings', 'error');
            }
        });
    };

    const handleDeleteStore = () => {
        deleteStore({ integrationId: storeId, type: 'FLIPKART' }, {
            onSuccess: () => {
                addToast('Store disconnected successfully', 'success');
                router.push('/seller/integrations');
            },
            onError: (error: any) => {
                addToast(error.message || 'Failed to disconnect store', 'error');
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-blue)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/seller/integrations/flipkart/${storeId}`)}
                        className="gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Flipkart Settings</h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{store?.storeName || 'Flipkart Store'}</p>
                    </div>
                </div>
                <Button
                    onClick={handleSaveSettings}
                    disabled={isUpdating}
                    className="gap-2 bg-[#2874F0] hover:bg-[#1E5BC6] text-white"
                >
                    {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            {/* Info Alert */}
            <Card className="bg-[#2874F0]/5 border-[#2874F0]/20">
                <CardContent className="p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#2874F0] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">Flipkart Dispatch Requirements</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Orders must be dispatched within the specified SLA. Self-ship orders require invoice details and tracking numbers.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Sync Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle>Sync Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">
                            Sync Frequency
                        </label>
                        <Select
                            value={settings.syncFrequency}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                syncFrequency: e.target.value as any
                            }))}
                            options={syncFrequencyOptions}
                        />
                        <p className="text-xs text-[var(--text-muted)]">How often to check Flipkart for new shipments</p>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)]">Auto-dispatch with tracking</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Automatically send tracking details to Flipkart</p>
                        </div>
                        <Switch
                            checked={settings.autoTrackingUpdate}
                            onCheckedChange={(checked) => setSettings(prev => ({
                                ...prev,
                                autoTrackingUpdate: checked
                            }))}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)]">Import historical orders</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Sync last 7 days of approved shipments</p>
                        </div>
                        <Switch
                            checked={settings.syncHistoricalOrders}
                            onCheckedChange={(checked) => setSettings(prev => ({
                                ...prev,
                                syncHistoricalOrders: checked
                            }))}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)]">Sync errors</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Get notified when syncs fail</p>
                        </div>
                        <Switch
                            checked={settings.notifications.syncErrors}
                            onCheckedChange={(checked) => setSettings(prev => ({
                                ...prev,
                                notifications: { ...prev.notifications, syncErrors: checked }
                            }))}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)]">Connection issues</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Alert when API credentials expire or connection fails</p>
                        </div>
                        <Switch
                            checked={settings.notifications.connectionIssues}
                            onCheckedChange={(checked) => setSettings(prev => ({
                                ...prev,
                                notifications: { ...prev.notifications, connectionIssues: checked }
                            }))}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-[var(--error-border)]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[var(--error)]">
                        <AlertTriangle className="w-5 h-5" />
                        Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 bg-[var(--error-bg)] rounded-lg">
                        <div className="flex-1">
                            <div className="font-medium text-[var(--error)]">Disconnect Store</div>
                            <div className="text-sm text-[var(--error)] opacity-90">
                                This will stop all syncs and remove the integration. This action cannot be undone.
                            </div>
                        </div>
                        <Button
                            variant="danger"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeleting}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Disconnect
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={showDeleteConfirm}
                title="Confirm Disconnection"
                description={`Are you sure you want to disconnect ${store?.storeName || 'this store'}? This will stop all automatic syncs, remove API connections, and disable dispatch tracking updates. This action cannot be undone.`}
                confirmText={isDeleting ? 'Disconnecting...' : 'Yes, Disconnect'}
                confirmVariant="danger"
                isLoading={isDeleting}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteStore}
            />
        </div>
    );
}
