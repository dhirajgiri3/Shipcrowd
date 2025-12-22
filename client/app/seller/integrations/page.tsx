"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent } from '@/src/shared/components/card';
import { Button } from '@/src/shared/components/button';
import { Badge } from '@/src/shared/components/badge';
import {
    Plug,
    CheckCircle2,
    ArrowRight,
    RefreshCcw,
    Settings
} from 'lucide-react';
import { useToast } from '@/src/shared/components/Toast';

const integrations = [
    {
        name: 'Shopify',
        description: 'Sync orders and inventory automatically from your Shopify store',
        status: 'connected',
        lastSync: '2 min ago',
        icon: 'https://cdn.worldvectorlogo.com/logos/shopify.svg',
        orders: 1245,
        color: '95BF47'
    },
    {
        name: 'WooCommerce',
        description: 'WordPress e-commerce integration for seamless order management',
        status: 'disconnected',
        icon: 'https://cdn.worldvectorlogo.com/logos/woocommerce.svg',
        color: '96588A'
    },
    {
        name: 'Amazon',
        description: 'Sync orders and inventory from Amazon Seller Central',
        status: 'disconnected',
        icon: 'https://toppng.com/uploads/preview/amazon-logo-vector-1157394522189k5iof9l3.png',
        color: 'FF9900'
    },
    {
        name: 'Flipkart',
        description: 'Connect your Flipkart Seller account to manage orders',
        status: 'disconnected',
        icon: 'https://cdn.worldvectorlogo.com/logos/flipkart.svg',
        color: '2874F0'
    },
];

export default function IntegrationsPage() {
    const { addToast } = useToast();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Plug className="h-6 w-6 text-[#2525FF]" />
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
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Connected</h3>
                    {integrations.filter(i => i.status === 'connected').map((integration, idx) => (
                        <Card key={idx} className="border-emerald-100 bg-emerald-50/20 hover:shadow-md transition-shadow">
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
                                            <p className="text-sm text-gray-600 mb-3">{integration.description}</p>
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                                                <span className="flex items-center gap-1">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                    Last sync: {integration.lastSync}
                                                </span>
                                                <span>•</span>
                                                <span className="font-medium text-gray-700">{integration.orders?.toLocaleString() || 0} orders synced</span>
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
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Available</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    {integrations.filter(i => i.status !== 'connected').map((integration, idx) => (
                        <Card key={idx} className="hover:shadow-md hover:border-[#2525FF]/20 transition-all group">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 p-3 flex items-center justify-center bg-[var(--bg-secondary)] rounded-xl group-hover:bg-[#2525FF]/5 transition-colors flex-shrink-0">
                                        <img src={integration.icon!} className="w-full h-full object-contain" alt={integration.name} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{integration.name}</h4>
                                        <p className="text-sm text-gray-600 mb-4">{integration.description}</p>
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
            <Card className="bg-[#2525FF]/5 border-[#2525FF]/10">
                <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-[#2525FF]/10 rounded-lg">
                            <Plug className="h-4 w-4 text-[#2525FF]" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Need help with integrations?</h4>
                            <p className="text-sm text-gray-600 mb-3">Our team can help you set up and configure your store integrations.</p>
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
