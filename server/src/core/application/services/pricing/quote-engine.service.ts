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
import { NormalizedRateResult, PricingConfidence } from '../../../../infrastructure/external/couriers/base/normalized-pricing.types';
import ServiceLevelPricingMetricsService from '../metrics/service-level-pricing-metrics.service';

type Provider = 'velocity' | 'delhivery' | 'ekart';

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

type RankedOption = {
    optionId: string;
    provider: Provider;
    serviceId?: mongoose.Types.ObjectId;
    serviceName: string;
    chargeableWeight: number;
    zone?: string;
    quotedAmount: number;
    costAmount: number;
    estimatedMargin: number;
    estimatedMarginPercent: number;
    eta?: {
        minDays?: number;
        maxDays?: number;
        estimatedDeliveryDate?: Date;
    };
    pricingSource: 'live' | 'table' | 'hybrid';
    confidence: PricingConfidence;
    rankScore: number;
    tags: string[];
};

class QuoteEngineService {
    async generateQuotes(input: QuoteEngineInput) {
        const startedAt = Date.now();
        let providerEntries: Provider[] = [];
        const providerTimeouts: Record<Provider, boolean> = {} as Record<Provider, boolean>;

        const companyObjectId = new mongoose.Types.ObjectId(input.companyId);
        const sellerObjectId = new mongoose.Types.ObjectId(input.sellerId);

        try {
            const policy = await SellerCourierPolicy.findOne({
                companyId: companyObjectId,
                sellerId: sellerObjectId,
                isActive: true,
            }).lean();

            let services = await CourierService.find({
                companyId: companyObjectId,
                status: 'active',
                isDeleted: false,
            }).lean();

            services = this.applyPolicyFilters(services, policy || undefined);

            if (!services.length) {
                throw new AppError('No active courier services available for seller policy', ErrorCode.BIZ_NOT_FOUND, 404);
            }

            const groupedByProvider = services.reduce((acc, service) => {
                const provider = service.provider as Provider;
                if (!acc[provider]) acc[provider] = [];
                acc[provider].push(service);
                return acc;
            }, {} as Record<Provider, any[]>);

            const options: RankedOption[] = [];
            providerEntries = Object.keys(groupedByProvider) as Provider[];

            const providerResults = await Promise.all(providerEntries.map(async (provider) => {
                const providerServices = groupedByProvider[provider];
                try {
                    const providerOptions = await this.withTimeout(
                        this.buildProviderOptions(provider, providerServices, input),
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
                    return { provider, providerOptions: [] as RankedOption[] };
                }
            }));

            for (const result of providerResults) {
                options.push(...result.providerOptions);
            }

            if (!options.length) {
                throw new AppError('No quote options could be generated', ErrorCode.VAL_PINCODE_NOT_SERVICEABLE, 422);
            }

            const ranked = this.rankOptions(options, policy?.autoPriority || 'balanced', policy?.balancedDeltaPercent ?? 5);
            const selectionMode = policy?.selectionMode || 'manual_with_recommendation';

            let recommendation = ranked.find((option) => option.tags.includes('RECOMMENDED'))?.optionId || ranked[0]?.optionId;
            if (selectionMode === 'manual_only') {
                recommendation = undefined;
                ranked.forEach((option) => {
                    option.tags = option.tags.filter((tag) => tag !== 'RECOMMENDED');
                });
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
                fallbackOptionsCount: ranked.filter((item) => item.pricingSource !== 'live').length,
                confidence,
            });

            return {
                sessionId: String(session._id),
                expiresAt: session.expiresAt,
                options: session.options,
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

    async selectOption(companyId: string, sellerId: string, sessionId: string, optionId: string) {
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
            throw new AppError('Selected option not found in quote session', ErrorCode.RES_NOT_FOUND, 404);
        }

        session.selectedOptionId = optionId;
        await session.save();

        return {
            sessionId: String(session._id),
            selectedOptionId: optionId,
        };
    }

    async getSelectedOption(companyId: string, sellerId: string, sessionId: string, requestedOptionId?: string) {
        const session = await QuoteSession.findOne({
            _id: sessionId,
            companyId,
            sellerId,
        }).lean();

        if (!session) {
            throw new AppError('Quote session not found', ErrorCode.RES_NOT_FOUND, 404);
        }

        if (session.expiresAt < new Date()) {
            throw new AppError('Quote session expired', ErrorCode.BIZ_INVALID_STATE, 410);
        }

        const selectedId = requestedOptionId || session.selectedOptionId;
        if (!selectedId) {
            throw new AppError('No quote option selected', ErrorCode.VAL_INVALID_INPUT, 400);
        }

        const option = session.options.find((item) => item.optionId === selectedId);
        if (!option) {
            throw new AppError('Selected option not found in session', ErrorCode.RES_NOT_FOUND, 404);
        }

        return {
            session,
            option,
        };
    }

    private applyPolicyFilters(services: any[], policy?: any) {
        if (!policy) {
            return services;
        }

        return services.filter((service) => {
            if (policy.allowedProviders?.length && !policy.allowedProviders.includes(service.provider)) {
                return false;
            }
            if (policy.blockedProviders?.length && policy.blockedProviders.includes(service.provider)) {
                return false;
            }
            if (policy.allowedServiceIds?.length) {
                const allowed = policy.allowedServiceIds.map((id: any) => id.toString());
                if (!allowed.includes(service._id.toString())) {
                    return false;
                }
            }
            if (policy.blockedServiceIds?.length) {
                const blocked = policy.blockedServiceIds.map((id: any) => id.toString());
                if (blocked.includes(service._id.toString())) {
                    return false;
                }
            }
            return true;
        });
    }

    private async buildProviderOptions(provider: Provider, services: any[], input: QuoteEngineInput): Promise<RankedOption[]> {
        const providerKey = PROVIDER_TO_FACTORY_KEY[provider];
        const providerClient = await CourierFactory.getProvider(providerKey, new mongoose.Types.ObjectId(input.companyId));

        let serviceable = true;
        let zone: string | undefined;
        let defaultConfidence: PricingConfidence = 'high';

        if (provider === 'ekart' && (providerClient as any).getLaneServiceability) {
            const laneResult = await (providerClient as any).getLaneServiceability({
                pickupPincode: input.fromPincode,
                dropPincode: input.toPincode,
                weight: input.weight,
                paymentMode: input.paymentMode,
            });
            serviceable = !!laneResult.serviceable;
            zone = laneResult.zone;
            defaultConfidence = laneResult.confidence;
        } else {
            serviceable = await providerClient.checkServiceability(input.toPincode, 'delivery');
            defaultConfidence = 'medium';
        }

        if (!serviceable) {
            return [];
        }

        const rateResults = await providerClient.getRates({
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
        }).catch((error) => {
            logger.warn('Provider live rate failed, switching to table fallback', {
                provider,
                error: error instanceof Error ? error.message : error,
            });
            return [];
        });

        const liveRateAmount = rateResults?.[0]?.total || 0;
        const liveRateZone = rateResults?.[0]?.zone || zone;

        const options: RankedOption[] = [];
        for (const service of services) {
            if (!this.isServiceEligibleForRequest(service, input, liveRateZone)) {
                continue;
            }

            const cost = await this.resolveCost(provider, service._id, input.weight, liveRateAmount, liveRateZone, defaultConfidence);
            const sell = await this.resolveSell(service._id, input.weight, cost.amount, liveRateZone);
            const estimatedMargin = sell.amount - cost.amount;
            const estimatedMarginPercent = sell.amount > 0 ? (estimatedMargin / sell.amount) * 100 : 0;

            options.push({
                optionId: `opt-${provider}-${service._id.toString()}`,
                provider,
                serviceId: service._id,
                serviceName: service.displayName,
                chargeableWeight: input.weight,
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
            });
        }

        return options;
    }

    private isServiceEligibleForRequest(service: any, input: QuoteEngineInput, routeZone?: string): boolean {
        const constraints = service?.constraints || {};
        const minWeightKg = Number(constraints?.minWeightKg || 0);
        const maxWeightKg = Number(constraints?.maxWeightKg || 0);
        const maxCodValue = Number(constraints?.maxCodValue || 0);
        const maxPrepaidValue = Number(constraints?.maxPrepaidValue || 0);
        const paymentModes = Array.isArray(constraints?.paymentModes) ? constraints.paymentModes : [];
        const supportedZones = Array.isArray(service?.zoneSupport) ? service.zoneSupport : [];

        if (minWeightKg > 0 && input.weight < minWeightKg) {
            return false;
        }

        if (maxWeightKg > 0 && input.weight > maxWeightKg) {
            return false;
        }

        if (input.paymentMode === 'cod' && maxCodValue > 0 && input.orderValue > maxCodValue) {
            return false;
        }

        if (input.paymentMode === 'prepaid' && maxPrepaidValue > 0 && input.orderValue > maxPrepaidValue) {
            return false;
        }

        if (paymentModes.length && !paymentModes.includes(input.paymentMode)) {
            return false;
        }

        if (supportedZones.length > 0) {
            const normalized = supportedZones
                .map((zone: string) => this.normalizeZoneKey(zone))
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

    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, provider: Provider): Promise<T> {
        let timer: NodeJS.Timeout | null = null;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                reject(new AppError(`Provider ${provider} quote timed out`, ErrorCode.SYS_INTERNAL_ERROR, 504));
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
        weight: number,
        liveRateAmount: number,
        zone: string | undefined,
        defaultConfidence: PricingConfidence
    ): Promise<NormalizedRateResult> {
        const card = await ServiceRateCard.findOne({
            serviceId,
            cardType: 'cost',
            status: 'active',
            isDeleted: false,
            'effectiveDates.startDate': { $lte: new Date() },
            $or: [
                { 'effectiveDates.endDate': { $exists: false } },
                { 'effectiveDates.endDate': { $gte: new Date() } },
            ],
        }).lean();

        if (card) {
            if ((card.sourceMode === 'LIVE_API' || card.sourceMode === 'HYBRID') && liveRateAmount > 0) {
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
                };
            }

            const tableAmount = this.calculateFromCard(card, weight, zone);
            return {
                provider,
                amount: tableAmount,
                currency: 'INR',
                source: card.sourceMode === 'HYBRID' ? 'hybrid' : 'table',
                confidence: 'medium',
                zone,
                breakdown: {
                    freight: tableAmount,
                    total: tableAmount,
                },
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
            };
        }

        return {
            provider,
            amount: Math.max(50, weight * 20),
            currency: 'INR',
            source: 'table',
            confidence: 'low',
            zone,
            breakdown: {
                freight: Math.max(50, weight * 20),
                total: Math.max(50, weight * 20),
            },
        };
    }

    private async resolveSell(serviceId: mongoose.Types.ObjectId, weight: number, fallbackFromCost: number, zone: string | undefined) {
        const card = await ServiceRateCard.findOne({
            serviceId,
            cardType: 'sell',
            status: 'active',
            isDeleted: false,
            'effectiveDates.startDate': { $lte: new Date() },
            $or: [
                { 'effectiveDates.endDate': { $exists: false } },
                { 'effectiveDates.endDate': { $gte: new Date() } },
            ],
        }).lean();

        if (!card) {
            return {
                amount: fallbackFromCost * 1.1,
                source: 'table' as const,
            };
        }

        return {
            amount: this.calculateFromCard(card, weight, zone),
            source: card.sourceMode === 'LIVE_API' ? 'live' as const : card.sourceMode === 'HYBRID' ? 'hybrid' as const : 'table' as const,
        };
    }

    private calculateFromCard(card: any, weight: number, zone: string | undefined): number {
        const zoneRules = card.zoneRules || [];
        const normalizedZone = this.normalizeZoneKey(zone);
        const selectedZoneRule = zoneRules.find(
            (rule: any) => this.normalizeZoneKey(rule.zoneKey) === normalizedZone
        ) || zoneRules[0];

        if (!selectedZoneRule) {
            return Math.max(50, weight * 20);
        }

        const slab = (selectedZoneRule.slabs || []).find((item: any) => weight >= Number(item.minKg) && weight <= Number(item.maxKg));
        if (slab) {
            return Number(slab.charge || 0);
        }

        const lastSlab = (selectedZoneRule.slabs || [])[selectedZoneRule.slabs.length - 1];
        if (!lastSlab) {
            return Math.max(50, weight * 20);
        }

        const extraWeight = Math.max(0, weight - Number(lastSlab.maxKg || 0));
        const roundingUnitKg = Number(card?.calculation?.roundingUnitKg || 1);
        const roundingMode = card?.calculation?.roundingMode || 'ceil';
        const extraWeightUnits = roundingUnitKg > 0 ? (extraWeight / roundingUnitKg) : extraWeight;

        let roundedUnits = extraWeightUnits;
        if (roundingMode === 'ceil') roundedUnits = Math.ceil(extraWeightUnits);
        if (roundingMode === 'floor') roundedUnits = Math.floor(extraWeightUnits);
        if (roundingMode === 'nearest') roundedUnits = Math.round(extraWeightUnits);

        const roundedExtraWeight = Math.max(0, roundedUnits) * Math.max(roundingUnitKg, 0);
        const extraCharge = roundedExtraWeight * Number(selectedZoneRule.additionalPerKg || 0);
        return Number(lastSlab.charge || 0) + extraCharge;
    }

    private normalizeZoneKey(zone?: string): string | null {
        const raw = String(zone || '').trim().toLowerCase();
        if (!raw) return null;
        if (raw === 'all') return 'all';
        if (raw.startsWith('zone_')) return `zone${raw.replace('zone_', '')}`;
        if (/^zone[a-e]$/.test(raw)) return raw;
        if (/^[a-e]$/.test(raw)) return `zone${raw}`;
        if (raw.endsWith('_a') || raw.endsWith('_b') || raw.endsWith('_c') || raw.endsWith('_d') || raw.endsWith('_e')) {
            const zoneChar = raw.charAt(raw.length - 1);
            return `zone${zoneChar}`;
        }
        return null;
    }

    private rankOptions(options: RankedOption[], priority: 'price' | 'speed' | 'balanced', balancedDeltaPercent: number): RankedOption[] {
        const cheapest = [...options].sort((a, b) => a.quotedAmount - b.quotedAmount)[0];
        const fastest = [...options].sort((a, b) => (a.eta?.maxDays || 999) - (b.eta?.maxDays || 999))[0];

        const recommendedId = this.pickRecommendedOption(options, priority, balancedDeltaPercent).optionId;

        return options
            .map((option) => {
                const priceRank = cheapest.quotedAmount > 0 && option.quotedAmount > 0 ? cheapest.quotedAmount / option.quotedAmount : 0;
                const speedRank = fastest?.eta?.maxDays ? fastest.eta.maxDays / (option.eta?.maxDays || 999) : 0;
                option.rankScore = Number((priceRank * 0.6 + speedRank * 0.4).toFixed(4));
                option.tags = [];
                if (option.optionId === cheapest.optionId) option.tags.push('CHEAPEST');
                if (fastest && option.optionId === fastest.optionId) option.tags.push('FASTEST');
                if (option.optionId === recommendedId) option.tags.push('RECOMMENDED');
                return option;
            })
            .sort((a, b) => b.rankScore - a.rankScore);
    }

    private pickRecommendedOption(options: RankedOption[], priority: 'price' | 'speed' | 'balanced', balancedDeltaPercent: number) {
        if (priority === 'price') {
            return [...options].sort((a, b) => a.quotedAmount - b.quotedAmount)[0];
        }

        if (priority === 'speed') {
            return [...options].sort((a, b) => (a.eta?.maxDays || 999) - (b.eta?.maxDays || 999))[0];
        }

        const cheapest = [...options].sort((a, b) => a.quotedAmount - b.quotedAmount)[0];
        const fastest = [...options].sort((a, b) => (a.eta?.maxDays || 999) - (b.eta?.maxDays || 999))[0];
        const threshold = cheapest.quotedAmount * (1 + balancedDeltaPercent / 100);
        return fastest.quotedAmount <= threshold ? fastest : cheapest;
    }
}

export default new QuoteEngineService();
