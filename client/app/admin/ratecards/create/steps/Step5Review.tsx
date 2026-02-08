"use client";

import { RateCardFormData, calculateMultipliers } from '../../components/ratecardWizard.utils';
import { PriceCalculator } from '../../components/PriceCalculator';

interface Step5ReviewProps {
    formData: RateCardFormData;
}

export function Step5Review({ formData }: Step5ReviewProps) {
    const multipliers = calculateMultipliers(formData);

    return (
        <div className="space-y-6">
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Rate Card Summary</h4>
                <div className="text-sm text-[var(--text-secondary)] space-y-1">
                    <div>Name: {formData.name || '—'}</div>
                    <div>Category: {formData.rateCardCategory || '—'}</div>
                    <div>Carrier: {formData.isGeneric ? 'Generic' : `${formData.carrier} ${formData.serviceType}`}</div>
                    <div>Status: {formData.status}</div>
                    <div>Shipment Type: {formData.shipmentType}</div>
                    <div>Base Rate Zone A: ₹{formData.basicZoneA || 0}</div>
                    <div>Zone Multipliers: B {multipliers.zoneB || '—'}x, C {multipliers.zoneC || '—'}x, D {multipliers.zoneD || '—'}x, E {multipliers.zoneE || '—'}x</div>
                    <div>Additional Weight: {formData.additionalWeight || '—'} gm @ ₹{formData.additionalZoneA || 0} (Zone A)</div>
                    <div>COD: {formData.codPercentage || 0}% (min ₹{formData.codMinimumCharge || 0})</div>
                    <div>Minimum Fare: ₹{formData.minimumFare || 0}</div>
                    <div>GST: {formData.gst || 0}%</div>
                    <div>Effective Dates: {formData.effectiveStartDate || '—'} {formData.effectiveEndDate ? `→ ${formData.effectiveEndDate}` : ''}</div>
                    {formData.useAdvancedPricing && (
                        <div>
                            Advanced Slabs: {formData.advancedBaseRates.length} base rate{formData.advancedBaseRates.length === 1 ? '' : 's'} • {formData.advancedWeightRules.length} weight rule{formData.advancedWeightRules.length === 1 ? '' : 's'}
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Price Calculator</h4>
                <PriceCalculator formData={formData} />
            </div>
        </div>
    );
}
