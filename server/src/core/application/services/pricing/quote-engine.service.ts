import mongoose from 'mongoose';
import {
CourierService,
QuoteSession,
SellerCourierPolicy,
SellerRateCard,
ServiceRateCard,
} from '../../../../infrastructure/database/mongoose/models';
import { ICourierService } from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/courier-service.model';
import { ISellerCourierPolicy } from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/seller-courier-policy.model';
import { IServiceRateCard } from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/service-rate-card.model';
import {
CourierRateRequest,
CourierRateResponse,
ICourierAdapter,
} from '../../../../infrastructure/external/couriers/base/courier.adapter';
import {
NormalizedRateResult,
PricingConfidence,
} from '../../../../infrastructure/external/couriers/base/normalized-pricing.types';
import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import {
AutoPriority,
PricingSource,
QuoteOptionOutput,
QuotePricingBreakdown,
QuoteSessionOutput,
SelectionMode,
ServiceRateCardFormulaOutput,
} from '../../../domain/types/service-level-pricing.types';
import CourierProviderRegistry from '../courier/courier-provider-registry';
import { CourierFactory } from '../courier/courier.factory';
import ServiceLevelPricingMetricsService from '../metrics/service-level-pricing-metrics.service';
import { getPricingFeatureFlags } from './pricing-feature-flags';
import PricingStrategyService from './pricing-strategy.service';
import RouteIntelligenceService from './route-intelligence.service';
import ServiceRateCardFormulaService from './service-rate-card-formula.service';

type CanonicalProvider = NormalizedRateResult['provider'];
type Provider = CanonicalProvider;

const SUPPORTED_PROVIDERS: CanonicalProvider[] = [...CourierProviderRegistry.getSupportedProviders()];

const PROVIDER_TO_FACTORY_KEY: Record<string, string> = Object.fromEntries(
    SUPPORTED_PROVIDERS.map((provider) => [
        provider,
        CourierProviderRegistry.getIntegrationProvider(provider),
    ])
);

const PROVIDER_TIMEOUT_MS: Record<string, number> = {
    ekart: 35000,
    delhivery: 20000,
    velocity: 35000,
};

const SERVICEABILITY_TIMEOUT_MS: Record<string, number> = {
    ekart: 2500,
    delhivery: 2500,
    velocity: 0,
};

type CourierServiceLean = {
    _id: mongoose.Types.ObjectId;
    provider: Provider;
    serviceType: ICourierService['serviceType'];
    providerServiceId?: string;
    displayName: string;
    constraints?: ICourierService['constraints'];
    sla?: ICourierService['sla'];
    zoneSupport?: ICourierService['zoneSupport'];
    flowType?: ICourierService['flowType'];
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
    | 'rateCardType'
    | 'rateCardCategory'
>;

type ServiceRateCardLean = Pick<
    IServiceRateCard,
    'sourceMode' | 'zoneRules' | 'calculation' | 'cardType' | 'currency'
    | 'flowType' | 'category'
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

interface ServiceLiveRate {
    amount: number;
    zone?: string;
    confidence: PricingConfidence;
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
    private shouldCountAsProviderFailure(error: unknown): boolean {
        const statusCode = Number((error as any)?.statusCode || (error as any)?.status);
        const code = String((error as any)?.code || '');

        // Non-fatal provider outcomes: treat as "no options", not platform outage.
        if (statusCode === 404 || statusCode === 422) return false;
        if (
            code === ErrorCode.BIZ_NOT_FOUND ||
            code === ErrorCode.VAL_PINCODE_NOT_SERVICEABLE ||
            code === ErrorCode.VAL_INVALID_INPUT
        ) {
            return false;
        }

        return true;
    }

    async generateQuotes(input: QuoteEngineInput): Promise<QuoteSessionOutput> {
        // Wiring point for phased rollout flags. Behavior remains unchanged in this PR.
        const pricingFeatureFlags = this.getPricingFeatureFlags();
        if (input.shipmentType === 'reverse' && !pricingFeatureFlags.reverseQuoteEnabled) {
            throw new AppError(
                'Reverse shipping not yet configured',
                ErrorCode.VAL_INVALID_INPUT,
                422
            );
        }

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
                companyId: null,
                status: 'active',
                isDeleted: false,
            }).lean<CourierServiceLean[]>();

            services = services.filter((service) =>
                this.matchesShipmentFlow(service.flowType || 'forward', input.shipmentType)
            );

            if (input.shipmentType === 'reverse') {
                const hasReverseConfigured = services.length > 0;
                if (!hasReverseConfigured) {
                    throw new AppError(
                        'Reverse shipping not yet configured',
                        ErrorCode.VAL_INVALID_INPUT,
                        422
                    );
                }

                const reverseCardCount = await ServiceRateCard.countDocuments({
                    companyId: null,
                    flowType: 'reverse',
                    status: 'active',
                    isDeleted: false,
                });
                if (reverseCardCount === 0) {
                    throw new AppError(
                        'Reverse shipping not yet configured',
                        ErrorCode.VAL_INVALID_INPUT,
                        422
                    );
                }
            }

            services = this.applyPolicyFilters(services, policy || undefined);
            logger.debug('Quote engine service pool prepared', {
                companyId: input.companyId,
                sellerId: input.sellerId,
                policyApplied: Boolean(policy),
                servicesCount: services.length,
            });

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
            logger.debug('Quote engine provider entries resolved', {
                companyId: input.companyId,
                sellerId: input.sellerId,
                providerEntries,
                providerServiceCounts: Object.fromEntries(
                    SUPPORTED_PROVIDERS.map((provider) => [
                        provider,
                        groupedByProvider[provider].length,
                    ])
                ),
            });

            const providerResults = await Promise.all(
                providerEntries.map(async (provider) => {
                    const providerServices = groupedByProvider[provider];
                    try {
                        const providerAvailable = await CourierFactory.isProviderAvailable(
                            PROVIDER_TO_FACTORY_KEY[provider],
                            companyObjectId
                        );
                        if (!providerAvailable) {
                            logger.warn('Quote engine skipped provider due to inactive/missing integration', {
                                companyId: input.companyId,
                                provider,
                            });
                            return {
                                provider,
                                providerOptions: [] as QuoteOptionOutput[],
                                failed: false,
                            };
                        }

                        const providerOptions = await this.withTimeout(
                            this.buildProviderOptions(
                                provider,
                                providerServices,
                                input,
                                now,
                                policy || undefined
                            ),
                            PROVIDER_TIMEOUT_MS[provider],
                            provider
                        );
                        return { provider, providerOptions, failed: false };
                    } catch (error) {
                        const hardFailure = this.shouldCountAsProviderFailure(error);
                        logger.warn('Provider quote generation failed', {
                            provider,
                            companyId: input.companyId,
                            hardFailure,
                            error: error instanceof Error ? error.message : error,
                        });
                        if (hardFailure) {
                            providerTimeouts[provider] = true;
                        }
                        return {
                            provider,
                            providerOptions: [] as QuoteOptionOutput[],
                            failed: hardFailure,
                        };
                    }
                })
            );

            const options: QuoteOptionOutput[] = providerResults.flatMap(
                (result) => result.providerOptions
            );
            logger.debug('Quote engine provider option results', {
                companyId: input.companyId,
                sellerId: input.sellerId,
                providerOptionCounts: providerResults.map((result) => ({
                    provider: result.provider,
                    count: result.providerOptions.length,
                    failed: result.failed,
                })),
                totalOptions: options.length,
            });

            // Enrich with route intelligence performance metrics
            if (options.length > 0) {
                try {
                    const uniqueProviders = [...new Set(options.map((opt) => opt.provider))];
                    const perfMap = await RouteIntelligenceService.getBatchRoutePerformance(
                        input.companyId,
                        uniqueProviders,
                        input.fromPincode,
                        input.toPincode
                    );

                    for (const option of options) {
                        const perf = perfMap.get(option.provider);
                        if (perf) {
                            option.performanceMetrics = perf;
                        }
                    }
                } catch (perfError) {
                    logger.warn('Route intelligence enrichment failed, continuing without perf metrics', {
                        companyId: input.companyId,
                        error: perfError instanceof Error ? perfError.message : perfError,
                    });
                }
            }
            const failedProviders = providerResults.filter((result) => result.failed);
            const allProvidersFailed =
                providerEntries.length > 0 && failedProviders.length === providerEntries.length;

            if (!options.length) {
                if (allProvidersFailed) {
                    throw new AppError(
                        'Courier rates unavailable from all configured live providers',
                        ErrorCode.EXT_SERVICE_UNAVAILABLE,
                        503,
                        true,
                        {
                            providerFailures: failedProviders.map((result) => result.provider),
                            fromPincode: input.fromPincode,
                            toPincode: input.toPincode,
                        }
                    );
                }

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

    private getPricingFeatureFlags() {
        return getPricingFeatureFlags();
    }

    private applyPolicyFilters(
        services: CourierServiceLean[],
        policy?: SellerPolicyLean
    ): CourierServiceLean[] {
        if (!policy) {
            return services;
        }

        const allowedProviders = new Set<CanonicalProvider>(
            (policy.allowedProviders || []).filter((provider): provider is CanonicalProvider =>
                this.isProvider(String(provider))
            )
        );
        const blockedProviders = new Set<CanonicalProvider>(
            (policy.blockedProviders || []).filter((provider): provider is CanonicalProvider =>
                this.isProvider(String(provider))
            )
        );
        const allowedServiceIds = new Set(
            (policy.allowedServiceIds || []).map((id) => String(id))
        );
        const blockedServiceIds = new Set(
            (policy.blockedServiceIds || []).map((id) => String(id))
        );

        return services.filter((service) => {
            if (
                allowedProviders.size > 0 &&
                !allowedProviders.has(service.provider as CanonicalProvider)
            ) {
                return false;
            }

            if (blockedProviders.has(service.provider as CanonicalProvider)) {
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
        now: Date,
        policy?: SellerPolicyLean
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
            try {
                const laneResult = await this.withTimeout(
                    providerClient.getLaneServiceability({
                        pickupPincode: input.fromPincode,
                        dropPincode: input.toPincode,
                        weight: input.weight,
                        paymentMode: input.paymentMode,
                    }),
                    SERVICEABILITY_TIMEOUT_MS.ekart,
                    provider
                );
                serviceable = Boolean(laneResult.serviceable);
                zone = laneResult.zone;
                defaultConfidence = laneResult.confidence;
            } catch (error) {
                logger.warn(
                    'Quote engine Ekart lane serviceability failed, continuing with fallback pricing',
                    {
                        companyId: input.companyId,
                        fromPincode: input.fromPincode,
                        toPincode: input.toPincode,
                        error: error instanceof Error ? error.message : error,
                    }
                );
                serviceable = true;
                defaultConfidence = 'low';
            }
        } else if (provider === 'velocity') {
            // Velocity checkServiceability uses a default origin and can reject valid lanes
            // for the current quote origin. Use live-rate call per service as the source of truth.
            serviceable = true;
            defaultConfidence = 'medium';
        } else {
            try {
                serviceable = await this.withTimeout(
                    providerClient.checkServiceability(
                        input.toPincode,
                        'delivery'
                    ),
                    SERVICEABILITY_TIMEOUT_MS[provider],
                    provider
                );
                defaultConfidence = 'medium';
            } catch (error) {
                logger.warn(
                    'Quote engine provider serviceability check failed, continuing with fallback pricing',
                    {
                        provider,
                        companyId: input.companyId,
                        fromPincode: input.fromPincode,
                        toPincode: input.toPincode,
                        error: error instanceof Error ? error.message : error,
                    }
                );
                serviceable = true;
                defaultConfidence = 'low';
            }
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
        const liveRateCache = new Map<string, ServiceLiveRate>();
        const candidates = await Promise.all(
            services.map(async (service) => {
                try {
                    const liveRate = await this.getLiveRateForService(
                        provider,
                        providerClient,
                        rateRequest,
                        service,
                        zone,
                        defaultConfidence,
                        liveRateCache
                    );
                    const liveRateZone = liveRate.zone || zone;
                    if (!this.isServiceEligibleForRequest(service, input, liveRateZone)) {
                        return null;
                    }

                    const cost = await this.resolveCost(
                        provider,
                        service._id,
                        input,
                        liveRate.amount,
                        liveRateZone,
                        liveRate.confidence,
                        now
                    );
                    const sell = await this.resolveSell(
                        provider,
                        service._id,
                        input,
                        cost.amount,
                        liveRateZone,
                        now,
                        policy
                    );
                    const estimatedMargin = sell.amount - cost.amount;
                    const estimatedMarginPercent =
                        sell.amount > 0 ? (estimatedMargin / sell.amount) * 100 : 0;

                    return {
                        optionId: `opt-${provider}-${service._id.toString()}`,
                        provider,
                        serviceId: service._id,
                        serviceName: service.displayName,
                        chargeableWeight: Math.max(
                            cost.chargeableWeight,
                            sell.chargeableWeight,
                            liveRate.chargeableWeight
                        ),
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
                    } as QuoteOptionOutput;
                } catch (error) {
                    logger.warn('Quote engine skipped provider service due to service-level failure', {
                        provider,
                        serviceId: String(service._id),
                        serviceCode: service.providerServiceId,
                        serviceType: service.serviceType,
                        error: error instanceof Error ? error.message : error,
                    });
                    return null;
                }
            })
        );

        return candidates.filter((item): item is QuoteOptionOutput => item !== null);
    }

    private matchesShipmentFlow(
        serviceFlowType: 'forward' | 'reverse' | 'both',
        shipmentType: 'forward' | 'reverse'
    ): boolean {
        if (shipmentType === 'forward') {
            return serviceFlowType === 'forward' || serviceFlowType === 'both';
        }
        return serviceFlowType === 'reverse' || serviceFlowType === 'both';
    }

    private async getLiveRateForService(
        provider: Provider,
        providerClient: ICourierAdapter,
        baseRateRequest: CourierRateRequest,
        service: CourierServiceLean,
        fallbackZone: string | undefined,
        defaultConfidence: PricingConfidence,
        cache: Map<string, ServiceLiveRate>
    ): Promise<ServiceLiveRate> {
        const cacheKey = `${service.serviceType}:${service.providerServiceId || ''}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        if (
            provider === 'ekart' &&
            (service.serviceType === 'express' || service.serviceType === 'air') &&
            !service.providerServiceId
        ) {
            logger.warn('Courier service missing providerServiceId for Ekart express/air mapping', {
                provider,
                serviceId: String(service._id),
                serviceType: service.serviceType,
            });
        }

        const rateRequest: CourierRateRequest = {
            ...baseRateRequest,
            serviceType: service.serviceType,
            providerServiceId: service.providerServiceId,
        };

        const rateResults = await providerClient
            .getRates(rateRequest)
            .catch((error: unknown) => {
                logger.warn('Provider live rate failed, switching to table fallback', {
                    provider,
                    serviceId: String(service._id),
                    serviceType: service.serviceType,
                    error: error instanceof Error ? error.message : error,
                });
                return [] as CourierRateResponse[];
            });

        const liveRate = this.pickPrimaryRate(rateResults);
        const resolved: ServiceLiveRate = {
            amount: Number(liveRate?.total || 0),
            zone: liveRate?.zone || fallbackZone,
            confidence: defaultConfidence,
            chargeableWeight: baseRateRequest.package.weight,
        };
        cache.set(cacheKey, resolved);
        return resolved;
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
        const flowType = input.shipmentType === 'reverse' ? 'reverse' : 'forward';
        const card = await this.findActiveRateCard({
            serviceId,
            cardType: 'cost',
            flowType,
            now,
            category: 'default',
            sellerCompanyId: input.companyId,
            sellerId: input.sellerId,
            rateCardType: 'default',
        });
        const strategy = PricingStrategyService.resolveCost({
            hasCard: Boolean(card),
            cardSourceMode: card?.sourceMode,
            hasLiveRate: liveRateAmount > 0,
        });

        if (strategy.mode === 'live') {
            return {
                provider,
                amount: liveRateAmount,
                currency: 'INR',
                source: strategy.source,
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

        if (strategy.mode === 'formula' && card) {
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
                source: strategy.source,
                confidence: strategy.confidence,
                zone,
                breakdown: this.toNormalizedBreakdown(formulaResult),
                quoteBreakdown: this.toQuoteBreakdown(formulaResult),
                chargeableWeight: formulaResult.chargeableWeight,
            };
        }

        const fallback = Math.max(50, input.weight * 20);
        return {
            provider,
            amount: fallback,
            currency: 'INR',
            source: strategy.source,
            confidence: strategy.confidence,
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
        now: Date,
        policy?: SellerPolicyLean
    ): Promise<ResolvedSell> {
        const flowType = input.shipmentType === 'reverse' ? 'reverse' : 'forward';
        const preferredCategory = (policy?.rateCardCategory || 'default') as
            | 'default'
            | 'basic'
            | 'standard'
            | 'advanced'
            | 'custom';
        const card = await this.findActiveRateCard({
            serviceId,
            cardType: 'sell',
            flowType,
            now,
            category: preferredCategory,
            sellerCompanyId: input.companyId,
            sellerId: input.sellerId,
            rateCardType: (policy?.rateCardType || 'default') as 'default' | 'custom',
        });
        const strategy = PricingStrategyService.resolveSell({
            hasCard: Boolean(card),
            cardSourceMode: card?.sourceMode,
        });

        if (strategy.mode === 'fallback' || !card) {
            return {
                amount: fallbackFromCost * 1.1,
                source: strategy.source,
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
            source: strategy.source,
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

    private buildPlatformRateCardQuery(params: {
        serviceId: mongoose.Types.ObjectId;
        cardType: 'cost' | 'sell';
        flowType: 'forward' | 'reverse';
        now: Date;
        category?: 'default' | 'basic' | 'standard' | 'advanced' | 'custom';
    }) {
        return {
            companyId: null,
            serviceId: params.serviceId,
            cardType: params.cardType,
            flowType: params.flowType,
            ...(params.cardType === 'sell'
                ? { category: params.category || 'default' }
                : {}),
            status: 'active',
            isDeleted: false,
            'effectiveDates.startDate': { $lte: params.now },
            $or: [
                { 'effectiveDates.endDate': { $exists: false } },
                { 'effectiveDates.endDate': { $gte: params.now } },
            ],
        };
    }

    private buildSellerRateCardQuery(params: {
        companyId: string;
        sellerId: string;
        serviceId: mongoose.Types.ObjectId;
        flowType: 'forward' | 'reverse';
        now: Date;
    }) {
        return {
            companyId: new mongoose.Types.ObjectId(params.companyId),
            sellerId: new mongoose.Types.ObjectId(params.sellerId),
            serviceId: params.serviceId,
            cardType: 'sell',
            flowType: params.flowType,
            status: 'active',
            isDeleted: false,
            'effectiveDates.startDate': { $lte: params.now },
            $or: [
                { 'effectiveDates.endDate': { $exists: false } },
                { 'effectiveDates.endDate': { $gte: params.now } },
            ],
        };
    }

    private getSellCategoryFallbackChain(
        category: 'default' | 'basic' | 'standard' | 'advanced' | 'custom'
    ): Array<'default' | 'basic' | 'standard' | 'advanced' | 'custom'> {
        switch (category) {
            case 'basic':
                return ['basic', 'default'];
            case 'standard':
                return ['standard', 'basic', 'default'];
            case 'advanced':
                return ['advanced', 'standard', 'basic', 'default'];
            case 'custom':
                return ['custom', 'advanced', 'standard', 'basic', 'default'];
            case 'default':
            default:
                return ['default'];
        }
    }

    private async findTopCard<T>(
        queryModel: { find: (query: any) => any },
        query: Record<string, unknown>
    ): Promise<T | null> {
        const cards = (await queryModel
            .find(query)
            .sort({ 'effectiveDates.startDate': -1, createdAt: -1 })
            .limit(2)
            .lean()) as T[];
        if (cards.length > 1) {
            logger.warn('Multiple active rate cards matched deterministic selection', {
                query,
                selectedBy: ['effectiveDates.startDate desc', 'createdAt desc'],
            });
        }
        return cards[0] || null;
    }

    private async findActiveRateCard(
        params: {
            serviceId: mongoose.Types.ObjectId;
            cardType: 'cost' | 'sell';
            flowType: 'forward' | 'reverse';
            now: Date;
            category: 'default' | 'basic' | 'standard' | 'advanced' | 'custom';
            sellerCompanyId: string;
            sellerId: string;
            rateCardType: 'default' | 'custom';
        }
    ): Promise<ServiceRateCardLean | null> {
        if (params.cardType === 'cost') {
            return this.findTopCard<ServiceRateCardLean>(
                ServiceRateCard,
                this.buildPlatformRateCardQuery({
                    serviceId: params.serviceId,
                    cardType: 'cost',
                    flowType: params.flowType,
                    now: params.now,
                    category: 'default',
                })
            );
        }

        if (params.rateCardType === 'custom') {
            const sellerCard = await this.findTopCard<ServiceRateCardLean>(
                SellerRateCard,
                this.buildSellerRateCardQuery({
                    companyId: params.sellerCompanyId,
                    sellerId: params.sellerId,
                    serviceId: params.serviceId,
                    flowType: params.flowType,
                    now: params.now,
                })
            );
            if (sellerCard) {
                return sellerCard;
            }
        }

        const chain = this.getSellCategoryFallbackChain(params.category);
        for (const category of chain) {
            const platformCard = await this.findTopCard<ServiceRateCardLean>(
                ServiceRateCard,
                this.buildPlatformRateCardQuery({
                    serviceId: params.serviceId,
                    cardType: 'sell',
                    flowType: params.flowType,
                    now: params.now,
                    category,
                })
            );
            if (platformCard) {
                if (category !== params.category) {
                    logger.info('Sell rate card category fallback applied', {
                        serviceId: String(params.serviceId),
                        flowType: params.flowType,
                        requestedCategory: params.category,
                        appliedCategory: category,
                    });
                }
                return platformCard;
            }
        }

        return null;
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

        const rankedOptions = options
            .map((option) => {
                // Price score (relative to cheapest)
                const priceScore =
                    cheapest.quotedAmount > 0 && option.quotedAmount > 0
                        ? cheapest.quotedAmount / option.quotedAmount
                        : 0;

                // Speed score (relative to fastest)
                const speedScore = fastest?.eta?.maxDays
                    ? fastest.eta.maxDays / (option.eta?.maxDays || 999)
                    : 0;

                // Reliability score (from performance metrics)
                const reliabilityScore = option.performanceMetrics
                    ? option.performanceMetrics.deliverySuccessRate / 100
                    : 0.7; // Neutral default

                // New formula: 40% price, 30% speed, 30% reliability
                const rankScore = priceScore * 0.4 + speedScore * 0.3 + reliabilityScore * 0.3;

                // Assign tags
                const tags: string[] = [];
                if (option.optionId === cheapest.optionId) tags.push('CHEAPEST');
                if (fastest && option.optionId === fastest.optionId) tags.push('FASTEST');
                if (option.optionId === recommendedId) tags.push('RECOMMENDED');

                return {
                    ...option,
                    rankScore: Number(rankScore.toFixed(4)),
                    tags,
                };
            })
            .sort((a, b) => b.rankScore - a.rankScore);

        // Add recommendation reason to the top option (the recommended one)
        const topOption = rankedOptions.find((opt) => opt.tags.includes('RECOMMENDED'));
        if (topOption) {
            const perf = topOption.performanceMetrics;

            if (topOption.tags.includes('CHEAPEST') && perf && perf.deliverySuccessRate > 90) {
                topOption.recommendationReason = 'Best price with reliable delivery';
            } else if (topOption.tags.includes('FASTEST')) {
                topOption.recommendationReason = 'Fastest delivery option';
            } else if (perf && perf.rtoRate < 8) {
                topOption.recommendationReason = 'Most reliable for this route';
            } else {
                topOption.recommendationReason = 'Best overall balance';
            }
        }

        return rankedOptions;
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
void QuoteEngineService;

export default new QuoteEngineService();
