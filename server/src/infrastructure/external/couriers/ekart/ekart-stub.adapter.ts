/**
 * Ekart Stub Adapter
 * 
 * Purpose: Return fixed rates for UI comparison WITHOUT real API integration
 * Strategy: Same as Delhivery - fixed rates, block shipments, flag as stub
 */

import PincodeLookupService from '../../../../core/application/services/logistics/pincode-lookup.service';

export interface StubRateResponse {
    carrier: string;
    serviceType: string;
    baseRate: number;
    total: number;
    estimatedDays: number;
    isStub: true;
    message: string;
}

export class EkartStubAdapter {
    private readonly STUB_RATES = {
        // Ekart rates slightly lower than Delhivery
        zoneA: { standard: 32, express: 48 },
        zoneB: { standard: 38, express: 58 },
        zoneC: { standard: 42, express: 65 },
        zoneD: { standard: 52, express: 80 },
        zoneE: { standard: 70, express: 105 },
    };

    private readonly DELIVERY_DAYS = {
        zoneA: { standard: 1, express: 1 },
        zoneB: { standard: 2, express: 1 },
        zoneC: { standard: 3, express: 2 },
        zoneD: { standard: 5, express: 3 },
        zoneE: { standard: 7, express: 5 },
    };

    async getRates(
        fromPincode: string,
        toPincode: string,
        weight: number,
        serviceType: 'standard' | 'express' = 'standard'
    ): Promise<StubRateResponse> {
        const pincodeService = PincodeLookupService;
        const zoneInfo = pincodeService.getZoneFromPincodes(fromPincode, toPincode);
        const zone = zoneInfo.zone;

        const baseRate = this.STUB_RATES[zone as keyof typeof this.STUB_RATES][serviceType];
        const estimatedDays = this.DELIVERY_DAYS[zone as keyof typeof this.DELIVERY_DAYS][serviceType];
        const weightCharge = weight > 0.5 ? (weight - 0.5) * 18 : 0;
        const total = baseRate + weightCharge;

        return {
            carrier: 'ekart',
            serviceType,
            baseRate,
            total: Math.round(total * 100) / 100,
            estimatedDays,
            isStub: true,
            message: 'Ekart rates are estimates only. Use Velocity for actual shipments.',
        };
    }

    async createShipment(): Promise<never> {
        throw new Error(
            'Ekart integration not available. Use Velocity for shipment creation. ' +
            'Ekart rates shown for comparison only.'
        );
    }

    async trackShipment(): Promise<never> {
        throw new Error('Ekart tracking not available. This carrier is for rate comparison only.');
    }

    async checkServiceability(): Promise<never> {
        throw new Error('Ekart serviceability not available. This carrier is for rate comparison only.');
    }
}

let ekartStubInstance: EkartStubAdapter | null = null;

export function getEkartStub(): EkartStubAdapter {
    if (!ekartStubInstance) {
        ekartStubInstance = new EkartStubAdapter();
    }
    return ekartStubInstance;
}
