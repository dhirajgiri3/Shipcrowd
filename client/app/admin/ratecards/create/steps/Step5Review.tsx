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
                    <div>Name: {formData.courierProviderId} {formData.courierServiceId} {formData.rateCardCategory}</div>
                    <div>Status: {formData.status}</div>
                    <div>Shipment Type: {formData.shipmentType}</div>
                    <div>Base Rate Zone A: ₹{formData.basicZoneA || 0}</div>
                    <div>Zone Multipliers: B {multipliers.zoneB || '—'}x, C {multipliers.zoneC || '—'}x, D {multipliers.zoneD || '—'}x, E {multipliers.zoneE || '—'}x</div>
                    <div>Additional Weight: {formData.additionalWeight} gm @ ₹{formData.additionalZoneA || 0} (Zone A)</div>
                    <div>COD: {formData.codPercentage}% (min ₹{formData.codMinimumCharge})</div>
                    <div>Minimum Fare: ₹{formData.minimumFare || 0}</div>
                    <div>GST: {formData.gst}%</div>
                </div>
            </div>

            <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Price Calculator</h4>
                <PriceCalculator formData={formData} />
            </div>
        </div>
    );
}
