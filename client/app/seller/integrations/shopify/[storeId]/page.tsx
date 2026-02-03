'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useIntegration, useSyncLogs, useDeleteIntegration } from '@/src/core/api/hooks/integrations/useEcommerceIntegrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { formatDate } from '@/src/lib/utils';
import {
    Store,
    RefreshCw,
    Settings,
    Unplug,
    Activity,
    Package,
    AlertCircle,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';

export const dynamic = "force-dynamic";

export default function ShopifyStorePage() {
    const params = useParams();
    const router = useRouter();
    const { addToast } = useToast();
    const storeId = params.storeId as string;

    const { data: store, isLoading: isStoreLoading } = useIntegration(storeId);
    const { data: logs, isLoading: isLogsLoading } = useSyncLogs(storeId);
    const { mutate: disconnectStore, isPending: isDisconnecting } = useDeleteIntegration();

    const handleDisconnect = () => {
        if (window.confirm('Are you sure you want to disconnect this store? This will stop all syncs.')) {
            disconnectStore(storeId, {
                onSuccess: () => {
                    addToast('Store disconnected successfully', 'success');
                    router.push('/seller/integrations');
                },
                onError: (error) => {
                    addToast(error.message || 'Failed to disconnect store', 'error');
                }
            });
        }
    };

    if (isStoreLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!store) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertCircle className="w-12 h-12 text-[var(--error)] mb-4" />
                <h2 className="text-xl font-semibold mb-2">Store Not Found</h2>
                <Button onClick={() => router.push('/seller/integrations')}>
                    Back to Integrations
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#95BF47]/10 rounded-2xl flex items-center justify-center">
                        <img src="/logos/shopify.svg" alt="Shopify" className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            {store.storeName}
                            <Badge variant={store.isActive ? 'success' : 'secondary'}>
                                {store.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </h1>
                        <a
                            href={store.storeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary-blue)] flex items-center gap-1"
                        >
                            {store.storeUrl}
                            <Store className="w-3 h-3" />
                        </a>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push(`/seller/integrations/shopify/${storeId}/settings`)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDisconnect}
                        disabled={isDisconnecting}
                    >
                        {!isDisconnecting && <Unplug className="w-4 h-4 mr-2" />}
                        {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Sync Health</span>
                            <Activity className={`w-4 h-4 ${(store.stats?.syncSuccessRate || 100) > 90 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`} />
                        </div>
                        <div className="text-2xl font-bold">{store.stats?.syncSuccessRate || 100}%</div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Success rate over last 24h</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Total Orders</span>
                            <Package className="w-4 h-4 text-[var(--primary-blue)]" />
                        </div>
                        <div className="text-2xl font-bold">{store.stats?.totalOrdersSynced || 0}</div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Synced to Shipcrowd</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Last Sync</span>
                            <Clock className="w-4 h-4 text-[var(--primary-purple)]" />
                        </div>
                        <div className="text-sm font-medium">
                            {store.stats?.lastSyncAt ? formatDate(store.stats.lastSyncAt) : 'Never'}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Latest synchronization</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Status</span>
                            <div className={`w-2 h-2 rounded-full ${store.isActive ? 'bg-[var(--success)] animate-pulse' : 'bg-[var(--text-muted)]'}`} />
                        </div>
                        <div className="text-lg font-bold">{store.isActive ? 'Connected' : 'Inactive'}</div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Current integration state</p>
                    </CardContent>
                </Card>
            </div>

            {/* Sync History */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Sync Activity</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/seller/integrations/shopify/${storeId}/sync`)}>
                        View All
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLogsLoading ? (
                        <div className="p-4 text-center text-sm text-[var(--text-muted)]">Loading logs...</div>
                    ) : logs && logs.length > 0 ? (
                        <div className="space-y-4">
                            {logs.slice(0, 5).map((log) => (
                                <div key={log._id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {log.status === 'COMPLETED' ? (
                                            <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-[var(--error)]" />
                                        )}
                                        <div>
                                            <div className="font-medium text-sm">{log.triggerType === 'WEBHOOK' ? 'Webhook Event' : 'Manual Sync'}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{formatDate(log.startedAt)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant={log.status === 'COMPLETED' ? 'success' : 'destructive'} className="text-xs">
                                            {log.status}
                                        </Badge>
                                        {log.ordersProcessed > 0 && (
                                            <div className="text-xs text-[var(--text-muted)] mt-1">{log.ordersProcessed} orders</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            No sync activity recorded yet
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
