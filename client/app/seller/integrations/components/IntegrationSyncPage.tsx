'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    useIntegration,
    useSyncLogs,
    useTriggerSync,
} from '@/src/core/api/hooks/integrations/useEcommerceIntegrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { formatDate } from '@/src/lib/utils';
import {
    RefreshCw,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Clock,
    Filter,
    Loader2,
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import type { IntegrationType } from '@/src/types/api/integrations';

type SyncStatus = 'ALL' | 'COMPLETED' | 'FAILED' | 'IN_PROGRESS' | 'PARTIAL';

interface Props {
    platform: 'shopify' | 'woocommerce' | 'amazon' | 'flipkart';
    type: IntegrationType;
    storeId: string;
}

export default function IntegrationSyncPage({ platform, type, storeId }: Props) {
    const router = useRouter();
    const { addToast } = useToast();
    const [statusFilter, setStatusFilter] = useState<SyncStatus>('ALL');
    const [syncType, setSyncType] = useState<'all' | 'recent'>('recent');
    const [showSyncModal, setShowSyncModal] = useState(false);

    const { data: store, isLoading: isStoreLoading } = useIntegration(storeId, type);
    const { data: logs, isLoading: isLogsLoading, refetch: refetchLogs } = useSyncLogs(storeId, type);
    const { mutate: triggerSync, isPending: isSyncing } = useTriggerSync();

    const handleManualSync = () => {
        const sinceDate = syncType === 'recent' ? new Date(Date.now() - 24 * 60 * 60 * 1000) : undefined;

        triggerSync(
            {
                integrationId: storeId,
                type,
                syncType: 'orders',
                sinceDate: sinceDate?.toISOString(),
            },
            {
                onSuccess: () => {
                    addToast('Sync started successfully', 'success');
                    setShowSyncModal(false);
                    setTimeout(() => refetchLogs(), 2000);
                },
                onError: (error) => {
                    addToast(error.message || 'Failed to start sync', 'error');
                },
            }
        );
    };

    const filteredLogs =
        logs?.filter((log) => {
            if (statusFilter === 'ALL') return true;
            return log.status === statusFilter;
        }) || [];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'FAILED':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'IN_PROGRESS':
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'PARTIAL':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    if (isStoreLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/seller/integrations/${platform}/${storeId}`)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sync History</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{store?.storeName || 'Store'}</p>
                    </div>
                </div>

                <Button onClick={() => setShowSyncModal(true)} disabled={isSyncing}>
                    {isSyncing ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Syncing...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Manual Sync
                        </>
                    )}
                </Button>
            </div>

            {showSyncModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle>Start Manual Sync</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer">
                                <input type="radio" name="syncType" checked={syncType === 'recent'} onChange={() => setSyncType('recent')} />
                                <div>
                                    <div className="font-medium">Recent Orders (24h)</div>
                                    <div className="text-xs text-gray-500">Sync last 24 hours only</div>
                                </div>
                            </label>
                            <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer">
                                <input type="radio" name="syncType" checked={syncType === 'all'} onChange={() => setSyncType('all')} />
                                <div>
                                    <div className="font-medium">All Orders</div>
                                    <div className="text-xs text-gray-500">Run full order sync</div>
                                </div>
                            </label>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setShowSyncModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleManualSync} disabled={isSyncing}>
                                    {isSyncing ? 'Starting...' : 'Start Sync'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <div className="flex gap-2 flex-wrap">
                            {(['ALL', 'COMPLETED', 'FAILED', 'IN_PROGRESS', 'PARTIAL'] as SyncStatus[]).map((status) => (
                                <Button key={status} variant={statusFilter === status ? 'primary' : 'outline'} size="sm" onClick={() => setStatusFilter(status)}>
                                    {status.replace('_', ' ')}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Sync Logs ({filteredLogs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLogsLoading ? (
                        <div className="p-8 text-center text-[var(--text-secondary)]">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Loading sync logs...
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text-secondary)]">No sync logs found.</div>
                    ) : (
                        <div className="space-y-3">
                            {filteredLogs.map((log) => (
                                <div key={log._id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1">
                                            {getStatusIcon(log.status)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm">{log.triggerType || 'SYNC'}</span>
                                                    <Badge className="text-xs">{log.status}</Badge>
                                                </div>
                                                <div className="text-xs text-gray-500 mb-2">
                                                    {formatDate(log.startedAt)} {log.durationMs ? `• ${Math.round(log.durationMs / 1000)}s` : ''}
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                                    Processed: {log.ordersProcessed || 0} • Success: {log.ordersSuccess || 0} • Failed: {log.ordersFailed || 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
