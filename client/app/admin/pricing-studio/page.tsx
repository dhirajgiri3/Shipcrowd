'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Badge } from '@/src/components/ui/core/Badge';
import { useServiceRateCards, useSimulateServiceRateCard, ServiceRateCardItem, useCourierServices } from '@/src/core/api/hooks/admin';
import { formatCurrency } from '@/src/lib/utils';

type PricingPayload = {
    totalAmount?: number;
    chargeableWeight?: number;
    subtotal?: number;
    codCharge?: number;
    fuelCharge?: number;
    rtoCharge?: number;
    gstBreakdown?: { total?: number; cgst?: number; sgst?: number; igst?: number };
    breakdown?: {
        slab?: { slabCharge?: number; roundedExtraWeightKg?: number; additionalPerKg?: number };
        weight?: { actualWeight?: number; volumetricWeight?: number; weightBasisUsed?: string };
        zone?: { resolvedZone?: string; source?: string };
    };
};

export default function PricingStudioPage() {
    const { data: cards = [], isLoading } = useServiceRateCards();
    const { data: courierServices = [] } = useCourierServices();
    const simulateMutation = useSimulateServiceRateCard();

    const [costCardId, setCostCardId] = useState('');
    const [sellCardId, setSellCardId] = useState('');
    const [weight, setWeight] = useState(0.5);
    const [length, setLength] = useState(10);
    const [width, setWidth] = useState(10);
    const [height, setHeight] = useState(10);
    const [zone, setZone] = useState('');
    const [paymentMode, setPaymentMode] = useState<'cod' | 'prepaid'>('prepaid');
    const [orderValue, setOrderValue] = useState(1000);
    const [provider, setProvider] = useState<'velocity' | 'delhivery' | 'ekart'>('delhivery');
    const [fromPincode, setFromPincode] = useState('560001');
    const [toPincode, setToPincode] = useState('110001');

    const [costPricing, setCostPricing] = useState<PricingPayload | null>(null);
    const [sellPricing, setSellPricing] = useState<PricingPayload | null>(null);
    const [simulationError, setSimulationError] = useState<string | null>(null);

    const costCards = useMemo(() => cards.filter((card) => card.cardType === 'cost'), [cards]);
    const sellCards = useMemo(() => cards.filter((card) => card.cardType === 'sell'), [cards]);

    const serviceNameMap = useMemo(() => {
        const map = new Map<string, string>();
        courierServices.forEach(s => map.set(s._id, s.displayName));
        return map;
    }, [courierServices]);

    const findCard = (id: string) => cards.find((card) => card._id === id) as ServiceRateCardItem | undefined;

    const getServiceName = (serviceId: string) => serviceNameMap.get(serviceId) || serviceId;

    const runSimulation = async () => {
        setCostPricing(null);
        setSellPricing(null);
        setSimulationError(null);

        try {
            const payload = {
                weight,
                dimensions: { length, width, height },
                zone: zone || undefined,
                paymentMode,
                orderValue,
                provider,
                fromPincode,
                toPincode,
            };

            if (costCardId) {
                const costResult = await simulateMutation.mutateAsync({ id: costCardId, ...payload });
                setCostPricing((costResult as any).pricing || null);
            }
            if (sellCardId) {
                const sellResult = await simulateMutation.mutateAsync({ id: sellCardId, ...payload });
                setSellPricing((sellResult as any).pricing || null);
            }
        } catch (error: any) {
            setSimulationError(
                error?.response?.data?.message || error?.message || 'Simulation failed'
            );
        }
    };

    const marginAmount = (sellPricing?.totalAmount || 0) - (costPricing?.totalAmount || 0);
    const marginPercent = (sellPricing?.totalAmount || 0) > 0 ? (marginAmount / (sellPricing?.totalAmount || 1)) * 100 : 0;

    return (
        <div className="p-6 md:p-8 max-w-[1300px] mx-auto space-y-6 bg-[var(--bg-secondary)] min-h-screen">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pricing Studio</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Simulate service-rate-card formulas and preview cost vs sell margins.</p>
            </div>

            {simulationError && (
                <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="p-4">
                        <p className="text-sm text-red-600 dark:text-red-400">{simulationError}</p>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Simulation Inputs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-muted)]">Cost Card</label>
                            <select
                                value={costCardId}
                                onChange={(e) => setCostCardId(e.target.value)}
                                className="w-full h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-sm"
                            >
                                <option value="">Select cost card</option>
                                {costCards.map((card) => (
                                    <option key={card._id} value={card._id}>
                                        {getServiceName(card.serviceId)} • {card.status}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-muted)]">Sell Card</label>
                            <select
                                value={sellCardId}
                                onChange={(e) => setSellCardId(e.target.value)}
                                className="w-full h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-sm"
                            >
                                <option value="">Select sell card</option>
                                {sellCards.map((card) => (
                                    <option key={card._id} value={card._id}>
                                        {getServiceName(card.serviceId)} • {card.status}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">Weight (kg)</label>
                                <Input
                                    value={weight}
                                    onChange={(e) => setWeight(Number(e.target.value || 0))}
                                    type="number"
                                    min={0.1}
                                    step={0.1}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">Order Value</label>
                                <Input
                                    value={orderValue}
                                    onChange={(e) => setOrderValue(Number(e.target.value || 0))}
                                    type="number"
                                    min={0}
                                    step={1}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">L (cm)</label>
                                <Input
                                    value={length}
                                    onChange={(e) => setLength(Number(e.target.value || 0))}
                                    type="number"
                                    min={1}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">W (cm)</label>
                                <Input
                                    value={width}
                                    onChange={(e) => setWidth(Number(e.target.value || 0))}
                                    type="number"
                                    min={1}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">H (cm)</label>
                                <Input
                                    value={height}
                                    onChange={(e) => setHeight(Number(e.target.value || 0))}
                                    type="number"
                                    min={1}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">Zone (optional)</label>
                                <Input
                                    value={zone}
                                    onChange={(e) => setZone(e.target.value)}
                                    placeholder="Auto-resolved"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">Payment</label>
                                <select
                                    value={paymentMode}
                                    onChange={(e) => setPaymentMode(e.target.value as 'cod' | 'prepaid')}
                                    className="w-full h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-sm"
                                >
                                    <option value="prepaid">Prepaid</option>
                                    <option value="cod">COD</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">Provider</label>
                                <select
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value as 'velocity' | 'delhivery' | 'ekart')}
                                    className="w-full h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-sm"
                                >
                                    <option value="delhivery">Delhivery</option>
                                    <option value="ekart">eKart</option>
                                    <option value="velocity">Velocity</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">From PIN</label>
                                <Input
                                    value={fromPincode}
                                    onChange={(e) => setFromPincode(e.target.value)}
                                    maxLength={6}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-muted)]">To PIN</label>
                                <Input
                                    value={toPincode}
                                    onChange={(e) => setToPincode(e.target.value)}
                                    maxLength={6}
                                />
                            </div>
                        </div>

                        <Button
                            onClick={runSimulation}
                            disabled={simulateMutation.isPending || (!costCardId && !sellCardId)}
                            className="w-full"
                        >
                            {simulateMutation.isPending ? 'Calculating...' : 'Calculate'}
                        </Button>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <p className="text-xs text-[var(--text-muted)]">Cost Total</p>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">
                                {formatCurrency(costPricing?.totalAmount || 0)}
                            </p>
                            {costCardId && (
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Card: {getServiceName(findCard(costCardId)?.serviceId || '')}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <p className="text-xs text-[var(--text-muted)]">Sell Total</p>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">
                                {formatCurrency(sellPricing?.totalAmount || 0)}
                            </p>
                            {sellCardId && (
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Card: {getServiceName(findCard(sellCardId)?.serviceId || '')}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader className="pb-3">
                            <p className="text-xs text-[var(--text-muted)]">Margin Preview</p>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between">
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {formatCurrency(marginAmount)}
                                </p>
                                <Badge
                                    variant={marginAmount >= 0 ? 'success' : 'error'}
                                    className="text-sm font-semibold"
                                >
                                    {marginPercent.toFixed(2)}%
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase">Cost Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">Subtotal:</span>
                                <span>{formatCurrency(costPricing?.subtotal || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">COD:</span>
                                <span>{formatCurrency(costPricing?.codCharge || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">Fuel:</span>
                                <span>{formatCurrency(costPricing?.fuelCharge || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">RTO:</span>
                                <span>{formatCurrency(costPricing?.rtoCharge || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">GST:</span>
                                <span>{formatCurrency(costPricing?.gstBreakdown?.total || 0)}</span>
                            </div>
                            {(costPricing?.gstBreakdown?.cgst || 0) > 0 && (
                                <div className="text-xs text-[var(--text-muted)] ml-4 flex justify-between">
                                    <span>CGST + SGST:</span>
                                    <span>
                                        {formatCurrency(costPricing?.gstBreakdown?.cgst || 0)} + {formatCurrency(costPricing?.gstBreakdown?.sgst || 0)}
                                    </span>
                                </div>
                            )}
                            {(costPricing?.gstBreakdown?.igst || 0) > 0 && (
                                <div className="text-xs text-[var(--text-muted)] ml-4 flex justify-between">
                                    <span>IGST:</span>
                                    <span>{formatCurrency(costPricing?.gstBreakdown?.igst || 0)}</span>
                                </div>
                            )}
                            <div className="border-t border-[var(--border-subtle)] pt-1.5" />
                            <div className="flex justify-between text-xs">
                                <span className="text-[var(--text-secondary)]">Actual Wt:</span>
                                <span>{(costPricing?.breakdown?.weight?.actualWeight || 0).toFixed(3)} kg</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-[var(--text-secondary)]">Volumetric:</span>
                                <span>{(costPricing?.breakdown?.weight?.volumetricWeight || 0).toFixed(3)} kg</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium">
                                <span>Chargeable:</span>
                                <span>
                                    {(costPricing?.chargeableWeight || 0).toFixed(3)} kg
                                    {costPricing?.breakdown?.weight?.weightBasisUsed && (
                                        <Badge variant="outline" className="ml-1.5 text-[9px]">
                                            {costPricing.breakdown.weight.weightBasisUsed}
                                        </Badge>
                                    )}
                                </span>
                            </div>
                            {costPricing?.breakdown?.zone && (
                                <div className="flex justify-between text-xs border-t border-[var(--border-subtle)] pt-1.5">
                                    <span className="text-[var(--text-secondary)]">Zone:</span>
                                    <span>
                                        <Badge variant="outline" className="text-[9px]">
                                            {costPricing.breakdown.zone.resolvedZone || 'N/A'}
                                        </Badge>
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase">Sell Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">Subtotal:</span>
                                <span>{formatCurrency(sellPricing?.subtotal || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">COD:</span>
                                <span>{formatCurrency(sellPricing?.codCharge || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">Fuel:</span>
                                <span>{formatCurrency(sellPricing?.fuelCharge || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">RTO:</span>
                                <span>{formatCurrency(sellPricing?.rtoCharge || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)]">GST:</span>
                                <span>{formatCurrency(sellPricing?.gstBreakdown?.total || 0)}</span>
                            </div>
                            {(sellPricing?.gstBreakdown?.cgst || 0) > 0 && (
                                <div className="text-xs text-[var(--text-muted)] ml-4 flex justify-between">
                                    <span>CGST + SGST:</span>
                                    <span>
                                        {formatCurrency(sellPricing?.gstBreakdown?.cgst || 0)} + {formatCurrency(sellPricing?.gstBreakdown?.sgst || 0)}
                                    </span>
                                </div>
                            )}
                            {(sellPricing?.gstBreakdown?.igst || 0) > 0 && (
                                <div className="text-xs text-[var(--text-muted)] ml-4 flex justify-between">
                                    <span>IGST:</span>
                                    <span>{formatCurrency(sellPricing?.gstBreakdown?.igst || 0)}</span>
                                </div>
                            )}
                            <div className="border-t border-[var(--border-subtle)] pt-1.5" />
                            <div className="flex justify-between text-xs">
                                <span className="text-[var(--text-secondary)]">Actual Wt:</span>
                                <span>{(sellPricing?.breakdown?.weight?.actualWeight || 0).toFixed(3)} kg</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-[var(--text-secondary)]">Volumetric:</span>
                                <span>{(sellPricing?.breakdown?.weight?.volumetricWeight || 0).toFixed(3)} kg</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium">
                                <span>Chargeable:</span>
                                <span>
                                    {(sellPricing?.chargeableWeight || 0).toFixed(3)} kg
                                    {sellPricing?.breakdown?.weight?.weightBasisUsed && (
                                        <Badge variant="outline" className="ml-1.5 text-[9px]">
                                            {sellPricing.breakdown.weight.weightBasisUsed}
                                        </Badge>
                                    )}
                                </span>
                            </div>
                            {sellPricing?.breakdown?.zone && (
                                <div className="flex justify-between text-xs border-t border-[var(--border-subtle)] pt-1.5">
                                    <span className="text-[var(--text-secondary)]">Zone:</span>
                                    <span>
                                        <Badge variant="outline" className="text-[9px]">
                                            {sellPricing.breakdown.zone.resolvedZone || 'N/A'}
                                        </Badge>
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {isLoading && <p className="text-sm text-[var(--text-muted)]">Loading service rate cards...</p>}
        </div>
    );
}
