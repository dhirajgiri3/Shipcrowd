import mongoose from 'mongoose';
import {
    CourierService,
    QuoteSession,
    SellerCourierPolicy,
    ServiceRateCard,
} from '../../../../infrastructure/database/mongoose/models';
import { CourierFactory } from '../courier/courier.factory';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import {
    NormalizedRateResult,
    PricingConfidence,
} from '../../../../infrastructure/external/couriers/base/normalized-pricing.types';
import {
    CourierRateRequest,
    CourierRateResponse,
    ICourierAdapter,
} from '../../../../infrastructure/external/couriers/base/courier.adapter';
import ServiceLevelPricingMetricsService from '../metrics/service-level-pricing-metrics.service';
import ServiceRateCardFormulaService from './service-rate-card-formula.service';
import {
    AutoPriority,
    PricingSource,
    QuoteOptionOutput,
    QuotePricingBreakdown,
    QuoteSessionOutput,
    SelectionMode,
    ServiceRateCardFormulaOutput,
    ServiceLevelProvider,
} from '../../../domain/types/service-level-pricing.types';
import { ICourierService } from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/courier-service.model';
import { ISellerCourierPolicy } from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/seller-courier-policy.model';
import { IServiceRateCard } from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/service-rate-card.model';

type Provider = ServiceLevelProvider;

const SUPPORTED_PROVIDERS: Provider[] = ['velocity', 'delhivery', 'ekart'];

const PROVIDER_TO_FACTORY_KEY: Record<Provider, string> = {
    velocity: 'velocity-shipfast',
    delhivery: 'delhivery',
    ekart: 'ekart',
};

const PROVIDER_TIMEOUT_MS: Record<Provider, number> = {
    ekart: 2000,
    delhivery: 1500,
    velocity: 1500,
};

type CourierServiceLean = {
    _id: mongoose.Types.ObjectId;
    provider: Provider;
    displayName: string;
    constraints?: ICourierService['constraints'];
    sla?: ICourierService['sla'];
    zoneSupport?: ICourierService['zoneSupport'];
};

type SellerPolicyLean = Pick<
    ISellerCourierPolicy,
    | 'selectionMode'
    | 'autoPriority'
    | 'balancedDeltaPercent'
    | 'allowedProviders'
    | 'blockedProviders'
    | 'allowedServiceIds'
    | 'blockedServiceIds'
>;

type ServiceRateCardLean = Pick<
    IServiceRateCard,
    'sourceMode' | 'zoneRules' | 'calculation' | 'cardType' | 'currency'
>;

type QuoteSessionLean = {
    _id: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
    sellerId: mongoose.Types.ObjectId;
    options: QuoteOptionOutput[];
    selectedOptionId?: string;
    expiresAt: Date;
};

interface EkartLaneResult {
    serviceable: boolean;
    zone?: string;
    confidence: PricingConfidence;
}

interface EkartLaneServiceabilityClient {
    getLaneServiceability(input: {
        pickupPincode: string;
        dropPincode: string;
        weight: number;
        paymentMode: 'cod' | 'prepaid';
    }): Promise<EkartLaneResult>;
}

interface ResolvedSell {
    amount: number;
    source: PricingSource;
    breakdown: QuotePricingBreakdown;
    chargeableWeight: number;
}

interface ResolvedCost extends NormalizedRateResult {
    quoteBreakdown: QuotePricingBreakdown;
    chargeableWeight: number;
}

export interface QuoteEngineInput {
    companyId: string;
    sellerId: string;
    fromPincode: string;
    toPincode: string;
    weight: number;
    dimensions: {
        length: number;
        width: number;
        height: number;
    };
    paymentMode: 'cod' | 'prepaid';
    orderValue: number;
    shipmentType: 'forward' | 'reverse';
}

class QuoteEngineService {
    async generateQuotes(input: QuoteEngineInput): Promise<QuoteSessionOutput> {
        const startedAt = Date.now();
        let providerEntries: Provider[] = [];
        const providerTimeouts: Partial<Record<Provider, boolean>> = {};

        const companyObjectId = new mongoose.Types.ObjectId(input.companyId);
        const sellerObjectId = new mongoose.Types.ObjectId(input.sellerId);
        const now = new Date();

        try {
            const policy = await SellerCourierPolicy.findOne({
                companyId: companyObjectId,
                sellerId: sellerObjectId,
                isActive: true,
            }).lean<SellerPolicyLean | null>();

            let services = await CourierService.find({
                companyId: companyObjectId,
                status: 'active',
                isDeleted: false,
            }).lean<CourierServiceLean[]>();

            services = this.applyPolicyFilters(services, policy || undefined);

            if (!services.length) {
                throw new AppError(
                    'No active courier services available for seller policy',
                    ErrorCode.BIZ_NOT_FOUND,
                    404
                );
            }

            const groupedByProvider: Record<Provider, CourierServiceLean[]> = {
                velocity: [],
                delhivery: [],
                ekart: [],
            };

            for (const service of services) {
                if (this.isProvider(service.provider)) {
                    groupedByProvider[service.provider].push(service);
                }
            }

            providerEntries = SUPPORTED_PROVIDERS.filter(
                (provider) => groupedByProvider[provider].length > 0
            );

            const providerResults = await Promise.all(
                providerEntries.map(async (provider) => {
                    const providerServices = groupedByProvider[provider];
                    try {
                        const providerOptions = await this.withTimeout(
                            this.buildProviderOptions(provider, providerServices, input, now),
                            PROVIDER_TIMEOUT_MS[provider],
                            provider
                        );
                        return { provider, providerOptions };
                    } catch (error) {
                        logger.warn('Provider quote generation failed', {
                            provider,
                            companyId: input.companyId,
                            error: error instanceof Error ? error.message : error,
                        });
                        providerTimeouts[provider] = true;
                        return { provider, providerOptions: [] as QuoteOptionOutput[] };
                    }
                })
            );

            const options: QuoteOptionOutput[] = providerResults.flatMap(
                (result) => result.providerOptions
            );

            if (!options.length) {
                throw new AppError(
                    'No quote options could be generated',
                    ErrorCode.VAL_PINCODE_NOT_SERVICEABLE,
                    422
                );
            }

            const ranked = this.rankOptions(
                options,
                policy?.autoPriority || 'balanced',
                policy?.balancedDeltaPercent ?? 5
            );

            const selectionMode: SelectionMode =
                policy?.selectionMode || 'manual_with_recommendation';
            let recommendation: string | undefined =
                ranked.find((option) => option.tags.includes('RECOMMENDED'))?.optionId ||
                ranked[0]?.optionId;

            if (selectionMode === 'manual_only') {
                recommendation = undefined;
                for (const option of ranked) {
                    option.tags = option.tags.filter((tag) => tag !== 'RECOMMENDED');
                }
            }

            const session = await QuoteSession.create({
                companyId: companyObjectId,
                sellerId: sellerObjectId,
                input: {
                    fromPincode: input.fromPincode,
                    toPincode: input.toPincode,
                    weight: input.weight,
                    dimensions: input.dimensions,
                    paymentMode: input.paymentMode,
                    orderValue: input.orderValue,
                    shipmentType: input.shipmentType,
                },
                options: ranked.map((opt) => ({
                    optionId: opt.optionId,
                    provider: opt.provider,
                    serviceId: opt.serviceId,
                    serviceName: opt.serviceName,
                    chargeableWeight: opt.chargeableWeight,
                    zone: opt.zone,
                    quotedAmount: opt.quotedAmount,
                    costAmount: opt.costAmount,
                    estimatedMargin: opt.estimatedMargin,
                    estimatedMarginPercent: opt.estimatedMarginPercent,
                    eta: opt.eta,
                    pricingSource: opt.pricingSource,
                    confidence: opt.confidence,
                    rankScore: opt.rankScore,
                    tags: opt.tags,
                    sellBreakdown: opt.sellBreakdown,
                    costBreakdown: opt.costBreakdown,
                })),
                recommendation,
                providerTimeouts,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            });

            const timeoutProviders = Object.keys(providerTimeouts) as Provider[];
            const confidence: PricingConfidence = timeoutProviders.length ? 'medium' : 'high';

            ServiceLevelPricingMetricsService.recordQuote({
                durationMs: Date.now() - startedAt,
                providerAttempts: providerEntries,
                providerTimeouts: timeoutProviders,
                optionsCount: ranked.length,
                fallbackOptionsCount: ranked.filter(
                    (item) => item.pricingSource !== 'live'
                ).length,
                confidence,
            });

            return {
                sessionId: String(session._id),
                expiresAt: session.expiresAt,
                options: ranked,
                recommendation,
                confidence,
                providerTimeouts,
            };
        } catch (error) {
            ServiceLevelPricingMetricsService.recordQuote({
                durationMs: Date.now() - startedAt,
                providerAttempts: providerEntries,
                providerTimeouts: Object.keys(providerTimeouts) as Provider[],
                optionsCount: 0,
                fallbackOptionsCount: 0,
                confidence: 'low',
            });
            throw error;
        }
    }

    async selectOption(
        companyId: string,
        sellerId: string,
        sessionId: string,
        optionId: string
    ): Promise<{ sessionId: string; selectedOptionId: string }> {
        const session = await QuoteSession.findOne({
            _id: sessionId,
            companyId,
            sellerId,
        });

        if (!session) {
            throw new AppError('Quote session not found', ErrorCode.RES_NOT_FOUND, 404);
        }

        if (session.expiresAt < new Date()) {
            throw new AppError('Quote session expired', ErrorCode.BIZ_INVALID_STATE, 410);
        }

        const optionExists = session.options.some((option) => option.optionId === optionId);
        if (!optionExists) {
            throw new AppError(
                'Selected option is invalid for this quote session',
                ErrorCode.VAL_INVALID_INPUT,
                422
            );
        }

        session.selectedOptionId = optionId;
        await session.save();

        return {
            sessionId: String(session._id),
            selectedOptionId: optionId,
        };
    }

    async getSelectedOption(
        companyId: string,
        sellerId: string,
        sessionId: string,
        requestedOptionId?: string
    ): Promise<{ session: QuoteSessionLean; option: QuoteOptionOutput }> {
        const session = await QuoteSession.findOne({
            _id: sessionId,
            companyId,
            sellerId,
        }).lean<QuoteSessionLean | null>();

        if (!session) {
            throw new AppError('Quote session not found', ErrorCode.RES_NOT_FOUND, 404);
        }

        if (session.expiresAt < new Date()) {
            throw new AppError('Quote session expired', ErrorCode.BIZ_INVALID_STATE, 410);
        }

        const selectedId = requestedOptionId || session.selectedOptionId;
        if (!selectedId) {
            throw new AppError(
                'No quote option selected for this session',
                ErrorCode.VAL_INVALID_INPUT,
                422
            );
        }

        const option = session.options.find((item) => item.optionId === selectedId);
        if (!option) {
            throw new AppError(
                'Selected option is invalid for this quote session',
                ErrorCode.VAL_INVALID_INPUT,
                422
            );
        }

        return {
            session,
            option,
        };
    }

    private isProvider(value: string): value is Provider {
        return SUPPORTED_PROVIDERS.includes(value as Provider);
    }

    private applyPolicyFilters(
        services: CourierServiceLean[],
        policy?: SellerPolicyLean
    ): CourierServiceLean[] {
        if (!policy) {
            return services;
        }

        const allowedProviders = new Set(policy.allowedProviders || []);
        const blockedProviders = new Set(policy.blockedProviders || []);
        const allowedServiceIds = new Set(
            (policy.allowedServiceIds || []).map((id) => String(id))
        );
        const blockedServiceIds = new Set(
            (policy.blockedServiceIds || []).map((id) => String(id))
        );

        return services.filter((service) => {
            if (
                allowedProviders.size > 0 &&
                !allowedProviders.has(service.provider as Provider)
            ) {
                return false;
            }

            if (blockedProviders.has(service.provider as Provider)) {
                return false;
            }

            if (
                allowedServiceIds.size > 0 &&
                !allowedServiceIds.has(String(service._id))
            ) {
                return false;
            }

            if (blockedServiceIds.has(String(service._id))) {
                return false;
            }

            return true;
        });
    }

    private async buildProviderOptions(
        provider: Provider,
        services: CourierServiceLean[],
        input: QuoteEngineInput,
        now: Date
    ): Promise<QuoteOptionOutput[]> {
        const providerKey = PROVIDER_TO_FACTORY_KEY[provider];
        const providerClient = (await CourierFactory.getProvider(
            providerKey,
            new mongoose.Types.ObjectId(input.companyId)
        )) as ICourierAdapter & Partial<EkartLaneServiceabilityClient>;

        let serviceable = true;
        let zone: string | undefined;
        let defaultConfidence: PricingConfidence = 'high';

        if (
            provider === 'ekart' &&
            typeof providerClient.getLaneServiceability === 'function'
        ) {
            const laneResult = await providerClient.getLaneServiceability({
                pickupPincode: input.fromPincode,
                dropPincode: input.toPincode,
                weight: input.weight,
                paymentMode: input.paymentMode,
            });
            serviceable = Boolean(laneResult.serviceable);
            zone = laneResult.zone;
            defaultConfidence = laneResult.confidence;
        } else {
            serviceable = await providerClient.checkServiceability(
                input.toPincode,
                'delivery'
            );
            defaultConfidence = 'medium';
        }

        if (!serviceable) {
            return [];
        }

        const rateRequest: CourierRateRequest = {
            origin: { pincode: input.fromPincode },
            destination: { pincode: input.toPincode },
            package: {
                weight: input.weight,
                length: input.dimensions.length,
                width: input.dimensions.width,
                height: input.dimensions.height,
            },
            paymentMode: input.paymentMode,
            orderValue: input.orderValue,
            shipmentType: input.shipmentType === 'reverse' ? 'return' : 'forward',
        };

        const rateResults = await providerClient
            .getRates(rateRequest)
            .catch((error: unknown) => {
                logger.warn('Provider live rate failed, switching to table fallback', {
                    provider,
                    error: error instanceof Error ? error.message : error,
                });
                return [] as CourierRateResponse[];
            });

        const liveRate = this.pickPrimaryRate(rateResults);
        const liveRateAmount = Number(liveRate?.total || 0);
        const liveRateZone = liveRate?.zone || zone;
        const chargeableWeight = input.weight;

        const options: QuoteOptionOutput[] = [];
        for (const service of services) {
            if (!this.isServiceEligibleForRequest(service, input, liveRateZone)) {
                continue;
            }

            const cost = await this.resolveCost(
                provider,
                service._id,
                input,
                liveRateAmount,
                liveRateZone,
                defaultConfidence,
                now
            );
            const sell = await this.resolveSell(
                provider,
                service._id,
                input,
                cost.amount,
                liveRateZone,
                now
            );
            const estimatedMargin = sell.amount - cost.amount;
            const estimatedMarginPercent =
                sell.amount > 0 ? (estimatedMargin / sell.amount) * 100 : 0;

            options.push({
                optionId: `opt-${provider}-${service._id.toString()}`,
                provider,
                serviceId: service._id,
                serviceName: service.displayName,
                chargeableWeight: Math.max(cost.chargeableWeight, sell.chargeableWeight, chargeableWeight),
                zone: liveRateZone,
                quotedAmount: Number(sell.amount.toFixed(2)),
                costAmount: Number(cost.amount.toFixed(2)),
                estimatedMargin: Number(estimatedMargin.toFixed(2)),
                estimatedMarginPercent: Number(estimatedMarginPercent.toFixed(2)),
                eta: {
                    minDays: service.sla?.eddMinDays,
                    maxDays: service.sla?.eddMaxDays,
                },
                pricingSource: sell.source,
                confidence: cost.confidence,
                rankScore: 0,
                tags: [],
                sellBreakdown: sell.breakdown,
                costBreakdown: cost.quoteBreakdown,
            });
        }

        return options;
    }

    private pickPrimaryRate(
        rates: CourierRateResponse[] | undefined
    ): CourierRateResponse | null {
        if (!rates?.length) {
            return null;
        }

        const first = rates[0];
        if (!Number.isFinite(Number(first.total))) {
            return null;
        }
        return first;
    }

    private isServiceEligibleForRequest(
        service: CourierServiceLean,
        input: QuoteEngineInput,
        routeZone?: string
    ): boolean {
        const constraints = service.constraints || {};
        const minWeightKg = Number(constraints.minWeightKg || 0);
        const maxWeightKg = Number(constraints.maxWeightKg || 0);
        const maxCodValue = Number(constraints.maxCodValue || 0);
        const maxPrepaidValue = Number(constraints.maxPrepaidValue || 0);
        const paymentModes = Array.isArray(constraints.paymentModes)
            ? constraints.paymentModes
            : [];
        const supportedZones = Array.isArray(service.zoneSupport)
            ? service.zoneSupport
            : [];

        if (minWeightKg > 0 && input.weight < minWeightKg) {
            return false;
        }

        if (maxWeightKg > 0 && input.weight > maxWeightKg) {
            return false;
        }

        if (
            input.paymentMode === 'cod' &&
            maxCodValue > 0 &&
            input.orderValue > maxCodValue
        ) {
            return false;
        }

        if (
            input.paymentMode === 'prepaid' &&
            maxPrepaidValue > 0 &&
            input.orderValue > maxPrepaidValue
        ) {
            return false;
        }

        if (paymentModes.length && !paymentModes.includes(input.paymentMode)) {
            return false;
        }

        if (supportedZones.length > 0) {
            const normalized = supportedZones
                .map((zone) => this.normalizeZoneKey(zone))
                .filter(Boolean) as string[];
            const hasAllZones = normalized.includes('all');
            if (!hasAllZones && routeZone) {
                const normalizedRouteZone = this.normalizeZoneKey(routeZone);
                if (normalizedRouteZone && !normalized.includes(normalizedRouteZone)) {
                    return false;
                }
            }
        }

        return true;
    }

    private async withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        provider: Provider
    ): Promise<T> {
        let timer: NodeJS.Timeout | null = null;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                reject(
                    new AppError(
                        `Provider ${provider} quote timed out`,
                        ErrorCode.SYS_INTERNAL_ERROR,
                        504
                    )
                );
            }, timeoutMs);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }

    private async resolveCost(
        provider: Provider,
        serviceId: mongoose.Types.ObjectId,
        input: QuoteEngineInput,
        liveRateAmount: number,
        zone: string | undefined,
        defaultConfidence: PricingConfidence,
        now: Date
    ): Promise<ResolvedCost> {
        const card = await ServiceRateCard.findOne(
            this.buildRateCardQuery(serviceId, 'cost', now)
        ).lean<ServiceRateCardLean | null>();

        if (card) {
            if (
                (card.sourceMode === 'LIVE_API' || card.sourceMode === 'HYBRID') &&
                liveRateAmount > 0
            ) {
                return {
                    provider,
                    amount: liveRateAmount,
                    currency: 'INR',
                    source: card.sourceMode === 'LIVE_API' ? 'live' : 'hybrid',
                    confidence: defaultConfidence,
                    zone,
                    breakdown: {
                        freight: liveRateAmount,
                        total: liveRateAmount,
                    },
                    quoteBreakdown: {
                        subtotal: liveRateAmount,
                        total: liveRateAmount,
                    },
                    chargeableWeight: input.weight,
                };
            }

            const formulaResult = ServiceRateCardFormulaService.calculatePricing({
                serviceRateCard: card,
                weight: input.weight,
                dimensions: input.dimensions,
                zone,
                paymentMode: input.paymentMode,
                orderValue: input.orderValue,
                provider,
                fromPincode: input.fromPincode,
                toPincode: input.toPincode,
            });
            return {
                provider,
                amount: formulaResult.totalAmount,
                currency: 'INR',
                source: card.sourceMode === 'HYBRID' ? 'hybrid' : 'table',
                confidence: 'medium',
                zone,
                breakdown: this.toNormalizedBreakdown(formulaResult),
                quoteBreakdown: this.toQuoteBreakdown(formulaResult),
                chargeableWeight: formulaResult.chargeableWeight,
            };
        }

        if (liveRateAmount > 0) {
            return {
                provider,
                amount: liveRateAmount,
                currency: 'INR',
                source: 'live',
                confidence: defaultConfidence,
                zone,
                breakdown: {
                    freight: liveRateAmount,
                    total: liveRateAmount,
                },
                quoteBreakdown: {
                    subtotal: liveRateAmount,
                    total: liveRateAmount,
                },
                chargeableWeight: input.weight,
            };
        }

        const fallback = Math.max(50, input.weight * 20);
        return {
            provider,
            amount: fallback,
            currency: 'INR',
            source: 'table',
            confidence: 'low',
            zone,
            breakdown: {
                freight: fallback,
                total: fallback,
            },
            quoteBreakdown: {
                subtotal: fallback,
                total: fallback,
            },
            chargeableWeight: input.weight,
        };
    }

    private async resolveSell(
        provider: Provider,
        serviceId: mongoose.Types.ObjectId,
        input: QuoteEngineInput,
        fallbackFromCost: number,
        zone: string | undefined,
        now: Date
    ): Promise<ResolvedSell> {
        const card = await ServiceRateCard.findOne(
            this.buildRateCardQuery(serviceId, 'sell', now)
        ).lean<ServiceRateCardLean | null>();

        if (!card) {
            return {
                amount: fallbackFromCost * 1.1,
                source: 'table',
                breakdown: {
                    subtotal: fallbackFromCost * 1.1,
                    total: fallbackFromCost * 1.1,
                },
                chargeableWeight: input.weight,
            };
        }

        const formulaResult = ServiceRateCardFormulaService.calculatePricing({
            serviceRateCard: card,
            weight: input.weight,
            dimensions: input.dimensions,
            zone,
            paymentMode: input.paymentMode,
            orderValue: input.orderValue,
            provider,
            fromPincode: input.fromPincode,
            toPincode: input.toPincode,
        });

        return {
            amount: formulaResult.totalAmount,
            source: this.mapCardSourceModeToPricingSource(card.sourceMode),
            breakdown: this.toQuoteBreakdown(formulaResult),
            chargeableWeight: formulaResult.chargeableWeight,
        };
    }

    private toNormalizedBreakdown(
        formula: ServiceRateCardFormulaOutput
    ): NormalizedRateResult['breakdown'] {
        return {
            freight: formula.subtotal,
            cod: formula.codCharge,
            fuel: formula.fuelCharge,
            rto: formula.rtoCharge,
            taxes: formula.gstBreakdown.total,
            total: formula.totalAmount,
        };
    }

    private toQuoteBreakdown(formula: ServiceRateCardFormulaOutput): QuotePricingBreakdown {
        return {
            baseCharge: formula.baseCharge,
            weightCharge: formula.weightCharge,
            subtotal: formula.subtotal,
            codCharge: formula.codCharge,
            fuelCharge: formula.fuelCharge,
            rtoCharge: formula.rtoCharge,
            gst: formula.gstBreakdown.total,
            total: formula.totalAmount,
        };
    }

    private buildRateCardQuery(
        serviceId: mongoose.Types.ObjectId,
        cardType: 'cost' | 'sell',
        now: Date
    ) {
        return {
            serviceId,
            cardType,
            status: 'active',
            isDeleted: false,
            'effectiveDates.startDate': { $lte: now },
            $or: [
                { 'effectiveDates.endDate': { $exists: false } },
                { 'effectiveDates.endDate': { $gte: now } },
            ],
        };
    }

    private mapCardSourceModeToPricingSource(
        sourceMode: IServiceRateCard['sourceMode']
    ): PricingSource {
        if (sourceMode === 'LIVE_API') return 'live';
        if (sourceMode === 'HYBRID') return 'hybrid';
        return 'table';
    }

    private calculateFromCard(
        card: ServiceRateCardLean,
        weight: number,
        zone: string | undefined
    ): number {
        const zoneRules = Array.isArray(card.zoneRules) ? card.zoneRules : [];
        const normalizedZone = this.normalizeZoneKey(zone);
        const selectedZoneRule =
            zoneRules.find(
                (rule) => this.normalizeZoneKey(rule.zoneKey) === normalizedZone
            ) || zoneRules[0];

        if (!selectedZoneRule) {
            return Math.max(50, weight * 20);
        }

        const slabs = Array.isArray(selectedZoneRule.slabs)
            ? selectedZoneRule.slabs
            : [];
        const slab = slabs.find(
            (item) =>
                weight >= Number(item.minKg || 0) && weight <= Number(item.maxKg || 0)
        );
        if (slab) {
            return Number(slab.charge || 0);
        }

        const lastSlab = slabs[slabs.length - 1];
        if (!lastSlab) {
            return Math.max(50, weight * 20);
        }

        const extraWeight = Math.max(0, weight - Number(lastSlab.maxKg || 0));
        const roundingUnitKg = Number(card.calculation?.roundingUnitKg || 1);
        const roundingMode = card.calculation?.roundingMode || 'ceil';
        const extraWeightUnits =
            roundingUnitKg > 0 ? extraWeight / roundingUnitKg : extraWeight;

        let roundedUnits = extraWeightUnits;
        if (roundingMode === 'ceil') roundedUnits = Math.ceil(extraWeightUnits);
        if (roundingMode === 'floor') roundedUnits = Math.floor(extraWeightUnits);
        if (roundingMode === 'nearest') roundedUnits = Math.round(extraWeightUnits);

        const roundedExtraWeight =
            Math.max(0, roundedUnits) * Math.max(roundingUnitKg, 0);
        const extraCharge =
            roundedExtraWeight * Number(selectedZoneRule.additionalPerKg || 0);
        return Number(lastSlab.charge || 0) + extraCharge;
    }

    private normalizeZoneKey(zone?: string): string | null {
        const raw = String(zone || '').trim().toLowerCase();
        if (!raw) return null;
        if (raw === 'all') return 'all';
        if (raw.startsWith('zone_')) return `zone${raw.replace('zone_', '')}`;
        if (/^zone[a-e]$/.test(raw)) return raw;
        if (/^[a-e]$/.test(raw)) return `zone${raw}`;
        if (
            raw.endsWith('_a') ||
            raw.endsWith('_b') ||
            raw.endsWith('_c') ||
            raw.endsWith('_d') ||
            raw.endsWith('_e')
        ) {
            const zoneChar = raw.charAt(raw.length - 1);
            return `zone${zoneChar}`;
        }
        return null;
    }

    private rankOptions(
        options: QuoteOptionOutput[],
        priority: AutoPriority,
        balancedDeltaPercent: number
    ): QuoteOptionOutput[] {
        const cheapest = [...options].sort((a, b) => a.quotedAmount - b.quotedAmount)[0];
        const fastest = [...options].sort(
            (a, b) => (a.eta?.maxDays || 999) - (b.eta?.maxDays || 999)
        )[0];

        const recommendedId = this.pickRecommendedOption(
            options,
            priority,
            balancedDeltaPercent
        ).optionId;

        return options
            .map((option) => {
                const priceRank =
                    cheapest.quotedAmount > 0 && option.quotedAmount > 0
                        ? cheapest.quotedAmount / option.quotedAmount
                        : 0;
                const speedRank = fastest?.eta?.maxDays
                    ? fastest.eta.maxDays / (option.eta?.maxDays || 999)
                    : 0;
                const tags: string[] = [];
                if (option.optionId === cheapest.optionId) tags.push('CHEAPEST');
                if (fastest && option.optionId === fastest.optionId) tags.push('FASTEST');
                if (option.optionId === recommendedId) tags.push('RECOMMENDED');

                return {
                    ...option,
                    rankScore: Number((priceRank * 0.6 + speedRank * 0.4).toFixed(4)),
                    tags,
                };
            })
            .sort((a, b) => b.rankScore - a.rankScore);
    }

    private pickRecommendedOption(
        options: QuoteOptionOutput[],
        priority: AutoPriority,
        balancedDeltaPercent: number
    ): QuoteOptionOutput {
        if (priority === 'price') {
            return [...options].sort((a, b) => a.quotedAmount - b.quotedAmount)[0];
        }

        if (priority === 'speed') {
            return [...options].sort(
                (a, b) => (a.eta?.maxDays || 999) - (b.eta?.maxDays || 999)
            )[0];
        }

        const cheapest = [...options].sort((a, b) => a.quotedAmount - b.quotedAmount)[0];
        const fastest = [...options].sort(
            (a, b) => (a.eta?.maxDays || 999) - (b.eta?.maxDays || 999)
        )[0];
        const threshold = cheapest.quotedAmount * (1 + balancedDeltaPercent / 100);
        return fastest.quotedAmount <= threshold ? fastest : cheapest;
    }
}

export default new QuoteEngineService();
