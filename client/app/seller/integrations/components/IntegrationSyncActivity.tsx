'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { formatDate } from '@/src/lib/utils';
import { RefreshCw, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { SyncLog } from '@/src/types/api/integrations';

interface IntegrationSyncActivityProps {
    logs: SyncLog[] | undefined;
    isLoading: boolean;
    platform: string;
    storeId: string;
}

function getStatusLabel(status: string) {
    switch (status) {
        case 'SUCCESS':
            return 'Completed';
        case 'PARTIAL_SUCCESS':
            return 'Partial';
        default:
            return status.replace('_', ' ');
    }
}

function isSuccessStatus(status: string) {
    return status === 'COMPLETED' || status === 'SUCCESS';
}

export function IntegrationSyncActivity({
    logs,
    isLoading,
    platform,
    storeId,
}: IntegrationSyncActivityProps) {
    const router = useRouter();

    return (
        <Card className="border-none bg-[var(--bg-secondary)] shadow-sm overflow-hidden hover:border-[var(--primary-blue)]/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
                <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-[var(--text-secondary)]" />
                    <CardTitle className="text-lg font-bold">Recent Sync Activity</CardTitle>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/seller/integrations/${platform}/${storeId}/sync`)}
                    className="text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] font-semibold"
                >
                    View All Activity
                    <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--primary-blue)] mb-3" />
                        <p className="text-sm text-[var(--text-muted)] font-medium">
                            Loading activity logs...
                        </p>
                    </div>
                ) : logs && logs.length > 0 ? (
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {logs.slice(0, 5).map((log) => (
                            <div
                                key={log._id}
                                className="flex items-center justify-between p-4 px-6 hover:bg-[var(--bg-primary)]/30 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={cn(
                                            'p-2 rounded-full shadow-sm',
                                            isSuccessStatus(log.status)
                                                ? 'bg-[var(--success)]/10 text-[var(--success)]'
                                                : log.status === 'PARTIAL_SUCCESS'
                                                  ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
                                                  : 'bg-[var(--error)]/10 text-[var(--error)]'
                                        )}
                                    >
                                        {isSuccessStatus(log.status) ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[var(--text-primary)]">
                                            {log.triggerType === 'WEBHOOK'
                                                ? 'Real-time Webhook'
                                                : log.triggerType === 'SCHEDULED'
                                                  ? 'Scheduled Sync'
                                                  : 'Manual Synchronization'}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                                            {formatDate(log.startedAt)} •{' '}
                                            {log.durationMs
                                                ? `${(log.durationMs / 1000).toFixed(1)}s`
                                                : 'Instant'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge
                                        variant={
                                            isSuccessStatus(log.status)
                                                ? 'success'
                                                : log.status === 'PARTIAL_SUCCESS'
                                                  ? 'warning'
                                                  : 'destructive'
                                        }
                                        className="text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1 shadow-sm border-none"
                                    >
                                        {isSuccessStatus(log.status) ? (
                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                        ) : (
                                            <AlertCircle className="w-2.5 h-2.5" />
                                        )}
                                        {getStatusLabel(log.status)}
                                    </Badge>
                                    {log.ordersProcessed > 0 && (
                                        <div className="text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                                            {log.ordersProcessed}{' '}
                                            {log.ordersProcessed === 1 ? 'order' : 'orders'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 px-6">
                        <div className="w-16 h-16 bg-[var(--bg-primary)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-subtle)] shadow-inner">
                            <RefreshCw className="w-8 h-8 text-[var(--text-muted)] opacity-20" />
                        </div>
                        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                            No activity yet
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto mb-4">
                            Your store's synchronization history will appear here once the first sync
                            completes.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                router.push(`/seller/integrations/${platform}/${storeId}/sync`)
                            }
                            className="text-[var(--primary-blue)] border-[var(--primary-blue)]/30 hover:bg-[var(--primary-blue-soft)]"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Trigger a manual sync
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
