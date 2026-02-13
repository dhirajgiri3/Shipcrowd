"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Select } from '@/src/components/ui/form/Select';
import { Slider } from '@/src/components/ui/core/Slider';
import {
    Package,
    MapPin,
    Weight,
    IndianRupee,
    Calculator,
    Settings2,
    ChevronDown,
    ChevronUp,
    Info,
    Box
} from 'lucide-react';
import { SmartRateInput } from '@/src/core/api/clients/shipping/ratesApi';
import { cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/core/Badge';

interface RateInputFormProps {
    formData: SmartRateInput;
    setFormData: (data: SmartRateInput) => void;
    onCalculate: () => void;
    isPending: boolean;
    customWeights: {
        price: number;
        speed: number;
        reliability: number;
        performance: number;
    };
    setCustomWeights: (weights: {
        price: number;
        speed: number;
        reliability: number;
        performance: number;
    }) => void;
}

export function RateInputForm({
    formData,
    setFormData,
    onCalculate,
    isPending,
    customWeights,
    setCustomWeights
}: RateInputFormProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleWeightChange = (field: keyof typeof customWeights, value: number) => {
        setCustomWeights({ ...customWeights, [field]: value });
    };

    const totalWeight = customWeights.price + customWeights.speed + customWeights.reliability + customWeights.performance;
    const isWeightValid = totalWeight === 100;

    return (
        <Card className="border-[var(--border-subtle)] shadow-sm sticky top-6">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5 text-[var(--primary-blue)]" />
                    Shipment Details
                </CardTitle>
                <CardDescription>Enter details to get AI-optimized rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Pincodes Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Origin
                        </label>
                        <Input
                            placeholder="Origin Pincode"
                            maxLength={6}
                            value={formData.originPincode}
                            onChange={(e) => setFormData({ ...formData, originPincode: e.target.value })}
                            className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] focus-visible:ring-[var(--primary-blue)]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Destination
                        </label>
                        <Input
                            placeholder="Dest. Pincode"
                            maxLength={6}
                            value={formData.destinationPincode}
                            onChange={(e) => setFormData({ ...formData, destinationPincode: e.target.value })}
                            className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] focus-visible:ring-[var(--primary-blue)]"
                        />
                    </div>
                </div>

                {/* Weight & Type Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                            <Weight className="h-3 w-3" /> Weight (kg)
                        </label>
                        <div className="relative">
                            <Input
                                type="number"
                                step="0.1"
                                min="0.01"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                                className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] pointer-events-none">kg</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)]">Payment Type</label>
                        <Select
                            options={[
                                { label: 'Prepaid', value: 'prepaid' },
                                { label: 'Cash on Delivery (COD)', value: 'cod' }
                            ]}
                            value={formData.paymentMode}
                            onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as 'prepaid' | 'cod' })}
                            className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]"
                        />
                    </div>
                </div>

                {/* Order Value */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" /> Order Value
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium">₹</span>
                        <Input
                            type="number"
                            min="0"
                            value={formData.orderValue}
                            onChange={(e) => setFormData({ ...formData, orderValue: parseInt(e.target.value) || 0 })}
                            className="pl-7 bg-[var(--bg-secondary)] border-[var(--border-subtle)]"
                        />
                    </div>
                </div>

                {/* Dimensions (Collapsible) */}
                <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                    <div className="bg-[var(--bg-secondary)]/50 px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)]">
                            <Box className="h-3.5 w-3.5" />
                            Dimensions & Volumetric Weight
                        </div>
                        {formData.dimensions && (
                            <Badge variant="neutral" className="text-[10px] h-5 px-1.5">
                                {((formData.dimensions.length * formData.dimensions.width * formData.dimensions.height) / 5000).toFixed(2)} kg (Vol)
                            </Badge>
                        )}
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] text-[var(--text-secondary)] uppercase">Length</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min="1"
                                    placeholder="L"
                                    className="h-8 text-xs pr-6"
                                    value={formData.dimensions?.length || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        dimensions: { ...formData.dimensions!, length: parseFloat(e.target.value) || 1 }
                                    })}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">cm</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-[var(--text-secondary)] uppercase">Width</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min="1"
                                    placeholder="W"
                                    className="h-8 text-xs pr-6"
                                    value={formData.dimensions?.width || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        dimensions: { ...formData.dimensions!, width: parseFloat(e.target.value) || 1 }
                                    })}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">cm</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-[var(--text-secondary)] uppercase">Height</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min="1"
                                    placeholder="H"
                                    className="h-8 text-xs pr-6"
                                    value={formData.dimensions?.height || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        dimensions: { ...formData.dimensions!, height: parseFloat(e.target.value) || 1 }
                                    })}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">cm</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Advanced Scoring Weights */}
                <div className="pt-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between text-xs font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue)]/80 py-2"
                    >
                        <span className="flex items-center gap-1.5">
                            <Settings2 className="h-3.5 w-3.5" />
                            Customize Scoring Weights
                        </span>
                        {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {showAdvanced && (
                        <div className={cn(
                            "mt-2 space-y-4 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] animate-in slide-in-from-top-2 duration-200",
                            !isWeightValid && "border-red-200 ring-1 ring-red-500/10"
                        )}>
                            <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)] mb-3">
                                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                <p>Adjust importance of factors for AI recommendations. Total must be 100%.</p>
                            </div>

                            <div className="space-y-4">
                                <Slider
                                    label="Price Sensitivity"
                                    value={customWeights.price}
                                    onValueChange={(val) => handleWeightChange('price', val)}
                                    max={100}
                                />
                                <Slider
                                    label="Delivery Speed"
                                    value={customWeights.speed}
                                    onValueChange={(val) => handleWeightChange('speed', val)}
                                    max={100}
                                />
                                <Slider
                                    label="Reliability"
                                    value={customWeights.reliability}
                                    onValueChange={(val) => handleWeightChange('reliability', val)}
                                    max={100}
                                />
                                <Slider
                                    label="Performance"
                                    value={customWeights.performance}
                                    onValueChange={(val) => handleWeightChange('performance', val)}
                                    max={100}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]/50">
                                <span className="text-xs font-medium text-[var(--text-secondary)]">Total Weight</span>
                                <span className={cn(
                                    "text-sm font-bold",
                                    isWeightValid ? "text-[var(--success)]" : "text-[var(--error)]"
                                )}>
                                    {totalWeight}%
                                </span>
                            </div>
                            {!isWeightValid && (
                                <p className="text-[10px] text-[var(--error)] text-right">
                                    Total must equal exactly 100%
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <Button
                    onClick={onCalculate}
                    disabled={isPending || (showAdvanced && !isWeightValid)}
                    className="w-full h-11 text-base shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    variant="primary"
                >
                    {isPending ? (
                        <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Calculating Best Rates...
                        </>
                    ) : (
                        <>
                            <Calculator className="h-4 w-4 mr-2" />
                            Calculate Rates
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
