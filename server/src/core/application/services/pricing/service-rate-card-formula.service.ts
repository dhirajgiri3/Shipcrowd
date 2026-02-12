import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import PincodeLookupService from '../logistics/pincode-lookup.service';
import GSTService from '../finance/gst.service';
import { VolumetricWeightCalculator } from '../../../../shared/utils/volumetric-weight.util';
import {
    ServiceLevelProvider,
    ServiceRateCardFormulaBreakdown,
    ServiceRateCardFormulaGstBreakdown,
    ServiceRateCardFormulaInput,
    ServiceRateCardFormulaOutput,
} from '../../../domain/types/service-level-pricing.types';
import { getPricingFeatureFlags } from './pricing-feature-flags';

type FormulaCard = ServiceRateCardFormulaInput['serviceRateCard'];
type ZoneRule = FormulaCard['zoneRules'][number];
type WeightSlab = ZoneRule['slabs'][number];

interface PincodeLookupDependency {
    getPincodeDetails(pincode: string): { state: string } | null;
    getZoneFromPincodes(fromPincode: string, toPincode: string): { zone: string };
    isValidPincodeFormat?(pincode: string): boolean;
}

interface GSTServiceDependency {
    calculateGST(
        taxableAmount: number,
        sellerStateCode: string,
        buyerStateCode: string
    ): {
        cgst: number;
        sgst: number;
        igst: number;
        totalGST: number;
    };
}

const FALLBACK_COD_PERCENTAGE = 0.02;
const FALLBACK_COD_MINIMUM = 30;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

const STATE_CODE_MAP: Record<string, string> = {
    'JAMMU AND KASHMIR': '01',
    'HIMACHAL PRADESH': '02',
    PUNJAB: '03',
    CHANDIGARH: '04',
    UTTARAKHAND: '05',
    HARYANA: '06',
    DELHI: '07',
    RAJASTHAN: '08',
    'UTTAR PRADESH': '09',
    BIHAR: '10',
    SIKKIM: '11',
    'ARUNACHAL PRADESH': '12',
    NAGALAND: '13',
    MANIPUR: '14',
    MIZORAM: '15',
    TRIPURA: '16',
    MEGHALAYA: '17',
    ASSAM: '18',
    'WEST BENGAL': '19',
    JHARKHAND: '20',
    ODISHA: '21',
    CHHATTISGARH: '22',
    'MADHYA PRADESH': '23',
    GUJARAT: '24',
    'DAMAN AND DIU': '25',
    'DADRA AND NAGAR HAVELI': '26',
    MAHARASHTRA: '27',
    'ANDHRA PRADESH (OLD)': '28',
    KARNATAKA: '29',
    GOA: '30',
    LAKSHADWEEP: '31',
    KERALA: '32',
    'TAMIL NADU': '33',
    PUDUCHERRY: '34',
    'ANDAMAN AND NICOBAR ISLANDS': '35',
    TELANGANA: '36',
    'ANDHRA PRADESH': '37',
    LADAKH: '38',
};

class ServiceRateCardFormulaService {
    constructor(
        private readonly pincodeLookup: PincodeLookupDependency = PincodeLookupService,
        private readonly gstService: GSTServiceDependency = GSTService
    ) {}

    calculatePricing(input: ServiceRateCardFormulaInput): ServiceRateCardFormulaOutput {
        const pricingFeatureFlags = this.getPricingFeatureFlags();

        this.validateInput(input);

        const weightBreakdown = this.calculateChargeableWeight(input);
        const zoneResolution = this.resolveZone(input);
        const zoneRule = this.findZoneRule(input.serviceRateCard, zoneResolution.resolvedZone);
        const baseAndWeight = this.calculateBaseAndWeight(
            zoneRule,
            weightBreakdown.chargeableWeight,
            input.serviceRateCard
        );
        const subtotal = this.round2(baseAndWeight.baseCharge + baseAndWeight.weightCharge);

        const cod = this.calculateCODCharge(zoneRule, input.paymentMode, input.orderValue);
        const fuel = this.calculateFuelSurcharge(zoneRule, subtotal, cod.charge);
        const rto = this.calculateRTOCharge(zoneRule, subtotal);
        const rtoTaxableComponent = pricingFeatureFlags.serviceLevelRtoPricingEnabled ? rto.charge : 0;

        const gstTaxableAmount = this.round2(subtotal + cod.charge + fuel.charge + rtoTaxableComponent);
        const gst = this.calculateGST(gstTaxableAmount, input.fromPincode, input.toPincode);
        const totalAmount = this.round2(gstTaxableAmount + gst.breakdown.total);

        const breakdown: ServiceRateCardFormulaBreakdown = {
            weight: {
                actualWeight: this.round3(input.weight),
                volumetricWeight: weightBreakdown.volumetricWeight,
                chargeableWeight: weightBreakdown.chargeableWeight,
                weightBasisUsed: weightBreakdown.weightBasisUsed,
                chargedBy: weightBreakdown.chargedBy,
                dimDivisorUsed: weightBreakdown.dimDivisorUsed,
            },
            zone: {
                inputZone: input.zone || null,
                resolvedZone: zoneResolution.resolvedZone,
                source: zoneResolution.source,
                matchedZoneRule: String(zoneRule.zoneKey),
            },
            slab: {
                minKg: Number(baseAndWeight.appliedSlab.minKg),
                maxKg: Number(baseAndWeight.appliedSlab.maxKg),
                slabCharge: this.round2(baseAndWeight.baseCharge),
                beyondMaxSlab: baseAndWeight.beyondMaxSlab,
                additionalPerKg: this.round2(baseAndWeight.additionalPerKg),
                extraWeightKg: this.round3(baseAndWeight.extraWeightKg),
                roundedExtraWeightKg: this.round3(baseAndWeight.roundedExtraWeightKg),
                roundingUnitKg: this.round3(baseAndWeight.roundingUnitKg),
                roundingMode: baseAndWeight.roundingMode,
            },
            cod: {
                paymentMode: input.paymentMode,
                ruleType: cod.ruleType,
                fallbackApplied: cod.fallbackApplied,
                charge: cod.charge,
            },
            fuel: {
                percentage: this.round4(fuel.percentage),
                base: fuel.base,
                baseAmount: fuel.baseAmount,
                charge: fuel.charge,
            },
            rto: {
                charge: rto.charge,
                calculationMode: rto.calculationMode,
                fallbackApplied: rto.fallbackApplied,
                baseAmount: rto.baseAmount,
                includedInQuoteTotal: pricingFeatureFlags.serviceLevelRtoPricingEnabled,
            },
            gst: {
                fromStateCode: gst.fromStateCode,
                toStateCode: gst.toStateCode,
                intraState: gst.fromStateCode === gst.toStateCode,
                taxableAmount: gstTaxableAmount,
                breakdown: gst.breakdown,
            },
        };

        return {
            chargeableWeight: weightBreakdown.chargeableWeight,
            baseCharge: this.round2(baseAndWeight.baseCharge),
            weightCharge: this.round2(baseAndWeight.weightCharge),
            subtotal,
            codCharge: cod.charge,
            fuelCharge: fuel.charge,
            rtoCharge: rto.charge,
            gstBreakdown: gst.breakdown,
            totalAmount,
            breakdown,
        };
    }

    private validateInput(input: ServiceRateCardFormulaInput): void {
        if (!input.serviceRateCard) {
            this.throwValidation('serviceRateCard is required');
        }
        if (!Array.isArray(input.serviceRateCard.zoneRules) || !input.serviceRateCard.zoneRules.length) {
            this.throwValidation('serviceRateCard.zoneRules must contain at least one zone rule');
        }
        if (!Number.isFinite(input.weight) || input.weight <= 0) {
            this.throwValidation('weight must be greater than 0');
        }
        if (!input.dimensions || !this.areValidDimensions(input.dimensions)) {
            this.throwValidation('dimensions must include positive length, width, and height');
        }
        if (!Number.isFinite(input.orderValue) || input.orderValue < 0) {
            this.throwValidation('orderValue must be 0 or higher');
        }
        if (!['cod', 'prepaid'].includes(input.paymentMode)) {
            this.throwValidation('paymentMode must be cod or prepaid');
        }
        this.validatePincode(input.fromPincode, 'fromPincode');
        this.validatePincode(input.toPincode, 'toPincode');
    }

    private validatePincode(pincode: string, fieldName: string): void {
        const isValidByDependency =
            typeof this.pincodeLookup.isValidPincodeFormat === 'function'
                ? this.pincodeLookup.isValidPincodeFormat(pincode)
                : undefined;
        const isValid = isValidByDependency === undefined ? PINCODE_REGEX.test(pincode) : isValidByDependency;
        if (!isValid) {
            this.throwValidation(`${fieldName} must be a valid 6-digit pincode`);
        }
    }

    private areValidDimensions(dimensions: ServiceRateCardFormulaInput['dimensions']): boolean {
        return (
            Number.isFinite(dimensions.length) &&
            dimensions.length > 0 &&
            Number.isFinite(dimensions.width) &&
            dimensions.width > 0 &&
            Number.isFinite(dimensions.height) &&
            dimensions.height > 0
        );
    }

    private calculateChargeableWeight(input: ServiceRateCardFormulaInput): {
        volumetricWeight: number;
        chargeableWeight: number;
        weightBasisUsed: 'actual' | 'volumetric' | 'max';
        chargedBy: 'actual' | 'volumetric';
        dimDivisorUsed: number;
    } {
        const calculation = input.serviceRateCard.calculation || {};
        const configuredDivisor = Number(calculation.dimDivisor);
        const defaultDivisor = this.resolveProviderDimDivisor(input.provider);
        const dimDivisorUsed =
            Number.isFinite(configuredDivisor) && configuredDivisor > 0
                ? configuredDivisor
                : defaultDivisor;

        const volumetricWeight = this.round3(
            (input.dimensions.length * input.dimensions.width * input.dimensions.height) /
                dimDivisorUsed
        );

        const weightBasisUsed =
            calculation.weightBasis === 'actual' ||
            calculation.weightBasis === 'volumetric' ||
            calculation.weightBasis === 'max'
                ? calculation.weightBasis
                : 'max';

        let chargeableWeight = input.weight;
        if (weightBasisUsed === 'volumetric') {
            chargeableWeight = volumetricWeight;
        } else if (weightBasisUsed === 'max') {
            chargeableWeight = Math.max(input.weight, volumetricWeight);
        }
        chargeableWeight = this.round3(chargeableWeight);

        return {
            volumetricWeight,
            chargeableWeight,
            weightBasisUsed,
            chargedBy: chargeableWeight === this.round3(input.weight) ? 'actual' : 'volumetric',
            dimDivisorUsed,
        };
    }

    private resolveProviderDimDivisor(provider: ServiceLevelProvider): number {
        return VolumetricWeightCalculator.getDimFactor(provider);
    }

    private resolveZone(input: ServiceRateCardFormulaInput): {
        resolvedZone: string;
        source: 'input' | 'pincode_lookup';
    } {
        const normalizedInputZone = this.normalizeZoneKey(input.zone);
        if (normalizedInputZone) {
            return {
                resolvedZone: normalizedInputZone,
                source: 'input',
            };
        }

        const zoneFromLookup = this.pincodeLookup.getZoneFromPincodes(
            input.fromPincode,
            input.toPincode
        )?.zone;
        const normalizedLookupZone = this.normalizeZoneKey(zoneFromLookup);

        if (!normalizedLookupZone) {
            this.throwValidation('Unable to resolve zone from input zone and pincode lookup');
        }

        return {
            resolvedZone: normalizedLookupZone,
            source: 'pincode_lookup',
        };
    }

    private findZoneRule(serviceRateCard: FormulaCard, resolvedZone: string): ZoneRule {
        const zoneRules = serviceRateCard.zoneRules || [];
        const matchedRule =
            zoneRules.find((rule) => this.normalizeZoneKey(rule.zoneKey) === resolvedZone) ||
            zoneRules.find((rule) => this.normalizeZoneKey(rule.zoneKey) === 'all') ||
            zoneRules[0];

        if (!matchedRule) {
            this.throwValidation(`No zone rule found for resolved zone: ${resolvedZone}`);
        }

        return matchedRule;
    }

    private calculateBaseAndWeight(
        zoneRule: ZoneRule,
        chargeableWeight: number,
        serviceRateCard: FormulaCard
    ): {
        baseCharge: number;
        weightCharge: number;
        appliedSlab: WeightSlab;
        beyondMaxSlab: boolean;
        additionalPerKg: number;
        extraWeightKg: number;
        roundedExtraWeightKg: number;
        roundingUnitKg: number;
        roundingMode: 'ceil' | 'floor' | 'nearest';
    } {
        const slabs = [...(zoneRule.slabs || [])].sort((a, b) => Number(a.minKg) - Number(b.minKg));
        if (!slabs.length) {
            this.throwValidation(`Zone rule ${zoneRule.zoneKey} has no slabs`);
        }

        const slabMatch = slabs.find(
            (slab) => chargeableWeight >= Number(slab.minKg) && chargeableWeight <= Number(slab.maxKg)
        );
        if (slabMatch) {
            return {
                baseCharge: this.round2(Number(slabMatch.charge)),
                weightCharge: 0,
                appliedSlab: slabMatch,
                beyondMaxSlab: false,
                additionalPerKg: this.round2(Number(zoneRule.additionalPerKg || 0)),
                extraWeightKg: 0,
                roundedExtraWeightKg: 0,
                roundingUnitKg: this.resolveRoundingUnit(serviceRateCard),
                roundingMode: this.resolveRoundingMode(serviceRateCard),
            };
        }

        const lastSlab = slabs[slabs.length - 1];
        if (chargeableWeight < Number(lastSlab.minKg)) {
            this.throwValidation(`No matching slab found for chargeable weight ${chargeableWeight}kg`);
        }

        const additionalPerKg = Number(zoneRule.additionalPerKg || 0);
        const roundingUnitKg = this.resolveRoundingUnit(serviceRateCard);
        const roundingMode = this.resolveRoundingMode(serviceRateCard);
        const extraWeightKg = Math.max(0, chargeableWeight - Number(lastSlab.maxKg));
        const roundedExtraWeightKg = this.roundExtraWeight(extraWeightKg, roundingUnitKg, roundingMode);
        const weightCharge = roundedExtraWeightKg * additionalPerKg;

        return {
            baseCharge: this.round2(Number(lastSlab.charge)),
            weightCharge: this.round2(weightCharge),
            appliedSlab: lastSlab,
            beyondMaxSlab: true,
            additionalPerKg: this.round2(additionalPerKg),
            extraWeightKg: this.round3(extraWeightKg),
            roundedExtraWeightKg: this.round3(roundedExtraWeightKg),
            roundingUnitKg: this.round3(roundingUnitKg),
            roundingMode,
        };
    }

    private resolveRoundingUnit(serviceRateCard: FormulaCard): number {
        const unit = Number(serviceRateCard.calculation?.roundingUnitKg);
        return Number.isFinite(unit) && unit > 0 ? unit : 1;
    }

    private resolveRoundingMode(serviceRateCard: FormulaCard): 'ceil' | 'floor' | 'nearest' {
        const mode = serviceRateCard.calculation?.roundingMode;
        return mode === 'floor' || mode === 'nearest' ? mode : 'ceil';
    }

    private roundExtraWeight(
        extraWeightKg: number,
        roundingUnitKg: number,
        roundingMode: 'ceil' | 'floor' | 'nearest'
    ): number {
        const units = extraWeightKg / roundingUnitKg;
        let roundedUnits = units;
        if (roundingMode === 'ceil') roundedUnits = Math.ceil(units);
        if (roundingMode === 'floor') roundedUnits = Math.floor(units);
        if (roundingMode === 'nearest') roundedUnits = Math.round(units);
        return Math.max(0, roundedUnits) * roundingUnitKg;
    }

    private calculateCODCharge(
        zoneRule: ZoneRule,
        paymentMode: 'cod' | 'prepaid',
        orderValue: number
    ): {
        charge: number;
        ruleType: 'flat' | 'percentage' | 'slab' | 'fallback' | 'not_applicable';
        fallbackApplied: boolean;
    } {
        if (paymentMode !== 'cod') {
            return { charge: 0, ruleType: 'not_applicable', fallbackApplied: false };
        }

        const codRule = zoneRule.codRule;
        if (!codRule?.type) {
            const fallback = this.calculateFallbackCOD(orderValue);
            return { charge: fallback, ruleType: 'fallback', fallbackApplied: true };
        }

        if (codRule.type === 'flat') {
            const flat = Number(codRule.minCharge || 0);
            if (flat > 0) {
                return { charge: this.round2(flat), ruleType: 'flat', fallbackApplied: false };
            }
            const fallback = this.calculateFallbackCOD(orderValue);
            return { charge: fallback, ruleType: 'fallback', fallbackApplied: true };
        }

        if (codRule.type === 'percentage') {
            const percentage = this.normalizePercentage(Number(codRule.percentage || 0));
            if (percentage > 0) {
                let charge = orderValue * percentage;
                if (Number.isFinite(Number(codRule.minCharge))) {
                    charge = Math.max(charge, Number(codRule.minCharge));
                }
                if (Number.isFinite(Number(codRule.maxCharge)) && Number(codRule.maxCharge) > 0) {
                    charge = Math.min(charge, Number(codRule.maxCharge));
                }
                return { charge: this.round2(charge), ruleType: 'percentage', fallbackApplied: false };
            }
            const fallback = this.calculateFallbackCOD(orderValue);
            return { charge: fallback, ruleType: 'fallback', fallbackApplied: true };
        }

        if (codRule.type === 'slab' && Array.isArray(codRule.slabs) && codRule.slabs.length > 0) {
            const matchedSlab = codRule.slabs.find(
                (slab) => orderValue >= Number(slab.min) && orderValue <= Number(slab.max)
            );
            if (matchedSlab) {
                const charge =
                    matchedSlab.type === 'percentage'
                        ? orderValue * this.normalizePercentage(Number(matchedSlab.value || 0))
                        : Number(matchedSlab.value || 0);
                return { charge: this.round2(charge), ruleType: 'slab', fallbackApplied: false };
            }
        }

        const fallback = this.calculateFallbackCOD(orderValue);
        return { charge: fallback, ruleType: 'fallback', fallbackApplied: true };
    }

    private calculateFallbackCOD(orderValue: number): number {
        return this.round2(Math.max(orderValue * FALLBACK_COD_PERCENTAGE, FALLBACK_COD_MINIMUM));
    }

    private calculateFuelSurcharge(
        zoneRule: ZoneRule,
        subtotal: number,
        codCharge: number
    ): {
        percentage: number;
        base: 'freight' | 'freight_cod';
        baseAmount: number;
        charge: number;
    } {
        const percentage = this.normalizePercentage(Number(zoneRule.fuelSurcharge?.percentage || 0));
        const base = zoneRule.fuelSurcharge?.base === 'freight_cod' ? 'freight_cod' : 'freight';
        const baseAmount = this.round2(base === 'freight_cod' ? subtotal + codCharge : subtotal);
        const charge = percentage > 0 ? this.round2(baseAmount * percentage) : 0;

        return {
            percentage,
            base,
            baseAmount,
            charge,
        };
    }

    private calculateRTOCharge(
        zoneRule: ZoneRule,
        subtotal: number
    ): {
        charge: number;
        calculationMode: 'flat' | 'percentage' | 'forward_mirror' | 'not_applicable';
        fallbackApplied: boolean;
        baseAmount: number;
    } {
        const rtoRule = zoneRule.rtoRule;
        const baseAmount = this.round2(subtotal);
        const hasLegacyPercentageConfig =
            !!rtoRule &&
            (Number.isFinite(Number(rtoRule.percentage)) ||
                Number.isFinite(Number(rtoRule.minCharge)) ||
                Number.isFinite(Number(rtoRule.maxCharge)));

        if (!rtoRule) {
            return {
                charge: baseAmount,
                calculationMode: 'forward_mirror',
                fallbackApplied: true,
                baseAmount,
            };
        }

        if (!rtoRule.type && hasLegacyPercentageConfig) {
            const percentage = this.normalizePercentage(Number(rtoRule.percentage || 0));
            let charge = baseAmount * percentage;
            if (Number.isFinite(Number(rtoRule.minCharge))) {
                charge = Math.max(charge, Number(rtoRule.minCharge));
            }
            if (Number.isFinite(Number(rtoRule.maxCharge)) && Number(rtoRule.maxCharge) > 0) {
                charge = Math.min(charge, Number(rtoRule.maxCharge));
            }
            return {
                charge: this.round2(charge),
                calculationMode: 'percentage',
                fallbackApplied: false,
                baseAmount,
            };
        }

        if (!rtoRule.type) {
            return {
                charge: baseAmount,
                calculationMode: 'forward_mirror',
                fallbackApplied: true,
                baseAmount,
            };
        }

        if (rtoRule.type === 'forward_mirror') {
            return {
                charge: baseAmount,
                calculationMode: 'forward_mirror',
                fallbackApplied: false,
                baseAmount,
            };
        }

        if (rtoRule.type === 'flat') {
            const amount = this.round2(Number(rtoRule.amount || 0));
            return {
                charge: amount,
                calculationMode: 'flat',
                fallbackApplied: false,
                baseAmount,
            };
        }

        if (rtoRule.type === 'percentage') {
            const percentage = this.normalizePercentage(Number(rtoRule.percentage || 0));
            let charge = baseAmount * percentage;
            if (Number.isFinite(Number(rtoRule.minCharge))) {
                charge = Math.max(charge, Number(rtoRule.minCharge));
            }
            if (Number.isFinite(Number(rtoRule.maxCharge)) && Number(rtoRule.maxCharge) > 0) {
                charge = Math.min(charge, Number(rtoRule.maxCharge));
            }
            return {
                charge: this.round2(charge),
                calculationMode: 'percentage',
                fallbackApplied: false,
                baseAmount,
            };
        }

        return {
            charge: 0,
            calculationMode: 'not_applicable',
            fallbackApplied: false,
            baseAmount,
        };
    }

    private calculateGST(
        taxableAmount: number,
        fromPincode: string,
        toPincode: string
    ): {
        fromStateCode: string;
        toStateCode: string;
        breakdown: ServiceRateCardFormulaGstBreakdown;
    } {
        const from = this.pincodeLookup.getPincodeDetails(fromPincode);
        const to = this.pincodeLookup.getPincodeDetails(toPincode);
        if (!from || !to) {
            this.throwValidation('Unable to resolve GST states from provided pincodes');
        }

        const fromStateCode = this.getStateCode(from.state);
        const toStateCode = this.getStateCode(to.state);

        const gst = this.gstService.calculateGST(taxableAmount, fromStateCode, toStateCode);
        const breakdown: ServiceRateCardFormulaGstBreakdown = {
            cgst: this.round2(gst.cgst),
            sgst: this.round2(gst.sgst),
            igst: this.round2(gst.igst),
            total: this.round2(gst.totalGST),
        };

        return {
            fromStateCode,
            toStateCode,
            breakdown,
        };
    }

    private getStateCode(stateName: string): string {
        const code = STATE_CODE_MAP[String(stateName || '').trim().toUpperCase()];
        if (!code) {
            this.throwValidation(`Unsupported state for GST calculation: ${stateName}`);
        }
        return code;
    }

    private normalizeZoneKey(zone?: string | null): string | null {
        const raw = String(zone || '').trim().toLowerCase();
        if (!raw) return null;
        if (raw === 'all') return 'all';
        if (raw.startsWith('zone_')) return `zone${raw.replace('zone_', '')}`;
        if (/^zone[a-e]$/.test(raw)) return raw;
        if (/^[a-e]$/.test(raw)) return `zone${raw}`;
        if (/^(route|lane)_[a-e]$/.test(raw)) return `zone${raw.charAt(raw.length - 1)}`;
        if (/(^|_)zone[a-e]$/.test(raw)) {
            return raw.slice(-5);
        }
        return null;
    }

    private normalizePercentage(value: number): number {
        if (!Number.isFinite(value) || value <= 0) {
            return 0;
        }
        return value > 1 ? value / 100 : value;
    }

    private throwValidation(message: string): never {
        throw new AppError(message, ErrorCode.VAL_INVALID_INPUT, 422);
    }

    private round2(value: number): number {
        return Math.round(value * 100) / 100;
    }

    private round3(value: number): number {
        return Math.round(value * 1000) / 1000;
    }

    private round4(value: number): number {
        return Math.round(value * 10000) / 10000;
    }

    private getPricingFeatureFlags() {
        return getPricingFeatureFlags();
    }
}

export { ServiceRateCardFormulaService };
export default new ServiceRateCardFormulaService();
