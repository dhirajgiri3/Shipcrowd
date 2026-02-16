import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import {
    SellerCourierPolicy,
    SellerRateCard,
    User,
} from '../../../../infrastructure/database/mongoose/models';
import {
    AuthorizationError,
    ConflictError,
    NotFoundError,
    ValidationError,
} from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import {
    guardChecks,
    requireCompanyContext,
    validateObjectId,
} from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import {
    calculatePagination,
    sendCreated,
    sendPaginated,
    sendSuccess,
} from '../../../../shared/utils/responseHelper';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';
import {
    updateSellerRateCardSchema,
    upsertSellerRateCardSchema,
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
    sellerId: string;
    serviceId: string;
    flowType: 'forward' | 'reverse';
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
        sellerId: params.sellerId,
        serviceId: params.serviceId,
        cardType: 'sell',
        category: 'custom',
        flowType: params.flowType,
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

    const overlapping = await SellerRateCard.findOne(query).select('_id').lean();
    if (overlapping) {
        throw new ConflictError(
            'Active seller rate card effective window overlaps with an existing active custom card for this service and flow',
            ErrorCode.BIZ_INVALID_STATE
        );
    }
};

const resolveSellerContextForAdmin = async (req: Request) => {
    const { sellerId } = req.params;
    if (!sellerId) {
        throw new ValidationError('sellerId is required', ErrorCode.VAL_MISSING_FIELD);
    }
    validateObjectId(sellerId, 'seller');

    const seller = await User.findById(sellerId).select('companyId role').lean();
    if (!seller) {
        throw new NotFoundError('Seller', ErrorCode.RES_NOT_FOUND);
    }
    if (!seller.companyId) {
        throw new ValidationError('Seller has no company context', ErrorCode.VAL_INVALID_INPUT);
    }

    return {
        sellerId,
        companyId: String(seller.companyId),
    };
};

const resolveSellerContextForSeller = (req: Request) => {
    const auth = guardChecks(req);
    requireCompanyContext(auth);
    const { sellerId } = req.params;
    if (!sellerId) {
        throw new ValidationError('sellerId is required', ErrorCode.VAL_MISSING_FIELD);
    }
    validateObjectId(sellerId, 'seller');

    if (String(auth.userId) !== String(sellerId) && !isPlatformAdmin(req.user ?? {})) {
        throw new AuthorizationError('You can only manage your own custom rate cards');
    }

    return {
        sellerId,
        companyId: String(auth.companyId),
        auth,
    };
};

const markPolicyCustom = async (params: {
    companyId: string;
    sellerId: string;
    updatedBy?: string;
}) => {
    await SellerCourierPolicy.findOneAndUpdate(
        {
            companyId: params.companyId,
            sellerId: params.sellerId,
        },
        {
            $setOnInsert: {
                companyId: params.companyId,
                sellerId: params.sellerId,
            },
            $set: {
                rateCardType: 'custom',
                rateCardCategory: 'custom',
                ...(params.updatedBy ? { 'metadata.updatedBy': params.updatedBy } : {}),
            },
        },
        { upsert: true, new: false }
    );
};

const listCards = async (req: Request, res: Response, next: NextFunction, adminMode: boolean): Promise<void> => {
    try {
        if (adminMode) {
            guardChecks(req, { requireCompany: false });
        }

        const context = adminMode
            ? await resolveSellerContextForAdmin(req)
            : resolveSellerContextForSeller(req);

        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
        const skip = (page - 1) * limit;

        const query: any = {
            companyId: context.companyId,
            sellerId: context.sellerId,
            cardType: 'sell',
            category: 'custom',
            isDeleted: false,
        };
        if (req.query.status) query.status = req.query.status;
        if (req.query.flowType) query.flowType = req.query.flowType;
        if (req.query.serviceId) query.serviceId = req.query.serviceId;

        const [items, total] = await Promise.all([
            SellerRateCard.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            SellerRateCard.countDocuments(query),
        ]);

        sendPaginated(res, items, calculatePagination(total, page, limit), 'Seller custom rate cards retrieved');
    } catch (error) {
        logger.error('Error listing seller custom rate cards:', error);
        next(error);
    }
};

const createCard = async (req: Request, res: Response, next: NextFunction, adminMode: boolean): Promise<void> => {
    try {
        const auth = adminMode
            ? guardChecks(req, { requireCompany: false })
            : guardChecks(req);

        const context = adminMode
            ? await resolveSellerContextForAdmin(req)
            : resolveSellerContextForSeller(req);

        const validation = upsertSellerRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err: { path: Array<string | number>; message: string }) => ({
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
            companyId: context.companyId,
            sellerId: context.sellerId,
            serviceId: validation.data.serviceId,
            flowType: validation.data.flowType || 'forward',
            status: validation.data.status || 'draft',
            startDate,
            endDate,
        });

        const card = await SellerRateCard.create({
            ...validation.data,
            companyId: context.companyId,
            sellerId: context.sellerId,
            cardType: 'sell',
            category: 'custom',
            isDeleted: false,
        });

        await markPolicyCustom({
            companyId: context.companyId,
            sellerId: context.sellerId,
            updatedBy: auth.userId,
        });

        sendCreated(res, card, 'Seller custom rate card created');
    } catch (error) {
        logger.error('Error creating seller custom rate card:', error);
        next(error);
    }
};

const updateCard = async (req: Request, res: Response, next: NextFunction, adminMode: boolean): Promise<void> => {
    try {
        const auth = adminMode
            ? guardChecks(req, { requireCompany: false })
            : guardChecks(req);

        const context = adminMode
            ? await resolveSellerContextForAdmin(req)
            : resolveSellerContextForSeller(req);

        const validation = updateSellerRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err: { path: Array<string | number>; message: string }) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const existing = await SellerRateCard.findOne({
            _id: req.params.id,
            companyId: context.companyId,
            sellerId: context.sellerId,
            cardType: 'sell',
            category: 'custom',
            isDeleted: false,
        }).lean();

        if (!existing) {
            throw new NotFoundError('Seller custom rate card', ErrorCode.RES_NOT_FOUND);
        }

        const merged = {
            serviceId: String(validation.data.serviceId || existing.serviceId),
            flowType: (validation.data.flowType || existing.flowType || 'forward') as 'forward' | 'reverse',
            status: (validation.data.status || existing.status) as 'draft' | 'active' | 'inactive',
            effectiveDates: {
                startDate: validation.data.effectiveDates?.startDate || existing.effectiveDates?.startDate,
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
            companyId: context.companyId,
            sellerId: context.sellerId,
            serviceId: merged.serviceId,
            flowType: merged.flowType,
            status: merged.status,
            startDate,
            endDate,
            excludeId: req.params.id,
        });

        const updated = await SellerRateCard.findOneAndUpdate(
            {
                _id: req.params.id,
                companyId: context.companyId,
                sellerId: context.sellerId,
                cardType: 'sell',
                category: 'custom',
                isDeleted: false,
            },
            { $set: validation.data },
            { new: true }
        ).lean();

        if (!updated) {
            throw new NotFoundError('Seller custom rate card', ErrorCode.RES_NOT_FOUND);
        }

        await markPolicyCustom({
            companyId: context.companyId,
            sellerId: context.sellerId,
            updatedBy: auth.userId,
        });

        sendSuccess(res, updated, 'Seller custom rate card updated');
    } catch (error) {
        logger.error('Error updating seller custom rate card:', error);
        next(error);
    }
};

const deleteCard = async (req: Request, res: Response, next: NextFunction, adminMode: boolean): Promise<void> => {
    try {
        if (adminMode) {
            guardChecks(req, { requireCompany: false });
        } else {
            guardChecks(req);
        }

        const context = adminMode
            ? await resolveSellerContextForAdmin(req)
            : resolveSellerContextForSeller(req);

        const deleted = await SellerRateCard.findOneAndUpdate(
            {
                _id: req.params.id,
                companyId: context.companyId,
                sellerId: context.sellerId,
                cardType: 'sell',
                category: 'custom',
                isDeleted: false,
            },
            { $set: { isDeleted: true, status: 'inactive' } },
            { new: true }
        ).lean();

        if (!deleted) {
            throw new NotFoundError('Seller custom rate card', ErrorCode.RES_NOT_FOUND);
        }

        sendSuccess(res, null, 'Seller custom rate card deleted');
    } catch (error) {
        logger.error('Error deleting seller custom rate card:', error);
        next(error);
    }
};

export const listSellerRateCards = (req: Request, res: Response, next: NextFunction) => listCards(req, res, next, false);
export const createSellerRateCard = (req: Request, res: Response, next: NextFunction) => createCard(req, res, next, false);
export const updateSellerRateCard = (req: Request, res: Response, next: NextFunction) => updateCard(req, res, next, false);
export const deleteSellerRateCard = (req: Request, res: Response, next: NextFunction) => deleteCard(req, res, next, false);

export const listSellerRateCardsAdmin = (req: Request, res: Response, next: NextFunction) => listCards(req, res, next, true);
export const createSellerRateCardAdmin = (req: Request, res: Response, next: NextFunction) => createCard(req, res, next, true);
export const updateSellerRateCardAdmin = (req: Request, res: Response, next: NextFunction) => updateCard(req, res, next, true);
export const deleteSellerRateCardAdmin = (req: Request, res: Response, next: NextFunction) => deleteCard(req, res, next, true);

export default {
    listSellerRateCards,
    createSellerRateCard,
    updateSellerRateCard,
    deleteSellerRateCard,
    listSellerRateCardsAdmin,
    createSellerRateCardAdmin,
    updateSellerRateCardAdmin,
    deleteSellerRateCardAdmin,
};
