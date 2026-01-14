/**
 * Delhivery Stub Adapter
 * 
 * Purpose: Return fixed rates for UI comparison WITHOUT real API integration
 * 
 * Strategy (Option A - Approved):
 * - Return fixed rates based on zone  
 * - Block shipment creation with clear error
 * - Flag responses with `isStub: true`
 * 
 * Why Stub? No Delhivery API documentation available for Phase 0
 */

import PincodeLookupService from '../../../../core/application/services/logistics/pincode-lookup.service';

export interface StubRateResponse {
    carrier: string;
    serviceType: string;
    baseRate: number;
    total: number;
    estimatedDays: number;
    isStub: true; // Always true for stubs
    message: string;
}

export class DelhiveryStubAdapter {
    private readonly STUB_RATES = {
        // Zone-based fixed rates (₹)
        zoneA: { standard: 35, express: 50 },  // Same city
        zoneB: { standard: 40, express: 60 },  // Same state
        zoneC: { standard: 45, express: 70 },  // Metro to metro
        zoneD: { standard: 55, express: 85 },  // Rest of India
        zoneE: { standard: 75, express: 110 }, // J&K/Northeast
    };

    private readonly DELIVERY_DAYS = {
        zoneA: { standard: 1, express: 1 },
        zoneB: { standard: 2, express: 1 },
        zoneC: { standard: 3, express: 2 },
        zoneD: { standard: 4, express: 2 },
        zoneE: { standard: 6, express: 4 },
    };

    /**
     * Get stub rates for comparison
     */
    async getRates(
        fromPincode: string,
        toPincode: string,
        weight: number,
        serviceType: 'standard' | 'express' = 'standard'
    ): Promise<StubRateResponse> {
        // Get zone from PincodeLookupService
        const pincodeService = PincodeLookupService;
        const zoneInfo = pincodeService.getZoneFromPincodes(fromPincode, toPincode);
        const zone = zoneInfo.zone;

        // Get stub rate
        const baseRate = this.STUB_RATES[zone as keyof typeof this.STUB_RATES][serviceType];
        const estimatedDays = this.DELIVERY_DAYS[zone as keyof typeof this.DELIVERY_DAYS][serviceType];

        // Simple weight-based calculation
        const weightCharge = weight > 0.5 ? (weight - 0.5) * 20 : 0;
        const total = baseRate + weightCharge;

        return {
            carrier: 'delhivery',
            serviceType,
            baseRate,
            total: Math.round(total * 100) / 100,
            estimatedDays,
            isStub: true,
            message: 'Delhivery rates are estimates only. Use Velocity for actual shipments.',
        };
    }

    /**
     * Block shipment creation
     */
    async createShipment(): Promise<never> {
        throw new Error(
            'Delhivery integration not available. Use Velocity for shipment creation. ' +
            'Delhivery rates shown for comparison only.'
        );
    }

    /**
     * Block tracking
     */
    async trackShipment(): Promise<never> {
        throw new Error('Delhivery tracking not available. This carrier is for rate comparison only.');
    }

    /**
     * Block serviceability check
     */
    async checkServiceability(): Promise<never> {
        throw new Error('Delhivery serviceability not available. This carrier is for rate comparison only.');
    }
}

// Singleton
let delhiveryStubInstance: DelhiveryStubAdapter | null = null;

export function getDelhiveryStub(): DelhiveryStubAdapter {
    if (!delhiveryStubInstance) {
        delhiveryStubInstance = new DelhiveryStubAdapter();
    }
    return delhiveryStubInstance;
}
