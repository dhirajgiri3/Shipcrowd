/**
 * Intelligent Carrier Selection Service
 *
 * Selects the best carrier based on weight, zone, and delivery time.
 * Score = (rate × 0.7) + (deliveryTime × 5) - lower is better
 *
 * Carriers:
 * - Delhivery: Express, optimized for metro areas
 * - DTDC: Standard, pan-India coverage
 * - Xpressbees: Budget, regional focus
 */

export interface CarrierOption {
    carrier: string;
    rate: number;
    deliveryTime: number;
    score: number;
    serviceType: string;
}

export interface CarrierSelectionResult {
    selectedCarrier: string;
    selectedRate: number;
    selectedDeliveryTime: number;
    selectedServiceType: string;
    alternativeOptions: CarrierOption[];
}

interface CarrierConfig {
    name: string;
    baseRate: number;
    perKgRate: number;
    expressMultiplier: number;
    metroDiscount: number;
    baseDeliveryTime: { express: number; standard: number };
    strongZones: string[];
}

// Static carrier configuration (no third-party API dependencies)
const CARRIERS: CarrierConfig[] = [
    {
        name: 'Delhivery',
        baseRate: 40,
        perKgRate: 20,
        expressMultiplier: 1.3,
        metroDiscount: 0.9,
        baseDeliveryTime: { express: 2, standard: 3 },
        strongZones: ['metro', 'tier1'],
    },
    {
        name: 'DTDC',
        baseRate: 45,
        perKgRate: 18,
        expressMultiplier: 1.2,
        metroDiscount: 1.0,
        baseDeliveryTime: { express: 3, standard: 4 },
        strongZones: ['tier1', 'tier2', 'tier3'],
    },
    {
        name: 'Xpressbees',
        baseRate: 35,
        perKgRate: 22,
        expressMultiplier: 1.4,
        metroDiscount: 1.1,
        baseDeliveryTime: { express: 3, standard: 5 },
        strongZones: ['tier2', 'tier3'],
    },
];

// Metro city pincode prefixes (first 3 or 6 digits)
const METRO_PINCODES = [
    '110001', '110002', '110003', '110004', '110005', // Delhi
    '400001', '400002', '400003', '400004', '400005', // Mumbai
    '560001', '560002', '560003', '560004', '560005', // Bangalore
    '600001', '600002', '600003', '600004', '600005', // Chennai
    '500001', '500002', '500003', '500004', '500005', // Hyderabad
    '411001', '411002', '411003', '411004', '411005', // Pune
    '700001', '700002', '700003', '700004', '700005', // Kolkata
];

/**
 * Check if a pincode is in a metro area
 */
const isMetroPincode = (pincode: string): boolean => {
    const prefix = pincode.slice(0, 3);
    return METRO_PINCODES.some(metro => metro.startsWith(prefix));
};

/**
 * Calculate the zone type based on origin and destination
 */
const getZoneType = (originPincode: string, destinationPincode: string): string => {
    const originPrefix = originPincode.slice(0, 3);
    const destPrefix = destinationPincode.slice(0, 3);

    // Same pincode prefix = Local
    if (originPrefix === destPrefix) {
        return 'local';
    }

    // Both metro = Metro
    if (isMetroPincode(originPincode) && isMetroPincode(destinationPincode)) {
        return 'metro';
    }

    // Same state (first 2 digits often indicate state/region)
    if (originPincode.slice(0, 2) === destinationPincode.slice(0, 2)) {
        return 'zonal';
    }

    // Rest of India
    return 'roi';
};

/**
 * Select the best carrier for a shipment
 *
 * @param weight - Package weight in kg
 * @param originPincode - Origin pincode
 * @param destinationPincode - Destination pincode
 * @param serviceType - 'express' or 'standard'
 * @returns CarrierSelectionResult with selected carrier and alternatives
 */
export const selectBestCarrier = (
    weight: number,
    originPincode: string,
    destinationPincode: string,
    serviceType: 'express' | 'standard' = 'standard'
): CarrierSelectionResult => {
    const isMetro = isMetroPincode(destinationPincode);
    const zoneType = getZoneType(originPincode, destinationPincode);

    // Calculate rates and scores for each carrier
    const carrierOptions: CarrierOption[] = CARRIERS.map(carrier => {
        // Base rate calculation
        let rate = carrier.baseRate + (weight * carrier.perKgRate);

        // Apply express surcharge
        if (serviceType === 'express') {
            rate *= carrier.expressMultiplier;
        }

        // Apply metro discount for applicable carriers
        if (isMetro) {
            rate *= carrier.metroDiscount;
        }

        // Zone-based adjustments
        switch (zoneType) {
            case 'local':
                rate *= 0.85; // 15% discount for local
                break;
            case 'zonal':
                rate *= 0.95; // 5% discount for zonal
                break;
            case 'roi':
                rate *= 1.1; // 10% surcharge for ROI
                break;
        }

        // Get delivery time based on service type
        const deliveryTime = carrier.baseDeliveryTime[serviceType];

        // Adjust delivery time based on zone
        const adjustedDeliveryTime = zoneType === 'local'
            ? deliveryTime - 1
            : zoneType === 'roi'
                ? deliveryTime + 1
                : deliveryTime;

        // Calculate score: prioritizes cost (70%) and speed (30%)
        // Score = (rate × 0.7) + (deliveryTime × 5)
        const score = (rate * 0.7) + (Math.max(1, adjustedDeliveryTime) * 5);

        return {
            carrier: carrier.name,
            rate: Math.round(rate * 100) / 100, // Round to 2 decimal places
            deliveryTime: Math.max(1, adjustedDeliveryTime),
            score: Math.round(score * 100) / 100,
            serviceType,
        };
    });

    // Sort by score (lowest/best first)
    carrierOptions.sort((a, b) => a.score - b.score);

    return {
        selectedCarrier: carrierOptions[0].carrier,
        selectedRate: carrierOptions[0].rate,
        selectedDeliveryTime: carrierOptions[0].deliveryTime,
        selectedServiceType: carrierOptions[0].serviceType,
        alternativeOptions: carrierOptions,
    };
};

/**
 * Get all available carriers (for display purposes)
 */
export const getAvailableCarriers = (): string[] => {
    return CARRIERS.map(c => c.name);
};

/**
 * Validate carrier name
 */
export const isValidCarrier = (carrier: string): boolean => {
    return CARRIERS.some(c => c.name.toLowerCase() === carrier.toLowerCase());
};

export default {
    selectBestCarrier,
    getAvailableCarriers,
    isValidCarrier,
};
