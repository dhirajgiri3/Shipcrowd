export interface RateCardFormData {
    courierProviderId: string;
    courierServiceId: string;
    rateCardCategory: string;
    shipmentType: 'forward' | 'reverse';
    gst: string;
    minimumFare: string;
    minimumFareCalculatedOn: 'freight' | 'freight_overhead';
    zoneBType: 'state' | 'region';
    isWeightConstraint: boolean;
    minWeight: string;
    maxWeight: string;
    status: 'draft' | 'active' | 'inactive';
    basicWeight: string;
    basicZoneA: string;
    basicZoneB: string;
    basicZoneC: string;
    basicZoneD: string;
    basicZoneE: string;
    isGeneric: boolean;
    additionalWeight: string;
    additionalZoneA: string;
    additionalZoneB: string;
    additionalZoneC: string;
    additionalZoneD: string;
    additionalZoneE: string;
    codPercentage: string;
    codMinimumCharge: string;
}

export const initialRateCardFormData: RateCardFormData = {
    courierProviderId: '',
    courierServiceId: '',
    rateCardCategory: '',
    shipmentType: 'forward',
    gst: '18',
    minimumFare: '',
    minimumFareCalculatedOn: 'freight',
    zoneBType: 'state',
    isWeightConstraint: false,
    minWeight: '',
    maxWeight: '',
    status: 'active',
    basicWeight: '500',
    basicZoneA: '',
    basicZoneB: '',
    basicZoneC: '',
    basicZoneD: '',
    basicZoneE: '',
    isGeneric: false,
    additionalWeight: '500',
    additionalZoneA: '',
    additionalZoneB: '',
    additionalZoneC: '',
    additionalZoneD: '',
    additionalZoneE: '',
    codPercentage: '2.5',
    codMinimumCharge: '25',
};

export const courierOptions = [
    { id: 'delhivery', name: 'Delhivery', services: ['Surface', 'Air', 'Express'] },
    { id: 'xpressbees', name: 'Xpressbees', services: ['Surface', 'Air'] },
    { id: 'dtdc', name: 'DTDC', services: ['Surface', 'Air', 'Express', 'Ground'] },
    { id: 'bluedart', name: 'Bluedart', services: ['Express', 'Dart Apex'] },
    { id: 'ecom-express', name: 'Ecom Express', services: ['Standard', 'Express'] },
];

export const rateCardCategories = ['lite', 'basic', 'advanced', 'pro', 'enterprise', 'premium'];

export const zoneMappings = ['state', 'region'] as const;

export const shipmentTypes = ['forward', 'reverse'] as const;

export function calculateMultipliers(formData: RateCardFormData) {
    const basePrice = parseFloat(formData.basicZoneA) || 0;
    const multipliers: Record<string, number> = { zoneA: 1.0 };

    if (basePrice > 0) {
        multipliers.zoneB = parseFloat((parseFloat(formData.basicZoneB) / basePrice).toFixed(2));
        multipliers.zoneC = parseFloat((parseFloat(formData.basicZoneC) / basePrice).toFixed(2));
        multipliers.zoneD = parseFloat((parseFloat(formData.basicZoneD) / basePrice).toFixed(2));
        multipliers.zoneE = parseFloat((parseFloat(formData.basicZoneE) / basePrice).toFixed(2));
    }

    return multipliers;
}

export function calculatePricePerKg(additionalWeightGm: number, zoneAPrice: number) {
    if (additionalWeightGm <= 0 || zoneAPrice <= 0) return 0;
    return (zoneAPrice / additionalWeightGm) * 1000;
}

export function buildRateCardPayload(formData: RateCardFormData) {
    const basePrice = parseFloat(formData.basicZoneA) || 0;
    const multipliers = calculateMultipliers(formData);
    const addWeightGm = parseFloat(formData.additionalWeight) || 500;
    const addPriceA = parseFloat(formData.additionalZoneA) || 0;
    const pricePerKg = calculatePricePerKg(addWeightGm, addPriceA);

    return {
        name: formData.isGeneric
            ? `GENERIC ${formData.rateCardCategory} ${Date.now()}`
            : `${formData.courierProviderId} ${formData.courierServiceId} ${formData.rateCardCategory} ${Date.now()}`,
        courierProviderId: formData.isGeneric ? null : formData.courierProviderId,
        courierServiceId: formData.isGeneric ? null : formData.courierServiceId,
        rateCardCategory: formData.rateCardCategory,
        shipmentType: formData.shipmentType,
        gst: parseFloat(formData.gst),
        minimumFare: parseFloat(formData.minimumFare) || 0,
        minimumFareCalculatedOn: formData.minimumFareCalculatedOn,
        zoneBType: formData.zoneBType,
        isWeightConstraint: formData.isWeightConstraint,
        minWeight: formData.minWeight ? parseFloat(formData.minWeight) : undefined,
        maxWeight: formData.maxWeight ? parseFloat(formData.maxWeight) : undefined,
        status: formData.status,
        baseRates: [{
            carrier: formData.isGeneric ? undefined : formData.courierProviderId,
            serviceType: formData.isGeneric ? undefined : formData.courierServiceId,
            basePrice: basePrice,
            minWeight: 0,
            maxWeight: parseFloat(formData.basicWeight) / 1000,
        }],
        weightRules: [{
            minWeight: parseFloat(formData.basicWeight) / 1000,
            maxWeight: 1000,
            pricePerKg,
            carrier: formData.isGeneric ? undefined : formData.courierProviderId,
            serviceType: formData.isGeneric ? undefined : formData.courierServiceId,
        }],
        zoneMultipliers: multipliers,
        codPercentage: parseFloat(formData.codPercentage),
        codMinimumCharge: parseFloat(formData.codMinimumCharge),
        effectiveDates: {
            startDate: new Date().toISOString(),
        }
    };
}
