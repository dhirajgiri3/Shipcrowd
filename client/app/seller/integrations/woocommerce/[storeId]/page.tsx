'use client';

import React, { useState } from 'react';
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
    Clock,
    ExternalLink,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { cn } from '@/src/lib/utils';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';

export const dynamic = "force-dynamic";

export default function WooCommerceStorePage() {
    const params = useParams();
    const router = useRouter();
    const { addToast } = useToast();
    const storeId = params.storeId as string;
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

    const { data: store, isLoading: isStoreLoading } = useIntegration(storeId, 'WOOCOMMERCE');
    const { data: logs, isLoading: isLogsLoading } = useSyncLogs(storeId, 'WOOCOMMERCE');
    const { mutate: disconnectStore, isPending: isDisconnecting } = useDeleteIntegration();

    const handleDisconnect = () => {
        setShowDisconnectDialog(true);
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
                <div className="w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-[var(--error)]" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Store Not Found</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-4">The store you're looking for doesn't exist or has been removed.</p>
                <Button onClick={() => router.push('/seller/integrations')}>
                    Back to Integrations
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 md:p-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
                <div className="flex items-start gap-5">
                    <div className="w-20 h-20 bg-[#96588A]/10 rounded-2xl flex items-center justify-center border border-[#96588A]/20 shadow-sm transition-transform hover:scale-105">
                        <img src="/logos/woocommerce.svg" alt="WooCommerce" className="w-12 h-12" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                                {store.storeName || 'WooCommerce Store'}
                            </h1>
                            <Badge 
                                variant={store.isActive ? 'success' : 'secondary'} 
                                className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider shadow-sm"
                            >
                                <div className={cn("h-2 w-2 rounded-full", store.isActive ? "bg-white animate-pulse" : "bg-current")} />
                                {store.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {store.isPaused && (
                                <Badge variant="warning" className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider shadow-sm">
                                    Paused
                                </Badge>
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <a
                                href={store.storeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary-blue)] transition-colors flex items-center gap-1.5 group w-fit"
                            >
                                {store.storeUrl?.replace('https://', '')}
                                <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </a>
                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                <Clock className="w-3 h-3" />
                                <span>Connected {formatDate(store.connectedAt || store.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="md"
                        onClick={() => router.push(`/seller/integrations/woocommerce/${storeId}/settings`)}
                        className="h-11 px-5 font-medium border-[var(--border-default)] hover:bg-[var(--bg-secondary)] transition-all"
                    >
                        <Settings className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />
                        Settings
                    </Button>
                    <Button
                        variant="danger"
                        size="md"
                        onClick={handleDisconnect}
                        disabled={isDisconnecting}
                        className="h-11 px-5 font-medium shadow-sm hover:shadow-md transition-all"
                    >
                        {isDisconnecting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Unplug className="w-4 h-4 mr-2" />
                        )}
                        {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Card className="border-none bg-[var(--bg-secondary)] shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-[var(--success)]/10 rounded-lg">
                                <Activity className={cn("w-5 h-5", (store.stats?.syncSuccessRate || 100) > 90 ? 'text-[var(--success)]' : 'text-[var(--warning)]')} />
                            </div>
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Sync Health</span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-3xl font-bold text-[var(--text-primary)]">{store.stats?.syncSuccessRate || 100}%</div>
                            <p className="text-xs text-[var(--text-muted)] font-medium">Success rate (24h)</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-[var(--bg-secondary)] shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-[var(--primary-blue)]/10 rounded-lg">
                                <Package className="w-5 h-5 text-[var(--primary-blue)]" />
                            </div>
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Total Orders</span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-3xl font-bold text-[var(--text-primary)]">{store.stats?.totalOrdersSynced || 0}</div>
                            <p className="text-xs text-[var(--text-muted)] font-medium">Synced to Shipcrowd</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-[var(--bg-secondary)] shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-[var(--primary-purple)]/10 rounded-lg">
                                <Clock className="w-5 h-5 text-[var(--primary-purple)]" />
                            </div>
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Last Sync</span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-lg font-bold text-[var(--text-primary)] truncate">
                                {store.stats?.lastSyncAt ? formatDate(store.stats.lastSyncAt) : 'Never'}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] font-medium">Latest synchronization</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-[var(--bg-secondary)] shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("p-2 rounded-lg", store.isActive ? "bg-[var(--success)]/10" : "bg-[var(--text-muted)]/10")}>
                                <div className={cn("w-5 h-5 rounded-full border-2 border-white shadow-sm", store.isActive ? "bg-[var(--success)] animate-pulse" : "bg-[var(--text-muted)]")} />
                            </div>
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Connection</span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-[var(--text-primary)]">{store.isActive ? 'Connected' : 'Inactive'}</div>
                            <p className="text-xs text-[var(--text-muted)] font-medium">Integration status</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sync History Section */}
            <Card className="border-none bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
                    <div className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-[var(--text-secondary)]" />
                        <CardTitle className="text-lg font-bold">Recent Sync Activity</CardTitle>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(`/seller/integrations/woocommerce/${storeId}/sync`)}
                        className="text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] font-semibold"
                    >
                        View All Activity
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {isLogsLoading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--text-muted)] mb-3" />
                            <p className="text-sm text-[var(--text-muted)] font-medium">Loading activity logs...</p>
                        </div>
                    ) : logs && logs.length > 0 ? (
                        <div className="divide-y divide-[var(--border-subtle)]">
                            {logs.slice(0, 5).map((log: any) => (
                                <div key={log._id} className="flex items-center justify-between p-4 px-6 hover:bg-[var(--bg-primary)]/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "p-2 rounded-full shadow-sm",
                                            log.status === 'COMPLETED' ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--error)]/10 text-[var(--error)]"
                                        )}>
                                            {log.status === 'COMPLETED' ? (
                                                <CheckCircle2 className="w-5 h-5" />
                                            ) : (
                                                <AlertCircle className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[var(--text-primary)]">
                                                {log.triggerType === 'WEBHOOK' ? 'Real-time Webhook' : 'Manual Synchronization'}
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                                                {formatDate(log.startedAt)} • {log.durationMs ? `${(log.durationMs/1000).toFixed(1)}s` : 'Instant'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge 
                                            variant={log.status === 'COMPLETED' ? 'success' : 'destructive'} 
                                            className="text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1 shadow-sm border-none"
                                        >
                                            {log.status === 'COMPLETED' ? (
                                                <CheckCircle2 className="w-2.5 h-2.5" />
                                            ) : (
                                                <AlertCircle className="w-2.5 h-2.5" />
                                            )}
                                            {log.status}
                                        </Badge>
                                        {log.ordersProcessed > 0 && (
                                            <div className="text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                                                {log.ordersProcessed} {log.ordersProcessed === 1 ? 'order' : 'orders'}
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
                            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">No activity yet</h3>
                            <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">Your store's synchronization history will appear here once the first sync completes.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <ConfirmDialog
            open={showDisconnectDialog}
            title="Disconnect store"
            description="Are you sure you want to disconnect this store? This will stop all syncs."
            confirmText="Disconnect"
            confirmVariant="danger"
            onCancel={() => setShowDisconnectDialog(false)}
            onConfirm={() => {
                disconnectStore({ integrationId: storeId, type: 'WOOCOMMERCE' }, {
                    onSuccess: () => {
                        addToast('Store disconnected successfully', 'success');
                        router.push('/seller/integrations');
                    },
                    onError: (error: any) => {
                        addToast(error.message || 'Failed to disconnect store', 'error');
                    }
                });
                setShowDisconnectDialog(false);
            }}
        />
    );
}
