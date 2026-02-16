"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import { Building2, Globe, Loader2, Settings2, Shield, User, Wallet } from 'lucide-react';
import { useProfile, useProfileUpdate } from '@/src/core/api/hooks/identity/useProfile';
import { RoleAvatar } from '@/src/components/shared/RoleAvatar';

const SETTINGS_LINKS = [
    {
        title: 'Feature Flags',
        description: 'View and control backend feature switches',
        href: '/admin/settings/features',
        icon: Settings2,
    },
    {
        title: 'Platform Settings',
        description: 'Manage live serviceability and platform config',
        href: '/admin/settings/platform',
        icon: Globe,
    },
    {
        title: 'Integrations',
        description: 'Monitor ecommerce integration health and sync',
        href: '/admin/integrations',
        icon: Building2,
    },
    {
        title: 'Billing',
        description: 'Open billing and financial administration',
        href: '/admin/billing',
        icon: Wallet,
    },
    {
        title: 'Security',
        description: 'Review fraud and security operations controls',
        href: '/admin/security/fraud',
        icon: Shield,
    },
];

export function SettingsClient() {
    const { data: user, isLoading } = useProfile();
    const { mutate: updateProfile, isPending: isUpdating } = useProfileUpdate();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phone: user.profile?.phone || '',
                email: user.email || '',
            });
        }
    }, [user]);

    const dirty = useMemo(() => {
        if (!user) return false;
        return formData.name !== (user.name || '') || formData.phone !== (user.profile?.phone || '');
    }, [formData, user]);

    const handleSaveProfile = () => {
        if (!user || !dirty) return;
        updateProfile({
            name: formData.name,
            phone: formData.phone,
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
                <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <Skeleton className="h-64 w-full rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
            <PageHeader
                title="Settings"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin' },
                    { label: 'Settings', active: true },
                ]}
                subtitle="Manage your profile and open operational settings modules"
                showBack={false}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your admin account details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4 pb-5 border-b border-[var(--border-subtle)]">
                        <RoleAvatar
                            role={user?.role || 'admin'}
                            name={user?.name || 'Admin'}
                            size="lg"
                        />
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{user?.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">Default role-based avatar</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Full Name</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Phone Number</label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                                placeholder="+91 98765 43210"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Email Address</label>
                            <Input value={formData.email} disabled className="bg-[var(--bg-secondary)] text-[var(--text-muted)]" />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveProfile} disabled={isUpdating || !dirty} className="min-w-[120px]">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
                {SETTINGS_LINKS.map((item) => (
                    <Link key={item.href} href={item.href}>
                        <Card className="h-full hover:bg-[var(--bg-secondary)]/60 transition-colors cursor-pointer">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <item.icon className="w-4 h-4" />
                                    {item.title}
                                </CardTitle>
                                <CardDescription>{item.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
