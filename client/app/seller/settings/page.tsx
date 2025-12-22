"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/shared/components/card';
import { Button } from '@/src/shared/components/button';
import { Input } from '@/src/shared/components/Input';
import { Badge } from '@/src/shared/components/badge';
import { User, Bell, Lock, Globe, CreditCard, Building2, Key } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/src/shared/components/Toast';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const { addToast } = useToast();

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'company', label: 'Company', icon: Building2 },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'integrations', label: 'Integrations', icon: Globe },
        { id: 'api', label: 'API Keys', icon: Key },
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
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all
                                ${activeTab === tab.id
                                    ? 'bg-[#2525FF]/5 text-[#2525FF] border border-[#2525FF]/10'
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
                                <CardDescription>Update your personal details and preferences.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                                    <div className="h-20 w-20 rounded-xl bg-[#2525FF] flex items-center justify-center text-white text-2xl font-bold">
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
                                    <Input defaultValue="dhiraj.giri@shipcrowd.in" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                                    <Input defaultValue="+91 98765 43210" />
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <Button onClick={() => addToast('Profile saved successfully!', 'success')}>Save Changes</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'company' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Company Information</CardTitle>
                                <CardDescription>Manage your business details and branding.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Company Name</label>
                                    <Input defaultValue="ShipCrowd" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">GSTIN</label>
                                        <Input defaultValue="29AABCT1234F1ZH" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">PAN</label>
                                        <Input defaultValue="AABCT1234F" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Business Address</label>
                                    <Input defaultValue="123, Tech Park, Whitefield" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">City</label>
                                        <Input defaultValue="Bangalore" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">State</label>
                                        <Input defaultValue="Karnataka" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Pincode</label>
                                        <Input defaultValue="560066" />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <Button onClick={() => addToast('Company details saved!', 'success')}>Save Changes</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'integrations' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Connected Platforms</CardTitle>
                                <CardDescription>Manage your store integrations and sync settings.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {[
                                    { name: 'Shopify', status: 'Connected', icon: 'https://cdn.worldvectorlogo.com/logos/shopify.svg' },
                                    { name: 'WooCommerce', status: 'Disconnected', icon: 'https://cdn.worldvectorlogo.com/logos/woocommerce.svg' },
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
                                            <Button variant="outline" size="sm">
                                                {platform.status === 'Connected' ? 'Configure' : 'Connect'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'api' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>API Keys</CardTitle>
                                <CardDescription>Manage your API keys for external integrations.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 border border-gray-100 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">Production API Key</p>
                                            <p className="text-xs text-[var(--text-muted)]">Created on Dec 1, 2024</p>
                                        </div>
                                        <Badge variant="success">Active</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value="sk_live_******************"
                                            disabled
                                            className="font-mono text-sm"
                                        />
                                        <Button variant="outline" size="sm" onClick={() => addToast('API key copied!', 'success')}>
                                            Copy
                                        </Button>
                                    </div>
                                </div>
                                <Button variant="outline" onClick={() => addToast('New API key generated!', 'success')}>
                                    <Key className="h-4 w-4 mr-2" />
                                    Generate New Key
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Placeholder for other tabs */}
                    {!['profile', 'company', 'integrations', 'api'].includes(activeTab) && (
                        <Card>
                            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                                    <Lock className="w-6 h-6 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-[var(--text-primary)]">Settings Section</h3>
                                <p className="text-[var(--text-muted)] max-w-sm mt-2">
                                    This section is under development. Functionality will be available soon.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
