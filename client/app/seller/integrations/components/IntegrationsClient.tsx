"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Plug,
    CheckCircle2,
    ArrowRight,
    RefreshCcw,
    Settings
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';

const integrations = [
    {
        name: 'Shopify',
        description: 'Sync orders and inventory automatically from your Shopify store',
        status: 'connected',
        lastSync: '2 min ago',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Shopify_logo_2018.svg',
        orders: 1245,
        color: '95BF47'
    },
    {
        name: 'WooCommerce',
        description: 'WordPress e-commerce integration for seamless order management',
        status: 'disconnected',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/WooCommerce_logo.svg',
        color: '96588A'
    },
    {
        name: 'Amazon',
        description: 'Sync orders and inventory from Amazon Seller Central',
        status: 'disconnected',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
        color: 'FF9900'
    },
    {
        name: 'Flipkart',
        description: 'Connect your Flipkart Seller account to manage orders',
        status: 'disconnected',
        icon: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/flipkart-icon.png',
        color: '2874F0'
    },
];

export function IntegrationsClient() {
    const { addToast } = useToast();

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
                <Badge variant="success" className="text-sm px-3 py-1">
                    {integrations.filter(i => i.status === 'connected').length} Connected
                </Badge>
            </div>

            {/* Connected Integrations */}
            {integrations.filter(i => i.status === 'connected').length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Connected</h3>
                    {integrations.filter(i => i.status === 'connected').map((integration, idx) => (
                        <Card key={idx} className="border-[var(--success)]/20 bg-[var(--success-bg)] hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-14 h-14 p-3 flex items-center justify-center bg-[var(--bg-primary)] rounded-xl shadow-sm flex-shrink-0">
                                            <img src={integration.icon!} className="w-full h-full object-contain" alt={integration.name} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-lg font-semibold text-[var(--text-primary)]">{integration.name}</h4>
                                                <Badge variant="success" className="text-xs">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Active
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] mb-3">{integration.description}</p>
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                                                <span className="flex items-center gap-1">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                                                    Last sync: {integration.lastSync}
                                                </span>
                                                <span>•</span>
                                                <span className="font-medium text-[var(--text-secondary)]">{integration.orders?.toLocaleString() || 0} orders synced</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addToast('Syncing...', 'info')}
                                        >
                                            <RefreshCcw className="h-4 w-4 mr-1.5" />
                                            Sync Now
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addToast('Opening settings...', 'info')}
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Available Integrations */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Available</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    {integrations.filter(i => i.status !== 'connected').map((integration, idx) => (
                        <Card key={idx} className="hover:shadow-md hover:border-[var(--primary-blue)]/20 transition-all group">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 p-3 flex items-center justify-center bg-[var(--bg-secondary)] rounded-xl group-hover:bg-[var(--primary-blue-soft)] transition-colors flex-shrink-0">
                                        <img src={integration.icon!} className="w-full h-full object-contain" alt={integration.name} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{integration.name}</h4>
                                        <p className="text-sm text-[var(--text-secondary)] mb-4">{integration.description}</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => addToast(`Connecting to ${integration.name}...`, 'info')}
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
