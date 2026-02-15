import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import CourierProviderRegistry from '../../../../core/application/services/courier/courier-provider-registry';
import { CourierService, Integration } from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import { calculatePagination, sendCreated, sendPaginated, sendSuccess } from '../../../../shared/utils/responseHelper';
import { createCourierServiceSchema, updateCourierServiceSchema } from '../../../../shared/validation/schemas';

const parseServiceTypeFromProvider = (provider: string): Array<'surface' | 'express' | 'air' | 'standard'> => {
    if (provider === 'delhivery') return ['surface', 'express'];
    if (provider === 'velocity') return ['surface', 'express'];
    return ['surface'];
};

export const listCourierServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
        const skip = (page - 1) * limit;

        const query: any = {
            companyId: auth.companyId,
            isDeleted: false,
        };

        if (req.query.provider) query.provider = req.query.provider;
        if (req.query.status) query.status = req.query.status;
        if (req.query.search) {
            const regex = { $regex: req.query.search, $options: 'i' };
            query.$or = [{ displayName: regex }, { serviceCode: regex }];
        }

        const [items, total] = await Promise.all([
            CourierService.find(query)
                .select('provider serviceCode providerServiceId displayName serviceType status zoneSupport constraints sla') // Only needed fields
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            CourierService.countDocuments(query),
        ]);

        // Add cache headers for better client-side caching
        res.set({
            'Cache-Control': 'private, max-age=300',
            'Vary': 'Authorization',
        });

        sendPaginated(res, items, calculatePagination(total, page, limit), 'Courier services retrieved');
    } catch (error) {
        logger.error('Error listing courier services:', error);
        next(error);
    }
};

export const createCourierService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = createCourierServiceSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const {
            provider,
            integrationId,
            serviceCode,
            providerServiceId,
            displayName,
            serviceType,
            constraints,
            sla,
            zoneSupport,
            source,
        } = validation.data;

        const normalizedProvider = CourierProviderRegistry.toCanonical(String(provider || ''));
        if (!normalizedProvider) {
            throw new ValidationError('Unsupported provider', ErrorCode.VAL_INVALID_INPUT);
        }

        const activeIntegration = integrationId
            ? await Integration.findOne({
                _id: integrationId,
                companyId: auth.companyId,
                type: 'courier',
                isDeleted: false,
            }).lean()
            : await Integration.findOne({
                companyId: auth.companyId,
                type: 'courier',
                'settings.isActive': true,
                isDeleted: false,
                ...CourierProviderRegistry.buildIntegrationMatch(normalizedProvider),
            }).lean();

        if (!activeIntegration) {
            throw new ValidationError('Active courier integration not found for provider', ErrorCode.RES_INTEGRATION_NOT_FOUND);
        }

        const service = await CourierService.create({
            companyId: auth.companyId,
            provider: normalizedProvider,
            integrationId: activeIntegration._id,
            serviceCode,
            providerServiceId,
            displayName,
            serviceType,
            constraints,
            sla,
            zoneSupport,
            source: source || 'manual',
            status: 'active',
            isDeleted: false,
        });

        sendCreated(res, service, 'Courier service created');
    } catch (error) {
        logger.error('Error creating courier service:', error);
        next(error);
    }
};

export const getCourierServiceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const item = await CourierService.findOne({
            _id: req.params.id,
            companyId: auth.companyId,
            isDeleted: false,
        }).lean();

        if (!item) {
            throw new NotFoundError('Courier service', ErrorCode.RES_NOT_FOUND);
        }

        sendSuccess(res, item, 'Courier service retrieved');
    } catch (error) {
        logger.error('Error getting courier service:', error);
        next(error);
    }
};

export const updateCourierService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = updateCourierServiceSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const updated = await CourierService.findOneAndUpdate(
            {
                _id: req.params.id,
                companyId: auth.companyId,
                isDeleted: false,
            },
            {
                $set: validation.data,
            },
            { new: true }
        ).lean();

        if (!updated) {
            throw new NotFoundError('Courier service', ErrorCode.RES_NOT_FOUND);
        }

        sendSuccess(res, updated, 'Courier service updated');
    } catch (error) {
        logger.error('Error updating courier service:', error);
        next(error);
    }
};

export const toggleCourierServiceStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const item = await CourierService.findOne({
            _id: req.params.id,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!item) {
            throw new NotFoundError('Courier service', ErrorCode.RES_NOT_FOUND);
        }

        item.status = item.status === 'active' ? 'inactive' : 'active';
        await item.save();

        sendSuccess(res, item, `Courier service ${item.status}`);
    } catch (error) {
        logger.error('Error toggling courier service status:', error);
        next(error);
    }
};

export const syncProviderServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const provider = String(req.params.provider || '').toLowerCase();
        const canonicalProvider = CourierProviderRegistry.toCanonical(provider);
        if (!canonicalProvider) {
            throw new ValidationError('Unsupported provider for sync', ErrorCode.VAL_INVALID_INPUT);
        }

        const integration = await Integration.findOne({
            companyId: auth.companyId,
            type: 'courier',
            'settings.isActive': true,
            ...CourierProviderRegistry.buildIntegrationMatch(canonicalProvider),
        }).lean();

        if (!integration) {
            throw new ValidationError('Active integration not found for provider', ErrorCode.RES_INTEGRATION_NOT_FOUND);
        }

        const serviceTypes = parseServiceTypeFromProvider(canonicalProvider);
        const createdIds: string[] = [];

        for (const serviceType of serviceTypes) {
            const code = `${canonicalProvider}-${serviceType}`.toUpperCase();
            const existing = await CourierService.findOne({
                companyId: auth.companyId,
                provider: canonicalProvider,
                serviceCode: code,
                isDeleted: false,
            }).lean();

            if (existing) continue;

            const created = await CourierService.create({
                companyId: new mongoose.Types.ObjectId(auth.companyId),
                provider: canonicalProvider,
                integrationId: integration._id,
                serviceCode: code,
                displayName: `${canonicalProvider.toUpperCase()} ${serviceType.toUpperCase()}`,
                serviceType,
                status: 'active',
                zoneSupport: ['A', 'B', 'C', 'D', 'E'],
                source: 'synced',
                isDeleted: false,
            });

            createdIds.push(String(created._id));
        }

        sendSuccess(
            res,
            {
                provider,
                canonicalProvider,
                createdCount: createdIds.length,
                createdIds,
            },
            'Provider services sync completed'
        );
    } catch (error) {
        logger.error('Error syncing provider services:', error);
        next(error);
    }
};

export const deleteCourierService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const item = await CourierService.findOneAndUpdate(
            {
                _id: req.params.id,
                companyId: auth.companyId,
                isDeleted: false,
            },
            {
                $set: { isDeleted: true },
            },
            { new: true }
        ).lean();

        if (!item) {
            throw new NotFoundError('Courier service', ErrorCode.RES_NOT_FOUND);
        }

        sendSuccess(res, null, 'Courier service deleted');
    } catch (error) {
        logger.error('Error deleting courier service:', error);
        next(error);
    }
};

export default {
    listCourierServices,
    createCourierService,
    getCourierServiceById,
    updateCourierService,
    toggleCourierServiceStatus,
    deleteCourierService,
    syncProviderServices,
};
