'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import {
    useIntegration,
    useSyncLogs,
    useDeleteIntegration,
    useTriggerSync,
} from '@/src/core/api/hooks/integrations/useEcommerceIntegrations';
import { Button } from '@/src/components/ui/core/Button';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';
import { IntegrationStoreSkeleton } from '@/src/components/ui/feedback/IntegrationSkeleton';
import { IntegrationStoreLayout } from '../../components/IntegrationStoreLayout';
import { IntegrationStatsGrid } from '../../components/IntegrationStatsGrid';
import { IntegrationSyncActivity } from '../../components/IntegrationSyncActivity';
import { PLATFORM_META } from '../../components/platformConfig';

export const dynamic = 'force-dynamic';

export default function WooCommerceStorePage() {
    const params = useParams();
    const router = useRouter();
    const { addToast } = useToast();
    const storeId = params.storeId as string;
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

    const { data: store, isLoading: isStoreLoading } = useIntegration(storeId, 'WOOCOMMERCE');
    const { data: logs, isLoading: isLogsLoading, error: logsError, refetch: refetchLogs } = useSyncLogs(storeId, 'WOOCOMMERCE');
    const { mutate: disconnectStore, isPending: isDisconnecting } = useDeleteIntegration();
    const { mutate: triggerSync, isPending: isSyncing } = useTriggerSync();

    const handleSyncNow = () => {
        triggerSync(
            { integrationId: storeId, type: 'WOOCOMMERCE', syncType: 'orders' },
            {
                onSuccess: () => {
                    addToast('Sync started successfully', 'success');
                    setTimeout(() => refetchLogs(), 2000);
                },
                onError: (error: Error & { message?: string }) => {
                    addToast(error.message || 'Failed to start sync', 'error');
                },
            }
        );
    };

    const handleDisconnect = () => {
        setShowDisconnectDialog(true);
    };

    if (isStoreLoading) {
        return <IntegrationStoreSkeleton />;
    }

    if (!store) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-[var(--error)]" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Store Not Found</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                    The store you're looking for doesn't exist or has been removed.
                </p>
                <Button onClick={() => router.push('/seller/integrations')}>
                    Back to Integrations
                </Button>
            </div>
        );
    }

    return (
        <>
            <IntegrationStoreLayout
                platform="woocommerce"
                platformMeta={PLATFORM_META.woocommerce}
                store={store}
                storeId={storeId}
                onDisconnect={handleDisconnect}
                isDisconnecting={isDisconnecting}
                onSyncNow={handleSyncNow}
                isSyncing={isSyncing}
            >
                <IntegrationStatsGrid store={store} platformMeta={PLATFORM_META.woocommerce} />
                <IntegrationSyncActivity
                    logs={logs}
                    isLoading={isLogsLoading}
                    error={logsError ?? undefined}
                    platform="woocommerce"
                    storeId={storeId}
                />
            </IntegrationStoreLayout>

            <ConfirmDialog
                open={showDisconnectDialog}
                title="Disconnect store"
                description="Are you sure you want to disconnect this store? This will stop all syncs."
                confirmText="Disconnect"
                confirmVariant="danger"
                onCancel={() => setShowDisconnectDialog(false)}
                onConfirm={() => {
                    disconnectStore(
                        { integrationId: storeId, type: 'WOOCOMMERCE' },
                        {
                            onSuccess: () => {
                                addToast('Store disconnected successfully', 'success');
                                router.push('/seller/integrations');
                            },
                            onError: (error: Error & { message?: string }) => {
                                addToast(error.message || 'Failed to disconnect store', 'error');
                            },
                        }
                    );
                    setShowDisconnectDialog(false);
                }}
            />
        </>
    );
}
