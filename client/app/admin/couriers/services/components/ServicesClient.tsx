"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import {
    Settings,
    Search,
    Plus,
    Save,
    X,
    RefreshCw,
    Link,
    Power,
    SlidersHorizontal,
    UserCog,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
    useCourierServices,
    useCreateCourierService,
    useUpdateCourierService,
    useToggleCourierServiceStatus,
    useSyncProviderServices,
    useServiceRateCards,
    useCreateServiceRateCard,
    useUpdateServiceRateCard,
    useSellerCourierPolicy,
    useUpdateSellerCourierPolicy,
    useUserList,
    CourierServiceItem,
    ServiceRateCardItem,
} from '@/src/core/api/hooks/admin';
import { showErrorToast } from '@/src/lib/error';

type ServiceForm = {
    provider: 'velocity' | 'delhivery' | 'ekart';
    displayName: string;
    serviceCode: string;
    serviceType: 'surface' | 'express' | 'air' | 'standard';
    zoneSupport: string;
    minWeightKg: string;
    maxWeightKg: string;
    eddMinDays: string;
    eddMaxDays: string;
};

const defaultForm: ServiceForm = {
    provider: 'delhivery',
    displayName: '',
    serviceCode: '',
    serviceType: 'surface',
    zoneSupport: 'A,B,C,D,E',
    minWeightKg: '',
    maxWeightKg: '',
    eddMinDays: '',
    eddMaxDays: '',
};

const toZoneList = (value: string): string[] =>
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.toUpperCase());

const toOptionalNumber = (value: string): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

type RateCardForm = {
    serviceId: string;
    cardType: 'cost' | 'sell';
    sourceMode: 'LIVE_API' | 'TABLE' | 'HYBRID';
    status: 'draft' | 'active' | 'inactive';
    zoneKey: string;
    minKg: string;
    maxKg: string;
    charge: string;
    additionalPerKg: string;
};

const defaultRateCardForm: RateCardForm = {
    serviceId: '',
    cardType: 'sell',
    sourceMode: 'TABLE',
    status: 'active',
    zoneKey: 'zoneD',
    minKg: '0',
    maxKg: '0.5',
    charge: '',
    additionalPerKg: '0',
};

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

export function ServicesClient() {
    const [search, setSearch] = useState('');
    const [providerFilter, setProviderFilter] = useState<'all' | 'velocity' | 'delhivery' | 'ekart'>('all');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<CourierServiceItem | null>(null);
    const [form, setForm] = useState<ServiceForm>(defaultForm);

    const { data: services = [], isLoading, isFetching } = useCourierServices();
    const createMutation = useCreateCourierService();
    const updateMutation = useUpdateCourierService();
    const toggleMutation = useToggleCourierServiceStatus();
    const syncMutation = useSyncProviderServices();
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [rateCardForm, setRateCardForm] = useState<RateCardForm>(defaultRateCardForm);
    const [editingRateCard, setEditingRateCard] = useState<ServiceRateCardItem | null>(null);
    const { data: rateCards = [], isLoading: isRateCardsLoading } = useServiceRateCards(
        selectedServiceId ? { serviceId: selectedServiceId } : undefined
    );
    const createRateCardMutation = useCreateServiceRateCard();
    const updateRateCardMutation = useUpdateServiceRateCard();

    const [sellerSearch, setSellerSearch] = useState('');
    const [selectedSellerId, setSelectedSellerId] = useState('');
    const [policyForm, setPolicyForm] = useState<PolicyForm>(defaultPolicyForm);
    const { data: sellersResponse, isLoading: isSellersLoading } = useUserList({
        role: 'seller',
        search: sellerSearch || undefined,
        page: 1,
        limit: 100,
    });
    const sellers = sellersResponse?.users || [];
    const { data: sellerPolicy, isFetching: isPolicyFetching } = useSellerCourierPolicy(selectedSellerId);
    const updatePolicyMutation = useUpdateSellerCourierPolicy();

    const filtered = useMemo(() => {
        return services.filter((service) => {
            const providerOk = providerFilter === 'all' || service.provider === providerFilter;
            const query = search.trim().toLowerCase();
            const textOk =
                !query ||
                service.displayName.toLowerCase().includes(query) ||
                service.serviceCode.toLowerCase().includes(query);
            return providerOk && textOk;
        });
    }, [services, providerFilter, search]);

    useEffect(() => {
        if (!selectedServiceId && services.length > 0) {
            setSelectedServiceId(services[0]._id);
        }
    }, [selectedServiceId, services]);

    useEffect(() => {
        if (selectedServiceId && !editingRateCard) {
            setRateCardForm((prev) => ({ ...prev, serviceId: selectedServiceId }));
        }
    }, [selectedServiceId, editingRateCard]);

    useEffect(() => {
        if (!sellerPolicy || !selectedSellerId) {
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

    const resetForm = () => {
        setForm(defaultForm);
        setEditing(null);
        setShowForm(false);
    };

    const startCreate = () => {
        setEditing(null);
        setForm(defaultForm);
        setShowForm(true);
    };

    const startEdit = (item: CourierServiceItem) => {
        setEditing(item);
        setForm({
            provider: item.provider,
            displayName: item.displayName,
            serviceCode: item.serviceCode,
            serviceType: item.serviceType,
            zoneSupport: (item.zoneSupport || []).join(','),
            minWeightKg: String(item.constraints?.minWeightKg ?? ''),
            maxWeightKg: String(item.constraints?.maxWeightKg ?? ''),
            eddMinDays: String(item.sla?.eddMinDays ?? ''),
            eddMaxDays: String(item.sla?.eddMaxDays ?? ''),
        });
        setShowForm(true);
    };

    const saveService = async () => {
        const payload = {
            provider: form.provider,
            displayName: form.displayName.trim(),
            serviceCode: form.serviceCode.trim(),
            serviceType: form.serviceType,
            zoneSupport: toZoneList(form.zoneSupport),
            constraints: {
                minWeightKg: toOptionalNumber(form.minWeightKg),
                maxWeightKg: toOptionalNumber(form.maxWeightKg),
            },
            sla: {
                eddMinDays: toOptionalNumber(form.eddMinDays),
                eddMaxDays: toOptionalNumber(form.eddMaxDays),
            },
        };

        if (!payload.displayName || !payload.serviceCode) {
            showErrorToast('Display name and service code are required');
            return;
        }

        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing._id, data: payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
            resetForm();
        } catch {
            // handled by mutation hook
        }
    };

    const onToggle = async (item: CourierServiceItem) => {
        try {
            await toggleMutation.mutateAsync(item._id);
        } catch {
            // handled by mutation hook
        }
    };

    const syncProvider = async (provider: 'velocity' | 'delhivery' | 'ekart') => {
        try {
            await syncMutation.mutateAsync({ provider });
        } catch {
            // handled by mutation hook
        }
    };

    const resetRateCardForm = () => {
        setEditingRateCard(null);
        setRateCardForm((prev) => ({
            ...defaultRateCardForm,
            serviceId: selectedServiceId || prev.serviceId,
        }));
    };

    const editRateCard = (card: ServiceRateCardItem) => {
        const firstZone = card.zoneRules?.[0];
        const firstSlab = firstZone?.slabs?.[0];
        setEditingRateCard(card);
        setRateCardForm({
            serviceId: card.serviceId,
            cardType: card.cardType,
            sourceMode: card.sourceMode,
            status: card.status,
            zoneKey: firstZone?.zoneKey || 'zoneD',
            minKg: String(firstSlab?.minKg ?? 0),
            maxKg: String(firstSlab?.maxKg ?? 0.5),
            charge: String(firstSlab?.charge ?? 0),
            additionalPerKg: String(firstZone?.additionalPerKg ?? 0),
        });
    };

    const saveRateCard = async () => {
        const minKg = Number(rateCardForm.minKg);
        const maxKg = Number(rateCardForm.maxKg);
        const charge = Number(rateCardForm.charge);
        const additionalPerKg = Number(rateCardForm.additionalPerKg || 0);

        if (!rateCardForm.serviceId) {
            showErrorToast('Select a service before saving rate card');
            return;
        }

        if (!Number.isFinite(minKg) || !Number.isFinite(maxKg) || maxKg < minKg) {
            showErrorToast('Weight slab is invalid');
            return;
        }

        if (!Number.isFinite(charge) || charge < 0 || !Number.isFinite(additionalPerKg) || additionalPerKg < 0) {
            showErrorToast('Charges must be non-negative numbers');
            return;
        }

        const payload: Partial<ServiceRateCardItem> = {
            serviceId: rateCardForm.serviceId,
            cardType: rateCardForm.cardType,
            sourceMode: rateCardForm.sourceMode,
            status: rateCardForm.status,
            currency: 'INR',
            effectiveDates: {
                startDate: new Date().toISOString(),
            },
            calculation: {
                weightBasis: 'max',
                roundingUnitKg: 0.5,
                roundingMode: 'ceil',
                dimDivisor: 5000,
            },
            zoneRules: [
                {
                    zoneKey: rateCardForm.zoneKey.trim() || 'zoneD',
                    slabs: [
                        {
                            minKg,
                            maxKg,
                            charge,
                        },
                    ],
                    additionalPerKg,
                },
            ],
        };

        try {
            if (editingRateCard) {
                await updateRateCardMutation.mutateAsync({
                    id: editingRateCard._id,
                    data: payload,
                });
            } else {
                await createRateCardMutation.mutateAsync(payload);
            }
            resetRateCardForm();
        } catch {
            // handled by mutation hook
        }
    };

    const togglePolicyProvider = (key: 'allowedProviders' | 'blockedProviders', provider: ProviderKey, checked: boolean) => {
        setPolicyForm((prev) => {
            const current = new Set(prev[key]);
            if (checked) {
                current.add(provider);
            } else {
                current.delete(provider);
            }
            return { ...prev, [key]: Array.from(current) as ProviderKey[] };
        });
    };

    const saveSellerPolicy = async () => {
        if (!selectedSellerId) {
            showErrorToast('Select a seller first');
            return;
        }

        const allowed = Array.from(new Set(policyForm.allowedProviders));
        const blocked = Array.from(new Set(policyForm.blockedProviders.filter((provider) => !allowed.includes(provider))));
        const balancedDeltaPercent = Number(policyForm.balancedDeltaPercent || '5');

        if (!Number.isFinite(balancedDeltaPercent) || balancedDeltaPercent < 0 || balancedDeltaPercent > 100) {
            showErrorToast('Balanced delta must be between 0 and 100');
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
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Settings className="h-6 w-6 text-[var(--primary-blue)]" />
                        Courier Services
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Manage provider services used by quote and booking flows.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => syncProvider('velocity')} disabled={syncMutation.isPending}>
                        <RefreshCw className={cn('h-4 w-4 mr-2', syncMutation.isPending && 'animate-spin')} />
                        Sync Velocity
                    </Button>
                    <Button variant="outline" onClick={() => syncProvider('delhivery')} disabled={syncMutation.isPending}>
                        <RefreshCw className={cn('h-4 w-4 mr-2', syncMutation.isPending && 'animate-spin')} />
                        Sync Delhivery
                    </Button>
                    <Button variant="outline" onClick={() => syncProvider('ekart')} disabled={syncMutation.isPending}>
                        <RefreshCw className={cn('h-4 w-4 mr-2', syncMutation.isPending && 'animate-spin')} />
                        Sync Ekart
                    </Button>
                    <Button onClick={startCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="relative md:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                            <Input
                                className="pl-9"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by name or code"
                            />
                        </div>
                        <select
                            className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 text-sm"
                            value={providerFilter}
                            onChange={(event) => setProviderFilter(event.target.value as typeof providerFilter)}
                        >
                            <option value="all">All providers</option>
                            <option value="delhivery">Delhivery</option>
                            <option value="ekart">Ekart</option>
                            <option value="velocity">Velocity</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {showForm && (
                <Card className="border-[var(--primary-blue)]/20">
                    <CardHeader>
                        <CardTitle>{editing ? 'Edit Service' : 'Create Service'}</CardTitle>
                        <CardDescription>Keep this minimal: provider, service identity, zone support, and ETA.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <select
                                className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 text-sm"
                                value={form.provider}
                                onChange={(event) => setForm((prev) => ({ ...prev, provider: event.target.value as ServiceForm['provider'] }))}
                                disabled={!!editing}
                            >
                                <option value="delhivery">Delhivery</option>
                                <option value="ekart">Ekart</option>
                                <option value="velocity">Velocity</option>
                            </select>
                            <Input
                                placeholder="Service name"
                                value={form.displayName}
                                onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                            />
                            <Input
                                placeholder="Service code"
                                value={form.serviceCode}
                                onChange={(event) => setForm((prev) => ({ ...prev, serviceCode: event.target.value.toUpperCase() }))}
                            />
                            <select
                                className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 text-sm"
                                value={form.serviceType}
                                onChange={(event) => setForm((prev) => ({ ...prev, serviceType: event.target.value as ServiceForm['serviceType'] }))}
                            >
                                <option value="surface">Surface</option>
                                <option value="express">Express</option>
                                <option value="air">Air</option>
                                <option value="standard">Standard</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                            <Input
                                placeholder="Zones (A,B,C)"
                                value={form.zoneSupport}
                                onChange={(event) => setForm((prev) => ({ ...prev, zoneSupport: event.target.value }))}
                            />
                            <Input
                                type="number"
                                placeholder="Min kg"
                                value={form.minWeightKg}
                                onChange={(event) => setForm((prev) => ({ ...prev, minWeightKg: event.target.value }))}
                            />
                            <Input
                                type="number"
                                placeholder="Max kg"
                                value={form.maxWeightKg}
                                onChange={(event) => setForm((prev) => ({ ...prev, maxWeightKg: event.target.value }))}
                            />
                            <Input
                                type="number"
                                placeholder="ETA min"
                                value={form.eddMinDays}
                                onChange={(event) => setForm((prev) => ({ ...prev, eddMinDays: event.target.value }))}
                            />
                            <Input
                                type="number"
                                placeholder="ETA max"
                                value={form.eddMaxDays}
                                onChange={(event) => setForm((prev) => ({ ...prev, eddMaxDays: event.target.value }))}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={resetForm}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                            <Button onClick={saveService} disabled={createMutation.isPending || updateMutation.isPending}>
                                <Save className="h-4 w-4 mr-2" />
                                {editing ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Configured Services</CardTitle>
                    <CardDescription>
                        {isFetching ? 'Refreshing...' : `${filtered.length} service${filtered.length === 1 ? '' : 's'} found`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-[var(--text-muted)]">Loading services...</p>
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            title="No services found"
                            description="Create or sync provider services to start quoting at service level."
                            icon={<Link className="h-5 w-5" />}
                        />
                    ) : (
                        <div className="space-y-3">
                            {filtered.map((service) => (
                                <div key={service._id} className="border border-[var(--border-default)] rounded-lg p-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-[var(--text-primary)]">{service.displayName}</p>
                                                <Badge variant="outline">{service.provider}</Badge>
                                                <Badge variant="secondary">{service.serviceType}</Badge>
                                                <StatusBadge domain="courier" status={service.status} />
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                {service.serviceCode}
                                                {service.zoneSupport?.length ? ` • Zones: ${service.zoneSupport.join(', ')}` : ''}
                                                {service.sla?.eddMaxDays ? ` • ETA up to ${service.sla.eddMaxDays} days` : ''}
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => startEdit(service)}>
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onToggle(service)}
                                                disabled={toggleMutation.isPending}
                                            >
                                                <Power className="h-4 w-4 mr-1" />
                                                {service.status === 'active' ? 'Disable' : 'Enable'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Service Rate Cards
                    </CardTitle>
                    <CardDescription>
                        Maintain minimal service-level cost/sell cards with slab pricing.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                        <select
                            className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 text-sm md:col-span-2"
                            value={rateCardForm.serviceId || selectedServiceId}
                            onChange={(event) => {
                                const value = event.target.value;
                                setSelectedServiceId(value);
                                setRateCardForm((prev) => ({ ...prev, serviceId: value }));
                            }}
                        >
                            <option value="">Select service</option>
                            {services.map((service) => (
                                <option key={service._id} value={service._id}>
                                    {service.displayName} ({service.provider})
                                </option>
                            ))}
                        </select>
                        <select
                            className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 text-sm"
                            value={rateCardForm.cardType}
                            onChange={(event) => setRateCardForm((prev) => ({ ...prev, cardType: event.target.value as RateCardForm['cardType'] }))}
                        >
                            <option value="sell">Sell</option>
                            <option value="cost">Cost</option>
                        </select>
                        <select
                            className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 text-sm"
                            value={rateCardForm.sourceMode}
                            onChange={(event) => setRateCardForm((prev) => ({ ...prev, sourceMode: event.target.value as RateCardForm['sourceMode'] }))}
                        >
                            <option value="TABLE">TABLE</option>
                            <option value="HYBRID">HYBRID</option>
                            <option value="LIVE_API">LIVE_API</option>
                        </select>
                        <select
                            className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 text-sm"
                            value={rateCardForm.status}
                            onChange={(event) => setRateCardForm((prev) => ({ ...prev, status: event.target.value as RateCardForm['status'] }))}
                        >
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <Input
                            placeholder="Zone key (zoneD)"
                            value={rateCardForm.zoneKey}
                            onChange={(event) => setRateCardForm((prev) => ({ ...prev, zoneKey: event.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                        <Input
                            type="number"
                            placeholder="Min kg"
                            value={rateCardForm.minKg}
                            onChange={(event) => setRateCardForm((prev) => ({ ...prev, minKg: event.target.value }))}
                        />
                        <Input
                            type="number"
                            placeholder="Max kg"
                            value={rateCardForm.maxKg}
                            onChange={(event) => setRateCardForm((prev) => ({ ...prev, maxKg: event.target.value }))}
                        />
                        <Input
                            type="number"
                            placeholder="Slab charge"
                            value={rateCardForm.charge}
                            onChange={(event) => setRateCardForm((prev) => ({ ...prev, charge: event.target.value }))}
                        />
                        <Input
                            type="number"
                            placeholder="Additional / kg"
                            value={rateCardForm.additionalPerKg}
                            onChange={(event) => setRateCardForm((prev) => ({ ...prev, additionalPerKg: event.target.value }))}
                        />
                        <div className="flex gap-2">
                            <Button
                                className="flex-1"
                                onClick={saveRateCard}
                                disabled={createRateCardMutation.isPending || updateRateCardMutation.isPending}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {editingRateCard ? 'Update' : 'Create'}
                            </Button>
                            <Button variant="outline" onClick={resetRateCardForm}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {isRateCardsLoading ? (
                            <p className="text-sm text-[var(--text-muted)]">Loading rate cards...</p>
                        ) : rateCards.length === 0 ? (
                            <p className="text-sm text-[var(--text-muted)]">No rate cards for selected service.</p>
                        ) : rateCards.map((card) => (
                            <div key={card._id} className="border border-[var(--border-default)] rounded-lg p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                                        {card.cardType.toUpperCase()} • {card.sourceMode}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {card.zoneRules?.[0]?.zoneKey || '-'} • {card.zoneRules?.[0]?.slabs?.[0]
                                            ? `${card.zoneRules[0].slabs[0].minKg}-${card.zoneRules[0].slabs[0].maxKg}kg @ ₹${card.zoneRules[0].slabs[0].charge}`
                                            : 'No slab'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">{card.status}</Badge>
                                    <Button variant="outline" size="sm" onClick={() => editRateCard(card)}>
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        Seller Courier Policy
                    </CardTitle>
                    <CardDescription>
                        Set seller-level selection behavior and provider allow/block rules.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Input
                            placeholder="Search seller by name/email"
                            value={sellerSearch}
                            onChange={(event) => setSellerSearch(event.target.value)}
                        />
                        <select
                            className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 text-sm md:col-span-2"
                            value={selectedSellerId}
                            onChange={(event) => setSelectedSellerId(event.target.value)}
                        >
                            <option value="">Select seller</option>
                            {sellers.map((seller) => (
                                <option key={seller._id} value={seller._id}>
                                    {seller.name} ({seller.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedSellerId ? (
                        <div className="space-y-4 border border-[var(--border-default)] rounded-lg p-4">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                <select
                                    className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 text-sm"
                                    value={policyForm.selectionMode}
                                    onChange={(event) => setPolicyForm((prev) => ({
                                        ...prev,
                                        selectionMode: event.target.value as PolicyForm['selectionMode'],
                                    }))}
                                >
                                    <option value="manual_with_recommendation">manual_with_recommendation</option>
                                    <option value="manual_only">manual_only</option>
                                    <option value="auto">auto</option>
                                </select>
                                <select
                                    className="h-9 rounded-md border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 text-sm"
                                    value={policyForm.autoPriority}
                                    onChange={(event) => setPolicyForm((prev) => ({
                                        ...prev,
                                        autoPriority: event.target.value as PolicyForm['autoPriority'],
                                    }))}
                                >
                                    <option value="balanced">balanced</option>
                                    <option value="price">price</option>
                                    <option value="speed">speed</option>
                                </select>
                                <Input
                                    type="number"
                                    placeholder="Balanced delta %"
                                    value={policyForm.balancedDeltaPercent}
                                    onChange={(event) => setPolicyForm((prev) => ({ ...prev, balancedDeltaPercent: event.target.value }))}
                                />
                                <label className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)]">
                                    <input
                                        type="checkbox"
                                        checked={policyForm.isActive}
                                        onChange={(event) => setPolicyForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                                    />
                                    Policy Active
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-2 uppercase">Allowed Providers</p>
                                    <div className="space-y-2">
                                        {(['velocity', 'delhivery', 'ekart'] as ProviderKey[]).map((provider) => (
                                            <label key={`allowed-${provider}`} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={policyForm.allowedProviders.includes(provider)}
                                                    onChange={(event) => togglePolicyProvider('allowedProviders', provider, event.target.checked)}
                                                />
                                                {provider}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-2 uppercase">Blocked Providers</p>
                                    <div className="space-y-2">
                                        {(['velocity', 'delhivery', 'ekart'] as ProviderKey[]).map((provider) => (
                                            <label key={`blocked-${provider}`} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={policyForm.blockedProviders.includes(provider)}
                                                    onChange={(event) => togglePolicyProvider('blockedProviders', provider, event.target.checked)}
                                                />
                                                {provider}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    onClick={saveSellerPolicy}
                                    disabled={updatePolicyMutation.isPending || isPolicyFetching || isSellersLoading}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Policy
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--text-muted)]">
                            Select a seller to view and update courier policy.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
