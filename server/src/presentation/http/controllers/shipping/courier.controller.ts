import { Request, Response } from 'express';
import mongoose from 'mongoose';
import asyncHandler from '../../../../shared/utils/asyncHandler';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import {
    Integration,
    CourierPerformance,
    CourierService,
} from '../../../../infrastructure/database/mongoose/models';
import { CourierFactory } from '../../../../core/application/services/courier/courier.factory';

const PROVIDER_LABELS: Record<string, string> = {
    velocity: 'Velocity',
    delhivery: 'Delhivery',
    ekart: 'Ekart',
};

function getCompanyId(req: Request): string {
    const companyId = (req as any).user?.companyId;
    if (!companyId) {
        throw new ValidationError('Company ID required');
    }
    return String(companyId);
}

function normalizeProvider(id: string): string {
    return String(id || '').trim().toLowerCase();
}

function formatProviderName(provider: string): string {
    return PROVIDER_LABELS[provider] || provider.toUpperCase();
}

function isServiceActive(service: any): boolean {
    return service.status === 'active';
}

function toIntegrationProvider(provider: string): string {
    return provider === 'velocity' ? 'velocity-shipfast' : provider;
}

async function getProviderSnapshot(companyId: string, provider: string) {
    const [services, integration] = await Promise.all([
        CourierService.find({
            companyId,
            provider,
            isDeleted: false,
        }).lean(),
        Integration.findOne({
            companyId,
            provider: toIntegrationProvider(provider),
            type: 'courier',
            isDeleted: false,
        }).lean(),
    ]);

    if (!services.length) {
        return null;
    }

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
    const displayName = formatProviderName(provider);

    return {
        listItem: {
            id: provider,
            name: displayName,
            code: provider,
            logo: displayName.slice(0, 2).toUpperCase(),
            status: activeServices.length > 0 ? 'active' : 'inactive',
            services: Array.from(new Set(serviceNames)),
            zones: Array.from(zoneSet),
            apiIntegrated: integrationActive,
            pickupEnabled: true,
            codEnabled: maxCod > 0,
            trackingEnabled: true,
            codLimit: maxCod,
            weightLimit: maxWeight,
        },
        detail: {
            _id: provider,
            name: displayName,
            code: provider,
            apiEndpoint: integration?.settings?.baseUrl || '',
            isActive: activeServices.length > 0,
            integrationStatus: integrationActive ? 'HEALTHY' : 'WARNING',
            activeShipments: 0,
            slaCompliance: {
                today: 100,
                week: 100,
                month: 100,
            },
            services: services.map((service: any) => ({
                _id: String(service._id),
                name: service.displayName,
                code: service.serviceCode,
                type: String(service.serviceType || 'standard').toUpperCase(),
                isActive: service.status === 'active',
            })),
            createdAt: services.reduce((min, service: any) => {
                if (!min) return service.createdAt;
                return new Date(service.createdAt) < new Date(min) ? service.createdAt : min;
            }, null as any),
            updatedAt: services.reduce((max, service: any) => {
                if (!max) return service.updatedAt;
                return new Date(service.updatedAt) > new Date(max) ? service.updatedAt : max;
            }, null as any),
        },
    };
}

export class CourierController {
    getCouriers = asyncHandler(async (req: Request, res: Response) => {
        const companyId = getCompanyId(req);

        const services = await CourierService.find({
            companyId,
            isDeleted: false,
        })
            .select('provider')
            .lean();

        const providers = Array.from(
            new Set(services.map((service: any) => normalizeProvider(service.provider)).filter(Boolean))
        );

        const snapshots = await Promise.all(
            providers.map((provider) => getProviderSnapshot(companyId, provider))
        );

        res.status(200).json({
            success: true,
            data: snapshots.filter(Boolean).map((snapshot: any) => snapshot.listItem),
        });
    });

    getCourier = asyncHandler(async (req: Request, res: Response) => {
        const companyId = getCompanyId(req);
        const provider = normalizeProvider(req.params.id);

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
        const companyId = getCompanyId(req);
        const provider = normalizeProvider(req.params.id);
        const { name, apiEndpoint, apiKey, isActive } = req.body || {};

        const services = await CourierService.find({
            companyId,
            provider,
            isDeleted: false,
        });

        if (!services.length) {
            throw new NotFoundError('Courier');
        }

        if (typeof isActive === 'boolean') {
            await CourierService.updateMany(
                { companyId, provider, isDeleted: false },
                { $set: { status: isActive ? 'active' : 'inactive' } }
            );
        }

        if (typeof name === 'string' && name.trim().length > 0) {
            await Integration.updateOne(
                {
                    companyId,
                    provider: toIntegrationProvider(provider),
                    type: 'courier',
                    isDeleted: false,
                },
                {
                    $set: {
                        'metadata.displayName': name.trim(),
                    },
                }
            );
        }

        if (apiEndpoint || apiKey || typeof isActive === 'boolean') {
            await Integration.updateOne(
                {
                    companyId,
                    provider: toIntegrationProvider(provider),
                    type: 'courier',
                    isDeleted: false,
                },
                {
                    $set: {
                        ...(apiEndpoint ? { 'settings.baseUrl': String(apiEndpoint) } : {}),
                        ...(apiKey ? { 'credentials.apiKey': String(apiKey) } : {}),
                        ...(typeof isActive === 'boolean'
                            ? { 'settings.isActive': isActive }
                            : {}),
                    },
                }
            );
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

    toggleStatus = asyncHandler(async (req: Request, res: Response) => {
        const companyId = getCompanyId(req);
        const provider = normalizeProvider(req.params.id);

        const services = await CourierService.find({
            companyId,
            provider,
            isDeleted: false,
        }).lean();

        if (!services.length) {
            throw new NotFoundError('Courier');
        }

        const hasActive = services.some(isServiceActive);
        const nextStatus = hasActive ? 'inactive' : 'active';

        await Promise.all([
            CourierService.updateMany(
                { companyId, provider, isDeleted: false },
                { $set: { status: nextStatus } }
            ),
            Integration.updateOne(
                {
                    companyId,
                    provider: toIntegrationProvider(provider),
                    type: 'courier',
                    isDeleted: false,
                },
                { $set: { 'settings.isActive': nextStatus === 'active' } }
            ),
        ]);

        res.status(200).json({
            success: true,
            data: {
                id: provider,
                isActive: nextStatus === 'active',
                status: nextStatus,
            },
        });
    });

    testConnection = asyncHandler(async (req: Request, res: Response) => {
        const provider = normalizeProvider(req.params.id);
        const companyId = getCompanyId(req);

        try {
            await CourierFactory.getProvider(
                toIntegrationProvider(provider),
                new mongoose.Types.ObjectId(companyId)
            );
            res.status(200).json({ success: true, message: 'Connection successful' });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error instanceof Error ? error.message : 'Connection failed',
            });
        }
    });

    getPerformance = asyncHandler(async (req: Request, res: Response) => {
        const provider = normalizeProvider(req.params.id);
        const companyId = getCompanyId(req);

        const performance = await CourierPerformance.findOne({
            courierId: provider,
            companyId,
        }).lean();

        if (!performance) {
            return res.status(200).json({
                success: true,
                data: {
                    courierId: provider,
                    overallMetrics: {
                        avgDeliveryDays: 0,
                        pickupSuccessRate: 0,
                        deliverySuccessRate: 0,
                        rtoRate: 0,
                        ndrRate: 0,
                        totalShipments: 0,
                        rating: 0,
                    },
                    trends: {
                        deliverySpeedTrend: 'stable',
                        reliabilityTrend: 'stable',
                        volumeTrend: 'stable',
                    },
                    slaCompliance: {
                        today: 100,
                        week: 100,
                        month: 100,
                    },
                    activeShipments: 0,
                },
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                ...performance,
                slaCompliance: {
                    today: 98,
                    week: 97,
                    month: 96,
                },
                activeShipments: performance.overallMetrics?.totalShipments || 0,
            },
        });
    });
}
