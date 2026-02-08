import { Request, Response, NextFunction } from 'express';
import { ServiceRateCard } from '../../../../infrastructure/database/mongoose/models';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { sendCreated, sendSuccess, sendPaginated, calculatePagination } from '../../../../shared/utils/responseHelper';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import {
    importServiceRateCardSchema,
    simulateServiceRateCardSchema,
    upsertServiceRateCardSchema,
} from '../../../../shared/validation/schemas';

const calculateSimulation = (card: any, weight: number, zoneKey: string): number => {
    const zoneRule = (card.zoneRules || []).find((rule: any) => String(rule.zoneKey).toLowerCase() === zoneKey.toLowerCase()) || card.zoneRules?.[0];
    if (!zoneRule) return 0;

    const slab = (zoneRule.slabs || []).find((s: any) => weight >= Number(s.minKg) && weight <= Number(s.maxKg));
    if (slab) return Number(slab.charge || 0);

    const lastSlab = (zoneRule.slabs || [])[zoneRule.slabs.length - 1];
    if (!lastSlab) return 0;

    const extraWeight = Math.max(0, weight - Number(lastSlab.maxKg || 0));
    return Number(lastSlab.charge || 0) + extraWeight * Number(zoneRule.additionalPerKg || 0);
};

export const listServiceRateCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
        const skip = (page - 1) * limit;

        const query: any = { companyId: auth.companyId, isDeleted: false };
        if (req.query.serviceId) query.serviceId = req.query.serviceId;
        if (req.query.cardType) query.cardType = req.query.cardType;
        if (req.query.status) query.status = req.query.status;

        const [items, total] = await Promise.all([
            ServiceRateCard.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            ServiceRateCard.countDocuments(query),
        ]);

        sendPaginated(res, items, calculatePagination(total, page, limit), 'Service rate cards retrieved');
    } catch (error) {
        logger.error('Error listing service rate cards:', error);
        next(error);
    }
};

export const createServiceRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = upsertServiceRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const card = await ServiceRateCard.create({
            ...validation.data,
            companyId: auth.companyId,
            isDeleted: false,
        });

        sendCreated(res, card, 'Service rate card created');
    } catch (error) {
        logger.error('Error creating service rate card:', error);
        next(error);
    }
};

export const getServiceRateCardById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const card = await ServiceRateCard.findOne({
            _id: req.params.id,
            companyId: auth.companyId,
            isDeleted: false,
        }).lean();

        if (!card) {
            throw new NotFoundError('Service rate card', ErrorCode.RES_NOT_FOUND);
        }

        sendSuccess(res, card, 'Service rate card retrieved');
    } catch (error) {
        logger.error('Error getting service rate card:', error);
        next(error);
    }
};

export const updateServiceRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = upsertServiceRateCardSchema.partial().safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const updated = await ServiceRateCard.findOneAndUpdate(
            {
                _id: req.params.id,
                companyId: auth.companyId,
                isDeleted: false,
            },
            { $set: validation.data },
            { new: true }
        ).lean();

        if (!updated) {
            throw new NotFoundError('Service rate card', ErrorCode.RES_NOT_FOUND);
        }

        sendSuccess(res, updated, 'Service rate card updated');
    } catch (error) {
        logger.error('Error updating service rate card:', error);
        next(error);
    }
};

export const importServiceRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = importServiceRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const { zoneRules, metadata } = validation.data;
        const card = await ServiceRateCard.findOneAndUpdate(
            {
                _id: req.params.id,
                companyId: auth.companyId,
                isDeleted: false,
            },
            {
                $set: {
                    zoneRules,
                    'metadata.importedAt': new Date(),
                    'metadata.importedFrom': metadata?.importedFrom || 'manual',
                },
            },
            { new: true }
        ).lean();

        if (!card) {
            throw new NotFoundError('Service rate card', ErrorCode.RES_NOT_FOUND);
        }

        sendSuccess(res, card, 'Service rate card import completed');
    } catch (error) {
        logger.error('Error importing service rate card:', error);
        next(error);
    }
};

export const simulateServiceRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = simulateServiceRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const { weight, zoneKey } = validation.data;
        const card = await ServiceRateCard.findOne({
            _id: req.params.id,
            companyId: auth.companyId,
            isDeleted: false,
        }).lean();

        if (!card) {
            throw new NotFoundError('Service rate card', ErrorCode.RES_NOT_FOUND);
        }

        const amount = calculateSimulation(card, Number(weight || 0), String(zoneKey || ''));
        sendSuccess(res, { amount, currency: card.currency }, 'Service rate card simulation completed');
    } catch (error) {
        logger.error('Error simulating service rate card:', error);
        next(error);
    }
};

export default {
    listServiceRateCards,
    createServiceRateCard,
    getServiceRateCardById,
    updateServiceRateCard,
    importServiceRateCard,
    simulateServiceRateCard,
};
