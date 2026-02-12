import { Request, Response, NextFunction } from 'express';
import { ServiceRateCard } from '../../../../infrastructure/database/mongoose/models';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { sendCreated, sendSuccess, sendPaginated, calculatePagination } from '../../../../shared/utils/responseHelper';
import { ConflictError, NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import ServiceRateCardFormulaService from '../../../../core/application/services/pricing/service-rate-card-formula.service';
import {
    importServiceRateCardSchema,
    simulateServiceRateCardSchema,
    upsertServiceRateCardSchema,
} from '../../../../shared/validation/schemas';

type ZoneRuleInput = {
    zoneKey: string;
    slabs: Array<{
        minKg: number;
        maxKg: number;
        charge: number;
    }>;
};

const toDate = (value: string | Date | undefined): Date | undefined => {
    if (!value) return undefined;
    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(parsed.getTime())) return undefined;
    return parsed;
};

const validateZoneRuleSlabs = (zoneRules: ZoneRuleInput[]): Array<{ field: string; message: string }> => {
    const errors: Array<{ field: string; message: string }> = [];

    zoneRules.forEach((zoneRule, zoneIndex) => {
        const slabs = [...(zoneRule.slabs || [])].sort((a, b) => Number(a.minKg) - Number(b.minKg));
        if (!slabs.length) return;

        for (let i = 0; i < slabs.length; i++) {
            const slab = slabs[i];
            const slabField = `zoneRules.${zoneIndex}.slabs.${i}`;
            if (Number(slab.maxKg) <= Number(slab.minKg)) {
                errors.push({
                    field: slabField,
                    message: 'Slab maxKg must be greater than minKg for [minKg, maxKg) convention',
                });
            }

            if (i === 0) continue;
            const previous = slabs[i - 1];
            const previousMax = Number(previous.maxKg);
            const currentMin = Number(slab.minKg);

            if (currentMin < previousMax) {
                errors.push({
                    field: slabField,
                    message: `Slab overlap detected: ${currentMin} starts before previous max ${previousMax}`,
                });
            } else if (currentMin > previousMax) {
                errors.push({
                    field: slabField,
                    message: `Slab gap detected: previous max ${previousMax} does not match next min ${currentMin}`,
                });
            }
        }
    });

    return errors;
};

const ensureNoActiveWindowOverlap = async (params: {
    companyId: string;
    serviceId: string;
    cardType: 'cost' | 'sell';
    status: 'draft' | 'active' | 'inactive';
    startDate?: Date;
    endDate?: Date;
    excludeId?: string;
}) => {
    if (params.status !== 'active') return;
    if (!params.startDate) return;
    if (params.endDate && params.endDate <= params.startDate) {
        throw new ValidationError('Validation failed', [
            {
                field: 'effectiveDates.endDate',
                message: 'endDate must be greater than startDate for [startDate, endDate) convention',
            },
        ]);
    }

    const query: any = {
        companyId: params.companyId,
        serviceId: params.serviceId,
        cardType: params.cardType,
        status: 'active',
        isDeleted: false,
    };

    if (params.excludeId) {
        query._id = { $ne: params.excludeId };
    }

    if (params.endDate) {
        query['effectiveDates.startDate'] = { $lt: params.endDate };
    }

    query.$or = [
        { 'effectiveDates.endDate': { $exists: false } },
        { 'effectiveDates.endDate': null },
        { 'effectiveDates.endDate': { $gt: params.startDate } },
    ];

    const overlapping = await ServiceRateCard.findOne(query).select('_id').lean();
    if (overlapping) {
        throw new ConflictError(
            'Active rate card effective window overlaps with an existing active card for this service and card type',
            ErrorCode.BIZ_INVALID_STATE
        );
    }
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

        const slabErrors = validateZoneRuleSlabs(validation.data.zoneRules as ZoneRuleInput[]);
        if (slabErrors.length) {
            throw new ValidationError('Validation failed', slabErrors);
        }

        const startDate = toDate(validation.data.effectiveDates?.startDate as string | Date | undefined);
        const endDate = toDate(validation.data.effectiveDates?.endDate as string | Date | undefined);
        await ensureNoActiveWindowOverlap({
            companyId: auth.companyId,
            serviceId: validation.data.serviceId,
            cardType: validation.data.cardType,
            status: validation.data.status || 'draft',
            startDate,
            endDate,
        });

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

        const existing = await ServiceRateCard.findOne({
            _id: req.params.id,
            companyId: auth.companyId,
            isDeleted: false,
        }).lean();

        if (!existing) {
            throw new NotFoundError('Service rate card', ErrorCode.RES_NOT_FOUND);
        }

        const merged = {
            serviceId: String(validation.data.serviceId || existing.serviceId),
            cardType: (validation.data.cardType || existing.cardType) as 'cost' | 'sell',
            status: (validation.data.status || existing.status) as 'draft' | 'active' | 'inactive',
            effectiveDates: {
                startDate:
                    validation.data.effectiveDates?.startDate || existing.effectiveDates?.startDate,
                endDate: validation.data.effectiveDates?.endDate ?? existing.effectiveDates?.endDate,
            },
            zoneRules: (validation.data.zoneRules || existing.zoneRules || []) as ZoneRuleInput[],
        };

        const slabErrors = validateZoneRuleSlabs(merged.zoneRules);
        if (slabErrors.length) {
            throw new ValidationError('Validation failed', slabErrors);
        }

        const startDate = toDate(merged.effectiveDates.startDate as string | Date | undefined);
        const endDate = toDate(merged.effectiveDates.endDate as string | Date | undefined);
        await ensureNoActiveWindowOverlap({
            companyId: auth.companyId,
            serviceId: merged.serviceId,
            cardType: merged.cardType,
            status: merged.status,
            startDate,
            endDate,
            excludeId: req.params.id,
        });

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

        const {
            weight,
            dimensions,
            zone,
            paymentMode = 'prepaid',
            orderValue = 0,
            provider = 'delhivery',
            fromPincode = '560001',
            toPincode = '110001',
        } = validation.data;
        const card = await ServiceRateCard.findOne({
            _id: req.params.id,
            companyId: auth.companyId,
            isDeleted: false,
        }).lean();

        if (!card) {
            throw new NotFoundError('Service rate card', ErrorCode.RES_NOT_FOUND);
        }

        const result = ServiceRateCardFormulaService.calculatePricing({
            serviceRateCard: card,
            weight: Number(weight || 0),
            dimensions: dimensions || {
                length: 10,
                width: 10,
                height: 10,
            },
            zone,
            paymentMode,
            orderValue: Number(orderValue || 0),
            provider,
            fromPincode,
            toPincode,
        });
        sendSuccess(
            res,
            {
                card: {
                    id: String(card._id),
                    serviceId: String(card.serviceId),
                    cardType: card.cardType,
                    currency: card.currency,
                    sourceMode: card.sourceMode,
                },
                pricing: result,
            },
            'Service rate card simulation completed'
        );
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
