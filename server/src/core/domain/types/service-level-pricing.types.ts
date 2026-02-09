import mongoose from 'mongoose';
import { PricingConfidence } from '../../../infrastructure/external/couriers/base/normalized-pricing.types';
import { IServiceRateCard } from '../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/service-rate-card.model';

export type ServiceLevelProvider = 'velocity' | 'delhivery' | 'ekart';

export type SelectionMode = 'manual_with_recommendation' | 'manual_only' | 'auto';

export type AutoPriority = 'price' | 'speed' | 'balanced';

export type PricingSource = 'live' | 'table' | 'hybrid';

export interface QuoteOptionEta {
    minDays?: number;
    maxDays?: number;
    estimatedDeliveryDate?: Date;
}

export interface QuotePricingBreakdown {
    baseCharge?: number;
    weightCharge?: number;
    subtotal?: number;
    codCharge?: number;
    fuelCharge?: number;
    rtoCharge?: number;
    gst?: number;
    total?: number;
}

export interface QuoteOptionOutput {
    optionId: string;
    provider: ServiceLevelProvider;
    serviceId?: mongoose.Types.ObjectId;
    serviceName: string;
    chargeableWeight: number;
    zone?: string;
    quotedAmount: number;
    costAmount: number;
    estimatedMargin: number;
    estimatedMarginPercent: number;
    eta?: QuoteOptionEta;
    pricingSource: PricingSource;
    confidence: PricingConfidence;
    rankScore: number;
    tags: string[];
    sellBreakdown?: QuotePricingBreakdown;
    costBreakdown?: QuotePricingBreakdown;
}

export interface QuoteSessionOutput {
    sessionId: string;
    expiresAt: Date;
    options: QuoteOptionOutput[];
    recommendation?: string;
    confidence: PricingConfidence;
    providerTimeouts: Partial<Record<ServiceLevelProvider, boolean>>;
}

export interface SellerPolicySnapshot {
    selectionMode: SelectionMode;
    autoPriority: AutoPriority;
    balancedDeltaPercent: number;
    allowedProviders?: ServiceLevelProvider[];
    blockedProviders?: ServiceLevelProvider[];
    allowedServiceIds?: mongoose.Types.ObjectId[];
    blockedServiceIds?: mongoose.Types.ObjectId[];
}

export interface CarrierBillingBreakdown {
    freight?: number;
    cod?: number;
    fuel?: number;
    rto?: number;
    reversePickup?: number;
    qc?: number;
    taxes?: number;
    misc?: number;
}

export interface BillingImportShipmentCostSnapshot {
    _id: mongoose.Types.ObjectId;
    trackingNumber: string;
    carrierDetails?: {
        carrierTrackingNumber?: string;
    };
    paymentDetails?: {
        shippingCost?: number;
    };
    pricingDetails?: {
        selectedQuote?: {
            expectedCostAmount?: number;
        };
    };
}

export interface ServiceRateCardFormulaDimensions {
    length: number;
    width: number;
    height: number;
}

export interface ServiceRateCardFormulaInput {
    serviceRateCard: Pick<
        IServiceRateCard,
        'calculation' | 'zoneRules' | 'currency' | 'cardType'
    >;
    weight: number;
    dimensions: ServiceRateCardFormulaDimensions;
    zone?: string;
    paymentMode: 'cod' | 'prepaid';
    orderValue: number;
    provider: ServiceLevelProvider;
    fromPincode: string;
    toPincode: string;
}

export interface ServiceRateCardFormulaGstBreakdown {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
}

export interface ServiceRateCardFormulaBreakdown {
    weight: {
        actualWeight: number;
        volumetricWeight: number;
        chargeableWeight: number;
        weightBasisUsed: 'actual' | 'volumetric' | 'max';
        chargedBy: 'actual' | 'volumetric';
        dimDivisorUsed: number;
    };
    zone: {
        inputZone: string | null;
        resolvedZone: string;
        source: 'input' | 'pincode_lookup';
        matchedZoneRule: string;
    };
    slab: {
        minKg: number;
        maxKg: number;
        slabCharge: number;
        beyondMaxSlab: boolean;
        additionalPerKg: number;
        extraWeightKg: number;
        roundedExtraWeightKg: number;
        roundingUnitKg: number;
        roundingMode: 'ceil' | 'floor' | 'nearest';
    };
    cod: {
        paymentMode: 'cod' | 'prepaid';
        ruleType: 'flat' | 'percentage' | 'slab' | 'fallback' | 'not_applicable';
        fallbackApplied: boolean;
        charge: number;
    };
    fuel: {
        percentage: number;
        base: 'freight' | 'freight_cod';
        baseAmount: number;
        charge: number;
    };
    rto: {
        charge: number;
        calculationMode: 'not_applicable';
    };
    gst: {
        fromStateCode: string;
        toStateCode: string;
        intraState: boolean;
        taxableAmount: number;
        breakdown: ServiceRateCardFormulaGstBreakdown;
    };
}

export interface ServiceRateCardFormulaOutput {
    chargeableWeight: number;
    baseCharge: number;
    weightCharge: number;
    subtotal: number;
    codCharge: number;
    fuelCharge: number;
    rtoCharge: number;
    gstBreakdown: ServiceRateCardFormulaGstBreakdown;
    totalAmount: number;
    breakdown: ServiceRateCardFormulaBreakdown;
}
