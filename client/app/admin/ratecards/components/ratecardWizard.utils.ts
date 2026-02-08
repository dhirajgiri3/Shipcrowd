import type { AdminRateCard } from '@/src/core/api/hooks/admin/useAdminRateCards';

export interface RateCardFormData {
    name: string;
    scope: 'global' | 'company';
    companyId: string;
    rateCardCategory: string;
    shipmentType: 'forward' | 'reverse';
    gst: string;
    minimumFare: string;
    minimumFareCalculatedOn: 'freight' | 'freight_overhead';
    zoneBType: 'state' | 'distance';
    status: 'draft' | 'active' | 'inactive';
    codPercentage: string;
    codMinimumCharge: string;
    effectiveStartDate: string;
    effectiveEndDate: string;
    zoneABaseWeight: string;
    zoneABasePrice: string;
    zoneAAdditionalPricePerKg: string;
    zoneBBaseWeight: string;
    zoneBBasePrice: string;
    zoneBAdditionalPricePerKg: string;
    zoneCBaseWeight: string;
    zoneCBasePrice: string;
    zoneCAdditionalPricePerKg: string;
    zoneDBaseWeight: string;
    zoneDBasePrice: string;
    zoneDAdditionalPricePerKg: string;
    zoneEBaseWeight: string;
    zoneEBasePrice: string;
    zoneEAdditionalPricePerKg: string;
}

export interface RateCardEditState {
    formData: RateCardFormData;
    warnings: string[];
    isReadOnly: boolean;
}

export const initialRateCardFormData: RateCardFormData = {
    name: '',
    scope: 'global',
    companyId: '',
    rateCardCategory: '',
    shipmentType: 'forward',
    gst: '',
    minimumFare: '',
    minimumFareCalculatedOn: 'freight',
    zoneBType: 'state',
    status: 'draft',
    codPercentage: '',
    codMinimumCharge: '',
    effectiveStartDate: '',
    effectiveEndDate: '',
    zoneABaseWeight: '',
    zoneABasePrice: '',
    zoneAAdditionalPricePerKg: '',
    zoneBBaseWeight: '',
    zoneBBasePrice: '',
    zoneBAdditionalPricePerKg: '',
    zoneCBaseWeight: '',
    zoneCBasePrice: '',
    zoneCAdditionalPricePerKg: '',
    zoneDBaseWeight: '',
    zoneDBasePrice: '',
    zoneDAdditionalPricePerKg: '',
    zoneEBaseWeight: '',
    zoneEBasePrice: '',
    zoneEAdditionalPricePerKg: '',
};

export const zoneMappings = ['state', 'distance'] as const;

export const shipmentTypes = ['forward', 'reverse'] as const;

const toDateInputValue = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

export function buildRateCardPayload(formData: RateCardFormData, mode: 'create' | 'update' = 'create') {
    const toKg = (value: string) => {
        const parsed = parseFloat(value);
        if (Number.isNaN(parsed)) return 0;
        return parsed / 1000;
    };

    const payload: any = {
        name: formData.name.trim(),
        scope: formData.scope,
        rateCardCategory: formData.rateCardCategory?.trim() || undefined,
        shipmentType: formData.shipmentType,
        minimumFareCalculatedOn: formData.minimumFareCalculatedOn,
        zoneBType: formData.zoneBType,
        status: formData.status,
        zonePricing: {
            zoneA: {
                baseWeight: toKg(formData.zoneABaseWeight),
                basePrice: parseFloat(formData.zoneABasePrice) || 0,
                additionalPricePerKg: parseFloat(formData.zoneAAdditionalPricePerKg) || 0,
            },
            zoneB: {
                baseWeight: toKg(formData.zoneBBaseWeight),
                basePrice: parseFloat(formData.zoneBBasePrice) || 0,
                additionalPricePerKg: parseFloat(formData.zoneBAdditionalPricePerKg) || 0,
            },
            zoneC: {
                baseWeight: toKg(formData.zoneCBaseWeight),
                basePrice: parseFloat(formData.zoneCBasePrice) || 0,
                additionalPricePerKg: parseFloat(formData.zoneCAdditionalPricePerKg) || 0,
            },
            zoneD: {
                baseWeight: toKg(formData.zoneDBaseWeight),
                basePrice: parseFloat(formData.zoneDBasePrice) || 0,
                additionalPricePerKg: parseFloat(formData.zoneDAdditionalPricePerKg) || 0,
            },
            zoneE: {
                baseWeight: toKg(formData.zoneEBaseWeight),
                basePrice: parseFloat(formData.zoneEBasePrice) || 0,
                additionalPricePerKg: parseFloat(formData.zoneEAdditionalPricePerKg) || 0,
            },
        },
    };

    if (formData.scope === 'company' && formData.companyId) {
        payload.companyId = formData.companyId;
    }

    if (formData.gst) payload.gst = parseFloat(formData.gst);
    if (formData.minimumFare) payload.minimumFare = parseFloat(formData.minimumFare);
    if (formData.codPercentage) payload.codPercentage = parseFloat(formData.codPercentage);
    if (formData.codMinimumCharge) payload.codMinimumCharge = parseFloat(formData.codMinimumCharge);

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
    const warnings: string[] = [];
    if (!rateCard.zonePricing) {
        warnings.push('Zone pricing is missing for this rate card. Please populate zone pricing before saving.');
    }
    const allowedZoneBTypes = new Set(['state', 'distance']);
    let resolvedZoneBType = (rateCard.zoneBType as any) || 'state';
    if (!allowedZoneBTypes.has(resolvedZoneBType)) {
        warnings.push(`Invalid zoneBType '${rateCard.zoneBType}'. Defaulted to 'state'.`);
        resolvedZoneBType = 'state';
    }

    const companyId = typeof rateCard.companyId === 'string'
        ? rateCard.companyId
        : rateCard.companyId?._id || '';

    const toGm = (value?: number) => {
        if (value === undefined || value === null) return '';
        return String(Math.round(value * 1000));
    };

    const formData: RateCardFormData = {
        ...initialRateCardFormData,
        name: rateCard.name || '',
        scope: rateCard.scope || (companyId ? 'company' : 'global'),
        companyId,
        rateCardCategory: rateCard.rateCardCategory || '',
        shipmentType: rateCard.shipmentType || 'forward',
        gst: rateCard.gst !== undefined && rateCard.gst !== null ? String(rateCard.gst) : '',
        minimumFare: rateCard.minimumFare !== undefined && rateCard.minimumFare !== null ? String(rateCard.minimumFare) : '',
        minimumFareCalculatedOn: rateCard.minimumFareCalculatedOn || 'freight',
        zoneBType: resolvedZoneBType,
        status: (rateCard.status as any) || 'active',
        codPercentage: rateCard.codPercentage !== undefined && rateCard.codPercentage !== null ? String(rateCard.codPercentage) : '',
        codMinimumCharge: rateCard.codMinimumCharge !== undefined && rateCard.codMinimumCharge !== null ? String(rateCard.codMinimumCharge) : '',
        effectiveStartDate: toDateInputValue(rateCard.effectiveDates?.startDate),
        effectiveEndDate: toDateInputValue(rateCard.effectiveDates?.endDate),
        zoneABaseWeight: toGm(rateCard.zonePricing?.zoneA?.baseWeight),
        zoneABasePrice: rateCard.zonePricing?.zoneA?.basePrice !== undefined ? String(rateCard.zonePricing?.zoneA?.basePrice) : '',
        zoneAAdditionalPricePerKg: rateCard.zonePricing?.zoneA?.additionalPricePerKg !== undefined ? String(rateCard.zonePricing?.zoneA?.additionalPricePerKg) : '',
        zoneBBaseWeight: toGm(rateCard.zonePricing?.zoneB?.baseWeight),
        zoneBBasePrice: rateCard.zonePricing?.zoneB?.basePrice !== undefined ? String(rateCard.zonePricing?.zoneB?.basePrice) : '',
        zoneBAdditionalPricePerKg: rateCard.zonePricing?.zoneB?.additionalPricePerKg !== undefined ? String(rateCard.zonePricing?.zoneB?.additionalPricePerKg) : '',
        zoneCBaseWeight: toGm(rateCard.zonePricing?.zoneC?.baseWeight),
        zoneCBasePrice: rateCard.zonePricing?.zoneC?.basePrice !== undefined ? String(rateCard.zonePricing?.zoneC?.basePrice) : '',
        zoneCAdditionalPricePerKg: rateCard.zonePricing?.zoneC?.additionalPricePerKg !== undefined ? String(rateCard.zonePricing?.zoneC?.additionalPricePerKg) : '',
        zoneDBaseWeight: toGm(rateCard.zonePricing?.zoneD?.baseWeight),
        zoneDBasePrice: rateCard.zonePricing?.zoneD?.basePrice !== undefined ? String(rateCard.zonePricing?.zoneD?.basePrice) : '',
        zoneDAdditionalPricePerKg: rateCard.zonePricing?.zoneD?.additionalPricePerKg !== undefined ? String(rateCard.zonePricing?.zoneD?.additionalPricePerKg) : '',
        zoneEBaseWeight: toGm(rateCard.zonePricing?.zoneE?.baseWeight),
        zoneEBasePrice: rateCard.zonePricing?.zoneE?.basePrice !== undefined ? String(rateCard.zonePricing?.zoneE?.basePrice) : '',
        zoneEAdditionalPricePerKg: rateCard.zonePricing?.zoneE?.additionalPricePerKg !== undefined ? String(rateCard.zonePricing?.zoneE?.additionalPricePerKg) : '',
    };

    return {
        formData,
        warnings,
        isReadOnly: false,
    };
}
