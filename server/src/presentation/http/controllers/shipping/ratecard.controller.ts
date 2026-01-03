import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import RateCard, { IRateCard } from '../../../../infrastructure/database/mongoose/models/rate-card.model';
import Zone from '../../../../infrastructure/database/mongoose/models/zone.model';
import { AuthRequest } from '../../middleware/auth/auth';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/auditLog';
import mongoose from 'mongoose';
import {
    sendSuccess,
    sendError,
    sendValidationError,
    sendPaginated,
    sendCreated,
    calculatePagination
} from '../../../../shared/utils/responseHelper';

// Validation schemas
const weightRuleSchema = z.object({
    minWeight: z.number().min(0),
    maxWeight: z.number().min(0),
    pricePerKg: z.number().min(0),
    carrier: z.string().optional(),
    serviceType: z.string().optional(),
});

const baseRateSchema = z.object({
    carrier: z.string().min(1),
    serviceType: z.string().min(1),
    basePrice: z.number().min(0),
    minWeight: z.number().min(0),
    maxWeight: z.number().min(0),
});

const zoneRuleSchema = z.object({
    zoneId: z.string(),
    carrier: z.string().min(1),
    serviceType: z.string().min(1),
    additionalPrice: z.number(),
    transitDays: z.number().optional(),
});

const createRateCardSchema = z.object({
    name: z.string().min(2),
    baseRates: z.array(baseRateSchema).min(1),
    weightRules: z.array(weightRuleSchema).optional(),
    zoneRules: z.array(zoneRuleSchema).optional(),
    effectiveDates: z.object({
        startDate: z.string().transform(str => new Date(str)),
        endDate: z.string().transform(str => new Date(str)).optional(),
    }),
    status: z.enum(['draft', 'active', 'inactive']).default('draft'),
});

const updateRateCardSchema = createRateCardSchema.partial();

const calculateRateSchema = z.object({
    weight: z.number().min(0),
    zoneId: z.string().optional(),
    originPincode: z.string().optional(),
    destinationPincode: z.string().optional(),
    carrier: z.string().optional(),
    serviceType: z.enum(['express', 'standard']).default('standard'),
});

const validateWeightSlabs = (rules: Array<{ minWeight: number; maxWeight: number }>): boolean => {
    if (rules.length <= 1) return true;
    const sorted = [...rules].sort((a, b) => a.minWeight - b.minWeight);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].minWeight < sorted[i - 1].maxWeight) {
            return false;
        }
    }
    return true;
};

export const createRateCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            sendError(res, 'User is not associated with any company', 403, 'NO_COMPANY');
            return;
        }

        const validation = createRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        if (validation.data.weightRules && !validateWeightSlabs(validation.data.weightRules)) {
            sendError(res, 'Weight slabs cannot overlap', 400, 'WEIGHT_SLABS_OVERLAP');
            return;
        }

        const existingCard = await RateCard.findOne({
            name: validation.data.name,
            companyId,
            isDeleted: false,
        }).lean();

        if (existingCard) {
            sendError(res, 'Rate card with this name already exists', 400, 'DUPLICATE_RATECARD');
            return;
        }

        const zoneRules = validation.data.zoneRules?.map(rule => ({
            ...rule,
            zoneId: new mongoose.Types.ObjectId(rule.zoneId),
        }));

        const rateCard = new RateCard({
            ...validation.data,
            companyId,
            zoneRules,
        });

        await rateCard.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'create',
            'ratecard',
            String(rateCard._id),
            { message: 'Rate card created', name: validation.data.name },
            req
        );

        sendCreated(res, { rateCard }, 'Rate card created successfully');
    } catch (error) {
        logger.error('Error creating rate card:', error);
        next(error);
    }
};

export const getRateCards = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            sendError(res, 'User is not associated with any company', 403, 'NO_COMPANY');
            return;
        }

        const filter: any = { companyId, isDeleted: false };
        if (req.query.status) filter.status = req.query.status;

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const [rateCards, total] = await Promise.all([
            RateCard.find(filter)
                .populate('zoneRules.zoneId', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            RateCard.countDocuments(filter),
        ]);

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, rateCards, pagination, 'Rate cards retrieved successfully');
    } catch (error) {
        logger.error('Error fetching rate cards:', error);
        next(error);
    }
};

export const getRateCardById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            sendError(res, 'User is not associated with any company', 403, 'NO_COMPANY');
            return;
        }

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            sendError(res, 'Invalid rate card ID format', 400, 'INVALID_ID');
            return;
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            companyId,
            isDeleted: false,
        }).populate('zoneRules.zoneId', 'name postalCodes').lean();

        if (!rateCard) {
            sendError(res, 'Rate card not found', 404, 'RATECARD_NOT_FOUND');
            return;
        }

        sendSuccess(res, { rateCard }, 'Rate card retrieved successfully');
    } catch (error) {
        logger.error('Error fetching rate card:', error);
        next(error);
    }
};

export const updateRateCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            sendError(res, 'User is not associated with any company', 403, 'NO_COMPANY');
            return;
        }

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            sendError(res, 'Invalid rate card ID format', 400, 'INVALID_ID');
            return;
        }

        const validation = updateRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        if (validation.data.weightRules && !validateWeightSlabs(validation.data.weightRules)) {
            sendError(res, 'Weight slabs cannot overlap', 400, 'WEIGHT_SLABS_OVERLAP');
            return;
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            companyId,
            isDeleted: false,
        });

        if (!rateCard) {
            sendError(res, 'Rate card not found', 404, 'RATECARD_NOT_FOUND');
            return;
        }

        if (validation.data.name && validation.data.name !== rateCard.name) {
            const existingCard = await RateCard.findOne({
                name: validation.data.name,
                companyId,
                _id: { $ne: rateCardId },
                isDeleted: false,
            }).lean();

            if (existingCard) {
                sendError(res, 'Rate card with this name already exists', 400, 'DUPLICATE_RATECARD');
                return;
            }
        }

        Object.assign(rateCard, validation.data);

        if (validation.data.zoneRules) {
            rateCard.zoneRules = validation.data.zoneRules.map(rule => ({
                ...rule,
                zoneId: new mongoose.Types.ObjectId(rule.zoneId),
            })) as any;
        }

        await rateCard.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'update',
            'ratecard',
            rateCardId,
            { message: 'Rate card updated', changes: Object.keys(validation.data) },
            req
        );

        sendSuccess(res, { rateCard }, 'Rate card updated successfully');
    } catch (error) {
        logger.error('Error updating rate card:', error);
        next(error);
    }
};

export const calculateRate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            sendError(res, 'User is not associated with any company', 403, 'NO_COMPANY');
            return;
        }

        const validation = calculateRateSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        const rateCard = await RateCard.findOne({
            companyId,
            status: 'active',
            isDeleted: false,
        }).populate('zoneRules.zoneId', 'name postalCodes').lean();

        if (!rateCard) {
            sendError(res, 'No active rate card found', 404, 'NO_ACTIVE_RATECARD');
            return;
        }

        const weight = validation.data.weight;
        const carrier = validation.data.carrier || 'Delhivery';
        const serviceType = validation.data.serviceType;

        const baseRate = rateCard.baseRates.find(
            r =>
                r.carrier.toLowerCase() === carrier.toLowerCase() &&
                r.serviceType.toLowerCase() === serviceType &&
                weight >= r.minWeight &&
                weight <= r.maxWeight
        );

        let calculatedRate = baseRate?.basePrice || 50;

        const weightRule = rateCard.weightRules.find(
            r => weight >= r.minWeight && weight <= r.maxWeight
        );

        if (weightRule) {
            calculatedRate += weight * weightRule.pricePerKg;
        }

        let zoneName = 'Unknown';
        if (validation.data.destinationPincode && rateCard.zoneRules) {
            const zone = await Zone.findOne({
                companyId,
                postalCodes: { $regex: `^${validation.data.destinationPincode.slice(0, 3)}` },
                isDeleted: false,
            }).lean();

            if (zone) {
                zoneName = zone.name;
                const zoneId = (zone._id as mongoose.Types.ObjectId).toString();
                const zoneRule = rateCard.zoneRules.find(
                    r => r.zoneId.toString() === zoneId &&
                        r.carrier.toLowerCase() === carrier.toLowerCase()
                );

                if (zoneRule) {
                    calculatedRate += zoneRule.additionalPrice;
                }
            }
        }

        sendSuccess(res, {
            rate: Math.round(calculatedRate * 100) / 100,
            carrier,
            serviceType,
            weight,
            zone: zoneName,
            rateCardName: rateCard.name,
            breakdown: {
                base: baseRate?.basePrice || 50,
                weightCharge: weightRule ? weight * weightRule.pricePerKg : 0,
                zoneCharge: calculatedRate - (baseRate?.basePrice || 50) - (weightRule ? weight * weightRule.pricePerKg : 0),
            },
        }, 'Rate calculated successfully');
    } catch (error) {
        logger.error('Error calculating rate:', error);
        next(error);
    }
};

export default {
    createRateCard,
    getRateCards,
    getRateCardById,
    updateRateCard,
    calculateRate,
};
