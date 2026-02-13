"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Select } from '@/src/components/ui/form/Select';
import {
    Package,
    MapPin,
    Weight,
    IndianRupee,
    Calculator,
    Settings2,
    ChevronDown,
    ChevronUp,
    Info
} from 'lucide-react';
import { SmartRateInput } from '@/src/core/api/clients/shipping/ratesApi';
import { cn } from '@/src/lib/utils';

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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-[var(--primary-blue)]" />
                    Shipment Details
                </CardTitle>
                <CardDescription>Enter your shipment information to get smart recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Pincodes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            Origin Pincode
                        </label>
                        <Input
                            placeholder="Origin Pincode"
                            maxLength={6}
                            value={formData.originPincode}
                            onChange={(e) => setFormData({ ...formData, originPincode: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            Destination Pincode
                        </label>
                        <Input
                            placeholder="Destination Pincode"
                            maxLength={6}
                            value={formData.destinationPincode}
                            onChange={(e) => setFormData({ ...formData, destinationPincode: e.target.value })}
                        />
                    </div>
                </div>

                {/* Weight & Payment Mode */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                            <Weight className="h-4 w-4" />
                            Weight (kg)
                        </label>
                        <Input
                            type="number"
                            step="0.1"
                            min="0.01"
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Payment Mode</label>
                        <Select
                            options={[
                                { label: 'Prepaid', value: 'prepaid' },
                                { label: 'Cash on Delivery', value: 'cod' }
                            ]}
                            value={formData.paymentMode}
                            onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as 'prepaid' | 'cod' })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            Order Value
                        </label>
                        <Input
                            type="number"
                            min="0"
                            value={formData.orderValue}
                            onChange={(e) => setFormData({ ...formData, orderValue: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                {/* Dimensions (Optional) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                        Package Dimensions (Optional)
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-[var(--text-secondary)]">Length (cm)</label>
                            <Input
                                type="number"
                                placeholder="L"
                                min="1"
                                value={formData.dimensions?.length || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    dimensions: {
                                        ...formData.dimensions!,
                                        length: parseFloat(e.target.value) || 10
                                    }
                                })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-[var(--text-secondary)]">Width (cm)</label>
                            <Input
                                type="number"
                                placeholder="W"
                                min="1"
                                value={formData.dimensions?.width || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    dimensions: {
                                        ...formData.dimensions!,
                                        width: parseFloat(e.target.value) || 10
                                    }
                                })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-[var(--text-secondary)]">Height (cm)</label>
                            <Input
                                type="number"
                                placeholder="H"
                                min="1"
                                value={formData.dimensions?.height || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    dimensions: {
                                        ...formData.dimensions!,
                                        height: parseFloat(e.target.value) || 10
                                    }
                                })}
                            />
                        </div>
                    </div>
                    {formData.dimensions && (
                        <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-2 rounded">
                            <span>Volumetric Weight: {((formData.dimensions.length * formData.dimensions.width * formData.dimensions.height) / 5000).toFixed(3)} kg</span>
                            <span className="mx-2">•</span>
                            <span>Chargeable Weight: {Math.max(formData.weight, (formData.dimensions.length * formData.dimensions.width * formData.dimensions.height) / 5000).toFixed(3)} kg</span>
                        </div>
                    )}
                </div>

                {/* Advanced Settings */}
                <div className="border-t border-[var(--border-subtle)] pt-4">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-sm font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue)]/80"
                    >
                        <Settings2 className="h-4 w-4" />
                        Advanced Scoring Weights
                        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {showAdvanced && (
                        <div className="mt-4 space-y-4 p-4 rounded-lg bg-[var(--bg-secondary)]">
                            <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <p>Customize how couriers are scored. Total must equal 100%.</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(customWeights).map(([key, value]) => (
                                    <div key={key} className="space-y-2">
                                        <label className="text-xs font-medium text-[var(--text-primary)] capitalize">
                                            {key}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={value}
                                                onChange={(e) => handleWeightChange(key as keyof typeof customWeights, parseInt(e.target.value) || 0)}
                                            />
                                            <span className="text-sm text-[var(--text-secondary)]">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className={cn(
                                "text-sm font-medium",
                                isWeightValid ? "text-[var(--success)]" : "text-[var(--error)]"
                            )}>
                                Total: {totalWeight}% {isWeightValid ? '✓' : '✗ Must equal 100%'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Calculate Button */}
                <Button
                    onClick={onCalculate}
                    disabled={isPending || (showAdvanced && !isWeightValid)}
                    className="w-full"
                    size="lg"
                >
                    {isPending ? (
                        <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Calculating...
                        </>
                    ) : (
                        <>
                            <Calculator className="h-4 w-4 mr-2" />
                            Calculate Smart Rates
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
