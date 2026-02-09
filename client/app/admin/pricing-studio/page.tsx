'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { useServiceRateCards, useSimulateServiceRateCard, ServiceRateCardItem } from '@/src/core/api/hooks/admin';
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
    };
};

export default function PricingStudioPage() {
    const { data: cards = [], isLoading } = useServiceRateCards();
    const simulateMutation = useSimulateServiceRateCard();

    const [costCardId, setCostCardId] = useState('');
    const [sellCardId, setSellCardId] = useState('');
    const [weight, setWeight] = useState(0.5);
    const [length, setLength] = useState(10);
    const [width, setWidth] = useState(10);
    const [height, setHeight] = useState(10);
    const [zone, setZone] = useState('zoneD');
    const [paymentMode, setPaymentMode] = useState<'cod' | 'prepaid'>('prepaid');
    const [orderValue, setOrderValue] = useState(1000);
    const [provider, setProvider] = useState<'velocity' | 'delhivery' | 'ekart'>('delhivery');
    const [fromPincode, setFromPincode] = useState('560001');
    const [toPincode, setToPincode] = useState('110001');

    const [costPricing, setCostPricing] = useState<PricingPayload | null>(null);
    const [sellPricing, setSellPricing] = useState<PricingPayload | null>(null);

    const costCards = useMemo(() => cards.filter((card) => card.cardType === 'cost'), [cards]);
    const sellCards = useMemo(() => cards.filter((card) => card.cardType === 'sell'), [cards]);

    const findCard = (id: string) => cards.find((card) => card._id === id) as ServiceRateCardItem | undefined;

    const runSimulation = async () => {
        setCostPricing(null);
        setSellPricing(null);

        const payload = {
            weight,
            dimensions: { length, width, height },
            zone,
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
    };

    const marginAmount = (sellPricing?.totalAmount || 0) - (costPricing?.totalAmount || 0);
    const marginPercent = (costPricing?.totalAmount || 0) > 0 ? (marginAmount / (costPricing?.totalAmount || 1)) * 100 : 0;

    return (
        <div className="p-6 md:p-8 max-w-[1300px] mx-auto space-y-6 bg-[var(--bg-secondary)] min-h-screen">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pricing Studio</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Simulate service-rate-card formulas and preview cost vs sell margins.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 space-y-3">
                    <label className="text-xs text-[var(--text-muted)]">Cost Card</label>
                    <select value={costCardId} onChange={(e) => setCostCardId(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm">
                        <option value="">Select cost card</option>
                        {costCards.map((card) => (
                            <option key={card._id} value={card._id}>{card.serviceId} • {card.status}</option>
                        ))}
                    </select>

                    <label className="text-xs text-[var(--text-muted)]">Sell Card</label>
                    <select value={sellCardId} onChange={(e) => setSellCardId(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm">
                        <option value="">Select sell card</option>
                        {sellCards.map((card) => (
                            <option key={card._id} value={card._id}>{card.serviceId} • {card.status}</option>
                        ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">Weight (kg)</label>
                            <input value={weight} onChange={(e) => setWeight(Number(e.target.value || 0))} type="number" min={0.1} step={0.1} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">Order Value</label>
                            <input value={orderValue} onChange={(e) => setOrderValue(Number(e.target.value || 0))} type="number" min={0} step={1} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">L</label>
                            <input value={length} onChange={(e) => setLength(Number(e.target.value || 0))} type="number" min={1} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">W</label>
                            <input value={width} onChange={(e) => setWidth(Number(e.target.value || 0))} type="number" min={1} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">H</label>
                            <input value={height} onChange={(e) => setHeight(Number(e.target.value || 0))} type="number" min={1} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">Zone</label>
                            <input value={zone} onChange={(e) => setZone(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">Payment</label>
                            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as 'cod' | 'prepaid')} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm">
                                <option value="prepaid">prepaid</option>
                                <option value="cod">cod</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">Provider</label>
                            <select value={provider} onChange={(e) => setProvider(e.target.value as 'velocity' | 'delhivery' | 'ekart')} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm">
                                <option value="delhivery">delhivery</option>
                                <option value="ekart">ekart</option>
                                <option value="velocity">velocity</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">From PIN</label>
                            <input value={fromPincode} onChange={(e) => setFromPincode(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">To PIN</label>
                            <input value={toPincode} onChange={(e) => setToPincode(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                        </div>
                    </div>

                    <Button onClick={runSimulation} disabled={simulateMutation.isPending || (!costCardId && !sellCardId)} className="w-full">
                        {simulateMutation.isPending ? 'Calculating...' : 'Calculate'}
                    </Button>
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Cost Total</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(costPricing?.totalAmount || 0)}</p>
                        {costCardId && <p className="text-xs text-[var(--text-muted)] mt-1">Card: {findCard(costCardId)?.serviceId}</p>}
                    </div>
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Sell Total</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(sellPricing?.totalAmount || 0)}</p>
                        {sellCardId && <p className="text-xs text-[var(--text-muted)] mt-1">Card: {findCard(sellCardId)?.serviceId}</p>}
                    </div>

                    <div className="md:col-span-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
                        <p className="text-xs text-[var(--text-muted)] mb-2">Margin Preview</p>
                        <div className="flex items-end justify-between">
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(marginAmount)}</p>
                            <p className={`text-sm font-semibold ${marginAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {marginPercent.toFixed(2)}%
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 space-y-2">
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase">Cost Breakdown</p>
                        <p className="text-sm">Subtotal: {formatCurrency(costPricing?.subtotal || 0)}</p>
                        <p className="text-sm">COD: {formatCurrency(costPricing?.codCharge || 0)}</p>
                        <p className="text-sm">Fuel: {formatCurrency(costPricing?.fuelCharge || 0)}</p>
                        <p className="text-sm">GST: {formatCurrency(costPricing?.gstBreakdown?.total || 0)}</p>
                        <p className="text-sm">Chargeable Wt: {(costPricing?.chargeableWeight || 0).toFixed(3)} kg</p>
                    </div>

                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 space-y-2">
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase">Sell Breakdown</p>
                        <p className="text-sm">Subtotal: {formatCurrency(sellPricing?.subtotal || 0)}</p>
                        <p className="text-sm">COD: {formatCurrency(sellPricing?.codCharge || 0)}</p>
                        <p className="text-sm">Fuel: {formatCurrency(sellPricing?.fuelCharge || 0)}</p>
                        <p className="text-sm">GST: {formatCurrency(sellPricing?.gstBreakdown?.total || 0)}</p>
                        <p className="text-sm">Chargeable Wt: {(sellPricing?.chargeableWeight || 0).toFixed(3)} kg</p>
                    </div>
                </div>
            </div>

            {isLoading && <p className="text-sm text-[var(--text-muted)]">Loading service rate cards...</p>}
        </div>
    );
}
