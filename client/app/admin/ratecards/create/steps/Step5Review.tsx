"use client";

import { RateCardFormData } from '../../components/ratecardWizard.utils';
import { PriceCalculator } from '../../components/PriceCalculator';

interface Step5ReviewProps {
    formData: RateCardFormData;
}

export function Step5Review({ formData }: Step5ReviewProps) {
    const zones = [
        { key: 'A', baseWeight: formData.zoneABaseWeight, basePrice: formData.zoneABasePrice, addPerKg: formData.zoneAAdditionalPricePerKg },
        { key: 'B', baseWeight: formData.zoneBBaseWeight, basePrice: formData.zoneBBasePrice, addPerKg: formData.zoneBAdditionalPricePerKg },
        { key: 'C', baseWeight: formData.zoneCBaseWeight, basePrice: formData.zoneCBasePrice, addPerKg: formData.zoneCAdditionalPricePerKg },
        { key: 'D', baseWeight: formData.zoneDBaseWeight, basePrice: formData.zoneDBasePrice, addPerKg: formData.zoneDAdditionalPricePerKg },
        { key: 'E', baseWeight: formData.zoneEBaseWeight, basePrice: formData.zoneEBasePrice, addPerKg: formData.zoneEAdditionalPricePerKg },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Rate Card Summary</h4>
                <div className="text-sm text-[var(--text-secondary)] space-y-1">
                    <div>Name: {formData.name || '—'}</div>
                    <div>Category: {formData.rateCardCategory || '—'}</div>
                    <div>Pricing Model: Zone Pricing</div>
                    <div>Status: {formData.status}</div>
                    <div>Shipment Type: {formData.shipmentType}</div>
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Zone Pricing</div>
                        {zones.map((zone) => (
                            <div key={zone.key}>
                                Zone {zone.key}: {zone.baseWeight || '—'} gm • ₹{zone.basePrice || 0} base • ₹{zone.addPerKg || 0}/kg
                            </div>
                        ))}
                    </div>
                    <div>COD: {formData.codPercentage || 0}% (min ₹{formData.codMinimumCharge || 0})</div>
                    <div>Minimum Fare: ₹{formData.minimumFare || 0}</div>
                    <div>GST: {formData.gst || 0}%</div>
                    <div>Effective Dates: {formData.effectiveStartDate || '—'} {formData.effectiveEndDate ? `→ ${formData.effectiveEndDate}` : ''}</div>
                </div>
            </div>

            <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Price Calculator</h4>
                <PriceCalculator formData={formData} />
            </div>
        </div>
    );
}
