import type { AdminRateCard } from '@/src/core/api/hooks/admin/useAdminRateCards';

export interface RateCardFormData {
    name: string;
    companyId: string;
    carrier: string;
    serviceType: string;
    rateCardCategory: string;
    shipmentType: 'forward' | 'reverse';
    gst: string;
    minimumFare: string;
    minimumFareCalculatedOn: 'freight' | 'freight_overhead';
    zoneBType: 'state' | 'region';
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
    codPercentage: string;
    codMinimumCharge: string;
    effectiveStartDate: string;
    effectiveEndDate: string;
}

export interface RateCardEditState {
    formData: RateCardFormData;
    warnings: string[];
    isReadOnly: boolean;
}

export const initialRateCardFormData: RateCardFormData = {
    name: '',
    companyId: '',
    carrier: '',
    serviceType: '',
    rateCardCategory: '',
    shipmentType: 'forward',
    gst: '',
    minimumFare: '',
    minimumFareCalculatedOn: 'freight',
    zoneBType: 'state',
    status: 'draft',
    basicWeight: '',
    basicZoneA: '',
    basicZoneB: '',
    basicZoneC: '',
    basicZoneD: '',
    basicZoneE: '',
    isGeneric: false,
    additionalWeight: '',
    additionalZoneA: '',
    codPercentage: '',
    codMinimumCharge: '',
    effectiveStartDate: '',
    effectiveEndDate: '',
};

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

const toDateInputValue = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

export function buildRateCardPayload(formData: RateCardFormData, mode: 'create' | 'update' = 'create') {
    const basePrice = parseFloat(formData.basicZoneA) || 0;
    const multipliers = calculateMultipliers(formData);
    const addWeightGm = parseFloat(formData.additionalWeight) || 0;
    const addPriceA = parseFloat(formData.additionalZoneA) || 0;
    const pricePerKg = calculatePricePerKg(addWeightGm, addPriceA);

    const payload: any = {
        name: formData.name.trim(),
        rateCardCategory: formData.rateCardCategory?.trim() || undefined,
        shipmentType: formData.shipmentType,
        minimumFareCalculatedOn: formData.minimumFareCalculatedOn,
        zoneBType: formData.zoneBType,
        status: formData.status,
        baseRates: [
            {
                carrier: formData.isGeneric ? null : formData.carrier || null,
                serviceType: formData.isGeneric ? null : formData.serviceType || null,
                basePrice,
                minWeight: 0,
                maxWeight: formData.basicWeight ? parseFloat(formData.basicWeight) / 1000 : 0.5,
            },
        ],
    };

    if (mode === 'create' && formData.companyId) {
        payload.companyId = formData.companyId;
    }

    if (formData.gst) payload.gst = parseFloat(formData.gst);
    if (formData.minimumFare) payload.minimumFare = parseFloat(formData.minimumFare);
    if (formData.codPercentage) payload.codPercentage = parseFloat(formData.codPercentage);
    if (formData.codMinimumCharge) payload.codMinimumCharge = parseFloat(formData.codMinimumCharge);

    if (addWeightGm > 0 && pricePerKg > 0) {
        payload.weightRules = [
            {
                minWeight: formData.basicWeight ? parseFloat(formData.basicWeight) / 1000 : 0.5,
                maxWeight: 1000,
                pricePerKg,
                carrier: formData.isGeneric ? null : formData.carrier || null,
                serviceType: formData.isGeneric ? null : formData.serviceType || null,
            },
        ];
    }

    if (basePrice > 0) {
        payload.zoneMultipliers = multipliers;
    }

    if (mode === 'create') {
        payload.effectiveDates = {
            startDate: formData.effectiveStartDate
                ? new Date(formData.effectiveStartDate).toISOString()
                : new Date().toISOString(),
            ...(formData.effectiveEndDate
                ? { endDate: new Date(formData.effectiveEndDate).toISOString() }
                : {})
        };
    } else if (formData.effectiveStartDate || formData.effectiveEndDate) {
        payload.effectiveDates = {
            startDate: formData.effectiveStartDate
                ? new Date(formData.effectiveStartDate).toISOString()
                : new Date().toISOString(),
            ...(formData.effectiveEndDate
                ? { endDate: new Date(formData.effectiveEndDate).toISOString() }
                : {})
        };
    }

    return payload;
}

export function mapAdminRateCardToFormState(rateCard: AdminRateCard): RateCardEditState {
    const baseRates = rateCard.baseRates || [];
    const weightRules = rateCard.weightRules || [];
    const zoneRules = rateCard.zoneRules || [];
    const multipliers = rateCard.zoneMultipliers || {};

    const warnings: string[] = [];
    const hasZoneRulesWithoutMultipliers = zoneRules.length > 0 && Object.keys(multipliers).length === 0;

    if (baseRates.length > 1) {
        warnings.push('This rate card has multiple base rate slabs. The editor only supports a single slab and will use the first match.');
    }
    if (weightRules.length > 1) {
        warnings.push('This rate card has multiple weight rules. The editor only supports a single rule and will use the first match.');
    }
    if (hasZoneRulesWithoutMultipliers) {
        warnings.push('This rate card uses zone rules without multipliers. Editing is disabled to prevent data loss.');
    }

    const primaryBaseRate = baseRates.find((rate: any) => rate?.carrier || rate?.serviceType) || baseRates[0];
    const carrier = primaryBaseRate?.carrier || '';
    const serviceType = primaryBaseRate?.serviceType || '';
    const isGeneric = !carrier && !serviceType;

    const basePrice = primaryBaseRate?.basePrice ?? 0;
    const basicWeight = primaryBaseRate?.maxWeight ? String(primaryBaseRate.maxWeight * 1000) : '500';

    const weightRule =
        weightRules.find((rule: any) => rule?.carrier === carrier && rule?.serviceType === serviceType) ||
        weightRules[0];

    const additionalWeight = 500;
    const additionalZoneA = weightRule?.pricePerKg
        ? ((weightRule.pricePerKg / 1000) * additionalWeight).toFixed(2)
        : '';

    const companyId = typeof rateCard.companyId === 'string'
        ? rateCard.companyId
        : rateCard.companyId?._id || '';

    const formData: RateCardFormData = {
        ...initialRateCardFormData,
        name: rateCard.name || '',
        companyId,
        carrier,
        serviceType,
        rateCardCategory: rateCard.rateCardCategory || '',
        shipmentType: rateCard.shipmentType || 'forward',
        gst: rateCard.gst !== undefined && rateCard.gst !== null ? String(rateCard.gst) : '',
        minimumFare: rateCard.minimumFare !== undefined && rateCard.minimumFare !== null ? String(rateCard.minimumFare) : '',
        minimumFareCalculatedOn: rateCard.minimumFareCalculatedOn || 'freight',
        zoneBType: rateCard.zoneBType || 'state',
        status: (rateCard.status as any) || 'active',
        isGeneric,
        basicWeight,
        basicZoneA: basePrice ? String(basePrice) : '',
        basicZoneB: multipliers.zoneB && basePrice ? String((basePrice * multipliers.zoneB).toFixed(2)) : '',
        basicZoneC: multipliers.zoneC && basePrice ? String((basePrice * multipliers.zoneC).toFixed(2)) : '',
        basicZoneD: multipliers.zoneD && basePrice ? String((basePrice * multipliers.zoneD).toFixed(2)) : '',
        basicZoneE: multipliers.zoneE && basePrice ? String((basePrice * multipliers.zoneE).toFixed(2)) : '',
        additionalWeight: String(additionalWeight),
        additionalZoneA,
        codPercentage: rateCard.codPercentage !== undefined && rateCard.codPercentage !== null ? String(rateCard.codPercentage) : '',
        codMinimumCharge: rateCard.codMinimumCharge !== undefined && rateCard.codMinimumCharge !== null ? String(rateCard.codMinimumCharge) : '',
        effectiveStartDate: toDateInputValue(rateCard.effectiveDates?.startDate),
        effectiveEndDate: toDateInputValue(rateCard.effectiveDates?.endDate),
    };

    return {
        formData,
        warnings,
        isReadOnly: hasZoneRulesWithoutMultipliers,
    };
}
