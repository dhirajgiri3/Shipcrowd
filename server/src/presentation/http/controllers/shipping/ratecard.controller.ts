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
import RateCardImportService from '../../../../core/application/services/pricing/rate-card-import.service';
import PricingOrchestratorService from '../../../../core/application/services/pricing/pricing-orchestrator.service';
import RateCardAnalyticsService from '../../../../core/application/services/analytics/rate-card-analytics.service';
import SmartRateCalculatorService from '../../../../core/application/services/pricing/smart-rate-calculator.service';

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
    zoneMultipliers: z.record(z.number()).optional(),
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
    dimensions: z.object({
        length: z.number(),
        width: z.number(),
        height: z.number()
    }).optional(),
    paymentMode: z.enum(['prepaid', 'cod']).optional(),
    orderValue: z.number().optional(),
});

const smartRateCalculateSchema = z.object({
    originPincode: z.string().min(6).max(6),
    destinationPincode: z.string().min(6).max(6),
    weight: z.number().min(0.01),
    dimensions: z.object({
        length: z.number().min(1),
        width: z.number().min(1),
        height: z.number().min(1)
    }).optional(),
    paymentMode: z.enum(['prepaid', 'cod']),
    orderValue: z.number().min(0),
    preferredCarriers: z.array(z.string()).optional(),
    excludedCarriers: z.array(z.string()).optional(),
    scoringWeights: z.object({
        price: z.number().min(0).max(100),
        speed: z.number().min(0).max(100),
        reliability: z.number().min(0).max(100),
        performance: z.number().min(0).max(100),
    }).optional().refine((weights) => {
        if (!weights) return true;
        const sum = weights.price + weights.speed + weights.reliability + weights.performance;
        return sum === 100;
    }, { message: 'Scoring weights must sum to 100' }),
});

const validateWeightSlabs = (rules: Array<{ minWeight: number; maxWeight: number; carrier?: string; serviceType?: string }>): boolean => {
    if (!rules || rules.length <= 1) return true;

    const groups = new Map<string, typeof rules>();
    const normalize = (s?: string) => (s || '').trim().toLowerCase();

    // Group slabs by carrier + serviceType
    for (const rule of rules) {
        const carrier = normalize(rule.carrier) || 'any';
        const service = normalize(rule.serviceType) || 'any';
        const key = `${carrier}:${service}`;

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(rule);
    }

    // Validate each group independently
    for (const [key, groupRules] of groups) {
        const sorted = [...groupRules].sort((a, b) => a.minWeight - b.minWeight);
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].minWeight < sorted[i - 1].maxWeight) {
                return false;
            }
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
            throw new ValidationError('Weight Rules slabs cannot overlap within the same carrier/service type');
        }

        if (validation.data.baseRates && !validateWeightSlabs(validation.data.baseRates)) {
            throw new ValidationError('Base Rate slabs cannot overlap within the same carrier/service type');
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
            throw new ValidationError('Weight Rules slabs cannot overlap within the same carrier/service type');
        }

        if (validation.data.baseRates && !validateWeightSlabs(validation.data.baseRates)) {
            throw new ValidationError('Base Rate slabs cannot overlap within the same carrier/service type');
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
        const { CARRIERS } = await import('../../../../infrastructure/database/seeders/data/carrier-data.js');
        const carriers = Object.values(CARRIERS);

        const rates: any[] = [];

        // Calculate rates for each carrier
        for (const carrierData of carriers) {
            for (const serviceType of carrierData.serviceTypes) {
                try {
                    const pricingResult = await PricingOrchestratorService.calculateShipmentPricing({
                        companyId,
                        fromPincode: validation.data.originPincode || '110001',
                        toPincode: validation.data.destinationPincode || '400001',
                        weight: validation.data.weight,
                        dimensions: validation.data.dimensions || { length: 10, width: 10, height: 10 },
                        paymentMode: validation.data.paymentMode || 'prepaid',
                        orderValue: validation.data.orderValue || 1000,
                        carrier: carrierData.displayName,
                        serviceType
                    });

                    rates.push({
                        carrier: carrierData.displayName,
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
                    logger.warn(`Failed to calculate rate for ${carrierData.displayName} - ${serviceType}:`, error);
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

export const exportRateCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
        }

        const rateCards = await RateCard.find({
            companyId,
            isDeleted: false
        }).populate('zoneRules.zoneId', 'name standardZoneCode').lean();

        // Convert to CSV format
        const csvRows: string[] = [];
        csvRows.push('Name,Carrier,Service Type,Base Price,Min Weight,Max Weight,Zone,Zone Price,Status,Effective Start Date');

        for (const card of rateCards) {
            const baseRates = card.baseRates || [];
            const zoneRules = card.zoneRules || [];

            for (const baseRate of baseRates) {
                for (const zoneRule of zoneRules) {
                    const zoneName = (zoneRule.zoneId as any)?.standardZoneCode || (zoneRule.zoneId as any)?.name || 'Unknown';
                    csvRows.push([
                        `"${card.name}"`,
                        baseRate.carrier,
                        baseRate.serviceType,
                        baseRate.basePrice,
                        baseRate.minWeight,
                        baseRate.maxWeight,
                        zoneName,
                        zoneRule.additionalPrice,
                        card.status,
                        card.effectiveDates.startDate.toISOString().split('T')[0]
                    ].join(','));
                }
            }
        }

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="rate-cards-${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        logger.error('Error exporting rate cards:', error);
        next(error);
    }
};

export const bulkUpdateRateCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
        }

        const bulkUpdateSchema = z.object({
            rateCardIds: z.array(z.string()).min(1),
            operation: z.enum(['activate', 'deactivate', 'adjust_price']),
            adjustmentType: z.enum(['percentage', 'fixed']).optional(),
            adjustmentValue: z.number().optional()
        });

        const validation = bulkUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Invalid bulk update data', validation.error.errors);
        }

        const { rateCardIds, operation, adjustmentType, adjustmentValue } = validation.data;

        // Verify all rate cards belong to company
        const rateCards = await RateCard.find({
            _id: { $in: rateCardIds.map(id => new mongoose.Types.ObjectId(id)) },
            companyId,
            isDeleted: false
        });

        if (rateCards.length !== rateCardIds.length) {
            throw new ValidationError('Some rate cards not found or do not belong to your company');
        }

        let updatedCount = 0;

        if (operation === 'activate' || operation === 'deactivate') {
            const status = operation === 'activate' ? 'active' : 'inactive';
            await RateCard.updateMany(
                { _id: { $in: rateCardIds.map(id => new mongoose.Types.ObjectId(id)) } },
                { $set: { status } }
            );
            updatedCount = rateCards.length;
        } else if (operation === 'adjust_price' && adjustmentType && adjustmentValue !== undefined) {
            for (const card of rateCards) {
                if (adjustmentType === 'percentage') {
                    // Adjust base rates
                    card.baseRates = card.baseRates.map(rate => ({
                        ...rate,
                        basePrice: rate.basePrice * (1 + adjustmentValue / 100)
                    }));

                    // Adjust zone rules
                    card.zoneRules = card.zoneRules.map(rule => ({
                        ...rule,
                        additionalPrice: rule.additionalPrice * (1 + adjustmentValue / 100)
                    }));
                } else {
                    // Fixed adjustment
                    card.baseRates = card.baseRates.map(rate => ({
                        ...rate,
                        basePrice: rate.basePrice + adjustmentValue
                    }));

                    card.zoneRules = card.zoneRules.map(rule => ({
                        ...rule,
                        additionalPrice: rule.additionalPrice + adjustmentValue
                    }));
                }

                await card.save();
                updatedCount++;
            }
        }

        await createAuditLog(
            req.user._id,
            companyId,
            'update',
            'ratecard',
            'multiple',
            {
                message: `Bulk ${operation} on rate cards`,
                count: updatedCount,
                operation,
                adjustmentType,
                adjustmentValue
            },
            req
        );

        sendSuccess(res, { updatedCount }, `Successfully updated ${updatedCount} rate cards`);
    } catch (error) {
        logger.error('Error in bulk update:', error);
        next(error);
    }
};

export const importRateCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
        }

        if (!req.file) {
            throw new ValidationError('CSV or Excel file is required');
        }


        let overrides = {};
        if (req.body.metadata) {
            try {
                const parsed = JSON.parse(req.body.metadata);
                overrides = {
                    fuelSurcharge: parsed.fuelSurcharge ? Number(parsed.fuelSurcharge) : undefined,
                    fuelSurchargeBase: parsed.fuelSurchargeBase,
                    minimumCall: parsed.minimumCall ? Number(parsed.minimumCall) : undefined,
                    version: parsed.version,
                    isLocked: parsed.isLocked === true || parsed.isLocked === 'true'
                };
            } catch (e) {
                logger.warn('Failed to parse rate card import metadata', e);
            }
        }

        const result = await RateCardImportService.importRateCards(
            companyId,
            req.file.buffer,
            req.file.mimetype,
            req.user._id,
            req,
            { overrides }
        );

        sendSuccess(res, result, `Imported: ${result.created} new, ${result.updated} updated. ${result.errors.length} errors.`);
    } catch (error) {
        logger.error('Error importing rate cards:', error);
        next(error);
    }
};

/**
 * Smart Rate Calculator Endpoint
 
 * Uses AI-powered recommendation engine with weighted scoring
 */
export const calculateSmartRates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
        }

        const validation = smartRateCalculateSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const data = validation.data;

        // Call smart rate calculator service
        const result = await SmartRateCalculatorService.calculateSmartRates({
            companyId,
            originPincode: data.originPincode,
            destinationPincode: data.destinationPincode,
            weight: data.weight,
            dimensions: data.dimensions,
            paymentMode: data.paymentMode,
            orderValue: data.orderValue,
            preferredCarriers: data.preferredCarriers,
            excludedCarriers: data.excludedCarriers,
            scoringWeights: data.scoringWeights,
        });

        await createAuditLog(
            req.user._id,
            companyId,
            'read',
            'smart_rate_calculation',
            undefined,
            {
                message: 'Smart rate calculated',
                route: `${data.originPincode} -> ${data.destinationPincode}`,
                weight: data.weight,
                optionsReturned: result.totalOptions,
            },
            req
        );

        sendSuccess(res, result, 'Smart rates calculated successfully');
    } catch (error) {
        logger.error('Error calculating smart rates:', error);
        next(error);
    }
};

/**
 * Preview pricing for a shipment (Admin tool)
 */
export const previewPrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
        }

        const {
            fromPincode,
            toPincode,
            weight,
            paymentMode,
            orderValue,
            carrier,
            serviceType,
            dimensions
        } = req.body;

        // Validate inputs
        if (!fromPincode || !toPincode || !weight) {
            throw new ValidationError('Missing required fields: fromPincode, toPincode, weight');
        }

        const pricingResult = await PricingOrchestratorService.calculateShipmentPricing({
            companyId,
            fromPincode,
            toPincode,
            weight: Number(weight),
            paymentMode: paymentMode || 'prepaid',
            orderValue: Number(orderValue) || 0,
            carrier,
            serviceType,
            dimensions: dimensions || { length: 1, width: 1, height: 1 } // Default if missing
        });

        sendSuccess(res, pricingResult, 'Pricing calculated successfully');
    } catch (error) {
        next(error);
    }
};

export const cloneRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

        const sourceCard = await RateCard.findOne({
            _id: rateCardId,
            companyId,
            isDeleted: false
        }).lean();

        if (!sourceCard) {
            throw new NotFoundError('Source rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        // Create deep clone data
        const cloneData = {
            ...sourceCard,
            _id: new mongoose.Types.ObjectId(),
            name: `${sourceCard.name} (Copy)`,
            status: 'draft', // Reset to draft
            companyId, // Ensure ownership (same company)
            effectiveDates: {
                startDate: new Date(), // Reset effective dates
                endDate: undefined
            },
            createdAt: undefined,
            updatedAt: undefined,
            __v: undefined
        };

        const newRateCard = new RateCard(cloneData);
        await newRateCard.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'create',
            'ratecard',
            String(newRateCard._id),
            { message: 'Rate card cloned', sourceId: rateCardId },
            req
        );

        sendCreated(res, { rateCard: newRateCard }, 'Rate card cloned successfully');
    } catch (error) {
        logger.error('Error cloning rate card:', error);
        next(error);
    }
};

export const deleteRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const companyId = req.user.companyId;
        const rateCardId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        // Safety Check 1: Ensure it's not the default card for ANY company
        // (Even the current company shouldn't delete its active default card without switching)
        const Company = mongoose.model('Company'); // Lazy load to avoid circular deps if any
        const usageCount = await Company.countDocuments({
            'settings.defaultRateCardId': new mongoose.Types.ObjectId(rateCardId)
        });

        if (usageCount > 0) {
            throw new ConflictError(
                'Cannot delete rate card because it is currently assigned as the Default Rate Card for one or more companies. Please reassign them first.',
                ErrorCode.BIZ_CONFLICT
            );
        }

        const rateCard = await RateCard.findOneAndUpdate(
            {
                _id: rateCardId,
                companyId,
                isDeleted: false
            },
            {
                $set: { isDeleted: true }
            },
            { new: true }
        );

        if (!rateCard) {
            throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        await createAuditLog(
            req.user._id,
            companyId,
            'delete',
            'ratecard',
            rateCardId,
            { message: 'Rate card deleted (soft delete)' },
            req
        );

        sendSuccess(res, { id: rateCardId }, 'Rate card deleted successfully');
    } catch (error) {
        logger.error('Error deleting rate card:', error);
        next(error);
    }
};

export default {
    createRateCard,
    getRateCards,
    getRateCardById,
    updateRateCard,
    deleteRateCard,
    cloneRateCard,
    calculateRate,
    compareCarrierRates,
    calculateSmartRates,
    getRateCardAnalytics,
    getRateCardRevenueSeries,
    exportRateCards,
    bulkUpdateRateCards,
    importRateCards,
    previewPrice
};
