"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { DataTable } from '@/src/components/ui/data/DataTable';
import { EmptyState } from '@/src/components/ui/feedback/EmptyState';
import { Skeleton } from '@/src/components/ui/data/Skeleton';
import { useToast } from '@/src/components/ui/feedback/Toast';
import {
    CourierServiceItem,
    ServiceRateCardItem,
    useServiceRateCards,
    useCreateServiceRateCard,
    useUpdateServiceRateCard
} from '@/src/core/api/hooks/admin';
import { Save, Plus, Edit2, Coins, ArrowRight, Info, X } from 'lucide-react';
import { Select } from '@/src/components/ui/form/Select';

const cardTypeOptions = [
    { label: 'Sell (Customer)', value: 'sell' },
    { label: 'Cost (Carrier)', value: 'cost' },
];

const sourceModeOptions = [
    { label: 'Table (Static)', value: 'TABLE' },
    { label: 'Hybrid', value: 'HYBRID' },
    { label: 'Live API', value: 'LIVE_API' },
];

const flowTypeOptions = [
    { label: 'Forward', value: 'forward' },
    { label: 'Reverse', value: 'reverse' },
];

const categoryOptions = [
    { label: 'Default', value: 'default' },
    { label: 'Basic', value: 'basic' },
    { label: 'Standard', value: 'standard' },
    { label: 'Advanced', value: 'advanced' },
    { label: 'Custom', value: 'custom' },
];

const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
    { label: 'Inactive', value: 'inactive' },
];

const codRuleTypeOptions = [
    { label: 'None', value: 'none' },
    { label: 'Flat', value: 'flat' },
    { label: 'Percentage', value: 'percentage' },
    { label: 'Slab', value: 'slab' },
];

const codBasisOptions = [
    { label: 'Order Value', value: 'orderValue' },
    { label: 'COD Amount', value: 'codAmount' },
];

const fuelBaseOptions = [
    { label: 'Freight', value: 'freight' },
    { label: 'Freight + COD', value: 'freight_cod' },
];

const rtoRuleTypeOptions = [
    { label: 'Forward Mirror', value: 'forward_mirror' },
    { label: 'Flat', value: 'flat' },
    { label: 'Percentage', value: 'percentage' },
];

const toDateInputValue = (value?: string | Date): string => {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const toUtcDateString = (value: string): string | undefined => {
    if (!value) return undefined;
    return new Date(`${value}T00:00:00.000Z`).toISOString();
};

interface RateCardsTabProps {
    services: CourierServiceItem[];
    autoStartCreate?: boolean;
}

type RateCardForm = {
    serviceId: string;
    cardType: 'cost' | 'sell';
    flowType: 'forward' | 'reverse';
    category: 'default' | 'basic' | 'standard' | 'advanced' | 'custom';
    sourceMode: 'LIVE_API' | 'TABLE' | 'HYBRID';
    status: 'draft' | 'active' | 'inactive';
    effectiveStartDate: string;
    effectiveEndDate: string;
    zoneKey: string;
    minKg: string;
    maxKg: string;
    charge: string;
    additionalPerKg: string;
    codRuleType: 'none' | 'flat' | 'percentage' | 'slab';
    codFlatCharge: string;
    codPercentage: string;
    codMinCharge: string;
    codMaxCharge: string;
    codSlabBasis: 'orderValue' | 'codAmount';
    codSlabsJson: string;
    fuelPercentage: string;
    fuelBase: 'freight' | 'freight_cod';
    rtoRuleType: 'forward_mirror' | 'flat' | 'percentage';
    rtoFlatAmount: string;
    rtoPercentage: string;
    rtoMinCharge: string;
    rtoMaxCharge: string;
};

const defaultRateCardForm: RateCardForm = {
    serviceId: '',
    cardType: 'sell',
    flowType: 'forward',
    category: 'default',
    sourceMode: 'TABLE',
    status: 'active',
    effectiveStartDate: toDateInputValue(new Date()),
    effectiveEndDate: '',
    zoneKey: 'zoneD',
    minKg: '0',
    maxKg: '0.5',
    charge: '',
    additionalPerKg: '0',
    codRuleType: 'none',
    codFlatCharge: '0',
    codPercentage: '0',
    codMinCharge: '',
    codMaxCharge: '',
    codSlabBasis: 'orderValue',
    codSlabsJson: `[\n  { "min": 0, "max": 1000, "value": 30, "type": "flat" }\n]`,
    fuelPercentage: '0',
    fuelBase: 'freight',
    rtoRuleType: 'forward_mirror',
    rtoFlatAmount: '0',
    rtoPercentage: '0',
    rtoMinCharge: '',
    rtoMaxCharge: '',
};

// Skeleton for rate card table
function RateCardTableSkeleton() {
    return (
        <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded" />
                </div>
            ))}
        </div>
    );
}

export function RateCardsTab({ services, autoStartCreate = false }: RateCardsTabProps) {
    const { addToast } = useToast();
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [rateCardForm, setRateCardForm] = useState<RateCardForm>(defaultRateCardForm);
    const [editingRateCard, setEditingRateCard] = useState<ServiceRateCardItem | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [listFlowType, setListFlowType] = useState<'all' | 'forward' | 'reverse'>('all');
    const [listCategory, setListCategory] = useState<'all' | 'default' | 'basic' | 'standard' | 'advanced' | 'custom'>('all');

    const { data: rateCards = [], isLoading: isRateCardsLoading } = useServiceRateCards(
        selectedServiceId
            ? {
                serviceId: selectedServiceId,
                ...(listFlowType !== 'all' ? { flowType: listFlowType } : {}),
                ...(listCategory !== 'all' ? { category: listCategory } : {}),
            }
            : undefined
    );

    const createRateCardMutation = useCreateServiceRateCard();
    const updateRateCardMutation = useUpdateServiceRateCard();

    const [hasAutoStarted, setHasAutoStarted] = useState(false);

    const resetRateCardForm = () => {
        setEditingRateCard(null);
        setRateCardForm((prev) => ({
            ...defaultRateCardForm,
            serviceId: selectedServiceId || prev.serviceId,
            effectiveStartDate: toDateInputValue(new Date()),
        }));
        setShowForm(false);
    };

    const startCreate = () => {
        setEditingRateCard(null);
        setRateCardForm((prev) => ({
            ...defaultRateCardForm,
            serviceId: selectedServiceId,
            effectiveStartDate: toDateInputValue(new Date()),
        }));
        setShowForm(true);
        setShowMobileSidebar(false);
    };

    useEffect(() => {
        if (!autoStartCreate || hasAutoStarted || services.length === 0 || showForm) {
            return;
        }

        const serviceId = selectedServiceId || services[0]._id;
        setSelectedServiceId(serviceId);
        setRateCardForm({
            ...defaultRateCardForm,
            serviceId,
            effectiveStartDate: toDateInputValue(new Date()),
        });
        setEditingRateCard(null);
        setShowForm(true);
        setHasAutoStarted(true);
    }, [autoStartCreate, hasAutoStarted, services, showForm, selectedServiceId]);

    const startEdit = (card: ServiceRateCardItem) => {
        const firstZone = card.zoneRules?.[0];
        const firstSlab = firstZone?.slabs?.[0];
        const codRule = firstZone?.codRule;
        const fuelRule = firstZone?.fuelSurcharge;
        const rtoRule = firstZone?.rtoRule;

        const codRuleType: RateCardForm['codRuleType'] = codRule?.type || 'none';
        const rtoRuleType: RateCardForm['rtoRuleType'] =
            rtoRule?.type ||
            (rtoRule && (rtoRule as { percentage?: number; minCharge?: number; maxCharge?: number }).percentage !== undefined
                ? 'percentage'
                : 'forward_mirror');

        setEditingRateCard(card);
        setRateCardForm({
            serviceId: card.serviceId,
            cardType: card.cardType,
            flowType: card.flowType || 'forward',
            category: card.category || 'default',
            sourceMode: card.sourceMode,
            status: card.status,
            effectiveStartDate: toDateInputValue(card.effectiveDates?.startDate) || toDateInputValue(new Date()),
            effectiveEndDate: toDateInputValue(card.effectiveDates?.endDate),
            zoneKey: firstZone?.zoneKey || 'zoneD',
            minKg: String(firstSlab?.minKg ?? 0),
            maxKg: String(firstSlab?.maxKg ?? 0.5),
            charge: String(firstSlab?.charge ?? 0),
            additionalPerKg: String(firstZone?.additionalPerKg ?? 0),
            codRuleType,
            codFlatCharge: codRule?.type === 'flat' ? String(codRule.minCharge ?? 0) : '0',
            codPercentage: codRule?.type === 'percentage' ? String(codRule.percentage ?? 0) : '0',
            codMinCharge: codRule?.type === 'percentage' ? String(codRule.minCharge ?? '') : '',
            codMaxCharge: codRule?.type === 'percentage' ? String(codRule.maxCharge ?? '') : '',
            codSlabBasis: codRule?.type === 'slab' ? codRule.basis || 'orderValue' : 'orderValue',
            codSlabsJson:
                codRule?.type === 'slab'
                    ? JSON.stringify(codRule.slabs || [], null, 2)
                    : defaultRateCardForm.codSlabsJson,
            fuelPercentage: String(fuelRule?.percentage ?? 0),
            fuelBase: fuelRule?.base || 'freight',
            rtoRuleType,
            rtoFlatAmount: rtoRuleType === 'flat' ? String((rtoRule as { amount?: number })?.amount ?? 0) : '0',
            rtoPercentage:
                rtoRuleType === 'percentage'
                    ? String((rtoRule as { percentage?: number })?.percentage ?? 0)
                    : '0',
            rtoMinCharge:
                rtoRuleType === 'percentage'
                    ? String((rtoRule as { minCharge?: number })?.minCharge ?? '')
                    : '',
            rtoMaxCharge:
                rtoRuleType === 'percentage'
                    ? String((rtoRule as { maxCharge?: number })?.maxCharge ?? '')
                    : '',
        });
        setShowForm(true);
        setShowMobileSidebar(false);
    };

    const saveRateCard = async () => {
        const minKg = Number(rateCardForm.minKg);
        const maxKg = Number(rateCardForm.maxKg);
        const charge = Number(rateCardForm.charge);
        const additionalPerKg = Number(rateCardForm.additionalPerKg || 0);
        const fuelPercentage = Number(rateCardForm.fuelPercentage || 0);
        const startDateIso = toUtcDateString(rateCardForm.effectiveStartDate);
        const endDateIso = toUtcDateString(rateCardForm.effectiveEndDate);

        // Validation with Toast
        if (!rateCardForm.serviceId) {
            addToast('Please select a service before saving rate card', 'error');
            return;
        }

        if (!startDateIso) {
            addToast('Effective start date is required', 'error');
            return;
        }

        if (endDateIso && new Date(endDateIso).getTime() <= new Date(startDateIso).getTime()) {
            addToast('End date must be greater than start date', 'error');
            return;
        }

        if (!Number.isFinite(minKg) || !Number.isFinite(maxKg) || maxKg <= minKg) {
            addToast('Weight slab is invalid. Max weight must be greater than min weight', 'error');
            return;
        }

        if (!Number.isFinite(charge) || charge < 0 || !Number.isFinite(additionalPerKg) || additionalPerKg < 0) {
            addToast('Charges must be non-negative numbers', 'error');
            return;
        }

        if (!Number.isFinite(fuelPercentage) || fuelPercentage < 0) {
            addToast('Fuel surcharge percentage must be a non-negative number', 'error');
            return;
        }

        const zoneRule: ServiceRateCardItem['zoneRules'][number] = {
            zoneKey: rateCardForm.zoneKey.trim() || 'zoneD',
            slabs: [
                {
                    minKg,
                    maxKg,
                    charge,
                },
            ],
            additionalPerKg,
            fuelSurcharge: {
                percentage: fuelPercentage,
                base: rateCardForm.fuelBase,
            },
        };

        if (rateCardForm.codRuleType === 'flat') {
            const minCharge = Number(rateCardForm.codFlatCharge || 0);
            if (!Number.isFinite(minCharge) || minCharge < 0) {
                addToast('COD flat charge must be a non-negative number', 'error');
                return;
            }
            zoneRule.codRule = {
                type: 'flat',
                minCharge,
            };
        }

        if (rateCardForm.codRuleType === 'percentage') {
            const percentage = Number(rateCardForm.codPercentage || 0);
            const minCharge = rateCardForm.codMinCharge ? Number(rateCardForm.codMinCharge) : undefined;
            const maxCharge = rateCardForm.codMaxCharge ? Number(rateCardForm.codMaxCharge) : undefined;

            if (!Number.isFinite(percentage) || percentage < 0) {
                addToast('COD percentage must be a non-negative number', 'error');
                return;
            }
            if (minCharge !== undefined && (!Number.isFinite(minCharge) || minCharge < 0)) {
                addToast('COD min charge must be a non-negative number', 'error');
                return;
            }
            if (maxCharge !== undefined && (!Number.isFinite(maxCharge) || maxCharge < 0)) {
                addToast('COD max charge must be a non-negative number', 'error');
                return;
            }
            if (minCharge !== undefined && maxCharge !== undefined && maxCharge < minCharge) {
                addToast('COD max charge must be greater than or equal to min charge', 'error');
                return;
            }

            zoneRule.codRule = {
                type: 'percentage',
                percentage,
                minCharge,
                maxCharge,
            };
        }

        if (rateCardForm.codRuleType === 'slab') {
            let parsedSlabs: Array<{ min: number; max: number; value: number; type: 'flat' | 'percentage' }>;
            try {
                parsedSlabs = JSON.parse(rateCardForm.codSlabsJson || '[]');
            } catch {
                addToast('COD slab JSON is invalid', 'error');
                return;
            }

            if (!Array.isArray(parsedSlabs) || parsedSlabs.length === 0) {
                addToast('COD slab rule requires at least one slab entry', 'error');
                return;
            }

            const invalidEntry = parsedSlabs.find((item) => {
                const isTypeValid = item?.type === 'flat' || item?.type === 'percentage';
                return (
                    !isTypeValid ||
                    !Number.isFinite(Number(item?.min)) ||
                    !Number.isFinite(Number(item?.max)) ||
                    !Number.isFinite(Number(item?.value)) ||
                    Number(item?.min) < 0 ||
                    Number(item?.max) < 0 ||
                    Number(item?.value) < 0 ||
                    Number(item?.max) < Number(item?.min)
                );
            });

            if (invalidEntry) {
                addToast('COD slab entries must have valid min/max/value and type', 'error');
                return;
            }

            zoneRule.codRule = {
                type: 'slab',
                basis: rateCardForm.codSlabBasis,
                slabs: parsedSlabs.map((item) => ({
                    min: Number(item.min),
                    max: Number(item.max),
                    value: Number(item.value),
                    type: item.type,
                })),
            };
        }

        if (rateCardForm.rtoRuleType === 'forward_mirror') {
            zoneRule.rtoRule = { type: 'forward_mirror' };
        }

        if (rateCardForm.rtoRuleType === 'flat') {
            const amount = Number(rateCardForm.rtoFlatAmount || 0);
            if (!Number.isFinite(amount) || amount < 0) {
                addToast('RTO flat amount must be a non-negative number', 'error');
                return;
            }
            zoneRule.rtoRule = {
                type: 'flat',
                amount,
            };
        }

        if (rateCardForm.rtoRuleType === 'percentage') {
            const percentage = Number(rateCardForm.rtoPercentage || 0);
            const minCharge = rateCardForm.rtoMinCharge ? Number(rateCardForm.rtoMinCharge) : undefined;
            const maxCharge = rateCardForm.rtoMaxCharge ? Number(rateCardForm.rtoMaxCharge) : undefined;

            if (!Number.isFinite(percentage) || percentage < 0) {
                addToast('RTO percentage must be a non-negative number', 'error');
                return;
            }
            if (minCharge !== undefined && (!Number.isFinite(minCharge) || minCharge < 0)) {
                addToast('RTO min charge must be a non-negative number', 'error');
                return;
            }
            if (maxCharge !== undefined && (!Number.isFinite(maxCharge) || maxCharge < 0)) {
                addToast('RTO max charge must be a non-negative number', 'error');
                return;
            }
            if (minCharge !== undefined && maxCharge !== undefined && maxCharge < minCharge) {
                addToast('RTO max charge must be greater than or equal to min charge', 'error');
                return;
            }

            zoneRule.rtoRule = {
                type: 'percentage',
                percentage,
                minCharge,
                maxCharge,
            };
        }

        const payload: Partial<ServiceRateCardItem> = {
            serviceId: rateCardForm.serviceId,
            cardType: rateCardForm.cardType,
            flowType: rateCardForm.flowType,
            category: rateCardForm.cardType === 'sell' ? rateCardForm.category : 'default',
            sourceMode: rateCardForm.sourceMode,
            status: rateCardForm.status,
            currency: 'INR',
            effectiveDates: {
                startDate: startDateIso,
                endDate: endDateIso,
            },
            calculation: {
                weightBasis: 'max',
                roundingUnitKg: 0.5,
                roundingMode: 'ceil',
                dimDivisor: 5000,
            },
            zoneRules: [zoneRule],
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
            // Error handled by mutation hook with Toast
        }
    };

    const columns = [
        {
            header: 'Type',
            accessorKey: 'type',
            cell: (row: ServiceRateCardItem) => (
                <div className="flex items-center gap-2">
                    <Badge
                        variant={row.cardType === 'sell' ? 'primary' : 'outline'}
                        size="sm"
                        className="uppercase tracking-wide"
                    >
                        {row.cardType}
                    </Badge>
                    <Badge
                        variant="secondary"
                        size="sm"
                        className="uppercase tracking-wide"
                    >
                        {row.sourceMode}
                    </Badge>
                    <Badge
                        variant="outline"
                        size="sm"
                        className="uppercase tracking-wide"
                    >
                        {row.flowType || 'forward'}
                    </Badge>
                    {row.cardType === 'sell' && (
                        <Badge
                            variant="secondary"
                            size="sm"
                            className="uppercase tracking-wide"
                        >
                            {row.category || 'default'}
                        </Badge>
                    )}
                </div>
            )
        },
        {
            header: 'Zone / Slab',
            accessorKey: 'details',
            cell: (row: ServiceRateCardItem) => (
                <div className="text-sm flex flex-col gap-1">
                    <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                        {row.zoneRules?.[0]?.zoneKey || '-'}
                    </div>
                    {row.zoneRules?.[0]?.slabs?.[0] ? (
                        <div className="text-[var(--text-secondary)] text-xs">
                            {`${row.zoneRules[0].slabs[0].minKg}-${row.zoneRules[0].slabs[0].maxKg}kg @ ₹${row.zoneRules[0].slabs[0].charge}`}
                            <span className="text-[var(--text-muted)] mx-1.5">·</span>
                            <span>+₹{row.zoneRules[0].additionalPerKg}/kg</span>
                        </div>
                    ) : (
                        <span className="text-xs text-[var(--text-muted)]">No slab config</span>
                    )}
                </div>
            )
        },
        {
            header: 'Effective Window',
            accessorKey: 'effectiveDates',
            cell: (row: ServiceRateCardItem) => (
                <div className="text-xs text-[var(--text-secondary)]">
                    <div>{toDateInputValue(row.effectiveDates?.startDate) || '-'}</div>
                    <div className="text-[var(--text-muted)]">
                        {row.effectiveDates?.endDate
                            ? `to ${toDateInputValue(row.effectiveDates.endDate)}`
                            : 'open ended'}
                    </div>
                </div>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row: ServiceRateCardItem) => (
                <StatusBadge domain="ratecard" status={row.status} size="sm" />
            )
        },
        {
            header: 'Actions',
            accessorKey: 'actions',
            cell: (row: ServiceRateCardItem) => (
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(row)}
                        className="h-8 w-8 p-0"
                    >
                        <Edit2 className="h-4 w-4 text-[var(--text-secondary)]" />
                    </Button>
                </div>
            ),
            width: '60px'
        }
    ];

    const selectedService = services.find(s => s._id === selectedServiceId);

    return (
        <div className="space-y-4">
            {/* Mobile Service Selector */}
            <div className="lg:hidden">
                <Card className="border-[var(--border-default)]">
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-[var(--text-primary)]">
                                    Courier Service
                                </label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                                    className="lg:hidden"
                                >
                                    <Info className="h-4 w-4" />
                                </Button>
                            </div>
                            <Select
                                value={selectedServiceId}
                                onChange={(e) => {
                                    setSelectedServiceId(e.target.value);
                                    setRateCardForm(prev => ({ ...prev, serviceId: e.target.value }));
                                    setShowForm(false);
                                }}
                                options={[
                                    { label: 'Select a service...', value: '' },
                                    ...services.map((s) => ({
                                        label: `${s.displayName} (${s.provider})`,
                                        value: s._id
                                    }))
                                ]}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Mobile Tips Drawer */}
                {showMobileSidebar && (
                    <Card className="mt-4 border-[var(--primary-blue)]/20 bg-[var(--primary-blue-soft)]">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                    <Coins className="h-4 w-4 text-[var(--primary-blue)]" />
                                    Rate Card Tips
                                </h4>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowMobileSidebar(false)}
                                    className="h-6 w-6 p-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                                <li>Create <strong>Cost</strong> cards for what you pay carriers.</li>
                                <li>Create <strong>Sell</strong> cards for what you charge sellers.</li>
                                <li>Use <strong>Table</strong> mode for static rates.</li>
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Desktop Sidebar */}
                <div className="hidden lg:block lg:col-span-1">
                    <div className="sticky top-6 space-y-6">
                        <Card className="border-[var(--border-default)]">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base">Service Selection</CardTitle>
                                <CardDescription className="text-xs">
                                    Choose a courier service to manage its rate cards.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                        Courier Service
                                    </label>
                                    <Select
                                        value={selectedServiceId}
                                        onChange={(e) => {
                                            setSelectedServiceId(e.target.value);
                                            setRateCardForm(prev => ({ ...prev, serviceId: e.target.value }));
                                            setShowForm(false);
                                        }}
                                        options={[
                                            { label: 'Select a service...', value: '' },
                                            ...services.map((s) => ({
                                                label: `${s.displayName} (${s.provider})`,
                                                value: s._id
                                            }))
                                        ]}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-[var(--border-default)] bg-[var(--bg-secondary)]">
                            <CardContent className="p-4">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                                    <Coins className="h-4 w-4 text-[var(--primary-blue)]" />
                                    Rate Card Tips
                                </h4>
                                <ul className="text-xs text-[var(--text-secondary)] space-y-2 list-disc list-inside">
                                    <li>Create <strong className="text-[var(--text-primary)]">Cost</strong> cards for what you pay carriers.</li>
                                    <li>Create <strong className="text-[var(--text-primary)]">Sell</strong> cards for what you charge sellers.</li>
                                    <li>Use <strong className="text-[var(--text-primary)]">Table</strong> mode for static rates.</li>
                                    <li>Use <strong className="text-[var(--text-primary)]">Live API</strong> for dynamic carrier rates.</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                                {selectedService ? selectedService.displayName : 'Rate Cards'}
                            </h2>
                            {selectedService && (
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    {selectedService.provider}
                                </p>
                            )}
                        </div>
                        <Button
                            size="sm"
                            disabled={!selectedServiceId || showForm}
                            onClick={startCreate}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Rate Card
                        </Button>
                    </div>

                    {/* Form or Table */}
                    {showForm ? (
                        <Card className="border-[var(--primary-blue)]/30 animate-slide-up">
                            <CardHeader className="pb-4 border-b border-[var(--border-subtle)]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base">
                                            {editingRateCard ? 'Edit Rate Card' : 'New Rate Card'}
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            Define cost or sell rates for specific zones and weight slabs.
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={resetRateCardForm}
                                        className="h-8 w-8 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                {/* Type and Source */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                                            Type
                                        </label>
                                        <Select
                                            value={rateCardForm.cardType}
                                            onChange={(e) => {
                                                const nextCardType = e.target.value as RateCardForm['cardType'];
                                                setRateCardForm({
                                                    ...rateCardForm,
                                                    cardType: nextCardType,
                                                    category:
                                                        nextCardType === 'cost'
                                                            ? 'default'
                                                            : rateCardForm.category,
                                                });
                                            }}
                                            options={cardTypeOptions}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                                            Flow Type
                                        </label>
                                        <Select
                                            value={rateCardForm.flowType}
                                            onChange={(e) =>
                                                setRateCardForm({
                                                    ...rateCardForm,
                                                    flowType: e.target.value as RateCardForm['flowType'],
                                                })
                                            }
                                            options={flowTypeOptions}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                                            Category
                                        </label>
                                        <Select
                                            value={rateCardForm.category}
                                            onChange={(e) =>
                                                setRateCardForm({
                                                    ...rateCardForm,
                                                    category: e.target.value as RateCardForm['category'],
                                                })
                                            }
                                            disabled={rateCardForm.cardType === 'cost'}
                                            options={categoryOptions}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                                            Source Mode
                                        </label>
                                        <Select
                                            value={rateCardForm.sourceMode}
                                            onChange={(e) => setRateCardForm({
                                                ...rateCardForm,
                                                sourceMode: e.target.value as RateCardForm['sourceMode']
                                            })}
                                            options={sourceModeOptions}
                                        />
                                    </div>
                                </div>

                                {/* Effective Window */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                                            Effective Start
                                        </label>
                                        <Input
                                            type="date"
                                            value={rateCardForm.effectiveStartDate}
                                            onChange={(e) =>
                                                setRateCardForm({
                                                    ...rateCardForm,
                                                    effectiveStartDate: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                                            Effective End (Optional)
                                        </label>
                                        <Input
                                            type="date"
                                            value={rateCardForm.effectiveEndDate}
                                            onChange={(e) =>
                                                setRateCardForm({
                                                    ...rateCardForm,
                                                    effectiveEndDate: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Status and Zone */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                                            Status
                                        </label>
                                        <Select
                                            value={rateCardForm.status}
                                            onChange={(e) => setRateCardForm({
                                                ...rateCardForm,
                                                status: e.target.value as RateCardForm['status']
                                            })}
                                            options={statusOptions}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                                            Zone Key
                                        </label>
                                        <Input
                                            value={rateCardForm.zoneKey}
                                            onChange={(e) => setRateCardForm({
                                                ...rateCardForm,
                                                zoneKey: e.target.value
                                            })}
                                            placeholder="e.g. zoneD"
                                        />
                                    </div>
                                </div>

                                {/* Weight Slab & Charges */}
                                <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                    <CardContent className="p-4 space-y-3">
                                        <h4 className="text-sm font-medium text-[var(--text-primary)]">
                                            Weight Slab & Charges
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                    Min Kg
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={rateCardForm.minKg}
                                                    onChange={(e) => setRateCardForm({
                                                        ...rateCardForm,
                                                        minKg: e.target.value
                                                    })}
                                                    className="bg-[var(--bg-primary)]"
                                                    step="0.1"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                    Max Kg
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={rateCardForm.maxKg}
                                                    onChange={(e) => setRateCardForm({
                                                        ...rateCardForm,
                                                        maxKg: e.target.value
                                                    })}
                                                    className="bg-[var(--bg-primary)]"
                                                    step="0.1"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                    Base ₹
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={rateCardForm.charge}
                                                    onChange={(e) => setRateCardForm({
                                                        ...rateCardForm,
                                                        charge: e.target.value
                                                    })}
                                                    className="bg-[var(--bg-primary)]"
                                                    step="1"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                    Add. ₹/Kg
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={rateCardForm.additionalPerKg}
                                                    onChange={(e) => setRateCardForm({
                                                        ...rateCardForm,
                                                        additionalPerKg: e.target.value
                                                    })}
                                                    className="bg-[var(--bg-primary)]"
                                                    step="1"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* COD Rule */}
                                <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                    <CardContent className="p-4 space-y-3">
                                        <h4 className="text-sm font-medium text-[var(--text-primary)]">
                                            COD Rule
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                    Rule Type
                                                </label>
                                                <Select
                                                    value={rateCardForm.codRuleType}
                                                    onChange={(e) =>
                                                        setRateCardForm({
                                                            ...rateCardForm,
                                                            codRuleType: e.target.value as RateCardForm['codRuleType'],
                                                        })
                                                    }
                                                    options={codRuleTypeOptions}
                                                />
                                            </div>
                                            {rateCardForm.codRuleType === 'slab' && (
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                        Slab Basis
                                                    </label>
                                                    <Select
                                                        value={rateCardForm.codSlabBasis}
                                                        onChange={(e) =>
                                                            setRateCardForm({
                                                                ...rateCardForm,
                                                                codSlabBasis: e.target.value as RateCardForm['codSlabBasis'],
                                                            })
                                                        }
                                                        options={codBasisOptions}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {rateCardForm.codRuleType === 'flat' && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                    Flat Charge (INR)
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={rateCardForm.codFlatCharge}
                                                    onChange={(e) =>
                                                        setRateCardForm({
                                                            ...rateCardForm,
                                                            codFlatCharge: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                        )}

                                        {rateCardForm.codRuleType === 'percentage' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                        Percentage
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={rateCardForm.codPercentage}
                                                        onChange={(e) =>
                                                            setRateCardForm({
                                                                ...rateCardForm,
                                                                codPercentage: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                        Min Charge
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={rateCardForm.codMinCharge}
                                                        onChange={(e) =>
                                                            setRateCardForm({
                                                                ...rateCardForm,
                                                                codMinCharge: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                        Max Charge
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={rateCardForm.codMaxCharge}
                                                        onChange={(e) =>
                                                            setRateCardForm({
                                                                ...rateCardForm,
                                                                codMaxCharge: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {rateCardForm.codRuleType === 'slab' && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                    Slabs JSON
                                                </label>
                                                <textarea
                                                    value={rateCardForm.codSlabsJson}
                                                    onChange={(e) =>
                                                        setRateCardForm({
                                                            ...rateCardForm,
                                                            codSlabsJson: e.target.value,
                                                        })
                                                    }
                                                    className="min-h-[130px] w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                                                    placeholder='[{"min":0,"max":1000,"value":30,"type":"flat"}]'
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Fuel and RTO */}
                                <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                    <CardContent className="p-4 space-y-4">
                                        <h4 className="text-sm font-medium text-[var(--text-primary)]">
                                            Fuel & RTO
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                    Fuel %
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={rateCardForm.fuelPercentage}
                                                    onChange={(e) =>
                                                        setRateCardForm({
                                                            ...rateCardForm,
                                                            fuelPercentage: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                    Fuel Base
                                                </label>
                                                <Select
                                                    value={rateCardForm.fuelBase}
                                                    onChange={(e) =>
                                                        setRateCardForm({
                                                            ...rateCardForm,
                                                            fuelBase: e.target.value as RateCardForm['fuelBase'],
                                                        })
                                                    }
                                                    options={fuelBaseOptions}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                    RTO Rule
                                                </label>
                                                <Select
                                                    value={rateCardForm.rtoRuleType}
                                                    onChange={(e) =>
                                                        setRateCardForm({
                                                            ...rateCardForm,
                                                            rtoRuleType: e.target.value as RateCardForm['rtoRuleType'],
                                                        })
                                                    }
                                                    options={rtoRuleTypeOptions}
                                                />
                                            </div>
                                            {rateCardForm.rtoRuleType === 'flat' && (
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                        Flat Amount
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={rateCardForm.rtoFlatAmount}
                                                        onChange={(e) =>
                                                            setRateCardForm({
                                                                ...rateCardForm,
                                                                rtoFlatAmount: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {rateCardForm.rtoRuleType === 'percentage' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                        Percentage
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={rateCardForm.rtoPercentage}
                                                        onChange={(e) =>
                                                            setRateCardForm({
                                                                ...rateCardForm,
                                                                rtoPercentage: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                        Min Charge
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={rateCardForm.rtoMinCharge}
                                                        onChange={(e) =>
                                                            setRateCardForm({
                                                                ...rateCardForm,
                                                                rtoMinCharge: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                                                        Max Charge
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={rateCardForm.rtoMaxCharge}
                                                        onChange={(e) =>
                                                            setRateCardForm({
                                                                ...rateCardForm,
                                                                rtoMaxCharge: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="outline" onClick={resetRateCardForm}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={saveRateCard}
                                        disabled={createRateCardMutation.isPending || updateRateCardMutation.isPending}
                                    >
                                        {(createRateCardMutation.isPending || updateRateCardMutation.isPending) && (
                                            <div className="h-4 w-4 mr-2 border-2 border-[var(--text-inverse)] border-t-transparent rounded-full animate-spin" />
                                        )}
                                        <Save className="h-4 w-4 mr-2" />
                                        {editingRateCard ? 'Update' : 'Save'} Rate Card
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-[var(--border-default)] min-h-[400px]">
                            {!selectedServiceId ? (
                                <EmptyState
                                    variant="noData"
                                    icon={<ArrowRight className="h-12 w-12" />}
                                    title="Select a Service"
                                    description="Please select a courier service to view and manage its rate cards."
                                    className="h-[400px]"
                                />
                            ) : (
                                <>
                                    <CardContent className="border-b border-[var(--border-subtle)] p-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Select
                                                value={listFlowType}
                                                onChange={(e) =>
                                                    setListFlowType(
                                                        e.target.value as typeof listFlowType
                                                    )
                                                }
                                                options={[
                                                    { label: 'All Flows', value: 'all' },
                                                    ...flowTypeOptions,
                                                ]}
                                            />
                                            <Select
                                                value={listCategory}
                                                onChange={(e) =>
                                                    setListCategory(
                                                        e.target.value as typeof listCategory
                                                    )
                                                }
                                                options={[
                                                    { label: 'All Categories', value: 'all' },
                                                    ...categoryOptions,
                                                ]}
                                            />
                                        </div>
                                    </CardContent>
                                    {isRateCardsLoading ? (
                                        <RateCardTableSkeleton />
                                    ) : rateCards.length === 0 ? (
                                        <EmptyState
                                            variant="noItems"
                                            icon={<Coins className="h-12 w-12" />}
                                            title="No Rate Cards Found"
                                            description="This service doesn't have any rate cards configured yet."
                                            action={{
                                                label: 'Create First Rate Card',
                                                onClick: startCreate,
                                                variant: 'primary',
                                                icon: <Plus className="h-4 w-4" />
                                            }}
                                            className="h-[400px]"
                                        />
                                    ) : (
                                        <CardContent className="p-0">
                                            <DataTable
                                                columns={columns}
                                                data={rateCards}
                                                isLoading={isRateCardsLoading}
                                            />
                                        </CardContent>
                                    )}
                                </>
                            )}
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
