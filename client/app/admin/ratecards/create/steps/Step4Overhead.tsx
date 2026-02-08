"use client";

import { Input } from '@/src/components/ui/core/Input';
import { Select } from '@/src/components/ui/form/Select';
import { RateCardFormData } from '../../components/ratecardWizard.utils';

interface Step4OverheadProps {
    formData: RateCardFormData;
    onChange: (field: keyof RateCardFormData, value: string | boolean) => void;
}

export function Step4Overhead({ formData, onChange }: Step4OverheadProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">COD Percentage *</label>
                    <div className="relative">
                        <Input
                            type="number"
                            value={formData.codPercentage}
                            onChange={(e) => onChange('codPercentage', e.target.value)}
                            placeholder="2.5"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">%</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">COD Minimum Charge *</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">₹</span>
                        <Input
                            type="number"
                            value={formData.codMinimumCharge}
                            onChange={(e) => onChange('codMinimumCharge', e.target.value)}
                            placeholder="25"
                            className="pl-8"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Minimum Fare *</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">₹</span>
                        <Input
                            type="number"
                            value={formData.minimumFare}
                            onChange={(e) => onChange('minimumFare', e.target.value)}
                            placeholder="35"
                            className="pl-8"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Min Fare Based On *</label>
                    <Select
                        value={formData.minimumFareCalculatedOn}
                        onChange={(e) => onChange('minimumFareCalculatedOn', e.target.value)}
                        options={[
                            { label: 'Freight', value: 'freight' },
                            { label: 'Freight + Overhead', value: 'freight_overhead' }
                        ]}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">GST % *</label>
                <div className="relative max-w-[200px]">
                    <Input
                        type="number"
                        value={formData.gst}
                        onChange={(e) => onChange('gst', e.target.value)}
                        placeholder="18"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">%</span>
                </div>
            </div>
        </div>
    );
}
