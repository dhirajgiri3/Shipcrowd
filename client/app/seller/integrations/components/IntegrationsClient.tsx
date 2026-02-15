"use client";
export const dynamic = "force-dynamic";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Plug,
    ArrowRight,
    RefreshCcw,
    Settings,
    AlertCircle,
    Check,
    Store,
    ExternalLink
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useIntegrationHealth } from '@/src/core/api/hooks/integrations/useIntegrations';
import { useTriggerSync } from '@/src/core/api/hooks/integrations/useEcommerceIntegrations';
import { cn } from '@/src/lib/utils';
import { formatDate } from '@/src/lib/utils';

// Platform Metadata with enhanced information
const PLATFORMS = {
    shopify: {
        name: 'Shopify',
        description: 'Sync orders and inventory automatically from your Shopify store',
        icon: '/logos/shopify.svg',
        colorClass: 'text-[#95BF47]',
        bgClass: 'bg-[#95BF47]/10',
        borderClass: 'border-[#95BF47]/20',
        setupRoute: '/seller/integrations/shopify/setup',
        features: ['Auto order sync', 'Inventory management', 'Real-time webhooks'],
        popular: true,
    },
    woocommerce: {
        name: 'WooCommerce',
        description: 'WordPress e-commerce integration for seamless order management',
        icon: '/logos/woocommerce.svg',
        colorClass: 'text-[#96588A]',
        bgClass: 'bg-[#96588A]/10',
        borderClass: 'border-[#96588A]/20',
        setupRoute: '/seller/integrations/woocommerce/setup',
        features: ['REST API sync', 'Order tracking', 'Custom fields'],
        popular: false,
    },
    amazon: {
        name: 'Amazon',
        description: 'Sync orders and inventory from Amazon Seller Central',
        icon: '/logos/amazon.svg',
        colorClass: 'text-[#FF9900]',
        bgClass: 'bg-[#FF9900]/10',
        borderClass: 'border-[#FF9900]/20',
        setupRoute: '/seller/integrations/amazon/setup',
        features: ['SP-API integration', 'Multi-marketplace', 'FBA support'],
        popular: true,
    },
    flipkart: {
        name: 'Flipkart',
        description: 'Connect your Flipkart Seller account to manage orders',
        icon: '/logos/flipkart.png',
        colorClass: 'text-[#2874F0]',
        bgClass: 'bg-[#2874F0]/10',
        borderClass: 'border-[#2874F0]/20',
        setupRoute: '/seller/integrations/flipkart/setup',
        features: ['Seller Hub API', 'Returns handling', 'Analytics'],
        popular: false,
    }
};

export function IntegrationsClient() {
    const { addToast } = useToast();
    const router = useRouter();
    const { data, isLoading, error, refetch } = useIntegrationHealth();
    const triggerSync = useTriggerSync();
    const [syncingStores, setSyncingStores] = useState<Set<string>>(new Set());

    // Flatten connected stores from response (null-safe)
    // Exclude disconnected stores (isActive: false) - backend filters these, but defensive filter for cache/stale data
    const connectedStores = (data?.platforms
        ? [
              ...(data.platforms.shopify?.stores?.map((s: any) => ({ ...s, platform: 'shopify' as const })) ?? []),
              ...(data.platforms.woocommerce?.stores?.map((s: any) => ({ ...s, platform: 'woocommerce' as const })) ?? []),
              ...(data.platforms.amazon?.stores?.map((s: any) => ({ ...s, platform: 'amazon' as const })) ?? []),
              ...(data.platforms.flipkart?.stores?.map((s: any) => ({ ...s, platform: 'flipkart' as const })) ?? []),
          ]
        : []
    ).filter((s) => s && s.isActive !== false);

    // Get connected platform IDs (platforms with at least one connected store)
    const connectedPlatformIds = new Set(connectedStores.map(s => s.platform));

    // Only show platforms that are NOT yet connected in Available Platforms
    const availablePlatformsToConnect = Object.entries(PLATFORMS)
        .filter(([key]) => !connectedPlatformIds.has(key))
        .map(([key, meta]) => ({ id: key, ...meta }));

    // Handle sync (mutation shows toast on success/error; we only manage loading state)
    const handleSync = async (storeId: string, platform: string) => {
        const type = platform.toUpperCase() as 'SHOPIFY' | 'WOOCOMMERCE' | 'AMAZON' | 'FLIPKART';
        if (type === 'FLIPKART') {
            addToast('Manual sync is not supported for Flipkart. Orders sync automatically.', 'info');
            return;
        }
        setSyncingStores(prev => new Set(prev).add(storeId));
        try {
            await triggerSync.mutateAsync({ integrationId: storeId, type });
            setTimeout(() => refetch(), 2000);
        } catch {
            // Error toast handled by useTriggerSync onError
        } finally {
            setSyncingStores(prev => {
                const next = new Set(prev);
                next.delete(storeId);
                return next;
            });
        }
    };

    const isSyncSupported = (platform: string) =>
        !['flipkart'].includes(platform.toLowerCase());

    if (isLoading) {
        return (
            <div className="space-y-6 animate-fade-in" aria-label="Loading integrations" role="status">
                <div className="flex items-center gap-4 mb-8">
                    <div className="skeleton w-10 h-10 rounded-xl" />
                    <div className="space-y-2">
                        <div className="skeleton w-32 h-6 rounded-md" />
                        <div className="skeleton w-48 h-4 rounded-md" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`skeleton h-[200px] animate-fade-in stagger-${i}`} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        const errorMessage =
            (error as Error)?.message ||
            (error as { error?: { message?: string } })?.error?.message ||
            "We couldn't load your integrations. Please try again.";
        return (
            <div className="py-20 flex flex-col items-center justify-center min-h-[400px] text-center" role="alert">
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
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center shadow-xs">
                        <Plug className="h-6 w-6 text-[var(--primary-blue)]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Integrations</h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Connect your stores and sync orders automatically
                        </p>
                    </div>
                </div>

                {connectedStores.length > 0 && (
                    <Badge
                        variant="success"
                        size="lg"
                        className="px-4 py-1 self-start md:self-center bg-[var(--success-bg)] text-[var(--success)] shadow-none border border-[var(--success)]/20"
                    >
                        <Check className="w-4 h-4 mr-1.5" />
                        {connectedStores.length} Connected
                    </Badge>
                )}
            </div>

            {/* Connected Stores Section */}
            {connectedStores.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold tracking-widest text-[var(--text-tertiary)] uppercase flex items-center gap-2">
                            <Store className="w-4 h-4" />
                            Connected Stores
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refetch()}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                            aria-label="Refresh connected stores"
                        >
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Refresh Status
                        </Button>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
                        {connectedStores.map((store, idx) => {
                            const meta = PLATFORMS[store.platform as keyof typeof PLATFORMS] ?? PLATFORMS.shopify;
                            const isSyncing = syncingStores.has(store.storeId);
                            const canSync = store.isActive && isSyncSupported(store.platform);

                            return (
                                <Card
                                    key={store.storeId}
                                    className={cn(
                                        "group relative overflow-hidden border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/30 hover:shadow-brand-sm transition-all duration-300",
                                        `stagger-${(idx % 4) + 1}`
                                    )}
                                >
                                    <div className="absolute top-0 right-0 p-4">
                                        <Badge
                                            className={cn(
                                                "capitalize border font-medium",
                                                store.isPaused
                                                    ? 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/20'
                                                    : store.isActive
                                                        ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20'
                                                        : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] border-[var(--border-subtle)]'
                                            )}
                                            size="sm"
                                        >
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full mr-2",
                                                store.isPaused ? 'bg-[var(--warning)]' : store.isActive ? 'bg-[var(--success)]' : 'bg-[var(--text-tertiary)]'
                                            )} />
                                            {store.isPaused ? 'Paused' : store.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>

                                    <CardContent className="p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="h-14 w-14 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 p-3 group-hover:scale-105 transition-transform duration-300">
                                                <img
                                                    src={meta?.icon || '/placeholder.svg'}
                                                    className="w-full h-full object-contain"
                                                    alt={`${meta?.name} logo`}
                                                    loading="lazy"
                                                />
                                            </div>

                                            <div className="min-w-0 flex-1 pt-1">
                                                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                                    {meta?.name}
                                                </h3>
                                                <p className="text-sm text-[var(--text-secondary)] mt-1 truncate font-medium">
                                                    {store.storeName || store.shopDomain || store.storeUrl?.replace(/^https?:\/\//, '') || 'Store'}
                                                </p>

                                                {store.lastSyncAt && (
                                                    <p className="text-xs text-[var(--text-tertiary)] mt-2 flex items-center">
                                                        <RefreshCcw className="w-3 h-3 mr-1.5" />
                                                        Synced {formatDate(store.lastSyncAt)}
                                                    </p>
                                                )}

                                                <div className="mt-6 flex gap-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="flex-1 rounded-[var(--radius-full)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] transition-all font-medium text-[var(--text-secondary)]"
                                                        onClick={() => router.push(`/seller/integrations/${store.platform}/${store.storeId}`)}
                                                        aria-label={`Manage ${store.storeName}`}
                                                    >
                                                        <Settings className="h-4 w-4 mr-2" />
                                                        Manage
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        isLoading={isSyncing}
                                                        disabled={!canSync}
                                                        title={!store.isActive ? 'Store is inactive' : !isSyncSupported(store.platform) ? 'Manual sync not available for this platform' : undefined}
                                                        className={cn(
                                                            "flex-1 rounded-[var(--radius-full)] border transition-all font-medium",
                                                            meta.bgClass,
                                                            meta.colorClass,
                                                            meta.borderClass,
                                                            "hover:brightness-95"
                                                        )}
                                                        onClick={() => handleSync(store.storeId, store.platform)}
                                                        aria-label={`Sync ${store.storeName}`}
                                                        aria-busy={isSyncing}
                                                    >
                                                        {!isSyncing && <RefreshCcw className="h-4 w-4 mr-2" />}
                                                        Sync Now
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            ) : (
                // Empty State for Connect Stores
                <Card className="border-dashed border-2 border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
                    <CardContent className="md:p-12 p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6 animate-float">
                            <Store className="w-10 h-10 text-[var(--text-tertiary)]" />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                            No stores connected yet
                        </h3>
                        <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto leading-relaxed">
                            Connect your e-commerce store to start importing orders automatically.
                            Select a platform below to get started.
                        </p>
                        <Button
                            onClick={() => {
                                const element = document.getElementById('available-platforms');
                                element?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="rounded-full px-8"
                        >
                            Connect a Store
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Available Platforms - only show platforms not yet connected */}
            {availablePlatformsToConnect.length > 0 && (
            <div id="available-platforms" className="space-y-4 pt-4">
                <h2 className="text-xs font-bold tracking-widest text-[var(--text-tertiary)] uppercase flex items-center gap-2">
                    <Plug className="w-4 h-4" />
                    Available Platforms
                </h2>

                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
                    {availablePlatformsToConnect.map((platform, idx) => (
                        <Card
                            key={platform.id}
                            hover
                            className={cn(
                                "group border-[var(--border-subtle)] transition-all duration-300",
                                `stagger-${(idx % 4) + 1}`
                            )}
                        >
                            <CardContent className="p-6 h-full flex flex-col">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="h-14 w-14 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 p-3">
                                        <img
                                            src={platform.icon}
                                            className="w-full h-full object-contain"
                                            alt={`${platform.name} logo`}
                                            loading="lazy"
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                                {platform.name}
                                            </h3>
                                            {platform.popular && (
                                                <Badge variant="secondary" size="sm" className="bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] border-transparent font-medium">
                                                    Popular
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed line-clamp-2">
                                            {platform.description}
                                        </p>

                                        {/* Features List */}
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {platform.features.slice(0, 2).map((feature, i) => (
                                                <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-[var(--bg-secondary)] text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                                    {feature}
                                                </span>
                                            ))}
                                            {platform.features.length > 2 && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-[var(--bg-secondary)] text-[10px] font-semibold text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
                                                    +{platform.features.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-2">
                                    <Button
                                        onClick={() => router.push(platform.setupRoute)}
                                        variant="ghost"
                                        size="md"
                                        className={cn(
                                            "w-full rounded-[var(--radius-full)] border justify-center transition-all duration-300 group-hover:shadow-md",
                                            platform.bgClass,
                                            platform.borderClass,
                                            "text-[var(--text-primary)] hover:brightness-95"
                                        )}
                                        aria-label={`Connect ${platform.name}`}
                                    >
                                        <span className="flex items-center gap-2 font-semibold">
                                            Connect {platform.name}
                                            <ArrowRight className={cn("h-4 w-4", platform.colorClass)} />
                                        </span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            )}

            {/* Help Section */}
            <Card className="bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border-[var(--border-subtle)]">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                        <div className="h-12 w-12 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 shadow-sm">
                            <ExternalLink className="h-5 w-5 text-[var(--primary-blue)]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-[var(--text-primary)]">Need help with integrations?</h3>
                            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
                                Our support team can help you set up and configure your store integrations properly. Check our documentation or contact support.
                            </p>
                        </div>
                        <Button variant="secondary" className="shrink-0 font-medium">
                            Contact Support
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
