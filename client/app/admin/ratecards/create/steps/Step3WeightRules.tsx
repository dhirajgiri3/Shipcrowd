"use client";

import { Input } from '@/src/components/ui/core/Input';
import { RateCardFormData } from '../../components/ratecardWizard.utils';

interface Step3WeightRulesProps {
    formData: RateCardFormData;
    onChange: (field: keyof RateCardFormData, value: string | boolean) => void;
    multipliers: Record<string, number>;
    isReadOnly?: boolean;
}

export function Step3WeightRules({ formData, onChange, multipliers, isReadOnly = false }: Step3WeightRulesProps) {
    const zoneAValue = parseFloat(formData.additionalZoneA) || 0;

    const derivedZone = (zoneKey: string) => {
        const mult = multipliers[zoneKey];
        if (!mult || !zoneAValue) return '';
        return (zoneAValue * mult).toFixed(2);
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Additional Weight Increment (grams) *</label>
                <Input
                    type="number"
                    value={formData.additionalWeight}
                    onChange={(e) => onChange('additionalWeight', e.target.value)}
                    placeholder="500"
                    className="mt-2"
                    disabled={isReadOnly}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">Charges are applied per increment in grams.</p>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-4">
                    <div className="w-32 text-sm text-[var(--text-secondary)]">Zone A</div>
                    <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">₹</span>
                        <Input
                            type="number"
                            value={formData.additionalZoneA}
                            onChange={(e) => onChange('additionalZoneA', e.target.value)}
                            placeholder="0"
                            className="pl-8"
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
                {(['B', 'C', 'D', 'E'] as const).map(zone => (
                    <div key={zone} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-[var(--text-secondary)]">Zone {zone}</div>
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">₹</span>
                            <Input
                                type="number"
                                value={derivedZone(`zone${zone}`)}
                                readOnly
                                className="pl-8 bg-[var(--bg-secondary)]"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-xs text-[var(--text-muted)]">
                Enter price for Zone A only. Other zones are calculated using multipliers from Step 2.
            </div>
        </div>
    );
}
