"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { useCalculateRates } from '@/src/core/api/hooks/seller/useSellerRates';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { formatCurrency } from '@/src/lib/utils';
import { Truck, Calculator } from 'lucide-react';
import type { CourierRate } from '@/src/types/domain/order';

export function RatesClient() {
    const { addToast } = useToast();
    const { mutateAsync: calculateRates, isPending } = useCalculateRates();
    const [fromPincode, setFromPincode] = useState('560001');
    const [toPincode, setToPincode] = useState('110001');
    const [weight, setWeight] = useState('0.5');
    const [orderValue, setOrderValue] = useState('1000');
    const [rates, setRates] = useState<CourierRate[]>([]);

    const handleCalculate = async () => {
        try {
            const response = await calculateRates({
                originPincode: fromPincode,
                destinationPincode: toPincode,
                weight: Number(weight),
                paymentMode: 'prepaid',
                orderValue: Number(orderValue),
                length: 10,
                width: 10,
                height: 10,
            });
            setRates(response.data);
            addToast('Quotes fetched successfully', 'success');
        } catch (error: any) {
            addToast(error?.response?.data?.message || 'Failed to fetch quotes', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Calculator className="h-6 w-6 text-[var(--primary-blue)]" />
                    Courier Rate Calculator
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Powered by canonical quote-session pricing.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Shipment Input</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input value={fromPincode} onChange={(e) => setFromPincode(e.target.value)} placeholder="From pincode" />
                    <Input value={toPincode} onChange={(e) => setToPincode(e.target.value)} placeholder="To pincode" />
                    <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight (kg)" type="number" />
                    <Input value={orderValue} onChange={(e) => setOrderValue(e.target.value)} placeholder="Order value" type="number" />
                    <div className="md:col-span-4">
                        <Button onClick={handleCalculate} disabled={isPending}>
                            {isPending ? 'Calculating...' : 'Get Quotes'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Quote Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {rates.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)]">No quotes yet.</p>
                    ) : (
                        rates.map((rate) => (
                            <div key={rate.optionId || rate.courierId} className="p-3 rounded-lg border border-[var(--border-subtle)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-[var(--text-muted)]" />
                                    <div>
                                        <p className="font-medium text-[var(--text-primary)]">{rate.courierName}</p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {rate.serviceType} {rate.isRecommended ? '• Recommended' : ''}
                                        </p>
                                    </div>
                                </div>
                                <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(rate.rate)}</p>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
