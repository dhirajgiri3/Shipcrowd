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
import { Dialog, DialogContent, DialogTitle } from '@/src/components/ui/feedback/Dialog';
import { formatDate } from '@/src/lib/utils';
import {
    RefreshCw,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Clock,
    Filter,
    Calendar,
    Loader2,
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import type { IntegrationType } from '@/src/types/api/integrations';
import { PLATFORM_META } from './platformConfig';
import type { PlatformId } from './platformConfig';

type SyncStatus = 'ALL' | 'SUCCESS' | 'COMPLETED' | 'FAILED' | 'IN_PROGRESS' | 'PARTIAL_SUCCESS';

interface Props {
    platform: PlatformId;
    type: IntegrationType;
    storeId: string;
}

function getStatusLabel(status: string) {
    switch (status) {
        case 'SUCCESS':
        case 'COMPLETED':
            return 'Completed';
        case 'PARTIAL_SUCCESS':
            return 'Partial';
        default:
            return status.replace('_', ' ');
    }
}

function getStatusColor(status: string) {
    switch (status) {
        case 'SUCCESS':
        case 'COMPLETED':
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
}

export default function IntegrationSyncPage({ platform, type, storeId }: Props) {
    const router = useRouter();
    const { addToast } = useToast();
    const [statusFilter, setStatusFilter] = useState<SyncStatus>('ALL');
    const [syncType, setSyncType] = useState<'all' | 'recent'>('recent');
    const [showSyncModal, setShowSyncModal] = useState(false);

    const platformMeta = PLATFORM_META[platform];
    const accentColor = platformMeta?.color ?? 'var(--primary-blue)';

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
                onError: (error: Error & { message?: string }) => {
                    addToast(error.message || 'Failed to start sync', 'error');
                },
            }
        );
    };

    const filteredLogs =
        logs?.filter((log) => {
            if (statusFilter === 'ALL') return true;
            if (statusFilter === 'SUCCESS' || statusFilter === 'COMPLETED') {
                return log.status === 'SUCCESS' || log.status === 'COMPLETED';
            }
            return log.status === statusFilter;
        }) || [];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'SUCCESS':
            case 'COMPLETED':
                return <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />;
            case 'FAILED':
                return <AlertCircle className="w-5 h-5 text-[var(--error)]" />;
            case 'IN_PROGRESS':
                return <Loader2 className="w-5 h-5 text-[var(--primary-blue)] animate-spin" />;
            case 'PARTIAL_SUCCESS':
                return <AlertCircle className="w-5 h-5 text-[var(--warning)]" />;
            default:
                return <Clock className="w-5 h-5 text-[var(--text-muted)]" />;
        }
    };

    const filterOptions: SyncStatus[] = ['ALL', 'SUCCESS', 'FAILED', 'IN_PROGRESS', 'PARTIAL_SUCCESS'];

    if (isStoreLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-blue)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/seller/integrations/${platform}/${storeId}`)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sync History</h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {store?.storeName || 'Store'}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => setShowSyncModal(true)}
                    disabled={isSyncing}
                    style={
                        platformMeta
                            ? { backgroundColor: platformMeta.color, color: 'white' }
                            : undefined
                    }
                    className={!platformMeta ? '' : 'hover:opacity-90'}
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

            <Dialog open={showSyncModal} onOpenChange={setShowSyncModal}>
                <DialogContent className="max-w-md">
                    <DialogTitle>Start Manual Sync</DialogTitle>
                    <div className="space-y-4 pt-2">
                        <label className="flex items-center gap-2 p-3 border border-[var(--border-subtle)] rounded-lg cursor-pointer hover:bg-[var(--bg-hover)]">
                            <input
                                type="radio"
                                name="syncType"
                                checked={syncType === 'recent'}
                                onChange={() => setSyncType('recent')}
                                className="w-4 h-4"
                            />
                            <div>
                                <div className="font-medium text-[var(--text-primary)]">
                                    Recent Orders (24h)
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">
                                    Sync last 24 hours only
                                </div>
                            </div>
                        </label>
                        <label className="flex items-center gap-2 p-3 border border-[var(--border-subtle)] rounded-lg cursor-pointer hover:bg-[var(--bg-hover)]">
                            <input
                                type="radio"
                                name="syncType"
                                checked={syncType === 'all'}
                                onChange={() => setSyncType('all')}
                                className="w-4 h-4"
                            />
                            <div>
                                <div className="font-medium text-[var(--text-primary)]">
                                    All Orders
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">
                                    Run full order sync
                                </div>
                            </div>
                        </label>
                        <div className="flex gap-2 justify-end pt-2">
                            <Button variant="outline" onClick={() => setShowSyncModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleManualSync}
                                disabled={isSyncing}
                                style={
                                    platformMeta
                                        ? { backgroundColor: platformMeta.color, color: 'white' }
                                        : undefined
                                }
                                className={!platformMeta ? '' : 'hover:opacity-90'}
                            >
                                {isSyncing ? 'Starting...' : 'Start Sync'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <Filter className="w-4 h-4 text-[var(--text-muted)]" />
                        <div className="flex gap-2 flex-wrap">
                            {filterOptions.map((status) => (
                                <Button
                                    key={status}
                                    variant={statusFilter === status ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter(status)}
                                >
                                    {getStatusLabel(status)}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-[var(--text-primary)]">
                        Sync Logs ({filteredLogs.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLogsLoading ? (
                        <div className="p-8 text-center text-[var(--text-secondary)]">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--primary-blue)]" />
                            Loading sync logs...
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="py-12 text-center">
                            <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-50 text-[var(--text-muted)]" />
                            <p className="text-lg font-medium mb-1 text-[var(--text-primary)]">
                                No sync logs found
                            </p>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {statusFilter !== 'ALL'
                                    ? `No ${getStatusLabel(statusFilter).toLowerCase()} syncs to display`
                                    : 'Start a manual sync to see activity here'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredLogs.map((log) => (
                                <div
                                    key={log._id}
                                    className="p-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-primary)] hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1">
                                            {getStatusIcon(log.status)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm text-[var(--text-primary)]">
                                                        {log.triggerType === 'WEBHOOK'
                                                            ? 'Webhook Sync'
                                                            : log.triggerType === 'SCHEDULED'
                                                              ? 'Scheduled Sync'
                                                              : 'Manual Sync'}
                                                    </span>
                                                    <Badge
                                                        variant={getStatusColor(log.status) as 'success' | 'destructive' | 'warning' | 'default' | 'secondary'}
                                                        className="text-xs"
                                                    >
                                                        {getStatusLabel(log.status)}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-2">
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
                                                <div className="text-xs text-[var(--text-secondary)]">
                                                    Processed: {log.ordersProcessed || 0} • Success:{' '}
                                                    <span className="text-[var(--success)]">
                                                        {log.ordersSuccess || 0}
                                                    </span>{' '}
                                                    • Failed:{' '}
                                                    <span className="text-[var(--error)]">
                                                        {log.ordersFailed || 0}
                                                    </span>
                                                </div>
                                                {log.details?.errors && log.details.errors.length > 0 && (
                                                    <div className="mt-3 p-2 bg-[var(--error-bg)] rounded text-xs">
                                                        <div className="font-medium text-[var(--error)] mb-1">
                                                            Errors ({log.details.errors.length})
                                                        </div>
                                                        <div className="space-y-1">
                                                            {log.details.errors
                                                                .slice(0, 3)
                                                                .map((error: { error?: string; message?: string }, idx: number) => (
                                                                    <div key={idx} className="text-[var(--error)]">
                                                                        • {error.error || error.message || 'Unknown error'}
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}
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
