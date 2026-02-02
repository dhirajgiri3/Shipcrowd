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
import { Badge } from '@/src/components/ui/core/Badge';
import {
    ArrowLeft,
    Save,
    Trash2,
    AlertTriangle,
    Settings as SettingsIcon,
    Clock,
    Zap,
    Shield
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';

export const dynamic = "force-dynamic";

export default function ShopifySettingsPage() {
    const params = useParams();
    const router = useRouter();
    const { addToast } = useToast();
    const storeId = params.storeId as string;

    const { data: store, isLoading } = useIntegration(storeId);
    const { mutate: updateSettings, isPending: isUpdating } = useUpdateIntegration();
    const { mutate: deleteStore, isPending: isDeleting } = useDeleteIntegration();

    const [settings, setSettings] = useState<IntegrationSettings>({
        syncFrequency: 'EVERY_15_MIN',
        autoFulfill: true,
        autoTrackingUpdate: true,
        syncHistoricalOrders: false,
        historicalOrderDays: 30,
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

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    React.useEffect(() => {
        if (store?.settings) {
            setSettings(store.settings);
        }
    }, [store]);

    const handleSaveSettings = () => {
        updateSettings({
            integrationId: storeId,
            settings
        }, {
            onSuccess: () => {
                addToast('Settings saved successfully', 'success');
            },
            onError: (error) => {
                addToast(error.message || 'Failed to save settings', 'error');
            }
        });
    };

    const handleDeleteStore = () => {
        deleteStore(storeId, {
            onSuccess: () => {
                addToast('Store disconnected successfully', 'success');
                router.push('/seller/integrations');
            },
            onError: (error) => {
                addToast(error.message || 'Failed to disconnect store', 'error');
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/seller/integrations/shopify/${storeId}`)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <SettingsIcon className="w-6 h-6" />
                            Store Settings
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {store?.storeName || 'Store'}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={handleSaveSettings}
                    disabled={isUpdating}
                    className="bg-[#95BF47] hover:bg-[#7da639] text-white"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            {/* Sync Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Sync Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Sync Frequency</label>
                        <select
                            value={settings.syncFrequency}
                            onChange={(e) => setSettings({ ...settings, syncFrequency: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="REALTIME">Real-time (Webhooks)</option>
                            <option value="EVERY_5_MIN">Every 5 minutes</option>
                            <option value="EVERY_15_MIN">Every 15 minutes</option>
                            <option value="EVERY_30_MIN">Every 30 minutes</option>
                            <option value="HOURLY">Hourly</option>
                            <option value="MANUAL">Manual only</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            How often to check for new orders from Shopify
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                            <div className="font-medium">Sync Historical Orders</div>
                            <div className="text-sm text-gray-500">Import orders from before connection</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.syncHistoricalOrders}
                                onChange={(e) => setSettings({ ...settings, syncHistoricalOrders: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    {settings.syncHistoricalOrders && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Historical Order Days</label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={settings.historicalOrderDays}
                                onChange={(e) => setSettings({ ...settings, historicalOrderDays: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Number of days to look back (max 365)
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Automation Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        Automation
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                            <div className="font-medium">Auto-fulfill Orders</div>
                            <div className="text-sm text-gray-500">Automatically mark orders as fulfilled when shipment is created</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoFulfill}
                                onChange={(e) => setSettings({ ...settings, autoFulfill: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                            <div className="font-medium">Auto Tracking Updates</div>
                            <div className="text-sm text-gray-500">Push tracking numbers back to Shopify automatically</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoTrackingUpdate}
                                onChange={(e) => setSettings({ ...settings, autoTrackingUpdate: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-500" />
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                            <div className="font-medium">Sync Errors</div>
                            <div className="text-sm text-gray-500">Get notified when sync operations fail</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.notifications.syncErrors}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    notifications: {
                                        ...prev.notifications,
                                        syncErrors: e.target.checked
                                    }
                                }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                            <div className="font-medium">Connection Issues</div>
                            <div className="text-sm text-gray-500">Alert when connection to Shopify is lost</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.notifications.connectionIssues}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    notifications: {
                                        ...prev.notifications,
                                        connectionIssues: e.target.checked
                                    }
                                }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="flex-1">
                            <div className="font-medium text-red-700 dark:text-red-400">Disconnect Store</div>
                            <div className="text-sm text-red-600 dark:text-red-300">
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

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle className="text-red-600 dark:text-red-400">Confirm Disconnection</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Are you sure you want to disconnect <strong>{store?.storeName}</strong>?
                                This will:
                            </p>
                            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Stop all automatic syncs</li>
                                <li>Remove webhook connections</li>
                                <li>Disable order fulfillment updates</li>
                            </ul>
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                This action cannot be undone.
                            </p>

                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleDeleteStore}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? 'Disconnecting...' : 'Yes, Disconnect'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
