'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { Button } from '@/src/components/ui/core/Button';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Plug,
    RefreshCcw,
    Store,
} from 'lucide-react';
import { formatDate } from '@/src/lib/utils';
import { useIntegrationHealth } from '@/src/core/api/hooks/integrations/useIntegrations';
import { useTriggerSync } from '@/src/core/api/hooks/integrations/useEcommerceIntegrations';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { PLATFORM_META } from '@/app/seller/integrations/components/platformConfig';
import { cn } from '@/src/lib/utils';

export function AdminIntegrationsClient() {
    const { data, isLoading, error, refetch } = useIntegrationHealth();
    const triggerSync = useTriggerSync();
    const { addToast } = useToast();
    const [syncingStores, setSyncingStores] = useState<Set<string>>(new Set());

    const stores = useMemo(
        () =>
            (data?.platforms
                ? [
                    ...(data.platforms.shopify?.stores || []),
                    ...(data.platforms.woocommerce?.stores || []),
                    ...(data.platforms.amazon?.stores || []),
                    ...(data.platforms.flipkart?.stores || []),
                ]
                : []),
        [data]
    );

    const handleSync = async (storeId: string, platform: string) => {
        setSyncingStores((prev) => new Set(prev).add(storeId));
        try {
            await triggerSync.mutateAsync({
                integrationId: storeId,
                type: platform.toUpperCase() as 'SHOPIFY' | 'WOOCOMMERCE' | 'AMAZON' | 'FLIPKART',
            });
            addToast('Manual sync started', 'success');
            setTimeout(() => refetch(), 2000);
        } catch (err: unknown) {
            addToast((err as Error)?.message || 'Unable to trigger sync', 'error');
        } finally {
            setSyncingStores((prev) => {
                const next = new Set(prev);
                next.delete(storeId);
                return next;
            });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <Skeleton className="h-9 w-64" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-36 rounded-2xl" />
                    ))}
                </div>
                <Card className="border-[var(--border-subtle)]">
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-lg" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        const errorMessage =
            (error as Error)?.message ||
            (error as { error?: { message?: string } })?.error?.message ||
            "We couldn't load integrations. Please try again.";
        return (
            <div className="min-h-screen flex flex-col items-center justify-center py-20 text-center" role="alert">
                <div className="w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center text-[var(--error)] mb-4 animate-scale-in">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Failed to load integrations</h3>
                <p className="text-[var(--text-secondary)] mb-6 max-w-sm">{errorMessage}</p>
                <Button onClick={() => refetch()} variant="outline" className="min-w-[120px]">
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
            <PageHeader
                title="Ecommerce Integrations"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin' },
                    { label: 'Ecommerce Integrations', active: true },
                ]}
                subtitle="Platform-wide health and operational controls"
                showBack={false}
                actions={
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetch()}
                        className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]"
                        aria-label="Refresh integrations"
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Stores"
                    value={data?.summary?.totalStores ?? 0}
                    icon={Store}
                    variant="default"
                    delay={0}
                />
                <StatsCard
                    title="Active Stores"
                    value={data?.summary?.activeStores ?? 0}
                    icon={CheckCircle2}
                    variant="success"
                    delay={1}
                />
                <StatsCard
                    title="Healthy Stores"
                    value={data?.summary?.healthyStores ?? 0}
                    icon={Activity}
                    variant="info"
                    delay={2}
                />
                <StatsCard
                    title="Unhealthy Stores"
                    value={data?.summary?.unhealthyStores ?? 0}
                    icon={AlertTriangle}
                    variant="critical"
                    delay={3}
                />
            </div>

            <Card className="border-[var(--border-subtle)] overflow-hidden">
                <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
                    <CardTitle className="text-lg font-bold">Store Health</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {stores.length === 0 ? (
                        <div className="py-16 px-6 text-center">
                            <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-subtle)]">
                                <Plug className="w-8 h-8 text-[var(--text-muted)] opacity-50" />
                            </div>
                            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">No connected stores</h3>
                            <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
                                No ecommerce stores are connected to the platform yet.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border-subtle)]">
                            {stores.map((store) => {
                                const platformId = store.platform?.toLowerCase() as keyof typeof PLATFORM_META;
                                const meta = PLATFORM_META[platformId] ?? PLATFORM_META.shopify;
                                const isSyncing = syncingStores.has(store.storeId);

                                return (
                                    <div
                                        key={`${store.platform}-${store.storeId}`}
                                        className="flex items-start justify-between gap-4 p-4 hover:bg-[var(--bg-primary)]/30 transition-colors"
                                    >
                                        <div className="flex items-start gap-4 min-w-0">
                                            <div
                                                className={cn(
                                                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border',
                                                    meta.bgClass,
                                                    meta.borderClass
                                                )}
                                            >
                                                <img src={meta.icon} alt={meta.name} className="w-7 h-7 object-contain" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="font-semibold text-[var(--text-primary)] truncate">
                                                        {store.storeName}
                                                    </h3>
                                                    <Badge variant="outline" className="uppercase text-[10px] shrink-0">
                                                        {store.platform}
                                                    </Badge>
                                                    <Badge variant={store.isActive ? 'success' : 'secondary'} className="shrink-0">
                                                        {store.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                    {store.errorCount24h > 0 && (
                                                        <Badge variant="destructive" className="shrink-0">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            {store.errorCount24h} errors (24h)
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-[var(--text-secondary)] flex items-center gap-3 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Activity className="w-3 h-3" /> {store.syncSuccessRate ?? 0}% success
                                                    </span>
                                                    <span>Last sync: {store.lastSyncAt ? formatDate(store.lastSyncAt) : 'Never'}</span>
                                                    <span>Webhooks: {store.webhooksActive ?? 0}/{store.webhooksTotal ?? 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleSync(store.storeId, store.platform)}
                                            disabled={isSyncing || !store.isActive}
                                            className="shrink-0"
                                        >
                                            {isSyncing ? (
                                                <RefreshCcw className="w-3 h-3 mr-1 animate-spin" />
                                            ) : (
                                                <RefreshCcw className="w-3 h-3 mr-1" />
                                            )}
                                            Sync Now
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
