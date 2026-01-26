import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RateCard, IRateCard } from '../../../../infrastructure/database/mongoose/models';
import { Zone } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import mongoose from 'mongoose';
import {
    sendSuccess,
    sendPaginated,
    sendCreated,
    calculatePagination
} from '../../../../shared/utils/responseHelper';
import { AuthenticationError, ValidationError, NotFoundError, ConflictError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import PricingOrchestratorService from '../../../../core/application/services/pricing/pricing-orchestrator.service';
import RateCardAnalyticsService from '../../../../core/application/services/analytics/rate-card-analytics.service';

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

export const createRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
        }

        const validation = createRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        if (validation.data.weightRules && !validateWeightSlabs(validation.data.weightRules)) {
            throw new ValidationError('Weight slabs cannot overlap');
        }

        const existingCard = await RateCard.findOne({
            name: validation.data.name,
            companyId,
            isDeleted: false,
        }).lean();

        if (existingCard) {
            throw new ConflictError('Rate card with this name already exists', ErrorCode.BIZ_ALREADY_EXISTS);
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

export const getRateCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
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

export const getRateCardById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
        }

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            companyId,
            isDeleted: false,
        }).populate('zoneRules.zoneId', 'name postalCodes').lean();

        if (!rateCard) {
            throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        sendSuccess(res, { rateCard }, 'Rate card retrieved successfully');
    } catch (error) {
        logger.error('Error fetching rate card:', error);
        next(error);
    }
};

export const updateRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
        }

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        const validation = updateRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        if (validation.data.weightRules && !validateWeightSlabs(validation.data.weightRules)) {
            throw new ValidationError('Weight slabs cannot overlap');
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            companyId,
            isDeleted: false,
        });

        if (!rateCard) {
            throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        if (validation.data.name && validation.data.name !== rateCard.name) {
            const existingCard = await RateCard.findOne({
                name: validation.data.name,
                companyId,
                _id: { $ne: rateCardId },
                isDeleted: false,
            }).lean();

            if (existingCard) {
                throw new ConflictError('Rate card with this name already exists', ErrorCode.BIZ_ALREADY_EXISTS);
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

export const calculateRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
        }

        const validation = calculateRateSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        // Delegate to Pricing Orchestrator
        // Note: Dimensions and orderValue are defaulted for the calculator if not provided
        // ideally schema should allow optional or we use defaults suitable for estimation
        const pricingResult = await PricingOrchestratorService.calculateShipmentPricing({
            companyId,
            fromPincode: validation.data.originPincode || '110001', // Default origin if not supplied (though calculator usually supplies it)
            toPincode: validation.data.destinationPincode || '',
            weight: validation.data.weight,
            dimensions: { length: 10, width: 10, height: 10 }, // Default dimensions for estimation
            paymentMode: 'prepaid', // Default to prepaid for estimation
            orderValue: 1000, // Default value for estimation (affects COD mostly)
            carrier: validation.data.carrier,
            serviceType: validation.data.serviceType,
        });

        sendSuccess(res, {
            rate: pricingResult.totalPrice,
            carrier: validation.data.carrier || 'Default',
            serviceType: validation.data.serviceType,
            weight: validation.data.weight,
            zone: pricingResult.zone,
            rateCardName: pricingResult.rateCardName,
            breakdown: {
                base: pricingResult.baseRate,
                weightCharge: pricingResult.weightCharge,
                zoneCharge: pricingResult.zoneCharge,
                tax: pricingResult.gstAmount
            },
        }, 'Rate calculated successfully');
    } catch (error) {
        logger.error('Error calculating rate:', error);
        next(error);
    }
};

export const compareCarrierRates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const validation = calculateRateSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError(validation.error.errors[0].message, ErrorCode.VAL_INVALID_INPUT);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User not associated with company', ErrorCode.AUTH_REQUIRED);
        }

        // Get all carriers from CARRIERS static data
        const { CARRIERS } = await import('../../../../infrastructure/database/seeders/data/carrier-data');
        const carriers = Object.values(CARRIERS);

        const rates: any[] = [];

        // Calculate rates for each carrier
        for (const carrier of carriers) {
            for (const serviceType of carrier.serviceTypes) {
                try {
                    const pricingResult = await PricingOrchestratorService.calculateShipmentPricing({
                        companyId,
                        fromPincode: validation.data.originPincode,
                        toPincode: validation.data.destinationPincode,
                        weight: validation.data.weight,
                        dimensions: validation.data.dimensions || { length: 10, width: 10, height: 10 },
                        paymentMode: validation.data.paymentMode || 'prepaid',
                        orderValue: validation.data.orderValue || 1000,
                        carrier: carrier.displayName,
                        serviceType
                    });

                    rates.push({
                        carrier: carrier.displayName,
                        serviceType,
                        rate: pricingResult.totalPrice,
                        breakdown: {
                            base: pricingResult.baseRate,
                            weightCharge: pricingResult.weightCharge,
                            zoneCharge: pricingResult.zoneCharge,
                            tax: pricingResult.gstAmount,
                            codCharge: pricingResult.codCharge
                        },
                        zone: pricingResult.zone,
                        eta: {
                            minDays: serviceType === 'Express' ? 1 : serviceType === 'Air' ? 2 : 3,
                            maxDays: serviceType === 'Express' ? 2 : serviceType === 'Air' ? 3 : 5
                        },
                        recommended: false
                    });
                } catch (error) {
                    logger.warn(`Failed to calculate rate for ${carrier.displayName} - ${serviceType}:`, error);
                }
            }
        }

        // Sort by price
        rates.sort((a, b) => a.rate - b.rate);

        // Mark cheapest and fastest
        if (rates.length > 0) {
            rates[0].recommended = true; // Cheapest
        }

        const cheapest = rates[0];
        const fastest = rates.reduce((prev, curr) =>
            (curr.eta.maxDays < prev.eta.maxDays) ? curr : prev
        , rates[0]);

        sendSuccess(res, {
            rates,
            cheapest,
            fastest
        }, 'Multi-carrier rates calculated successfully');

    } catch (error) {
        logger.error('Error comparing carrier rates:', error);
        next(error);
    }
};

export const getRateCardAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
        }

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        // Verify rate card exists and belongs to company
        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            companyId,
            isDeleted: false,
        }).lean();

        if (!rateCard) {
            throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        // Parse date filters
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const stats = await RateCardAnalyticsService.getRateCardUsageStats(
            rateCardId,
            startDate,
            endDate
        );

        sendSuccess(res, { stats }, 'Rate card analytics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching rate card analytics:', error);
        next(error);
    }
};

export const getRateCardRevenueSeries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
        }

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        // Verify rate card exists and belongs to company
        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            companyId,
            isDeleted: false,
        }).lean();

        if (!rateCard) {
            throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        // Parse parameters
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(req.query.endDate as string);
        const granularity = (req.query.granularity as 'day' | 'week' | 'month') || 'day';

        if (!startDate || !endDate) {
            throw new ValidationError('startDate and endDate are required');
        }

        const timeSeries = await RateCardAnalyticsService.getRevenueTimeSeries(
            rateCardId,
            startDate,
            endDate,
            granularity
        );

        sendSuccess(res, { timeSeries }, 'Revenue time series retrieved successfully');
    } catch (error) {
        logger.error('Error fetching revenue time series:', error);
        next(error);
    }
};

export default {
    createRateCard,
    getRateCards,
    getRateCardById,
    updateRateCard,
    calculateRate,
    compareCarrierRates,
    getRateCardAnalytics,
    getRateCardRevenueSeries,
};
