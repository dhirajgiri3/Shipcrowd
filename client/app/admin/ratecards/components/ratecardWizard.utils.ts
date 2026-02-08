import type { AdminRateCard } from '@/src/core/api/hooks/admin/useAdminRateCards';

export interface RateCardFormData {
    name: string;
    companyId: string;
    carrier: string;
    serviceType: string;
    useAdvancedPricing: boolean;
    advancedBaseRates: AdvancedBaseRate[];
    advancedWeightRules: AdvancedWeightRule[];
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

export interface AdvancedBaseRate {
    carrier: string;
    serviceType: string;
    basePrice: string;
    minWeight: string;
    maxWeight: string;
}

export interface AdvancedWeightRule {
    carrier: string;
    serviceType: string;
    minWeight: string;
    maxWeight: string;
    pricePerKg: string;
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
    useAdvancedPricing: false,
    advancedBaseRates: [],
    advancedWeightRules: [],
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

const toNumber = (value: string, fallback?: number) => {
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) return fallback;
    return parsed;
};

export function buildRateCardPayload(formData: RateCardFormData, mode: 'create' | 'update' = 'create') {
    const basePrice = parseFloat(formData.basicZoneA) || 0;
    const multipliers = calculateMultipliers(formData);
    const addWeightGm = parseFloat(formData.additionalWeight) || 0;
    const addPriceA = parseFloat(formData.additionalZoneA) || 0;
    const pricePerKg = calculatePricePerKg(addWeightGm, addPriceA);

    const defaultBaseRate = {
        carrier: formData.isGeneric ? null : formData.carrier || null,
        serviceType: formData.isGeneric ? null : formData.serviceType || null,
        basePrice,
        minWeight: 0,
        maxWeight: formData.basicWeight ? parseFloat(formData.basicWeight) / 1000 : 0.5,
    };

    const advancedBaseRates = formData.advancedBaseRates
        .map((rate) => {
            const basePriceValue = toNumber(rate.basePrice);
            const maxWeight = toNumber(rate.maxWeight);
            if (basePriceValue === undefined || maxWeight === undefined) return null;
            return {
                carrier: rate.carrier?.trim() ? rate.carrier.trim() : null,
                serviceType: rate.serviceType?.trim() ? rate.serviceType.trim() : null,
                basePrice: basePriceValue,
                minWeight: toNumber(rate.minWeight, 0) || 0,
                maxWeight,
            };
        })
        .filter(Boolean) as Array<{
            carrier: string | null;
            serviceType: string | null;
            basePrice: number;
            minWeight: number;
            maxWeight: number;
        }>;

    const advancedWeightRules = formData.advancedWeightRules
        .map((rule) => {
            const pricePerKgValue = toNumber(rule.pricePerKg);
            const minWeight = toNumber(rule.minWeight);
            const maxWeight = toNumber(rule.maxWeight);
            if (pricePerKgValue === undefined || minWeight === undefined || maxWeight === undefined) return null;
            return {
                minWeight,
                maxWeight,
                pricePerKg: pricePerKgValue,
                carrier: rule.carrier?.trim() ? rule.carrier.trim() : null,
                serviceType: rule.serviceType?.trim() ? rule.serviceType.trim() : null,
            };
        })
        .filter(Boolean) as Array<{
            minWeight: number;
            maxWeight: number;
            pricePerKg: number;
            carrier: string | null;
            serviceType: string | null;
        }>;

    const payload: any = {
        name: formData.name.trim(),
        rateCardCategory: formData.rateCardCategory?.trim() || undefined,
        shipmentType: formData.shipmentType,
        minimumFareCalculatedOn: formData.minimumFareCalculatedOn,
        zoneBType: formData.zoneBType,
        status: formData.status,
        baseRates: formData.useAdvancedPricing && advancedBaseRates.length > 0
            ? advancedBaseRates
            : [defaultBaseRate],
    };

    if (mode === 'create' && formData.companyId) {
        payload.companyId = formData.companyId;
    }

    if (formData.gst) payload.gst = parseFloat(formData.gst);
    if (formData.minimumFare) payload.minimumFare = parseFloat(formData.minimumFare);
    if (formData.codPercentage) payload.codPercentage = parseFloat(formData.codPercentage);
    if (formData.codMinimumCharge) payload.codMinimumCharge = parseFloat(formData.codMinimumCharge);

    if (formData.useAdvancedPricing && advancedWeightRules.length > 0) {
        payload.weightRules = advancedWeightRules;
    } else if (addWeightGm > 0 && pricePerKg > 0) {
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

export function validateAdvancedSlabs(formData: RateCardFormData) {
    if (!formData.useAdvancedPricing) {
        return { baseRateErrors: [] as string[], weightRuleErrors: [] as string[], hasErrors: false };
    }

    const baseRateErrors: string[] = [];
    const weightRuleErrors: string[] = [];

    const normalizeKey = (carrier: string, serviceType: string) => {
        const carrierKey = carrier?.trim().toLowerCase() || 'any';
        const serviceKey = serviceType?.trim().toLowerCase() || 'any';
        return `${carrierKey}:${serviceKey}`;
    };

    const checkOverlap = (
        rules: Array<{ carrier: string; serviceType: string; minWeight: string; maxWeight: string }>,
        label: string
    ) => {
        const grouped = new Map<string, Array<{ min: number; max: number }>>();
        rules.forEach((rule) => {
            const min = parseFloat(rule.minWeight);
            const max = parseFloat(rule.maxWeight);
            if (!Number.isFinite(min) || !Number.isFinite(max)) return;
            const key = normalizeKey(rule.carrier, rule.serviceType);
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push({ min, max });
        });

        for (const [key, slabs] of grouped) {
            const sorted = slabs.sort((a, b) => a.min - b.min);
            for (let i = 1; i < sorted.length; i++) {
                if (sorted[i].min < sorted[i - 1].max) {
                    return `${label}: overlapping slabs for ${key}`;
                }
            }
        }
        return null;
    };

    formData.advancedBaseRates.forEach((rate, index) => {
        const basePrice = parseFloat(rate.basePrice);
        const maxWeight = parseFloat(rate.maxWeight);
        const minWeight = rate.minWeight ? parseFloat(rate.minWeight) : 0;
        if (!Number.isFinite(basePrice)) {
            baseRateErrors.push(`Base rate ${index + 1}: base price is required.`);
        }
        if (!Number.isFinite(maxWeight) || maxWeight <= minWeight) {
            baseRateErrors.push(`Base rate ${index + 1}: max weight must be greater than min weight.`);
        }
    });

    formData.advancedWeightRules.forEach((rule, index) => {
        const minWeight = parseFloat(rule.minWeight);
        const maxWeight = parseFloat(rule.maxWeight);
        const pricePerKg = parseFloat(rule.pricePerKg);
        if (!Number.isFinite(minWeight) || !Number.isFinite(maxWeight) || maxWeight <= minWeight) {
            weightRuleErrors.push(`Weight rule ${index + 1}: weight range is invalid.`);
        }
        if (!Number.isFinite(pricePerKg)) {
            weightRuleErrors.push(`Weight rule ${index + 1}: price per kg is required.`);
        }
    });

    const baseOverlap = checkOverlap(
        formData.advancedBaseRates.map(rate => ({
            carrier: rate.carrier,
            serviceType: rate.serviceType,
            minWeight: rate.minWeight,
            maxWeight: rate.maxWeight
        })),
        'Base rates'
    );
    if (baseOverlap) baseRateErrors.push(baseOverlap);

    const weightOverlap = checkOverlap(
        formData.advancedWeightRules.map(rule => ({
            carrier: rule.carrier,
            serviceType: rule.serviceType,
            minWeight: rule.minWeight,
            maxWeight: rule.maxWeight
        })),
        'Weight rules'
    );
    if (weightOverlap) weightRuleErrors.push(weightOverlap);

    return {
        baseRateErrors,
        weightRuleErrors,
        hasErrors: baseRateErrors.length > 0 || weightRuleErrors.length > 0
    };
}

export function mapAdminRateCardToFormState(rateCard: AdminRateCard): RateCardEditState {
    const baseRates = rateCard.baseRates || [];
    const weightRules = rateCard.weightRules || [];
    const zoneRules = rateCard.zoneRules || [];
    const multipliers = rateCard.zoneMultipliers || {};

    const warnings: string[] = [];
    const hasZoneRulesWithoutMultipliers = zoneRules.length > 0 && Object.keys(multipliers).length === 0;

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

    const useAdvancedPricing = baseRates.length > 1 || weightRules.length > 1;

    const advancedBaseRates: AdvancedBaseRate[] = baseRates.map(rate => ({
        carrier: rate.carrier || '',
        serviceType: rate.serviceType || '',
        basePrice: rate.basePrice !== undefined && rate.basePrice !== null ? String(rate.basePrice) : '',
        minWeight: rate.minWeight !== undefined && rate.minWeight !== null ? String(rate.minWeight) : '',
        maxWeight: rate.maxWeight !== undefined && rate.maxWeight !== null ? String(rate.maxWeight) : '',
    }));

    const advancedWeightRules: AdvancedWeightRule[] = weightRules.map(rule => ({
        carrier: rule.carrier || '',
        serviceType: rule.serviceType || '',
        minWeight: rule.minWeight !== undefined && rule.minWeight !== null ? String(rule.minWeight) : '',
        maxWeight: rule.maxWeight !== undefined && rule.maxWeight !== null ? String(rule.maxWeight) : '',
        pricePerKg: rule.pricePerKg !== undefined && rule.pricePerKg !== null ? String(rule.pricePerKg) : '',
    }));

    const formData: RateCardFormData = {
        ...initialRateCardFormData,
        name: rateCard.name || '',
        companyId,
        carrier,
        serviceType,
        useAdvancedPricing,
        advancedBaseRates,
        advancedWeightRules,
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
