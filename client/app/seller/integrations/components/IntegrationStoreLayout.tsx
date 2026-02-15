'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { formatDate } from '@/src/lib/utils';
import { Settings, Unplug, ExternalLink, Clock, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { EcommerceIntegration } from '@/src/types/api/integrations';
import type { PlatformMeta } from './platformConfig';

interface IntegrationStoreLayoutProps {
    platform: string;
    platformMeta: PlatformMeta;
    store: EcommerceIntegration;
    storeId: string;
    onDisconnect: () => void;
    isDisconnecting: boolean;
    onSyncNow?: () => void;
    isSyncing?: boolean;
    children: React.ReactNode;
}

export function IntegrationStoreLayout({
    platform,
    platformMeta,
    store,
    storeId,
    onDisconnect,
    isDisconnecting,
    onSyncNow,
    isSyncing,
    children,
}: IntegrationStoreLayoutProps) {
    const router = useRouter();
    const storeUrl = store.storeUrl || (store.shopDomain ? `https://${store.shopDomain}` : undefined);
    const storeDomain = store.shopDomain || store.storeUrl?.replace(/^https?:\/\//, '') || '';
    const storeName = store.shopName || store.storeName || `${platformMeta.name} Store`;

    const breadcrumbs = [
        { label: 'Dashboard', href: '/seller/dashboard' },
        { label: 'Integrations', href: '/seller/integrations' },
        { label: platformMeta.name, href: `/seller/integrations/${platform}` },
        { label: storeName, active: true },
    ];

    const actions = (
        <div className="flex flex-wrap items-center gap-3">
            {onSyncNow && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onSyncNow}
                    disabled={isSyncing || !store.isActive}
                    className="h-10 px-4 rounded-xl border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]"
                >
                    {isSyncing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-[var(--primary-blue)]" />
                    ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync Now
                </Button>
            )}
            <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/seller/integrations/${platform}/${storeId}/settings`)}
                className="h-10 px-4 rounded-xl border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]"
            >
                <Settings className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />
                Settings
            </Button>
            <Button
                variant="danger"
                size="sm"
                onClick={onDisconnect}
                disabled={isDisconnecting}
                className="h-10 px-4 rounded-xl"
            >
                {isDisconnecting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Unplug className="w-4 h-4 mr-2" />
                )}
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
        </div>
    );

    const subtitle = (
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
                <div
                    className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        platformMeta.bgClass,
                        platformMeta.borderClass
                    )}
                >
                    <img src={platformMeta.icon} alt="" className="w-5 h-5" aria-hidden />
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant={store.isActive ? 'success' : 'secondary'}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase"
                    >
                        <div
                            className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                store.isActive ? 'bg-white animate-pulse' : 'bg-current'
                            )}
                        />
                        {store.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {store.isPaused && (
                        <Badge variant="warning" className="px-2 py-0.5 text-[10px] font-semibold uppercase">
                            Paused
                        </Badge>
                    )}
                </div>
            </div>
            {platform === 'amazon' ? (
                <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {(store.credentials as { region?: string })?.region || 'IN'}
                    </Badge>
                    <span>
                        Seller ID:{' '}
                        {((store.credentials as { sellerId?: string })?.sellerId?.substring(0, 4) || '') + '****'}
                    </span>
                </div>
            ) : platform === 'flipkart' ? (
                <span>
                    App ID:{' '}
                    {((store.credentials as { appId?: string })?.appId?.substring(0, 6) || '') + '****'}
                </span>
            ) : storeUrl ? (
                <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--primary-blue)] transition-colors flex items-center gap-1.5 group w-fit"
                >
                    {storeDomain}
                    <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
            ) : null}
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Clock className="w-3 h-3" />
                <span>Connected {formatDate(store.installedAt || store.connectedAt || store.createdAt)}</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
            <PageHeader
                backUrl={`/seller/integrations/${platform}`}
                title={storeName}
                breadcrumbs={breadcrumbs}
                subtitle={subtitle}
                actions={actions}
            />
            <div className="space-y-6">
                {children}
            </div>
        </div>
    );
}
