"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { User, Bell, Lock, Globe, CreditCard } from 'lucide-react';
import { useState } from 'react';

export function SettingsClient() {
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'integrations', label: 'Integrations', icon: Globe },
        { id: 'billing', label: 'Billing', icon: CreditCard },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation for Settings */}
                <aside className="w-full md:w-64 space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 px-2">Settings</h2>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
                                ${activeTab === tab.id
                                    ? 'bg-indigo-50 text-[#2525FF]'
                                    : 'text-gray-600 hover:bg-[var(--bg-hover)] hover:text-gray-900'
                                }`
                            }
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 space-y-6">
                    {activeTab === 'profile' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>Update your account details and public profile.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                                    <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-bold">
                                        DG
                                    </div>
                                    <div>
                                        <Button variant="outline" size="sm">Change Avatar</Button>
                                        <p className="text-xs text-[var(--text-muted)] mt-2">JPG, GIF or PNG. Max size of 800K</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">First Name</label>
                                        <Input defaultValue="Dhiraj" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Last Name</label>
                                        <Input defaultValue="Giri" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                                    <Input defaultValue="dhiraj.giri@Shipcrowd.in" />
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <Button>Save Changes</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'integrations' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Connected Platforms</CardTitle>
                                <CardDescription>Manage your store integrations and API keys.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {[
                                    { name: 'Shopify', status: 'Connected', icon: 'https://cdn.worldvectorlogo.com/logos/shopify.svg' },
                                    { name: 'WooCommerce', status: 'Disconnected', icon: 'https://cdn.worldvectorlogo.com/logos/woocommerce.svg' },
                                    { name: 'Magento', status: 'Disconnected', icon: 'https://cdn.worldvectorlogo.com/logos/magento.svg' },
                                ].map((platform) => (
                                    <div key={platform.name} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 p-1 flex items-center justify-center bg-[var(--bg-secondary)] rounded-lg">
                                                <img src={platform.icon} className="w-6 h-6 object-contain" alt="" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-[var(--text-primary)]">{platform.name}</h4>
                                                <p className="text-xs text-[var(--text-muted)]">Sync orders and inventory</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant={platform.status === 'Connected' ? 'success' : 'neutral'}>
                                                {platform.status}
                                            </Badge>
                                            <Button variant="outline" size="sm">Configure</Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Placeholder for other tabs */}
                    {(activeTab !== 'profile' && activeTab !== 'integrations') && (
                        <Card>
                            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                                    <Lock className="w-6 h-6 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-[var(--text-primary)]">Settings Section</h3>
                                <p className="text-[var(--text-muted)] max-w-sm mt-2">
                                    This section is under development for the demo usage. Functionality will be available in production.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
