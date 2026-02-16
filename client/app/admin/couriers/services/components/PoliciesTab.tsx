"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { SearchInput } from '@/src/components/ui/form/SearchInput';
import { useSellerCourierPolicy, useUpdateSellerCourierPolicy, useUserList } from '@/src/core/api/hooks/admin';
import { Save, User, ShieldCheck } from 'lucide-react';
import { Badge } from '@/src/components/ui/core/Badge';
import { Select } from '@/src/components/ui/form/Select';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { useToast } from '@/src/components/ui/feedback/Toast';

type ProviderKey = 'velocity' | 'delhivery' | 'ekart';

type PolicyForm = {
    isActive: boolean;
    selectionMode: 'manual_with_recommendation' | 'manual_only' | 'auto';
    autoPriority: 'price' | 'speed' | 'balanced';
    balancedDeltaPercent: string;
    allowedProviders: ProviderKey[];
    blockedProviders: ProviderKey[];
    allowedServiceIds: string[];
    blockedServiceIds: string[];
};

const defaultPolicyForm: PolicyForm = {
    isActive: true,
    selectionMode: 'manual_with_recommendation',
    autoPriority: 'balanced',
    balancedDeltaPercent: '5',
    allowedProviders: [],
    blockedProviders: [],
    allowedServiceIds: [],
    blockedServiceIds: [],
};

const PROVIDERS: ProviderKey[] = ['velocity', 'delhivery', 'ekart'];

const selectionModeOptions = [
    { label: 'Manual + Recommendation', value: 'manual_with_recommendation' },
    { label: 'Manual Only', value: 'manual_only' },
    { label: 'Auto Select', value: 'auto' },
];

const autoPriorityOptions = [
    { label: 'Balanced (Smart)', value: 'balanced' },
    { label: 'Cheapest (Price)', value: 'price' },
    { label: 'Fastest (Speed)', value: 'speed' },
];

export function PoliciesTab() {
    const { addToast } = useToast();
    const [sellerSearchInput, setSellerSearchInput] = useState('');
    const [sellerSearch, setSellerSearch] = useState('');
    const [selectedSellerId, setSelectedSellerId] = useState('');
    const [policyForm, setPolicyForm] = useState<PolicyForm>(defaultPolicyForm);

    // Debounce search input (300ms delay)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setSellerSearch(sellerSearchInput);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [sellerSearchInput]);

    const { data: sellersResponse, isLoading: isSellersLoading } = useUserList({
        role: 'seller',
        search: sellerSearch || undefined,
        page: 1,
        limit: 100,
    });

    // Memoize seller list to prevent unnecessary re-renders
    const sellers = useMemo(() => sellersResponse?.users || [], [sellersResponse]);

    const { data: sellerPolicy, isLoading: isPolicyLoading } = useSellerCourierPolicy(selectedSellerId);
    const updatePolicyMutation = useUpdateSellerCourierPolicy();

    useEffect(() => {
        if (!sellerPolicy || !selectedSellerId) {
            setPolicyForm(defaultPolicyForm);
            return;
        }
        setPolicyForm({
            isActive: sellerPolicy.isActive !== false,
            selectionMode: sellerPolicy.selectionMode || 'manual_with_recommendation',
            autoPriority: sellerPolicy.autoPriority || 'balanced',
            balancedDeltaPercent: String(sellerPolicy.balancedDeltaPercent ?? 5),
            allowedProviders: (sellerPolicy.allowedProviders || []) as ProviderKey[],
            blockedProviders: (sellerPolicy.blockedProviders || []) as ProviderKey[],
            allowedServiceIds: sellerPolicy.allowedServiceIds || [],
            blockedServiceIds: sellerPolicy.blockedServiceIds || [],
        });
    }, [sellerPolicy, selectedSellerId]);

    // Memoize callback to prevent re-renders of child components
    const togglePolicyProvider = useCallback((key: 'allowedProviders' | 'blockedProviders', provider: ProviderKey, checked: boolean) => {
        setPolicyForm((prev) => {
            const current = new Set(prev[key]);
            if (checked) {
                current.add(provider);
            } else {
                current.delete(provider);
            }
            return { ...prev, [key]: Array.from(current) as ProviderKey[] };
        });
    }, []);

    const saveSellerPolicy = async () => {
        if (!selectedSellerId) {
            addToast('Please select a seller first', 'error');
            return;
        }

        const allowed = Array.from(new Set(policyForm.allowedProviders));
        const blocked = Array.from(new Set(policyForm.blockedProviders.filter((provider) => !allowed.includes(provider))));
        const balancedDeltaPercent = Number(policyForm.balancedDeltaPercent || '5');

        if (!Number.isFinite(balancedDeltaPercent) || balancedDeltaPercent < 0 || balancedDeltaPercent > 100) {
            addToast('Balanced delta must be between 0 and 100', 'error');
            return;
        }

        try {
            await updatePolicyMutation.mutateAsync({
                sellerId: selectedSellerId,
                data: {
                    isActive: policyForm.isActive,
                    selectionMode: policyForm.selectionMode,
                    autoPriority: policyForm.autoPriority,
                    balancedDeltaPercent,
                    allowedProviders: allowed,
                    blockedProviders: blocked,
                    allowedServiceIds: policyForm.allowedServiceIds,
                    blockedServiceIds: policyForm.blockedServiceIds,
                },
            });
        } catch {
            // handled by mutation hook
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
            <div className="lg:col-span-1 h-full flex flex-col">
                <Card className="h-full flex flex-col">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Select Seller</CardTitle>
                        <CardDescription>Configure policies for a specific seller.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-3 min-h-0 pb-4">
                        <div className="shrink-0">
                            <SearchInput
                                placeholder="Search seller..."
                                value={sellerSearchInput}
                                onChange={(e) => setSellerSearchInput(e.target.value)}
                                widthClass="w-full"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-premium">
                            {isSellersLoading ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="h-8 w-8 rounded-full" />
                                                <div className="flex-1 space-y-2">
                                                    <Skeleton className="h-4 w-32" />
                                                    <Skeleton className="h-3 w-48" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : sellers.length > 0 ? (
                                sellers.map((seller) => (
                                    <button
                                        key={seller._id}
                                        onClick={() => setSelectedSellerId(seller._id)}
                                        className={`w-full text-left p-3 rounded-lg text-sm transition-all duration-200 group border text-[var(--text-secondary)] ${selectedSellerId === seller._id
                                            ? 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue-deep)] border-[var(--primary-blue)]/30 shadow-sm shadow-blue-500/5'
                                            : 'border-transparent hover:bg-[var(--bg-hover)]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${selectedSellerId === seller._id ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] group-hover:bg-[var(--bg-levated)]'
                                                }`}>
                                                <User className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className={`font-medium truncate ${selectedSellerId === seller._id ? 'text-[var(--primary-blue-deep)]' : 'text-[var(--text-primary)]'}`}>
                                                    {seller.name}
                                                </div>
                                                <div className="text-xs opacity-80 truncate">{seller.email}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="py-8 text-center text-sm text-[var(--text-muted)] flex flex-col items-center">
                                    <Search className="h-8 w-8 mb-2 opacity-20" />
                                    No sellers found
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2 h-full flex flex-col">
                {selectedSellerId ? (
                    isPolicyLoading ? (
                        <Card className="h-full flex flex-col">
                            <CardHeader className="pb-4 border-b border-[var(--border-subtle)]">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-48" />
                                        <Skeleton className="h-4 w-64" />
                                    </div>
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto space-y-6 pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                </div>
                                <Skeleton className="h-32 w-full rounded-xl" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Skeleton className="h-48 w-full rounded-xl" />
                                    <Skeleton className="h-48 w-full rounded-xl" />
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="h-full flex flex-col animate-fade-in border-[var(--primary-blue)]/20 shadow-sm">
                            <CardHeader className="pb-4 border-b border-[var(--border-subtle)]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <ShieldCheck className="h-5 w-5 text-[var(--primary-blue)]" />
                                            Policy Configuration
                                        </CardTitle>
                                        <CardDescription>Rules that determine carrier selection.</CardDescription>
                                    </div>
                                    <Badge variant={policyForm.isActive ? 'default' : 'secondary'}>
                                        {policyForm.isActive ? 'Active Policy' : 'Policy Inactive'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto space-y-6 pt-6 scrollbar-premium">
                                {/* Controls */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">Selection Mode</label>
                                        <Select
                                            value={policyForm.selectionMode}
                                            onChange={(e) => setPolicyForm({ ...policyForm, selectionMode: e.target.value as PolicyForm['selectionMode'] })}
                                            options={selectionModeOptions}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">Auto Priority</label>
                                        <Select
                                            value={policyForm.autoPriority}
                                            onChange={(e) => setPolicyForm({ ...policyForm, autoPriority: e.target.value as PolicyForm['autoPriority'] })}
                                            options={autoPriorityOptions}
                                        />
                                    </div>
                                </div>

                                <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border-subtle)]">
                                    <div className="flex items-end gap-6">
                                        <div className="flex-1 space-y-3">
                                            <label className="text-sm font-medium text-[var(--text-primary)]">Balanced Delta Tolerance (%)</label>
                                            <Input
                                                type="number"
                                                value={policyForm.balancedDeltaPercent}
                                                className="bg-[var(--bg-primary)]"
                                                onChange={(e) => setPolicyForm({ ...policyForm, balancedDeltaPercent: e.target.value })}
                                                placeholder="5"
                                            />
                                            <p className="text-xs text-[var(--text-muted)]">Allowed price deviation for faster delivery options.</p>
                                        </div>
                                        <div className="pb-3">
                                            <label className="flex items-center gap-3 text-sm font-medium cursor-pointer select-none px-4 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                                                    checked={policyForm.isActive}
                                                    onChange={(e) => setPolicyForm({ ...policyForm, isActive: e.target.checked })}
                                                />
                                                Policy Active
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-[var(--color-success)]"></span>
                                            Allowed Providers
                                        </h4>
                                        <div className="space-y-2 bg-[var(--bg-tertiary)]/30 p-4 rounded-xl border border-[var(--border-subtle)]">
                                            {PROVIDERS.map((provider) => (
                                                <label key={`allowed-${provider}`} className="flex items-center justify-between gap-2 text-sm cursor-pointer hover:bg-[var(--bg-hover)] p-3 rounded-lg transition-colors bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm">
                                                    <span className="capitalize font-medium">{provider}</span>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                                                        checked={policyForm.allowedProviders.includes(provider)}
                                                        onChange={(e) => togglePolicyProvider('allowedProviders', provider, e.target.checked)}
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-[var(--color-error)]"></span>
                                            Blocked Providers
                                        </h4>
                                        <div className="space-y-2 bg-[var(--bg-tertiary)]/30 p-4 rounded-xl border border-[var(--border-subtle)]">
                                            {PROVIDERS.map((provider) => (
                                                <label key={`blocked-${provider}`} className="flex items-center justify-between gap-2 text-sm cursor-pointer hover:bg-[var(--bg-hover)] p-3 rounded-lg transition-colors bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-sm">
                                                    <span className="capitalize font-medium text-[var(--text-secondary)]">{provider}</span>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--color-error)] focus:ring-[var(--color-error)]"
                                                        checked={policyForm.blockedProviders.includes(provider)}
                                                        onChange={(e) => togglePolicyProvider('blockedProviders', provider, e.target.checked)}
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/20">
                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setSelectedSellerId('')}>Cancel</Button>
                                    <Button onClick={saveSellerPolicy} disabled={updatePolicyMutation.isPending} className="min-w-[120px]">
                                        {updatePolicyMutation.isPending ? (
                                            <div className="h-4 w-4 mr-2 border-2 border-[var(--text-inverse)] border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        {updatePolicyMutation.isPending ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )
                ) : (
                    <EmptyState
                        variant="noData"
                        icon={<User className="h-12 w-12" />}
                        title="No Seller Selected"
                        description="Select a seller from the list on the left to configure their specific courier policies and preferences."
                        className="h-full"
                    />
                )}
            </div>
        </div>
    );
}
