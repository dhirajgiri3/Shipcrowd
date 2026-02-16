import { Request, Response } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import CourierProviderRegistry, {
    CanonicalCourierProvider,
} from '../../../../core/application/services/courier/courier-provider-registry';
import { CourierFactory } from '../../../../core/application/services/courier/courier.factory';
import {
    CourierService,
    Integration,
    Shipment,
} from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import asyncHandler from '../../../../shared/utils/asyncHandler';
import { parseQueryDateRange } from '../../../../shared/utils/dateRange';
import { decryptData, encryptData } from '../../../../shared/utils/encryption';

const SUPPORTED_PROVIDERS = CourierProviderRegistry.getSupportedProviders();
type SupportedProvider = CanonicalCourierProvider;
const ACTIVE_SHIPMENT_STATUSES = [
    'picked',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'PICKED',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
];
const DELIVERED_SHIPMENT_STATUSES = ['delivered', 'DELIVERED'];
const RTO_SHIPMENT_STATUSES = ['rto', 'returned', 'rto_delivered', 'return_initiated', 'RTO', 'RETURNED', 'RTO_DELIVERED', 'RETURN_INITIATED'];
const NDR_SHIPMENT_STATUSES = ['ndr', 'NDR'];
const SLA_MIN_SAMPLE_SIZE = Number(process.env.COURIER_SLA_MIN_SAMPLE_SIZE || 10);
const DELHIVERY_BASE_URL_FALLBACK = process.env.DELHIVERY_BASE_URL || 'https://staging-express.delhivery.com';
const DELHIVERY_TOKEN_ERROR_PATTERNS = [
    'login or api key required',
    'authentication credentials were not provided',
    'unauthorized client/user',
    'invalid token',
];

function resolveCourierConfigScope(req: Request): string | null {
    const role = String((req as any).user?.role || '');
    const isPlatformAdmin = role === 'admin' || role === 'super_admin';
    const queryCompanyId = typeof req.query?.companyId === 'string' ? req.query.companyId.trim() : '';
    const bodyCompanyId = typeof (req.body as any)?.companyId === 'string' ? String((req.body as any).companyId).trim() : '';
    const requestedCompanyId = queryCompanyId || bodyCompanyId;

    if (isPlatformAdmin) {
        if (requestedCompanyId) {
            throw new ValidationError('companyId is not allowed for platform courier endpoints');
        }
        return null;
    }

    const authCompanyId = String((req as any).user?.companyId || '').trim();
    if (!authCompanyId) {
        throw new ValidationError('Company ID required');
    }
    return authCompanyId;
}

function normalizeProvider(id: string): string {
    return CourierProviderRegistry.normalize(id);
}
void normalizeProvider;

function formatProviderName(provider: string): string {
    return CourierProviderRegistry.getLabel(provider);
}

function isServiceActive(service: any): boolean {
    return service.status === 'active';
}

function toIntegrationProvider(provider: string): string {
    return CourierProviderRegistry.getIntegrationProvider(provider);
}

function integrationInsertFields(companyId: string | null, _provider: string) {
    return { companyId, type: 'courier', isDeleted: false };
}

function integrationProviderPatch(provider: string) {
    return CourierProviderRegistry.buildIntegrationPatch(provider);
}

function buildIntegrationQuery(companyId: string | null, provider: string) {
    return {
        companyId,
        type: 'courier',
        isDeleted: false,
        ...CourierProviderRegistry.buildIntegrationMatch(provider),
    };
}

function toSupportedProvider(provider: string): SupportedProvider | null {
    return CourierProviderRegistry.toCanonical(provider) as SupportedProvider | null;
}

function requireSupportedProvider(provider: string): SupportedProvider {
    const supported = toSupportedProvider(provider);
    if (!supported) {
        throw new NotFoundError('Courier');
    }
    return supported;
}

function buildCarrierCandidates(provider: SupportedProvider): string[] {
    return CourierProviderRegistry.getCarrierCandidates(provider);
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function encodeCredential(value: unknown): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
        return normalized;
    }
    return encryptData(normalized);
}

function decodeCredential(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim();
    if (!normalized) {
        return undefined;
    }

    let decoded = normalized;
    for (let i = 0; i < 2; i += 1) {
        try {
            decoded = decryptData(decoded).trim();
        } catch {
            break;
        }
    }

    return decoded || normalized;
}

function normalizeBaseUrl(value?: string | null): string {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return DELHIVERY_BASE_URL_FALLBACK;
    }
    return normalized.replace(/\/+$/, '');
}

function hasDelhiveryAuthError(payload: unknown): boolean {
    const text = typeof payload === 'string'
        ? payload.toLowerCase()
        : JSON.stringify(payload || {}).toLowerCase();
    return DELHIVERY_TOKEN_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
}

async function validateDelhiveryApiKeyOrThrow(params: {
    apiKey: string;
    baseUrl: string;
}): Promise<void> {
    const apiKey = String(params.apiKey || '').trim();
    if (!apiKey) {
        throw new ValidationError('Delhivery API token is required');
    }

    const baseUrl = normalizeBaseUrl(params.baseUrl);

    try {
        const response = await axios.get(`${baseUrl}/c/api/pin-codes/json/`, {
            headers: {
                Authorization: `Token ${apiKey}`,
                Accept: 'application/json',
            },
            params: { filter_codes: '110001' },
            timeout: 10000,
        });

        if (hasDelhiveryAuthError(response.data)) {
            throw new ValidationError('Invalid Delhivery API token');
        }
    } catch (error: any) {
        if (error instanceof ValidationError) {
            throw error;
        }

        const status = Number(error?.response?.status || 0);
        const body = error?.response?.data;
        if (status === 401 || status === 403 || hasDelhiveryAuthError(body)) {
            throw new ValidationError('Invalid Delhivery API token');
        }

        throw new ValidationError(
            'Unable to verify Delhivery API token. Please try again after checking Delhivery connectivity.'
        );
    }
}

function buildShipmentMatch(companyId: string | null, provider: SupportedProvider) {
    const carrierRegexes = buildCarrierCandidates(provider).map(
        (candidate) => new RegExp(`^${escapeRegExp(candidate)}$`, 'i')
    );
    const carrierClauses = carrierRegexes.map((regex) => ({ carrier: regex }));
    const providerClauses = carrierRegexes.map((regex) => ({ 'shippingDetails.provider': regex }));

    const match: Record<string, unknown> = {
        $or: [...carrierClauses, ...providerClauses],
        isDeleted: false,
    };

    if (companyId) {
        match.companyId = new mongoose.Types.ObjectId(companyId);
    }

    return match;
}

async function getActiveShipmentsCount(companyId: string | null, provider: SupportedProvider): Promise<number> {
    const match = buildShipmentMatch(companyId, provider);
    return Shipment.countDocuments({
        ...match,
        currentStatus: { $in: ACTIVE_SHIPMENT_STATUSES },
    });
}

async function getSlaComplianceForWindow(
    companyId: string | null,
    provider: SupportedProvider,
    windowStart: Date
): Promise<number | null> {
    const match = buildShipmentMatch(companyId, provider);
    const deliveredShipments = await Shipment.find({
        ...match,
        currentStatus: { $in: DELIVERED_SHIPMENT_STATUSES },
        estimatedDelivery: { $exists: true, $ne: null },
        actualDelivery: { $exists: true, $ne: null, $gte: windowStart },
    })
        .select('estimatedDelivery actualDelivery')
        .lean();

    if (deliveredShipments.length < SLA_MIN_SAMPLE_SIZE) {
        return null;
    }

    const onTime = deliveredShipments.filter((shipment: any) => {
        const estimated = new Date(shipment.estimatedDelivery);
        const actual = new Date(shipment.actualDelivery);
        return actual.getTime() <= estimated.getTime();
    }).length;

    return Number(((onTime / deliveredShipments.length) * 100).toFixed(2));
}

async function getSlaCompliance(companyId: string | null, provider: SupportedProvider): Promise<{
    today: number | null;
    week: number | null;
    month: number | null;
}> {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);

    const [today, week, month] = await Promise.all([
        getSlaComplianceForWindow(companyId, provider, dayStart),
        getSlaComplianceForWindow(companyId, provider, weekStart),
        getSlaComplianceForWindow(companyId, provider, monthStart),
    ]);

    return { today, week, month };
}

function normalizeServiceType(value?: string): string | null {
    if (!value) return null;
    const normalized = String(value).trim().toLowerCase();
    return normalized || null;
}

function resolveServiceTypeAliases(serviceType: string): string[] {
    const normalized = serviceType.trim().toLowerCase();
    if (!normalized) return [];
    if (normalized === 'standard') return ['standard', 'surface'];
    if (normalized === 'surface') return ['surface', 'standard'];
    if (normalized === 'economy') return ['economy', 'standard', 'surface'];
    if (normalized === 'express') return ['express'];
    return [normalized];
}

function resolveZoneAliases(zone: string): string[] {
    const normalized = zone.trim().toUpperCase();
    if (!normalized) return [];
    if (normalized === 'LOCAL') return ['LOCAL', 'ZONEA'];
    if (normalized === 'REGIONAL') return ['REGIONAL', 'ZONEB'];
    if (normalized === 'NATIONAL') return ['NATIONAL', 'ZONEC'];
    return [normalized];
}

function normalizeProviderFromCarrier(carrier: string): SupportedProvider | null {
    const value = String(carrier || '').toLowerCase();
    if (value.includes('velocity') || value.includes('shipfast')) return 'velocity';
    if (value.includes('delhivery')) return 'delhivery';
    if (value.includes('ekart')) return 'ekart';
    return null;
}

async function buildPerformanceFromShipments(params: {
    companyId: string | null;
    provider: SupportedProvider;
    startDate?: string;
    endDate?: string;
    zone?: string;
    serviceType?: string;
}) {
    const parsedRange = parseQueryDateRange(params.startDate, params.endDate);
    const startDate = parsedRange.startDate;
    const endDate = parsedRange.endDate;
    const normalizedZone = params.zone ? String(params.zone).toUpperCase() : null;
    const normalizedServiceType = normalizeServiceType(params.serviceType || '');

    const match: Record<string, unknown> = buildShipmentMatch(params.companyId, params.provider);
    if (startDate || endDate) {
        const createdAtFilter: Record<string, Date> = {};
        if (startDate) createdAtFilter.$gte = startDate;
        if (endDate) createdAtFilter.$lte = endDate;
        match.createdAt = createdAtFilter;
    }
    if (normalizedServiceType) {
        const aliases = resolveServiceTypeAliases(normalizedServiceType);
        const regexes = aliases.map((value) => new RegExp(`^${escapeRegExp(value)}$`, 'i'));
        match.serviceType = { $in: regexes };
    }
    if (normalizedZone) {
        const zoneAliases = resolveZoneAliases(normalizedZone);
        const zoneRegexes = zoneAliases.map((value) => new RegExp(`^${escapeRegExp(value)}$`, 'i'));
        match['pricingDetails.selectedQuote.zone'] = { $in: zoneRegexes };
    }

    const shipments = await Shipment.find(match)
        .select('currentStatus createdAt actualDelivery serviceType pricingDetails paymentDetails')
        .lean();

    const totalShipments = shipments.length;
    const deliveredShipments = shipments.filter((shipment: any) =>
        DELIVERED_SHIPMENT_STATUSES.includes(String(shipment.currentStatus))
    );
    const deliveredCount = deliveredShipments.length;
    const rtoCount = shipments.filter((shipment: any) =>
        RTO_SHIPMENT_STATUSES.includes(String(shipment.currentStatus))
    ).length;
    const ndrCount = shipments.filter((shipment: any) =>
        NDR_SHIPMENT_STATUSES.includes(String(shipment.currentStatus))
    ).length;

    const successRate = totalShipments > 0 ? (deliveredCount / totalShipments) * 100 : 0;
    const rtoPercentage = totalShipments > 0 ? (rtoCount / totalShipments) * 100 : 0;
    const ndrPercentage = totalShipments > 0 ? (ndrCount / totalShipments) * 100 : 0;

    const deliveryHours = deliveredShipments
        .filter((shipment: any) => shipment.actualDelivery && shipment.createdAt)
        .map((shipment: any) => {
            const createdAt = new Date(shipment.createdAt).getTime();
            const deliveredAt = new Date(shipment.actualDelivery).getTime();
            return Math.max(0, (deliveredAt - createdAt) / (1000 * 60 * 60));
        });
    const avgDeliveryTime =
        deliveryHours.length > 0
            ? deliveryHours.reduce((sum, value) => sum + value, 0) / deliveryHours.length
            : 0;

    const shipmentCosts = shipments
        .map((shipment: any) =>
            Number(
                shipment.pricingDetails?.totalPrice ??
                shipment.paymentDetails?.shippingCost ??
                0
            )
        )
        .filter((value: number) => Number.isFinite(value));
    const costPerShipment =
        shipmentCosts.length > 0
            ? shipmentCosts.reduce((sum, value) => sum + value, 0) / shipmentCosts.length
            : 0;

    const zoneMap = new Map<
        string,
        { total: number; delivered: number; totalHours: number; deliveredWithHours: number }
    >();
    shipments.forEach((shipment: any) => {
        const zone = String(shipment.pricingDetails?.selectedQuote?.zone || 'UNKNOWN').toUpperCase();
        const status = String(shipment.currentStatus);
        const entry = zoneMap.get(zone) || {
            total: 0,
            delivered: 0,
            totalHours: 0,
            deliveredWithHours: 0,
        };
        entry.total += 1;
        if (DELIVERED_SHIPMENT_STATUSES.includes(status)) {
            entry.delivered += 1;
            if (shipment.actualDelivery && shipment.createdAt) {
                const createdAt = new Date(shipment.createdAt).getTime();
                const deliveredAt = new Date(shipment.actualDelivery).getTime();
                entry.totalHours += Math.max(0, (deliveredAt - createdAt) / (1000 * 60 * 60));
                entry.deliveredWithHours += 1;
            }
        }
        zoneMap.set(zone, entry);
    });

    const zonePerformance = Array.from(zoneMap.entries()).map(([zone, entry]) => ({
        zone,
        successRate: entry.total > 0 ? Number(((entry.delivered / entry.total) * 100).toFixed(2)) : 0,
        avgDeliveryTime:
            entry.deliveredWithHours > 0
                ? Number((entry.totalHours / entry.deliveredWithHours).toFixed(2))
                : 0,
        totalShipments: entry.total,
        deliveredShipments: entry.delivered,
    }));

    const dailyBuckets = new Map<
        string,
        { total: number; delivered: number; totalHours: number; deliveredWithHours: number }
    >();
    shipments.forEach((shipment: any) => {
        const bucketDate = new Date(shipment.createdAt).toISOString().split('T')[0];
        const status = String(shipment.currentStatus);
        const entry = dailyBuckets.get(bucketDate) || {
            total: 0,
            delivered: 0,
            totalHours: 0,
            deliveredWithHours: 0,
        };
        entry.total += 1;
        if (DELIVERED_SHIPMENT_STATUSES.includes(status)) {
            entry.delivered += 1;
            if (shipment.actualDelivery && shipment.createdAt) {
                const createdAt = new Date(shipment.createdAt).getTime();
                const deliveredAt = new Date(shipment.actualDelivery).getTime();
                entry.totalHours += Math.max(0, (deliveredAt - createdAt) / (1000 * 60 * 60));
                entry.deliveredWithHours += 1;
            }
        }
        dailyBuckets.set(bucketDate, entry);
    });

    const timeSeriesData = Array.from(dailyBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, entry]) => ({
            date,
            successRate: entry.total > 0 ? Number(((entry.delivered / entry.total) * 100).toFixed(2)) : 0,
            shipments: entry.total,
            avgDeliveryTime:
                entry.deliveredWithHours > 0
                    ? Number((entry.totalHours / entry.deliveredWithHours).toFixed(2))
                    : 0,
        }));

    const rankingMatch: Record<string, unknown> = {
        isDeleted: false,
    };
    if (params.companyId) {
        rankingMatch.companyId = new mongoose.Types.ObjectId(params.companyId);
    }
    if (startDate || endDate) {
        const createdAtFilter: Record<string, Date> = {};
        if (startDate) createdAtFilter.$gte = startDate;
        if (endDate) createdAtFilter.$lte = endDate;
        rankingMatch.createdAt = createdAtFilter;
    }
    const rankingShipments = await Shipment.find(rankingMatch)
        .select('carrier shippingDetails.provider currentStatus')
        .lean();
    const providerStats = new Map<SupportedProvider, { total: number; delivered: number }>();
    rankingShipments.forEach((shipment: any) => {
        const provider = normalizeProviderFromCarrier(
            shipment.carrier || shipment.shippingDetails?.provider
        );
        if (!provider) return;
        const entry = providerStats.get(provider) || { total: 0, delivered: 0 };
        entry.total += 1;
        if (DELIVERED_SHIPMENT_STATUSES.includes(String(shipment.currentStatus))) {
            entry.delivered += 1;
        }
        providerStats.set(provider, entry);
    });
    const providerScores = Array.from(providerStats.entries()).map(([provider, entry]) => ({
        provider,
        successRate: entry.total > 0 ? (entry.delivered / entry.total) * 100 : 0,
    }));
    providerScores.sort((a, b) => b.successRate - a.successRate);
    const rankingIndex = providerScores.findIndex((item) => item.provider === params.provider);
    const ranking = rankingIndex >= 0 ? rankingIndex + 1 : providerScores.length + 1;
    const totalCouriers = Math.max(providerScores.length, 1);

    return {
        successRate: Number(successRate.toFixed(2)),
        avgDeliveryTime: Number(avgDeliveryTime.toFixed(2)),
        rtoPercentage: Number(rtoPercentage.toFixed(2)),
        ndrPercentage: Number(ndrPercentage.toFixed(2)),
        costPerShipment: Number(costPerShipment.toFixed(2)),
        totalShipments,
        deliveredShipments: deliveredCount,
        zonePerformance,
        timeSeriesData,
        ranking,
        totalCouriers,
    };
}

async function getProviderSnapshot(companyId: string | null, provider: string) {
    const supportedProvider = toSupportedProvider(provider);
    if (!supportedProvider) {
        return null;
    }

    const [services, integration, activeShipments, slaCompliance] = await Promise.all([
        CourierService.find({
            companyId,
            provider: supportedProvider,
            isDeleted: false,
        }).lean(),
        Integration.findOne(buildIntegrationQuery(companyId, supportedProvider)).lean(),
        getActiveShipmentsCount(companyId, supportedProvider),
        getSlaCompliance(companyId, supportedProvider),
    ]);

    const activeServices = services.filter(isServiceActive);
    const maxCod = services.reduce((max, service: any) => {
        return Math.max(max, Number(service.constraints?.maxCodValue || 0));
    }, 0);
    const maxWeight = services.reduce((max, service: any) => {
        return Math.max(max, Number(service.constraints?.maxWeightKg || 0));
    }, 0);

    const zoneSet = new Set<string>();
    const serviceNames: string[] = [];
    services.forEach((service: any) => {
        (service.zoneSupport || []).forEach((zone: string) => zoneSet.add(String(zone).toUpperCase()));
        serviceNames.push(service.serviceCode || service.displayName || service.serviceType);
    });

    const integrationActive = Boolean(integration?.settings?.isActive);
    const servicesActive = activeServices.length > 0;
    const isEnabled = integrationActive && servicesActive;
    const displayName = formatProviderName(supportedProvider);
    const credentialsConfigured =
        supportedProvider === 'velocity'
            ? Boolean(integration?.credentials?.username && integration?.credentials?.password)
            : supportedProvider === 'ekart'
                ? Boolean(
                    integration?.credentials?.clientId &&
                    integration?.credentials?.username &&
                    integration?.credentials?.password
                )
                : Boolean(integration?.credentials?.apiKey);
    const operationalStatus =
        !isEnabled ? 'DOWN' : credentialsConfigured ? 'OPERATIONAL' : 'DEGRADED';
    // For modal/UI: show integration active state when integration exists (so Activate toggle reflects saved state)
    const isActiveForDisplay = integration ? integrationActive : isEnabled;

    return {
        listItem: {
            id: supportedProvider,
            name: displayName,
            code: supportedProvider,
            logo: displayName.slice(0, 2).toUpperCase(),
            status: isEnabled ? 'active' : 'inactive',
            services: Array.from(new Set(serviceNames)),
            zones: Array.from(zoneSet),
            apiIntegrated: integrationActive,
            pickupEnabled: true,
            codEnabled: maxCod > 0,
            trackingEnabled: true,
            codLimit: maxCod,
            weightLimit: maxWeight,
            credentialsConfigured,
        },
        detail: {
            _id: supportedProvider,
            name: displayName,
            code: supportedProvider,
            apiEndpoint: integration?.settings?.baseUrl || '',
            isActive: isActiveForDisplay,
            operationalStatus,
            credentialsConfigured,
            activeShipments,
            slaCompliance,
            services: services.map((service: any) => ({
                _id: String(service._id),
                name: service.displayName,
                code: service.serviceCode,
                type: String(service.serviceType || 'standard').toUpperCase(),
                isActive: service.status === 'active',
            })),
            createdAt:
                services.reduce((min, service: any) => {
                    if (!min) return service.createdAt;
                    return new Date(service.createdAt) < new Date(min) ? service.createdAt : min;
                }, null as any) || integration?.createdAt || null,
            updatedAt:
                services.reduce((max, service: any) => {
                    if (!max) return service.updatedAt;
                    return new Date(service.updatedAt) > new Date(max) ? service.updatedAt : max;
                }, null as any) || integration?.updatedAt || null,
        },
    };
}

export class CourierController {
    getCouriers = asyncHandler(async (req: Request, res: Response) => {
        const companyId = resolveCourierConfigScope(req);
        const isPlatformAdmin = ['admin', 'super_admin'].includes(String((req as any).user?.role || ''));

        if (!companyId && isPlatformAdmin) {
            const snapshots = await Promise.all(
                SUPPORTED_PROVIDERS.map((provider) => getProviderSnapshot(null, provider))
            );
            const listItems = snapshots
                .filter((s): s is NonNullable<typeof s> => s !== null)
                .map((s) => s.listItem);
            res.status(200).json({
                success: true,
                data: listItems,
            });
            return;
        }

        const [services, integrations] = await Promise.all([
            CourierService.find({
                companyId,
                isDeleted: false,
            })
                .select('provider')
                .lean(),
            Integration.find({
                companyId,
                type: 'courier',
                isDeleted: false,
            })
                .select('provider platform')
                .lean(),
        ]);

        const discovered = new Set<string>(SUPPORTED_PROVIDERS);
        services.forEach((service: any) => {
            const provider = toSupportedProvider(service.provider);
            if (provider) discovered.add(provider);
        });
        integrations.forEach((integration: any) => {
            const provider = toSupportedProvider(integration.provider || integration.platform);
            if (provider) discovered.add(provider);
        });
        const providers = Array.from(discovered);

        const snapshots = await Promise.all(
            providers.map((provider) => getProviderSnapshot(companyId, provider))
        );

        res.status(200).json({
            success: true,
            data: snapshots.filter(Boolean).map((snapshot: any) => snapshot.listItem),
        });
    });

    getCourier = asyncHandler(async (req: Request, res: Response) => {
        const companyId = resolveCourierConfigScope(req);
        const isPlatformAdmin = ['admin', 'super_admin'].includes(String((req as any).user?.role || ''));
        const provider = requireSupportedProvider(req.params.id);

        if (!companyId && isPlatformAdmin) {
            const snapshot = await getProviderSnapshot(null, provider);
            if (!snapshot) {
                throw new NotFoundError('Courier');
            }
            res.status(200).json({
                success: true,
                data: snapshot.detail,
            });
            return;
        }

        const snapshot = await getProviderSnapshot(companyId, provider);
        if (!snapshot) {
            throw new NotFoundError('Courier');
        }

        res.status(200).json({
            success: true,
            data: snapshot.detail,
        });
    });

    updateCourier = asyncHandler(async (req: Request, res: Response) => {
        const companyId = resolveCourierConfigScope(req);
        const provider = requireSupportedProvider(req.params.id);
        const { name, apiEndpoint, apiKey, isActive, credentials } = req.body || {};
        const existingIntegration = await Integration.findOne(
            buildIntegrationQuery(companyId, provider)
        ).lean();

        if (provider === 'delhivery') {
            const requestApiKeyRaw = credentials?.apiKey ?? apiKey;
            const requestApiKey = typeof requestApiKeyRaw === 'string' ? requestApiKeyRaw.trim() : '';
            const existingApiKey = decodeCredential(existingIntegration?.credentials?.apiKey);
            const effectiveApiKey = requestApiKey || existingApiKey || '';
            const nextIsActive = typeof isActive === 'boolean'
                ? isActive
                : Boolean(existingIntegration?.settings?.isActive);
            const shouldValidate =
                nextIsActive &&
                (Boolean(requestApiKeyRaw) || typeof isActive === 'boolean');

            if (shouldValidate) {
                const baseUrl = normalizeBaseUrl(
                    typeof apiEndpoint === 'string' && apiEndpoint.trim()
                        ? apiEndpoint
                        : (existingIntegration as any)?.settings?.baseUrl
                );
                await validateDelhiveryApiKeyOrThrow({
                    apiKey: effectiveApiKey,
                    baseUrl,
                });
            }
        }

        if (typeof isActive === 'boolean') {
            await CourierService.updateMany(
                { companyId, provider, isDeleted: false },
                { $set: { status: isActive ? 'active' : 'inactive' } }
            );
        }

        if (typeof name === 'string' && name.trim().length > 0) {
            await Integration.updateOne(
                buildIntegrationQuery(companyId, provider),
                {
                    $set: {
                        ...integrationProviderPatch(provider),
                        'metadata.displayName': name.trim(),
                    },
                    $setOnInsert: integrationInsertFields(companyId, provider),
                },
                { upsert: true }
            );
        }

        const credentialPatch: Record<string, string> = {};
        if (provider === 'velocity') {
            if (credentials?.username) credentialPatch['credentials.username'] = encodeCredential(credentials.username);
            if (credentials?.password) credentialPatch['credentials.password'] = encodeCredential(credentials.password);
            if (apiKey || credentials?.apiKey) {
                credentialPatch['credentials.apiKey'] = encodeCredential(credentials?.apiKey || apiKey);
            }
        } else if (provider === 'delhivery') {
            if (apiKey || credentials?.apiKey) {
                credentialPatch['credentials.apiKey'] = encodeCredential(credentials?.apiKey || apiKey);
            }
        } else if (provider === 'ekart') {
            if (credentials?.clientId) credentialPatch['credentials.clientId'] = String(credentials.clientId);
            if (credentials?.username) credentialPatch['credentials.username'] = encodeCredential(credentials.username);
            if (credentials?.password) credentialPatch['credentials.password'] = encodeCredential(credentials.password);
        }

        if (apiEndpoint || Object.keys(credentialPatch).length || typeof isActive === 'boolean') {
            await Integration.updateOne(
                buildIntegrationQuery(companyId, provider),
                {
                    $set: {
                        ...integrationProviderPatch(provider),
                        ...(apiEndpoint ? { 'settings.baseUrl': String(apiEndpoint) } : {}),
                        ...(typeof isActive === 'boolean'
                            ? { 'settings.isActive': isActive }
                            : {}),
                        ...credentialPatch,
                    },
                    $setOnInsert: integrationInsertFields(companyId, provider),
                },
                { upsert: true }
            );
        }

        CourierFactory.clearCache(companyId, toIntegrationProvider(provider));
        if (provider === 'velocity') CourierFactory.clearCache(companyId, 'velocity');

        const snapshot = await getProviderSnapshot(companyId, provider);
        if (!snapshot) {
            throw new NotFoundError('Courier');
        }

        res.status(200).json({
            success: true,
            data: snapshot.detail,
        });
    });

    toggleStatus = asyncHandler(async (req: Request, res: Response) => {
        const companyId = resolveCourierConfigScope(req);
        const provider = requireSupportedProvider(req.params.id);

        const services = await CourierService.find({
            companyId,
            provider,
            isDeleted: false,
        }).lean();
        const integration = await Integration.findOne(
            buildIntegrationQuery(companyId, provider)
        ).lean();

        if (!services.length) {
            throw new NotFoundError('Courier');
        }

        const hasActiveServices = services.some(isServiceActive);
        const integrationActive = Boolean(integration?.settings?.isActive);
        const isCurrentlyEnabled = hasActiveServices && integrationActive;
        const nextStatus = isCurrentlyEnabled ? 'inactive' : 'active';

        await Promise.all([
            CourierService.updateMany(
                { companyId, provider, isDeleted: false },
                { $set: { status: nextStatus } }
            ),
            Integration.updateOne(
                buildIntegrationQuery(companyId, provider),
                {
                    $set: {
                        ...integrationProviderPatch(provider),
                        'settings.isActive': nextStatus === 'active',
                    },
                    $setOnInsert: integrationInsertFields(companyId, provider),
                },
                { upsert: true }
            ),
        ]);

        CourierFactory.clearCache(companyId, toIntegrationProvider(provider));
        if (provider === 'velocity') CourierFactory.clearCache(companyId, 'velocity');

        res.status(200).json({
            success: true,
            data: {
                id: provider,
                isActive: nextStatus === 'active',
                status: nextStatus,
            },
        });
    });

    getPerformance = asyncHandler(async (req: Request, res: Response) => {
        const provider = requireSupportedProvider(req.params.id);
        const companyId = resolveCourierConfigScope(req);
        if (!companyId) {
            return res.status(200).json({
                success: true,
                data: {
                    totalShipments: 0,
                    deliveredShipments: 0,
                    successRate: 0,
                    avgDeliveryTime: 0,
                    avgCost: 0,
                    costPerShipment: 0,
                    ndrCount: 0,
                    ndrPercentage: 0,
                    rtoCount: 0,
                    rtoPercentage: 0,
                    ranking: 0,
                    totalCouriers: 0,
                    trends: [],
                    zonePerformance: [],
                    serviceTypePerformance: [],
                    slaCompliance: { today: null, week: null, month: null },
                    activeShipments: 0,
                },
            });
        }
        const [activeShipments, slaCompliance, performance] = await Promise.all([
            getActiveShipmentsCount(companyId, provider),
            getSlaCompliance(companyId, provider),
            buildPerformanceFromShipments({
                companyId,
                provider,
                startDate: req.query.startDate as string | undefined,
                endDate: req.query.endDate as string | undefined,
                zone: req.query.zone as string | undefined,
                serviceType: req.query.serviceType as string | undefined,
            }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                ...performance,
                slaCompliance,
                activeShipments,
            },
        });
    });
}
