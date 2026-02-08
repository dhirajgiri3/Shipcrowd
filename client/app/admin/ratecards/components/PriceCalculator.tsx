"use client";

import { useMemo, useState } from 'react';
import { Input } from '@/src/components/ui/core/Input';
import { Button } from '@/src/components/ui/core/Button';
import { RateCardFormData, calculateMultipliers } from './ratecardWizard.utils';

interface PriceCalculatorProps {
    formData: RateCardFormData;
}

export function PriceCalculator({ formData }: PriceCalculatorProps) {
    const [weightKg, setWeightKg] = useState(1);
    const [zone, setZone] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
    const [paymentMode, setPaymentMode] = useState<'prepaid' | 'cod'>('prepaid');
    const [orderValue, setOrderValue] = useState(1000);
    const [result, setResult] = useState<{ subtotal: number; gst: number; total: number; breakdown: Record<string, number> } | null>(null);

    const multipliers = useMemo(() => calculateMultipliers(formData), [formData]);

    const calculate = () => {
        const baseWeightKg = (parseFloat(formData.basicWeight) || 500) / 1000;
        const addWeightGm = parseFloat(formData.additionalWeight) || 500;
        const baseZonePrice = parseFloat((formData as any)[`basicZone${zone}`]) || 0;

        const freightBase = baseZonePrice;
        const additionalWeightKg = Math.max(0, weightKg - baseWeightKg);
        const increments = Math.ceil((additionalWeightKg * 1000) / addWeightGm);

        const zoneMultiplier = multipliers[`zone${zone}`] || 1;
        const zoneAAdditional = parseFloat(formData.additionalZoneA) || 0;
        const additionalRate = zoneAAdditional * zoneMultiplier;
        const additionalCharge = increments > 0 ? increments * additionalRate : 0;

        const codCharge = paymentMode === 'cod'
            ? Math.max((orderValue * (parseFloat(formData.codPercentage) || 0)) / 100, parseFloat(formData.codMinimumCharge) || 0)
            : 0;

        let freight = freightBase + additionalCharge;
        if (formData.minimumFareCalculatedOn === 'freight') {
            freight = Math.max(freight, parseFloat(formData.minimumFare) || 0);
        }

        let subtotal = freight + codCharge;
        if (formData.minimumFareCalculatedOn === 'freight_overhead') {
            subtotal = Math.max(subtotal, parseFloat(formData.minimumFare) || 0);
        }

        const gst = subtotal * ((parseFloat(formData.gst) || 0) / 100);
        const total = subtotal + gst;

        setResult({
            subtotal,
            gst,
            total,
            breakdown: {
                baseRate: freightBase,
                additionalWeight: additionalCharge,
                codCharge,
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Weight (kg)</label>
                    <Input
                        type="number"
                        value={weightKg}
                        onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                        className="mt-2"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Zone</label>
                    <select
                        className="w-full h-10 mt-2 px-3 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] border-none"
                        value={zone}
                        onChange={(e) => setZone(e.target.value as any)}
                    >
                        {['A', 'B', 'C', 'D', 'E'].map(z => (
                            <option key={z} value={z}>Zone {z}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Payment Mode</label>
                    <select
                        className="w-full h-10 mt-2 px-3 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] border-none"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as any)}
                    >
                        <option value="prepaid">Prepaid</option>
                        <option value="cod">COD</option>
                    </select>
                </div>
            </div>

            {paymentMode === 'cod' && (
                <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Order Value</label>
                    <Input
                        type="number"
                        value={orderValue}
                        onChange={(e) => setOrderValue(parseFloat(e.target.value) || 0)}
                        className="mt-2"
                    />
                </div>
            )}

            <Button onClick={calculate}>Calculate Price</Button>

            {result && (
                <div className="space-y-2 bg-[var(--bg-secondary)] rounded-lg p-4">
                    <div className="flex justify-between text-sm">
                        <span>Base Rate</span>
                        <span>₹{result.breakdown.baseRate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Additional Weight</span>
                        <span>₹{result.breakdown.additionalWeight.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>COD Charge</span>
                        <span>₹{result.breakdown.codCharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium border-t border-[var(--border-default)] pt-2">
                        <span>Subtotal</span>
                        <span>₹{result.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>GST</span>
                        <span>₹{result.gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-[var(--border-default)] pt-2">
                        <span>Total</span>
                        <span>₹{result.total.toFixed(2)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
