/**
 * Carrier Data (Enriched)
 *
 * Courier partner data with tracking number formats, service types, and full capabilities.
 */

import { selectRandom, randomInt, selectWeightedFromObject } from '../utils/random.utils';
import { SEED_CONFIG, CarrierName } from '../config';
import { EKART_CONFIG } from './ekart-config';
import { VELOCITY_CONFIG } from './velocity-config';
import { DELHIVERY_CONFIG } from './delhivery-config';

// Tracking number counters per carrier to ensure uniqueness
const trackingCounters: Map<CarrierName, number> = new Map();

export interface CarrierCapabilities {
    mps: boolean;
    splitFlow: boolean;
    qcSupport: boolean;
    obd: boolean;
    ndr: 'full' | 'weak' | 'none';
    manifest: 'api' | 'auto' | 'missing';
    webhook: 'full' | 'partial' | 'none';
    pod: boolean;
    pickupScheduling: boolean;
    heavyShipment?: boolean; // Delhivery specific
}

export interface CarrierData {
    name: CarrierName;
    displayName: string;
    trackingPrefix: string;
    trackingLength: number;
    serviceTypes: string[];
    expressService: string;
    pickupCutoffTime: string; // 24-hour format
    codLimit: number;
    weightLimit: number; // in kg
    metroCoverage: boolean;
    tier2Coverage: boolean;
    tier3Coverage: boolean;
    isIntegrated: boolean; // Flag to indicate if API integration exists
    capabilities?: CarrierCapabilities; // Enriched capabilities from our analysis
    paymentModes?: string[];
}

export const CARRIERS: Record<CarrierName, CarrierData> = {
    delhivery: {
        name: 'delhivery',
        displayName: 'Delhivery',
        trackingPrefix: 'DHL',
        trackingLength: 14,
        serviceTypes: DELHIVERY_CONFIG.services.types,
        expressService: 'Express',
        pickupCutoffTime: '16:00',
        codLimit: 50000,
        weightLimit: 50,
        metroCoverage: true,
        tier2Coverage: true,
        tier3Coverage: true,
        isIntegrated: true,
        capabilities: DELHIVERY_CONFIG.capabilities as CarrierCapabilities,
        paymentModes: DELHIVERY_CONFIG.services.paymentModes
    },
    /*
    bluedart: {
        name: 'bluedart',
        displayName: 'BlueDart',
        trackingPrefix: 'BLU',
        trackingLength: 12,
        serviceTypes: ['Standard', 'Express', 'Priority', 'Dart Apex'],
        expressService: 'Priority',
        pickupCutoffTime: '15:00',
        codLimit: 100000,
        weightLimit: 100,
        metroCoverage: true,
        tier2Coverage: true,
        tier3Coverage: false,
        isIntegrated: false,
    },
    ecom_express: {
        name: 'ecom_express',
        displayName: 'Ecom Express',
        trackingPrefix: 'ECM',
        trackingLength: 11,
        serviceTypes: ['Standard', 'Express', 'Surface'],
        expressService: 'Express',
        pickupCutoffTime: '17:00',
        codLimit: 30000,
        weightLimit: 35,
        metroCoverage: true,
        tier2Coverage: true,
        tier3Coverage: true,
        isIntegrated: false,
    },
    dtdc: {
        name: 'dtdc',
        displayName: 'DTDC',
        trackingPrefix: 'DTC',
        trackingLength: 10,
        serviceTypes: ['Standard', 'Express', 'Lite', 'Plus'],
        expressService: 'Express',
        pickupCutoffTime: '16:30',
        codLimit: 25000,
        weightLimit: 40,
        metroCoverage: true,
        tier2Coverage: true,
        tier3Coverage: true,
        isIntegrated: false,
    },
    xpressbees: {
        name: 'xpressbees',
        displayName: 'XpressBees',
        trackingPrefix: 'XPB',
        trackingLength: 12,
        serviceTypes: ['Standard', 'Express', 'Economy'],
        expressService: 'Express',
        pickupCutoffTime: '17:00',
        codLimit: 25000,
        weightLimit: 30,
        metroCoverage: true,
        tier2Coverage: true,
        tier3Coverage: true,
        isIntegrated: false,
    },
    */
    velocity: {
        name: 'velocity',
        displayName: 'Velocity',
        trackingPrefix: 'VEL',
        trackingLength: 12,
        serviceTypes: VELOCITY_CONFIG.services.types,
        expressService: 'Express',
        pickupCutoffTime: '18:00',
        codLimit: 100000,
        weightLimit: 50,
        metroCoverage: true,
        tier2Coverage: true,
        tier3Coverage: true,
        isIntegrated: true,
        capabilities: VELOCITY_CONFIG.capabilities as CarrierCapabilities,
        paymentModes: VELOCITY_CONFIG.services.paymentModes
    },
    ekart: {
        name: 'ekart',
        displayName: 'Ekart Logistics',
        trackingPrefix: 'EK',
        trackingLength: 14,
        serviceTypes: EKART_CONFIG.services.types,
        expressService: 'Express',
        pickupCutoffTime: '14:00',
        codLimit: 50000,
        weightLimit: 100,
        metroCoverage: true,
        tier2Coverage: true,
        tier3Coverage: true,
        isIntegrated: true,
        capabilities: EKART_CONFIG.capabilities as CarrierCapabilities,
        paymentModes: EKART_CONFIG.services.paymentModes
    }
};

/**
 * Reset tracking number counters for a fresh seeding run
 */
export function resetTrackingCounters(): void {
    trackingCounters.clear();
}

/**
 * Select a carrier based on configured weights
 */
export function selectCarrier(): CarrierName {
    return selectWeightedFromObject(SEED_CONFIG.carriers);
}

/**
 * Get carrier data by name
 */
export function getCarrierData(carrierName: CarrierName): CarrierData {
    return CARRIERS[carrierName];
}

/**
 * Generate a unique tracking number for a carrier using a counter
 * Ensures no duplicate tracking numbers across all shipments
 */
export function generateTrackingNumber(carrierName: CarrierName): string {
    const carrier = CARRIERS[carrierName];

    // Initialize counter if not exists
    if (!trackingCounters.has(carrierName)) {
        trackingCounters.set(carrierName, 100000000); // Start from a reasonable number
    }

    // Increment and get the next counter value
    const currentCounter = trackingCounters.get(carrierName)!;
    trackingCounters.set(carrierName, currentCounter + 1);

    // Format the numeric part with proper padding
    const numericPart = currentCounter.toString().slice(-Math.max(carrier.trackingLength - carrier.trackingPrefix.length, 8));

    return `${carrier.trackingPrefix}${numericPart}`;
}

/**
 * Generate a reverse tracking number (for RTO)
 */
export function generateReverseTrackingNumber(originalAwb: string): string {
    return `RTO-${originalAwb}`;
}

/**
 * Select a service type for a carrier
 */
export function selectServiceType(carrierName: CarrierName, isExpress: boolean = false): string {
    const carrier = CARRIERS[carrierName];
    if (isExpress) {
        return carrier.expressService;
    }
    return selectRandom(carrier.serviceTypes);
}

/**
 * Check if carrier supports COD amount
 */
export function carrierSupportsCOD(carrierName: CarrierName, amount: number): boolean {
    const carrier = CARRIERS[carrierName];
    return amount <= carrier.codLimit;
}

/**
 * Check if carrier supports weight
 */
export function carrierSupportsWeight(carrierName: CarrierName, weight: number): boolean {
    const carrier = CARRIERS[carrierName];
    return weight <= carrier.weightLimit;
}

/**
 * Get best carrier for a shipment based on constraints
 */
export function getBestCarrier(
    codAmount: number = 0,
    weight: number = 1,
    cityTier: 'metro' | 'tier2' | 'tier3' = 'metro'
): CarrierName {
    const eligibleCarriers = Object.values(CARRIERS).filter((carrier) => {
        // Must be integrated
        if (!carrier.isIntegrated) return false;

        // Check COD limit
        if (codAmount > 0 && codAmount > carrier.codLimit) return false;

        // Check weight limit
        if (weight > carrier.weightLimit) return false;

        // Check coverage
        if (cityTier === 'tier3' && !carrier.tier3Coverage) return false;
        if (cityTier === 'tier2' && !carrier.tier2Coverage) return false;

        return true;
    });

    if (eligibleCarriers.length === 0) {
        // Fallback to Velocity (as it's the only one integrated)
        return 'velocity';
    }

    return selectRandom(eligibleCarriers).name;
}

/**
 * Calculate shipping cost based on weight and zone
 */
export function calculateShippingCost(
    carrierName: CarrierName,
    weight: number,
    zone: string,
    isCOD: boolean = false
): number {
    // Base rates per kg by zone
    const zoneRates: Record<string, number> = {
        zone_a: 25,  // Intra-city
        zone_b: 40,  // Intra-state
        zone_c: 55,  // Adjacent state
        zone_d: 70,  // Regional
        zone_e: 90,  // Pan-India
    };

    const baseRate = zoneRates[zone] || 55;

    // Carrier-specific multipliers
    const carrierMultipliers: Record<CarrierName, number> = {
        delhivery: 1.0,
        /*
        bluedart: 1.3, // Premium carrier
        ecom_express: 0.95,
        dtdc: 0.9,
        xpressbees: 0.85, // Budget carrier
        */
        velocity: 0.95, // Balanced
        ekart: 0.95, // Balanced
    };

    const multiplier = carrierMultipliers[carrierName];
    const weightCharge = Math.ceil(weight) * baseRate * multiplier;

    // COD charges (2% of COD amount or minimum ₹25)
    const codCharge = isCOD ? Math.max(25, 0.02 * 1000) : 0;

    // Fuel surcharge (10%)
    const fuelSurcharge = weightCharge * 0.10;

    return Math.round(weightCharge + codCharge + fuelSurcharge);
}

/**
 * Get carrier-specific warehouse ID
 */
export function generateCarrierWarehouseId(carrierName: CarrierName): string {
    const prefixes: Record<CarrierName, string> = {
        delhivery: 'DEL',
        /*
        bluedart: 'BDR',
        ecom_express: 'ECM',
        dtdc: 'DTC',
        xpressbees: 'XPB',
        */
        velocity: 'VEL',
        ekart: 'EK',
    };

    return `${prefixes[carrierName]}${randomInt(100000, 999999)}`;
}

/**
 * Get estimated delivery days based on carrier and zone
 */
export function getEstimatedDeliveryDays(
    carrierName: CarrierName,
    zone: string,
    isExpress: boolean = false
): { min: number; max: number } {
    const baseDays: Record<string, { min: number; max: number }> = {
        zone_a: { min: 1, max: 2 },
        zone_b: { min: 2, max: 3 },
        zone_c: { min: 3, max: 4 },
        zone_d: { min: 4, max: 6 },
        zone_e: { min: 5, max: 7 },
    };

    const days = baseDays[zone] || baseDays.zone_c;

    // Express is faster
    if (isExpress) {
        return {
            min: Math.max(1, days.min - 1),
            max: Math.max(2, days.max - 1),
        };
    }

    /*
    // BlueDart is generally faster
    if (carrierName === 'bluedart') {
        return {
            min: Math.max(1, days.min - 1),
            max: days.max,
        };
    }
    */

    return days;
}
