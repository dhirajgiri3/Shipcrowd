'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { Switch } from '@/src/components/ui/core/Switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/src/components/ui/feedback/Dialog';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import {
    useFeatureFlags,
    useToggleFeature,
} from '@/src/core/api/hooks/settings/useSettings';
import type { FeatureFlagItem } from '@/src/types/api/settings';
import { useAuth } from '@/src/features/auth';
import {
    AlertTriangle,
    Layers,
    Settings2,
    TestTube,
    Wallet,
} from 'lucide-react';

const CATEGORY_META: Record<string, { label: string; icon: any; description: string }> = {
    feature: {
        label: 'Core Features',
        icon: Layers,
        description: 'Primary platform modules and feature rollouts',
    },
    ops: {
        label: 'Operations',
        icon: Settings2,
        description: 'Operational controls and runtime switches',
    },
    experiment: {
        label: 'Experiments',
        icon: TestTube,
        description: 'Controlled experiments and partial rollouts',
    },
    billing: {
        label: 'Billing',
        icon: Wallet,
        description: 'Billing and finance related feature controls',
    },
};

export default function FeatureFlagsPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin';

    const { data: flags, isLoading } = useFeatureFlags();
    const toggleFeature = useToggleFeature();

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [flagToToggle, setFlagToToggle] = useState<FeatureFlagItem | null>(null);
    const [nextValue, setNextValue] = useState(false);

    const groupedFlags = useMemo(() => {
        const grouped: Record<string, FeatureFlagItem[]> = {};
        for (const flag of flags || []) {
            const category = flag.category || 'feature';
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(flag);
        }
        for (const list of Object.values(grouped)) {
            list.sort((a, b) => a.name.localeCompare(b.name));
        }
        return grouped;
    }, [flags]);

    const orderedCategories = useMemo(() => {
        const keys = Object.keys(groupedFlags);
        const priority = ['feature', 'ops', 'experiment', 'billing'];
        return keys.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
    }, [groupedFlags]);

    const requestToggle = (flag: FeatureFlagItem, enabled: boolean) => {
        if (!isSuperAdmin) {
            return;
        }

        if (flag.key === 'maintenance_mode' || flag.key === 'api_access') {
            setFlagToToggle(flag);
            setNextValue(enabled);
            setShowConfirmDialog(true);
            return;
        }

        toggleFeature.mutate({ key: flag.key, isEnabled: enabled });
    };

    const confirmToggle = async () => {
        if (!flagToToggle) return;
        await toggleFeature.mutateAsync({ key: flagToToggle.key, isEnabled: nextValue });
        setFlagToToggle(null);
        setShowConfirmDialog(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
                <PageHeader
                    title="Feature Management"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/admin' },
                        { label: 'Settings', href: '/admin/settings' },
                        { label: 'Feature Flags', active: true },
                    ]}
                    subtitle="Control system-wide feature availability"
                    showBack={false}
                />
                <div className="space-y-4 max-w-4xl">
                    <Skeleton className="h-48 w-full rounded-2xl" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-32 md:pb-20 animate-fade-in">
            <PageHeader
                title="Feature Management"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin' },
                    { label: 'Settings', href: '/admin/settings' },
                    { label: 'Feature Flags', active: true },
                ]}
                subtitle={isSuperAdmin ? 'Control system-wide feature availability' : 'View feature flags (read-only for admin role)'}
                showBack={false}
            />

            {!isSuperAdmin && (
                <Card className="max-w-4xl border-[var(--warning-border)] bg-[var(--warning-bg)]/20">
                    <CardContent className="py-3 text-sm text-[var(--warning-text)]">
                        You have read-only access. Only super admins can toggle feature flags.
                    </CardContent>
                </Card>
            )}

            {orderedCategories.length === 0 ? (
                <Card className="max-w-4xl">
                    <CardContent className="py-10 text-center text-[var(--text-muted)]">
                        No feature flags found.
                    </CardContent>
                </Card>
            ) : (
                <div className="max-w-4xl space-y-6">
                    {orderedCategories.map((category) => {
                        const meta = CATEGORY_META[category] || CATEGORY_META.feature;
                        const Icon = meta.icon;
                        return (
                            <Card key={category} className="border-[var(--border-subtle)]">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Icon className="h-4 w-4" />
                                        {meta.label}
                                    </CardTitle>
                                    <CardDescription>{meta.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {groupedFlags[category].map((flag) => (
                                        <div
                                            key={flag._id || flag.key}
                                            className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border-subtle)] p-4"
                                        >
                                            <div>
                                                <h4 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                                                    {flag.name}
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {flag.key}
                                                    </Badge>
                                                </h4>
                                                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                                    {flag.description}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-xs font-medium text-[var(--text-muted)]">
                                                    {flag.isEnabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                                <Switch
                                                    checked={flag.isEnabled}
                                                    disabled={!isSuperAdmin || toggleFeature.isPending}
                                                    onCheckedChange={() => requestToggle(flag, !flag.isEnabled)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
                            Confirm Action
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to <strong>{nextValue ? 'enable' : 'disable'}</strong> {flagToToggle?.name}?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmToggle}>Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
