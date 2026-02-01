"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { Plug, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useIntegrations } from '@/src/core/api/hooks/integrations/useIntegrations';
import { useUserList } from '@/src/core/api/hooks/admin/useUserManagement';

const MOCK_INTEGRATIONS = [
    { name: 'Shopify', status: 'connected', ordersSync: 12450, lastSync: '2 mins ago', logo: 'https://cdn.worldvectorlogo.com/logos/shopify.svg' },
    { name: 'WooCommerce', status: 'connected', ordersSync: 6720, lastSync: '15 mins ago', logo: 'https://cdn.worldvectorlogo.com/logos/woocommerce.svg' },
    { name: 'Amazon Seller', status: 'disconnected', ordersSync: 0, lastSync: 'Never', logo: 'https://toppng.com/uploads/preview/amazon-logo-vector-1157394522189k5iof9l3.png' },
    { name: 'Flipkart', status: 'disconnected', ordersSync: 0, lastSync: 'Never', logo: 'https://cdn.worldvectorlogo.com/logos/flipkart.svg' },
];

const MOCK_USERS = [
    { name: 'Rajesh Kumar', email: 'rajesh@Shipcrowd.in', role: 'Admin', status: 'Active', lastActive: '2 mins ago' },
    { name: 'Priya Sharma', email: 'priya@Shipcrowd.in', role: 'Operations', status: 'Active', lastActive: '10 mins ago' },
    { name: 'Amit Verma', email: 'amit@Shipcrowd.in', role: 'Finance', status: 'Active', lastActive: '1 hour ago' },
    { name: 'Sneha Patel', email: 'sneha@Shipcrowd.in', role: 'Support', status: 'Inactive', lastActive: '2 days ago' },
];

export function IntegrationsClient() {
    // --- REAL API INTEGRATION ---
    const { data: integrationsResponse, isLoading: integrationsLoading } = useIntegrations();
    const { data: usersResponse, isLoading: usersLoading } = useUserList({ page: 1, limit: 10 });

    // Extract data with fallback
    const integrations = integrationsResponse?.integrations || [];
    const isUsingMockIntegrations = !integrationsResponse?.integrations;

    const users = usersResponse?.users || [];
    const isUsingMockUsers = !usersResponse?.users;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Mock Data Indicators */}
            {(isUsingMockIntegrations || isUsingMockUsers) && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                        ⚠️ Using mock data (API data not available)
                    </p>
                </div>
            )}

            {/* 1. Integrations Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Plug className="h-6 w-6 text-[var(--primary-blue)]" />
                            Integrations & Users
                        </h2>
                        <p className="text-[var(--text-secondary)] text-sm mt-1">E-commerce connections and team management</p>
                    </div>
                    <Button className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue)]/90">
                        + Add Integration
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {(integrations.length > 0 ? integrations : MOCK_INTEGRATIONS).map((integration: any, idx: number) => (
                        <Card key={idx} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="h-10 w-10 flex items-center justify-center">
                                        <img src={integration.logo} alt={integration.name} className="h-full w-full object-contain" />
                                    </div>
                                    <Badge variant={
                                        integration.status === 'connected' ? 'success' :
                                            integration.status === 'error' ? 'warning' : 'neutral'
                                    }>
                                        {integration.status}
                                    </Badge>
                                </div>
                                <h3 className="font-semibold text-[var(--text-primary)] mb-1">{integration.name}</h3>
                                <p className="text-xs text-[var(--text-muted)] mb-3">
                                    {integration.ordersSync.toLocaleString()} orders synced
                                </p>
                                <div className="text-[10px] text-[var(--text-muted)] mb-3">
                                    Last sync: {integration.lastSync}
                                </div>
                                <Button
                                    size="sm"
                                    variant={integration.status === 'connected' ? 'outline' : 'secondary'}
                                    className="w-full text-xs"
                                >
                                    {integration.status === 'connected' ? 'Configure' : 'Connect Now'}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* 2. User Management Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Team Members</h3>
                    <Button variant="outline">+ Invite User</Button>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Name</th>
                                        <th className="px-6 py-3 font-medium">Email</th>
                                        <th className="px-6 py-3 font-medium">Role</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium">Last Active</th>
                                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {(users.length > 0 ? users : MOCK_USERS).map((user: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-[var(--bg-secondary)]">
                                            <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{user.name}</td>
                                            <td className="px-6 py-4 text-[var(--text-secondary)]">{user.email}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline">{user.role}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={user.status === 'Active' ? 'success' : 'neutral'}>
                                                    {user.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-[var(--text-muted)]">{user.lastActive}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Button size="sm" variant="ghost" className="h-8 text-xs">
                                                    Manage
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
