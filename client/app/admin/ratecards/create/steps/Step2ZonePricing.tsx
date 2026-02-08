"use client";

import { Input } from '@/src/components/ui/core/Input';
import { Select } from '@/src/components/ui/form/Select';
import { RateCardFormData, zoneMappings } from '../../components/ratecardWizard.utils';

interface Step2ZonePricingProps {
    formData: RateCardFormData;
    onChange: (field: keyof RateCardFormData, value: RateCardFormData[keyof RateCardFormData]) => void;
    isReadOnly?: boolean;
}

const ZONES = [
    { key: 'A', label: 'Zone A' },
    { key: 'B', label: 'Zone B' },
    { key: 'C', label: 'Zone C' },
    { key: 'D', label: 'Zone D' },
    { key: 'E', label: 'Zone E' },
] as const;

export function Step2ZonePricing({ formData, onChange, isReadOnly = false }: Step2ZonePricingProps) {
    return (
        <div className="space-y-6">
            <div className="text-sm text-[var(--text-muted)]">
                Enter pricing per zone. Base Weight is in grams and will be stored in kg.
            </div>
            <div className="space-y-4">
                {ZONES.map((zone) => {
                    const baseWeightField = `zone${zone.key}BaseWeight` as keyof RateCardFormData;
                    const basePriceField = `zone${zone.key}BasePrice` as keyof RateCardFormData;
                    const additionalField = `zone${zone.key}AdditionalPricePerKg` as keyof RateCardFormData;

                    return (
                        <div key={zone.key} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                            <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">{zone.label}</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Base Weight (gm)</label>
                                    <Input
                                        type="number"
                                        value={formData[baseWeightField] as string}
                                        onChange={(e) => onChange(baseWeightField, e.target.value)}
                                        className="mt-2"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Base Price (₹)</label>
                                    <Input
                                        type="number"
                                        value={formData[basePriceField] as string}
                                        onChange={(e) => onChange(basePriceField, e.target.value)}
                                        className="mt-2"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Additional Price per Kg (₹/kg)</label>
                                    <Input
                                        type="number"
                                        value={formData[additionalField] as string}
                                        onChange={(e) => onChange(additionalField, e.target.value)}
                                        className="mt-2"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="space-y-2 max-w-[280px]">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Zone B Type</label>
                <Select
                    value={formData.zoneBType}
                    onChange={(e) => onChange('zoneBType', e.target.value)}
                    disabled={isReadOnly}
                    options={zoneMappings.map((value) => ({
                        label: value === 'state' ? 'Same State' : 'Distance (<= 500km)',
                        value
                    }))}
                />
            </div>
        </div>
    );
}
