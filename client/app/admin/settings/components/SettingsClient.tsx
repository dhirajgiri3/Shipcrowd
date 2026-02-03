"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { User, Bell, Lock, Globe, CreditCard, Loader2 } from 'lucide-react';
import { useProfile, useProfileUpdate } from '@/src/core/api/hooks/identity/useProfile';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { cn } from '@/src/lib/utils';
import { Loader } from '@/src/components/ui/feedback/Loader';

export function SettingsClient() {
    const [activeTab, setActiveTab] = useState('profile');
    const { data: user, isLoading } = useProfile();
    const { mutate: updateProfile, isPending: isUpdating } = useProfileUpdate();
    const { addToast } = useToast();

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '' // Read-only usually
    });

    // Sync form data when user loads
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phone: user.profile?.phone || '',
                email: user.email || ''
            });
        }
    }, [user]);

    const handleSaveProfile = () => {
        if (!user) return;

        // Basic validation
        if (!formData.name.trim()) {
            addToast('Name is required', 'error');
            return;
        }

        updateProfile({
            name: formData.name,
            phone: formData.phone
        });
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'integrations', label: 'Integrations', icon: Globe },
        { id: 'billing', label: 'Billing', icon: CreditCard },
    ];

    if (isLoading) {
        return <Loader fullScreen message="Loading settings..." />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation for Settings */}
                <aside className="w-full md:w-64 space-y-2">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 px-2">Settings</h2>
                    <div className="flex flex-col gap-1">
                        {tabs.map((tab) => (
                            <Button
                                key={tab.id}
                                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full justify-start gap-3 px-4 py-2 font-medium",
                                    activeTab === tab.id
                                        ? "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)] hover:text-[var(--primary-blue)]"
                                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 space-y-6">
                    {activeTab === 'profile' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>Update your account details and public profile.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-6 pb-6 border-b border-[var(--border-subtle)]">
                                    <div className="h-20 w-20 rounded-full bg-[var(--primary-blue-soft)] flex items-center justify-center text-[var(--primary-blue)] text-2xl font-bold">
                                        {user?.name?.substring(0, 2).toUpperCase() || 'US'}
                                    </div>
                                    <div>
                                        <Button variant="outline" size="sm">Change Avatar</Button>
                                        <p className="text-xs text-[var(--text-muted)] mt-2">JPG, GIF or PNG. Max size of 800K</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-[var(--text-primary)]">Full Name</label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--text-primary)]">Phone Number</label>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--text-primary)]">Email Address</label>
                                        <Input
                                            value={formData.email}
                                            disabled
                                            className="bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                                        />
                                        <p className="text-xs text-[var(--text-muted)]">Email cannot be changed directly.</p>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button
                                        onClick={handleSaveProfile}
                                        disabled={isUpdating}
                                        className="min-w-[120px]"
                                    >
                                        {isUpdating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </Button>
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
                                    <div key={platform.name} className="flex items-center justify-between p-4 border border-[var(--border-subtle)] rounded-xl hover:bg-[var(--bg-secondary)]/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 p-1 flex items-center justify-center bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)]">
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
                                    <Lock className="w-6 h-6 text-[var(--text-disabled)]" />
                                </div>
                                <h3 className="text-lg font-medium text-[var(--text-primary)]">{tabs.find(t => t.id === activeTab)?.label} Section</h3>
                                <p className="text-[var(--text-muted)] max-w-sm mt-2">
                                    This section is currently under development. Please check back later for updates.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
