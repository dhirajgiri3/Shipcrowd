"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import { Label } from '@/src/components/ui/core/Label';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useAuth } from '@/src/features/auth';
import {
    useSellerCourierPolicy,
    useUpdateSellerCourierPolicy,
} from '@/src/core/api/hooks/admin/couriers/useSellerCourierPolicy';
import { ShieldCheck, Save } from 'lucide-react';

type Provider = 'velocity' | 'delhivery' | 'ekart';
const PROVIDERS: Provider[] = ['velocity', 'delhivery', 'ekart'];

type PolicyForm = {
    selectionMode: 'manual_with_recommendation' | 'manual_only' | 'auto';
    autoPriority: 'price' | 'speed' | 'balanced';
    balancedDeltaPercent: number;
    allowedProviders: Provider[];
    blockedProviders: Provider[];
    isActive: boolean;
};

const DEFAULT_FORM: PolicyForm = {
    selectionMode: 'manual_with_recommendation',
    autoPriority: 'balanced',
    balancedDeltaPercent: 5,
    allowedProviders: [],
    blockedProviders: [],
    isActive: true,
};

export function CouriersClient() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const sellerId = user?._id || '';
    const { data: policy, isLoading } = useSellerCourierPolicy(sellerId);
    const updatePolicy = useUpdateSellerCourierPolicy();
    const [form, setForm] = useState<PolicyForm>(DEFAULT_FORM);

    useEffect(() => {
        if (!policy) return;
        setForm({
            selectionMode: policy.selectionMode,
            autoPriority: policy.autoPriority,
            balancedDeltaPercent: policy.balancedDeltaPercent,
            allowedProviders: (policy.allowedProviders || []) as Provider[],
            blockedProviders: (policy.blockedProviders || []) as Provider[],
            isActive: policy.isActive,
        });
    }, [policy]);

    const selectedProviders = useMemo(
        () => (form.allowedProviders.length ? form.allowedProviders : PROVIDERS),
        [form.allowedProviders]
    );

    const toggleAllowedProvider = (provider: Provider) => {
        setForm((prev) => {
            const exists = prev.allowedProviders.includes(provider);
            const nextAllowed = exists
                ? prev.allowedProviders.filter((item) => item !== provider)
                : [...prev.allowedProviders, provider];
            const nextBlocked = prev.blockedProviders.filter((item) => item !== provider);
            return { ...prev, allowedProviders: nextAllowed, blockedProviders: nextBlocked };
        });
    };

    const savePolicy = async () => {
        if (!sellerId) {
            addToast('Unable to resolve seller identity', 'error');
            return;
        }

        try {
            await updatePolicy.mutateAsync({
                sellerId,
                data: {
                    selectionMode: form.selectionMode,
                    autoPriority: form.autoPriority,
                    balancedDeltaPercent: form.balancedDeltaPercent,
                    allowedProviders: form.allowedProviders,
                    blockedProviders: form.blockedProviders,
                    allowedServiceIds: [],
                    blockedServiceIds: [],
                    isActive: form.isActive,
                },
            });
            addToast('Courier policy updated', 'success');
        } catch {
            // handled in hook
        }
    };

    if (!sellerId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Courier Policy</CardTitle>
                    <CardDescription>Sign in again to load seller policy settings.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (isLoading) {
        return <Loader message="Loading courier policy..." />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-[var(--primary-blue)]" />
                    Courier Policy
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Configure provider eligibility and auto-selection strategy for your account.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Provider Selection</CardTitle>
                    <CardDescription>Select providers allowed for quote generation and booking.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {PROVIDERS.map((provider) => {
                            const enabled = selectedProviders.includes(provider);
                            return (
                                <button
                                    key={provider}
                                    type="button"
                                    onClick={() => toggleAllowedProvider(provider)}
                                    className={`px-3 py-2 rounded-lg text-sm border transition ${
                                        enabled
                                            ? 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] border-[var(--primary-blue)]/30'
                                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                                    }`}
                                >
                                    {provider}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={form.isActive ? 'success' : 'secondary'}>
                            {form.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Selection Strategy</CardTitle>
                    <CardDescription>Define how recommended options are chosen.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="selectionMode">Selection Mode</Label>
                        <select
                            id="selectionMode"
                            value={form.selectionMode}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    selectionMode: event.target.value as PolicyForm['selectionMode'],
                                }))
                            }
                            className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                        >
                            <option value="manual_with_recommendation">Manual + recommendation</option>
                            <option value="manual_only">Manual only</option>
                            <option value="auto">Auto</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="autoPriority">Auto Priority</Label>
                        <select
                            id="autoPriority"
                            value={form.autoPriority}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    autoPriority: event.target.value as PolicyForm['autoPriority'],
                                }))
                            }
                            className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                        >
                            <option value="balanced">Balanced</option>
                            <option value="price">Price</option>
                            <option value="speed">Speed</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="balancedDeltaPercent">Balanced Delta %</Label>
                        <input
                            id="balancedDeltaPercent"
                            type="number"
                            min={0}
                            max={100}
                            value={form.balancedDeltaPercent}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    balancedDeltaPercent: Number(event.target.value || 0),
                                }))
                            }
                            className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={savePolicy} disabled={updatePolicy.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Policy
                </Button>
            </div>
        </div>
    );
}
