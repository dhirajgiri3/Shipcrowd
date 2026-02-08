"use client";

import { Input } from '@/src/components/ui/core/Input';
import { RateCardFormData, zoneMappings } from '../../components/ratecardWizard.utils';

interface Step2ZonePricingProps {
    formData: RateCardFormData;
    onChange: (field: keyof RateCardFormData, value: string | boolean) => void;
    multipliers: Record<string, number>;
}

export function Step2ZonePricing({ formData, onChange, multipliers }: Step2ZonePricingProps) {
    return (
        <div className="space-y-6">
            <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">First Weight Slab (grams) *</label>
                <Input
                    type="number"
                    value={formData.basicWeight}
                    onChange={(e) => onChange('basicWeight', e.target.value)}
                    placeholder="500"
                    className="mt-2"
                />
            </div>

            <div className="space-y-3">
                {(['A', 'B', 'C', 'D', 'E'] as const).map(zone => (
                    <div key={zone} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-[var(--text-secondary)]">Zone {zone}</div>
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">₹</span>
                            <Input
                                type="number"
                                value={(formData as any)[`basicZone${zone}`]}
                                onChange={(e) => onChange(`basicZone${zone}` as keyof RateCardFormData, e.target.value)}
                                placeholder="0"
                                className="pl-8"
                            />
                        </div>
                        {zone !== 'A' && (
                            <div className="text-xs text-[var(--text-muted)] min-w-[60px]">
                                {multipliers[`zone${zone}`] ? `${multipliers[`zone${zone}`]}x` : '—'}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Zone B Mapping Type *</label>
                <div className="flex gap-4">
                    {zoneMappings.map(mapping => (
                        <label key={mapping} className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                name="zoneBType"
                                value={mapping}
                                checked={formData.zoneBType === mapping}
                                onChange={() => onChange('zoneBType', mapping)}
                                className="text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                            />
                            {mapping.charAt(0).toUpperCase() + mapping.slice(1)}-based
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
