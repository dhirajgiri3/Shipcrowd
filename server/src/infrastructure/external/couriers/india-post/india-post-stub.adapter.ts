/**
 * India Post Stub Adapter
 * 
 * Purpose: Return fixed rates for UI comparison WITHOUT real API integration
 * Strategy: Same as Delhivery - fixed rates, block shipments, flag as stub
 * Note: India Post typically has lower rates but slower delivery
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

export class IndiaPostStubAdapter {
    private readonly STUB_RATES = {
        // India Post - lowest rates but slowest delivery
        zoneA: { standard: 25, express: 40 },
        zoneB: { standard: 30, express: 50 },
        zoneC: { standard: 35, express: 55 },
        zoneD: { standard: 45, express: 70 },
        zoneE: { standard: 60, express: 95 },
    };

    private readonly DELIVERY_DAYS = {
        zoneA: { standard: 2, express: 1 },
        zoneB: { standard: 3, express: 2 },
        zoneC: { standard: 4, express: 2 },
        zoneD: { standard: 6, express: 3 },
        zoneE: { standard: 8, express: 5 },
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
        const weightCharge = weight > 0.5 ? (weight - 0.5) * 15 : 0;
        const total = baseRate + weightCharge;

        return {
            carrier: 'india_post',
            serviceType,
            baseRate,
            total: Math.round(total * 100) / 100,
            estimatedDays,
            isStub: true,
            message: 'India Post rates are estimates only. Use Velocity for actual shipments.',
        };
    }

    async createShipment(): Promise<never> {
        throw new Error(
            'India Post integration not available. Use Velocity for shipment creation. ' +
            'India Post rates shown for comparison only.'
        );
    }

    async trackShipment(): Promise<never> {
        throw new Error('India Post tracking not available. This carrier is for rate comparison only.');
    }

    async checkServiceability(): Promise<never> {
        throw new Error('India Post serviceability not available. This carrier is for rate comparison only.');
    }
}

let indiaPostStubInstance: IndiaPostStubAdapter | null = null;

export function getIndiaPostStub(): IndiaPostStubAdapter {
    if (!indiaPostStubInstance) {
        indiaPostStubInstance = new IndiaPostStubAdapter();
    }
    return indiaPostStubInstance;
}
