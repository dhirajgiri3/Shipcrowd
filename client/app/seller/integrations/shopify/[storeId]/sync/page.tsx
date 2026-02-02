'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import {
    useIntegration,
    useSyncLogs,
    useTriggerSync
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
    Download,
    Calendar,
    Loader2
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';

export const dynamic = "force-dynamic";

type SyncStatus = 'ALL' | 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';

export default function ShopifySyncPage() {
    const params = useParams();
    const router = useRouter();
    const { addToast } = useToast();
    const storeId = params.storeId as string;

    const [statusFilter, setStatusFilter] = useState<SyncStatus>('ALL');
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncType, setSyncType] = useState<'all' | 'recent'>('recent');

    const { data: store, isLoading: isStoreLoading } = useIntegration(storeId);
    const { data: logs, isLoading: isLogsLoading, refetch: refetchLogs } = useSyncLogs(storeId);
    const { mutate: triggerSync, isPending: isSyncing } = useTriggerSync();

    const handleManualSync = () => {
        const sinceDate = syncType === 'recent' ? new Date(Date.now() - 24 * 60 * 60 * 1000) : undefined;

        triggerSync({
            integrationId: storeId,
            syncType: 'orders',
            sinceDate: sinceDate?.toISOString()
        }, {
            onSuccess: () => {
                addToast('Sync started successfully', 'success');
                setShowSyncModal(false);
                setTimeout(() => refetchLogs(), 2000);
            },
            onError: (error) => {
                addToast(error.message || 'Failed to start sync', 'error');
            }
        });
    };

    const filteredLogs = logs?.filter(log => {
        if (statusFilter === 'ALL') return true;
        return log.status === statusFilter;
    }) || [];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'SUCCESS':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'FAILED':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'IN_PROGRESS':
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'PARTIAL_SUCCESS':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SUCCESS':
                return 'success';
            case 'FAILED':
                return 'destructive';
            case 'IN_PROGRESS':
                return 'default';
            case 'PARTIAL_SUCCESS':
                return 'warning';
            default:
                return 'secondary';
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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Sync History
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {store?.storeName || 'Store'}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => setShowSyncModal(true)}
                    disabled={isSyncing}
                    className="bg-[#95BF47] hover:bg-[#7da639] text-white"
                >
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

            {/* Sync Modal */}
            {showSyncModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle>Start Manual Sync</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Sync Type</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <input
                                            type="radio"
                                            name="syncType"
                                            value="recent"
                                            checked={syncType === 'recent'}
                                            onChange={(e) => setSyncType(e.target.value as 'all' | 'recent')}
                                            className="w-4 h-4"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium">Recent Orders (24h)</div>
                                            <div className="text-xs text-gray-500">Sync orders from the last 24 hours</div>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <input
                                            type="radio"
                                            name="syncType"
                                            value="all"
                                            checked={syncType === 'all'}
                                            onChange={(e) => setSyncType(e.target.value as 'all' | 'recent')}
                                            className="w-4 h-4"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium">All Orders</div>
                                            <div className="text-xs text-gray-500">Full sync of all orders (may take longer)</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowSyncModal(false)}
                                    disabled={isSyncing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleManualSync}
                                    disabled={isSyncing}
                                    className="bg-[#95BF47] hover:bg-[#7da639] text-white"
                                >
                                    {isSyncing ? 'Starting...' : 'Start Sync'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <div className="flex gap-2 flex-wrap">
                            {(['ALL', 'SUCCESS', 'FAILED', 'IN_PROGRESS'] as SyncStatus[]).map((status) => (
                                <Button
                                    key={status}
                                    variant={statusFilter === status ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter(status)}
                                >
                                    {status.replace('_', ' ')}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sync Logs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Sync Logs ({filteredLogs.length})</span>
                        <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLogsLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Loading sync logs...
                        </div>
                    ) : filteredLogs.length > 0 ? (
                        <div className="space-y-3">
                            {filteredLogs.map((log) => (
                                <div
                                    key={log._id}
                                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1">
                                            {getStatusIcon(log.status)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm">
                                                        {log.triggerType === 'WEBHOOK' ? 'Webhook Sync' :
                                                            log.triggerType === 'SCHEDULED' ? 'Scheduled Sync' :
                                                                'Manual Sync'}
                                                    </span>
                                                    <Badge variant={getStatusColor(log.status) as any} className="text-xs">
                                                        {log.status}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(log.startedAt)}
                                                    </span>
                                                    {log.durationMs && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {(log.durationMs / 1000).toFixed(1)}s
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-gray-500">Processed:</span>
                                                        <span className="ml-1 font-medium">{log.ordersProcessed || 0}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Success:</span>
                                                        <span className="ml-1 font-medium text-green-600">{log.ordersSuccess || 0}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Failed:</span>
                                                        <span className="ml-1 font-medium text-red-600">{log.ordersFailed || 0}</span>
                                                    </div>
                                                </div>

                                                {log.details?.errors && log.details.errors.length > 0 && (
                                                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                                                        <div className="font-medium text-red-700 dark:text-red-400 mb-1">
                                                            Errors ({log.details.errors.length})
                                                        </div>
                                                        <div className="space-y-1">
                                                            {log.details.errors.slice(0, 3).map((error: any, idx: number) => (
                                                                <div key={idx} className="text-red-600 dark:text-red-300">
                                                                    • {error.error || error.message || 'Unknown error'}
                                                                </div>
                                                            ))}
                                                            {log.details.errors.length > 3 && (
                                                                <div className="text-red-500">
                                                                    + {log.details.errors.length - 3} more errors
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-lg font-medium mb-1">No sync logs found</p>
                            <p className="text-sm">
                                {statusFilter !== 'ALL'
                                    ? `No ${statusFilter.toLowerCase()} syncs to display`
                                    : 'Start a manual sync to see activity here'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
