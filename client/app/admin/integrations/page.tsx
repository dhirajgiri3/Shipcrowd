'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { Button } from '@/src/components/ui/core/Button';
import { RefreshCcw, Activity, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/src/lib/utils';
import { useIntegrationHealth } from '@/src/core/api/hooks/integrations/useIntegrations';
import { useTriggerSync } from '@/src/core/api/hooks/integrations/useEcommerceIntegrations';
import { useToast } from '@/src/components/ui/feedback/Toast';

export const dynamic = 'force-dynamic';

export default function AdminIntegrationsPage() {
    const { data, isLoading, refetch } = useIntegrationHealth();
    const triggerSync = useTriggerSync();
    const { addToast } = useToast();

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
        try {
            await triggerSync.mutateAsync({ integrationId: storeId, type: platform.toUpperCase() as any });
            addToast('Manual sync started', 'success');
        } catch (error: any) {
            addToast(error?.message || 'Unable to trigger sync', 'error');
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Ecommerce Integrations</h1>
                    <p className="text-sm text-[var(--text-secondary)]">Platform-wide health and operational controls</p>
                </div>
                <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader><CardTitle>Total Stores</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold">{data?.summary.totalStores || 0}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Active Stores</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold text-[var(--success)]">{data?.summary.activeStores || 0}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Healthy Stores</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold text-[var(--primary-blue)]">{data?.summary.healthyStores || 0}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Unhealthy Stores</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold text-[var(--error)]">{data?.summary.unhealthyStores || 0}</CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Store Health</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-8 text-center text-[var(--text-secondary)]">Loading integrations...</div>
                    ) : stores.length === 0 ? (
                        <div className="py-8 text-center text-[var(--text-secondary)]">No connected ecommerce stores.</div>
                    ) : (
                        <div className="space-y-3">
                            {stores.map((store: any) => (
                                <div key={`${store.platform}-${store.storeId}`} className="border border-[var(--border-subtle)] rounded-lg p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold">{store.storeName}</h3>
                                                <Badge className="uppercase text-[10px]">{store.platform}</Badge>
                                                <Badge variant={store.isActive ? 'success' : 'secondary'}>
                                                    {store.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                                {store.errorCount24h > 0 && (
                                                    <Badge variant="destructive">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        {store.errorCount24h} errors (24h)
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-3">
                                                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {store.syncSuccessRate || 0}% success</span>
                                                <span>Last sync: {store.lastSyncAt ? formatDate(store.lastSyncAt) : 'Never'}</span>
                                                <span>Webhooks: {store.webhooksActive}/{store.webhooksTotal}</span>
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={() => handleSync(store.storeId, store.platform)}>
                                            <RefreshCcw className="w-3 h-3 mr-1" />
                                            Sync Now
                                        </Button>
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
