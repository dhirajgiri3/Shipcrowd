"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Label } from '@/src/components/ui/core/Label';
import { Badge } from '@/src/components/ui/core/Badge';
import { apiClient } from '@/src/core';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Calculator, ArrowRight, Banknote, MapPin, Package, Truck, Info, ChevronRight } from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';

interface PricingBreakdown {
    subtotal: number;
    shipping: number;
    codCharge: number;
    tax: {
        cgst: number;
        sgst: number;
        igst: number;
        total: number;
    };
    discount: number;
    total: number;
    metadata: any;
    pricingProvider: string;
}

export default function PricePreviewPage() {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PricingBreakdown | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        companyId: '',
        userId: '', // Optional, or derived from company
        fromPincode: '110001',
        toPincode: '400001',
        weight: '0.5',
        length: '10',
        width: '10',
        height: '10',
        paymentMode: 'prepaid',
        orderValue: '1000',
        carrier: '',
        serviceType: '',
        strict: false
    });

    // Fetch Companies
    const { data: companiesData } = useQuery({
        queryKey: ['companies', 'active'],
        queryFn: async () => {
            const res = await apiClient.get('/companies?status=active');
            return res.data?.data || [];
        }
    });

    const companies = Array.isArray(companiesData) ? companiesData : [];

    const handleCalculate = async () => {
        if (!formData.companyId) {
            addToast('Please select a company', 'error');
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const payload = {
                companyId: formData.companyId,
                fromPincode: formData.fromPincode,
                toPincode: formData.toPincode,
                weight: Number(formData.weight),
                dimensions: {
                    length: Number(formData.length),
                    width: Number(formData.width),
                    height: Number(formData.height)
                },
                paymentMode: formData.paymentMode as any,
                orderValue: Number(formData.orderValue),
                carrier: formData.carrier || undefined,
                serviceType: formData.serviceType || undefined,
                strict: formData.strict
            };

            const response = await apiClient.post('/price/preview', payload);
            setResult(response.data.data);
            addToast('Price calculated successfully', 'success');
        } catch (error: any) {
            addToast(error?.response?.data?.message || 'Calculation failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-6xl space-y-8 pb-safe">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--primary-blue-soft)]">
                            <Calculator className="h-6 w-6 text-[var(--primary-blue)]" />
                        </div>
                        Price Preview Engine
                    </h1>
                    <p className="text-[var(--text-secondary)] max-w-2xl pl-[3.25rem]">
                        Simulate shipping costs and debug rate card logic in real-time.
                        Verify how surcharges, taxes, and zone logic apply to a shipment.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* CONFIGURATION PANEL (Left) */}
                <div className="xl:col-span-4 space-y-6">
                    <Card className="h-full border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow duration-300">
                        <CardHeader className="pb-4 border-b border-[var(--border-subtle)]">
                            <CardTitle className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <Package className="h-4 w-4 text-[var(--primary-blue)]" />
                                Shipment Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                            {/* Company Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="company" className="text-[var(--text-secondary)] font-medium">Rate Card Source</Label>
                                <div className="relative">
                                    <select
                                        id="company"
                                        className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm 
                                                   focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent outline-none transition-all
                                                   text-[var(--text-primary)] shadow-sm"
                                        value={formData.companyId}
                                        onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                    >
                                        <option value="">Select Company / Client</option>
                                        {companies.map((c: any) => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Route Details */}
                            <div className="space-y-3">
                                <Label className="text-[var(--text-secondary)] font-medium">Route Details</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                                        <Input
                                            className="pl-9 bg-[var(--bg-elevated)] border-[var(--border-default)] focus-visible:ring-[var(--primary-blue)]"
                                            placeholder="Origin Pin"
                                            value={formData.fromPincode}
                                            onChange={(e) => setFormData({ ...formData, fromPincode: e.target.value })}
                                        />
                                    </div>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                                        <Input
                                            className="pl-9 bg-[var(--bg-elevated)] border-[var(--border-default)] focus-visible:ring-[var(--primary-blue)]"
                                            placeholder="Dest Pin"
                                            value={formData.toPincode}
                                            onChange={(e) => setFormData({ ...formData, toPincode: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Package Details */}
                            <div className="space-y-3">
                                <Label className="text-[var(--text-secondary)] font-medium">Package Details</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <span className="absolute right-3 top-2.5 text-xs text-[var(--text-muted)] font-medium">kg</span>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            placeholder="Weight"
                                            className="bg-[var(--bg-elevated)] border-[var(--border-default)] focus-visible:ring-[var(--primary-blue)]"
                                            value={formData.weight}
                                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                        />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-xs text-[var(--text-muted)] font-bold">₹</span>
                                        <Input
                                            type="number"
                                            placeholder="Value"
                                            className="pl-7 bg-[var(--bg-elevated)] border-[var(--border-default)] focus-visible:ring-[var(--primary-blue)]"
                                            value={formData.orderValue}
                                            onChange={(e) => setFormData({ ...formData, orderValue: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Input placeholder="L" className="bg-[var(--bg-elevated)] text-center text-xs" value={formData.length} onChange={e => setFormData({ ...formData, length: e.target.value })} />
                                    <Input placeholder="W" className="bg-[var(--bg-elevated)] text-center text-xs" value={formData.width} onChange={e => setFormData({ ...formData, width: e.target.value })} />
                                    <Input placeholder="H" className="bg-[var(--bg-elevated)] text-center text-xs" value={formData.height} onChange={e => setFormData({ ...formData, height: e.target.value })} />
                                </div>
                            </div>

                            {/* Service Details */}
                            <div className="space-y-2">
                                <Label className="text-[var(--text-secondary)] font-medium">Payment Mode</Label>
                                <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-lg">
                                    {['prepaid', 'cod'].map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setFormData({ ...formData, paymentMode: mode })}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.paymentMode === mode
                                                ? 'bg-white shadow-sm text-[var(--text-primary)]'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                                }`}
                                        >
                                            {mode.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Overrides */}
                            <div className="pt-4 border-t border-[var(--border-subtle)]">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Overrides</p>
                                    <Badge variant="outline" className="text-[10px] text-[var(--text-muted)]">Optional</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        placeholder="Specific Carrier"
                                        value={formData.carrier}
                                        onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                                        className="text-xs bg-[var(--bg-elevated)]"
                                    />
                                    <Input
                                        placeholder="Service Type"
                                        value={formData.serviceType}
                                        onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                                        className="text-xs bg-[var(--bg-elevated)]"
                                    />
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="strictMode"
                                        className="rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                                        checked={formData.strict}
                                        onChange={(e) => setFormData({ ...formData, strict: e.target.checked })}
                                    />
                                    <Label htmlFor="strictMode" className="text-xs font-medium text-[var(--text-secondary)]">
                                        Strict Mode (Fail if specific carrier rule missing)
                                    </Label>
                                </div>
                            </div>

                            <Button
                                className="w-full bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white h-11 text-sm font-medium shadow-[var(--shadow-brand-sm)]"
                                onClick={handleCalculate}
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Calculate Price
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* RESULTS PANEL (Right) */}
                <div className="xl:col-span-8 space-y-6">
                    {result ? (
                        <div className="space-y-6 animate-fade-in">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] shadow-none">
                                    <CardContent className="p-5 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-secondary)]">Total Cost</p>
                                                <p className="text-3xl font-bold text-[var(--text-primary)] mt-1 tracking-tight">₹{result.total.toFixed(2)}</p>
                                            </div>
                                            <div className="p-2 rounded-full bg-[var(--success-bg)]">
                                                <Banknote className="h-5 w-5 text-[var(--success)]" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] shadow-none">
                                    <CardContent className="p-5 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-secondary)]">Base Shipping</p>
                                                <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1 tracking-tight">₹{result.shipping.toFixed(2)}</p>
                                            </div>
                                            <div className="p-2 rounded-full bg-[var(--primary-blue-soft)]">
                                                <Truck className="h-5 w-5 text-[var(--primary-blue)]" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] shadow-none">
                                    <CardContent className="p-5 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-secondary)]">GST (18%)</p>
                                                <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1 tracking-tight">₹{result.tax.total.toFixed(2)}</p>
                                            </div>
                                            <div className="p-2 rounded-full bg-[var(--warning-bg)]">
                                                <Package className="h-5 w-5 text-[var(--warning)]" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detailed Bill */}
                            <Card className="border-[var(--border-subtle)] shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                        <Info className="h-4 w-4 text-[var(--text-muted)]" />
                                        Rate Breakdown
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {result.metadata?.resolution ? (
                                            (() => {
                                                const res = result.metadata.resolution;
                                                let variant: 'success' | 'warning' | 'neutral' = 'neutral';
                                                let label = 'Generic Rule';

                                                if (res.matchedLevel === 'EXACT') {
                                                    variant = 'success';
                                                    label = `Exact Match: ${res.matchedCarrier}/${res.matchedServiceType}`;
                                                } else if (res.matchedLevel === 'CARRIER_DEFAULT') {
                                                    variant = 'warning';
                                                    label = `Carrier Default: ${res.matchedCarrier}`;
                                                }

                                                return (
                                                    <Badge variant={variant} className="text-xs">
                                                        {label}
                                                    </Badge>
                                                );
                                            })()
                                        ) : null}
                                        <Badge variant="outline" className="bg-white">
                                            {result.pricingProvider || 'Internal'}
                                        </Badge>
                                    </div>
                                </div>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-[var(--border-subtle)]">
                                        {/* Items */}
                                        <div className="grid grid-cols-2 px-6 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                                            <span className="text-sm text-[var(--text-secondary)]">Base Freight (Zone + Weight)</span>
                                            <span className="text-sm font-mono font-medium text-right text-[var(--text-primary)]">₹{result.shipping.toFixed(2)}</span>
                                        </div>

                                        {result.codCharge > 0 && (
                                            <div className="grid grid-cols-2 px-6 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                                                <span className="text-sm text-[var(--text-secondary)]">COD Handling Charge</span>
                                                <span className="text-sm font-mono font-medium text-right text-[var(--text-primary)]">₹{result.codCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {/* Surcharges Check */}
                                        {((result.subtotal - result.shipping - result.codCharge) > 0.1) && (
                                            <div className="grid grid-cols-2 px-6 py-3 hover:bg-[var(--bg-hover)] transition-colors text-[var(--warning)]">
                                                <span className="text-sm font-medium flex items-center gap-1.5">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]"></span>
                                                    Additional Surcharges (Fuel/MinCall)
                                                </span>
                                                <span className="text-sm font-mono font-medium text-right">
                                                    ₹{(result.subtotal - result.shipping - result.codCharge).toFixed(2)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Subtotal */}
                                        <div className="grid grid-cols-2 px-6 py-3 bg-[var(--bg-tertiary)] font-medium">
                                            <span className="text-sm text-[var(--text-primary)]">Subtotal (Pre-Tax)</span>
                                            <span className="text-sm font-mono text-right text-[var(--text-primary)]">₹{result.subtotal.toFixed(2)}</span>
                                        </div>

                                        {/* Taxes */}
                                        <div className="px-6 py-3 space-y-1">
                                            <div className="flex justify-between text-xs text-[var(--text-muted)]">
                                                <span>CGST (9%)</span>
                                                <span>₹{result.tax.cgst.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-[var(--text-muted)]">
                                                <span>SGST (9%)</span>
                                                <span>₹{result.tax.sgst.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-[var(--text-muted)]">
                                                <span>IGST (18%)</span>
                                                <span>₹{result.tax.igst.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Final */}
                                        <div className="grid grid-cols-2 px-6 py-4 bg-[var(--primary-blue-soft)]">
                                            <span className="text-base font-bold text-[var(--primary-blue-deep)]">Net Payable</span>
                                            <span className="text-xl font-bold text-right text-[var(--primary-blue-deep)]">₹{result.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Debug Section */}
                            <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] transition-colors text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border-subtle)]"
                                    onClick={() => {/* Toggle functionality if needed */ }}
                                >
                                    <span>Advanced Debug Data (JSON)</span>
                                    <ChevronRight className="h-4 w-4 opacity-50" />
                                </button>
                                <div className="bg-[#0B0C15] p-4 overflow-x-auto">
                                    <pre className="text-[10px] font-mono text-emerald-400 leading-relaxed">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)]">
                            <div className="bg-[var(--bg-primary)] p-4 rounded-full shadow-[var(--shadow-sm)] mb-4">
                                <ArrowRight className="h-8 w-8 text-[var(--text-tertiary)]" />
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Ready to Simulate</h3>
                            <p className="max-w-xs mx-auto text-[var(--text-secondary)] text-sm leading-relaxed">
                                Enter shipment details on the left panel to generate a precise cost breakdown according to your active rate cards.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
