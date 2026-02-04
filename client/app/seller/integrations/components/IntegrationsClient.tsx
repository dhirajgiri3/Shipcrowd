"use client";
export const dynamic = "force-dynamic";

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Plug,
    CheckCircle2,
    ArrowRight,
    RefreshCcw,
    Settings,
    AlertCircle
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useIntegrationHealth, StoreHealth } from '@/src/core/api/hooks/integrations/useIntegrations';
import { cn } from '@/src/lib/utils';
import { formatDate } from '@/src/lib/utils'; // Assuming this utility exists

// Platform Metadata
const PLATFORMS = {
    shopify: {
        name: 'Shopify',
        description: 'Sync orders and inventory automatically from your Shopify store',
        icon: '/logos/shopify.svg',
        color: '95BF47',
        setupRoute: '/seller/integrations/shopify/setup'
    },
    woocommerce: {
        name: 'WooCommerce',
        description: 'WordPress e-commerce integration for seamless order management',
        icon: '/logos/woocommerce.svg',
        color: '96588A',
        setupRoute: '/seller/integrations/woocommerce/setup'
    },
    amazon: {
        name: 'Amazon',
        description: 'Sync orders and inventory from Amazon Seller Central',
        icon: '/logos/amazon.svg',
        color: 'FF9900',
        setupRoute: '/seller/integrations/amazon/setup'
    },
    flipkart: {
        name: 'Flipkart',
        description: 'Connect your Flipkart Seller account to manage orders',
        icon: '/logos/flipkart.png', // Ensure this matches actual file extension
        color: '2874F0',
        setupRoute: '/seller/integrations/flipkart/setup'
    }
};

export function IntegrationsClient() {
    const { addToast } = useToast();
    const router = useRouter();
    const { data, isLoading, error, refetch } = useIntegrationHealth();

    // Flatten connected stores from response
    const connectedStores = data?.platforms ? [
        ...(data.platforms.shopify?.stores?.map((s: any) => ({ ...s, platform: 'shopify' })) || []),
        ...(data.platforms.woocommerce?.stores?.map((s: any) => ({ ...s, platform: 'woocommerce' })) || []),
        ...(data.platforms.amazon?.stores?.map((s: any) => ({ ...s, platform: 'amazon' })) || []),
        ...(data.platforms.flipkart?.stores?.map((s: any) => ({ ...s, platform: 'flipkart' })) || [])
    ] : [];

    // Determine available integrations (platforms not yet connected, or allow multiple)
    // For simplicity, we show all compatible platforms in "Available" unless they are one-time connect only.
    // Assuming multi-store is allowed, we show all.
    // If strict unique platform needed: const connectedPlatforms = new Set(connectedStores.map(s => s.platform));
    const availablePlatforms = Object.entries(PLATFORMS).map(([key, meta]) => ({
        id: key,
        ...meta
    }));

    if (isLoading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-[var(--primary-blue-light)] border-t-[var(--primary-blue)] rounded-full animate-spin mb-4" />
                <p className="text-sm text-[var(--text-tertiary)]">Loading integrations...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-20 flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center text-[var(--error)] mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Failed to load integrations</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                    {error.message || "Something went wrong while fetching integration status."}
                </p>
                <Button onClick={() => refetch()} variant="outline">Try Again</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Plug className="h-6 w-6 text-[var(--primary-blue)]" />
                        Integrations
                    </h2>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Connect your stores and sync orders automatically</p>
                </div>
                {!isLoading && connectedStores.length > 0 && (
                    <Badge variant="success" className="text-sm px-3 py-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        {connectedStores.length} Connected
                    </Badge>
                )}
            </div>

            {/* Connected Integrations */}
            {connectedStores.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Connected Stores</h3>
                    {connectedStores.map((store, idx) => {
                        const meta = PLATFORMS[store.platform as keyof typeof PLATFORMS];
                        return (
                            <Card key={store.storeId} className="border-[var(--success)]/20 bg-[var(--success-bg)] hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="w-14 h-14 p-3 flex items-center justify-center bg-[var(--bg-primary)] rounded-xl shadow-sm flex-shrink-0">
                                                <img src={meta?.icon || '/placeholder.svg'} className="w-full h-full object-contain" alt={meta?.name} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-lg font-semibold text-[var(--text-primary)]">
                                                        {meta?.name} <span className="text-[var(--text-tertiary)] text-sm font-normal">({store.storeName})</span>
                                                    </h4>
                                                    <Badge
                                                        variant={store.isActive ? "success" : "secondary"}
                                                        className="text-xs flex items-center gap-1"
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        {store.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                    {store.isPaused && (
                                                        <Badge variant="warning" className="text-xs">Paused</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-[var(--text-secondary)] mb-3">
                                                    {store.storeUrl || meta?.description}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                                                    <span className="flex items-center gap-1">
                                                        <div className={cn("h-1.5 w-1.5 rounded-full", store.isActive ? "bg-[var(--success)]" : "bg-[var(--text-muted)]")} />
                                                        Last sync: {store.lastSyncAt ? formatDate(store.lastSyncAt) : 'Never'}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="font-medium text-[var(--text-secondary)]">
                                                        {store.syncSuccessRate ? `${store.syncSuccessRate}% success rate` : 'No sync data'}
                                                    </span>
                                                    {store.errorCount24h > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-[var(--error)] font-medium">{store.errorCount24h} errors (24h)</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addToast('Sync process started', 'info')}
                                                disabled={!store.isActive}
                                            >
                                                <RefreshCcw className="h-4 w-4 mr-1.5" />
                                                Sync Now
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push(`/seller/integrations/${store.platform}/${store.storeId}`)}
                                            >
                                                <Settings className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Available Integrations */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Available Platforms</h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {availablePlatforms.map((platform) => (
                        <Card key={platform.id} className="hover:shadow-md hover:border-[var(--primary-blue)]/20 transition-all group">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 p-3 flex items-center justify-center bg-[var(--bg-secondary)] rounded-xl group-hover:bg-[var(--primary-blue-soft)] transition-colors flex-shrink-0">
                                        <img src={platform.icon} className="w-full h-full object-contain" alt={platform.name} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{platform.name}</h4>
                                        <p className="text-sm text-[var(--text-secondary)] mb-4">{platform.description}</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => router.push(platform.setupRoute)}
                                        >
                                            Connect
                                            <ArrowRight className="h-4 w-4 ml-1.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Info Card */}
            <Card className="bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/10">
                <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-[var(--primary-blue)]/10 rounded-lg">
                            <Plug className="h-4 w-4 text-[var(--primary-blue)]" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Need help with integrations?</h4>
                            <p className="text-sm text-[var(--text-secondary)] mb-3">Our team can help you set up and configure your store integrations.</p>
                            <Button variant="outline" size="sm">
                                Contact Support
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
