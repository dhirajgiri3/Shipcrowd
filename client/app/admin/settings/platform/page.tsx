'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/src/components/ui/core/Card';
import { Input } from '@/src/components/ui/core/Input';
import { Label } from '@/src/components/ui/core/Label';
import { Badge } from '@/src/components/ui/core/Badge';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import {
    usePlatformSettings,
    useUpdatePlatformSettings,
} from '@/src/core/api/hooks/settings/useSettings';
import { Save, Shield, Building2 } from 'lucide-react';
import { useAuth } from '@/src/features/auth';

export default function PlatformSettingsPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin';

    const { data: settings, isLoading } = usePlatformSettings();
    const updateSettings = useUpdatePlatformSettings();

    const [metroCitiesText, setMetroCitiesText] = useState('');

    useEffect(() => {
        if (settings) {
            setMetroCitiesText((settings.serviceability.metroCities || []).join(', '));
        }
    }, [settings]);

    const parsedMetroCities = useMemo(
        () => metroCitiesText.split(',').map((city) => city.trim()).filter(Boolean),
        [metroCitiesText]
    );

    const hasChanges = useMemo(() => {
        if (!settings) return false;
        const current = settings.serviceability.metroCities || [];
        return JSON.stringify([...current].sort()) !== JSON.stringify([...parsedMetroCities].map((c) => c.toUpperCase()).sort());
    }, [parsedMetroCities, settings]);

    const handleSave = async () => {
        await updateSettings.mutateAsync({
            serviceability: {
                metroCities: parsedMetroCities,
            },
        });
    };

    if (isLoading || !settings) {
        return (
            <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
                <PageHeader
                    title="Platform Settings"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/admin' },
                        { label: 'Settings', href: '/admin/settings' },
                        { label: 'Platform', active: true },
                    ]}
                    subtitle="Manage live platform configuration"
                    showBack={false}
                />
                <div className="space-y-4 max-w-4xl">
                    <Skeleton className="h-48 w-full rounded-2xl" />
                    <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
            <PageHeader
                title="Platform Settings"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin' },
                    { label: 'Settings', href: '/admin/settings' },
                    { label: 'Platform', active: true },
                ]}
                subtitle="Manage live platform configuration"
                showBack={false}
                actions={
                    <Button onClick={handleSave} disabled={!isSuperAdmin || !hasChanges || updateSettings.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                }
            />

            {!isSuperAdmin && (
                <Card className="max-w-4xl border-[var(--warning-border)] bg-[var(--warning-bg)]/20">
                    <CardContent className="py-3 text-sm text-[var(--warning-text)]">
                        You have read-only access. Only super admins can update platform settings.
                    </CardContent>
                </Card>
            )}

            <div className="max-w-4xl space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Serviceability Settings
                        </CardTitle>
                        <CardDescription>
                            Metro cities used by zone calculation logic. Comma-separated values.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Label htmlFor="metroCities">Metro Cities</Label>
                        <Input
                            id="metroCities"
                            value={metroCitiesText}
                            onChange={(e) => setMetroCitiesText(e.target.value)}
                            disabled={!isSuperAdmin}
                            placeholder="NEW DELHI, MUMBAI, BENGALURU"
                        />
                        <p className="text-xs text-[var(--text-muted)]">
                            Current entries: {parsedMetroCities.length}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Integration & Security Status
                        </CardTitle>
                        <CardDescription>
                            Environment-backed read-only status (secrets are never shown here).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                                <div className="text-sm font-medium">Email</div>
                                <div className="mt-2 flex items-center gap-2">
                                    <Badge variant={settings.integrations.email.configured ? 'success' : 'outline'}>
                                        {settings.integrations.email.configured ? 'Configured' : 'Not Configured'}
                                    </Badge>
                                    <span className="text-xs text-[var(--text-muted)]">{settings.integrations.email.provider}</span>
                                </div>
                            </div>
                            <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                                <div className="text-sm font-medium">SMS</div>
                                <div className="mt-2 flex items-center gap-2">
                                    <Badge variant={settings.integrations.sms.configured ? 'success' : 'outline'}>
                                        {settings.integrations.sms.configured ? 'Configured' : 'Not Configured'}
                                    </Badge>
                                    <span className="text-xs text-[var(--text-muted)]">{settings.integrations.sms.provider}</span>
                                </div>
                            </div>
                            <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                                <div className="text-sm font-medium">Payment</div>
                                <div className="mt-2 flex items-center gap-2">
                                    <Badge variant={settings.integrations.payment.configured ? 'success' : 'outline'}>
                                        {settings.integrations.payment.configured ? 'Configured' : 'Not Configured'}
                                    </Badge>
                                    <span className="text-xs text-[var(--text-muted)]">{settings.integrations.payment.provider}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-[var(--border-subtle)] p-3 space-y-2">
                            <div className="text-sm font-medium">Allowed Origins</div>
                            <div className="text-xs text-[var(--text-muted)]">
                                CORS: {settings.security.corsAllowedOrigins.join(', ') || 'None'}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                                CSRF: {settings.security.csrfAllowedOrigins.join(', ') || 'None'}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
