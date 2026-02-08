import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RateCard, IRateCard } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import mongoose from 'mongoose';
import {
    guardChecks,
    requireCompanyContext,
} from '../../../../shared/helpers/controller.helpers';
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
import { RateCardSelectorService } from '../../../../core/application/services/pricing/rate-card-selector.service';
import { RateCardSimulationService, SimulationInput } from '../../../../core/application/services/pricing/rate-card-simulation.service';

// Validation schemas
const zonePricingEntrySchema = z.object({
    baseWeight: z.number().min(0),
    basePrice: z.number().min(0),
    additionalPricePerKg: z.number().min(0),
});

const zonePricingSchema = z.object({
    zoneA: zonePricingEntrySchema,
    zoneB: zonePricingEntrySchema,
    zoneC: zonePricingEntrySchema,
    zoneD: zonePricingEntrySchema,
    zoneE: zonePricingEntrySchema,
});

const rateCardPayloadSchema = z.object({
    name: z.string().min(2),
    rateCardCategory: z.string().optional(),
    shipmentType: z.enum(['forward', 'reverse']).optional(),
    gst: z.number().min(0).optional(),
    minimumFare: z.number().min(0).optional(),
    minimumFareCalculatedOn: z.enum(['freight', 'freight_overhead']).optional(),
    zoneBType: z.enum(['state', 'distance']).optional(),
    codPercentage: z.number().min(0).optional(),
    codMinimumCharge: z.number().min(0).optional(),
    fuelSurcharge: z.number().min(0).optional(),
    fuelSurchargeBase: z.enum(['freight', 'freight_cod']).optional(),
    zonePricing: zonePricingSchema,
    effectiveDates: z.object({
        startDate: z.string().transform(str => new Date(str)),
        endDate: z.string().transform(str => new Date(str)).optional(),
    }),
    status: z.enum(['draft', 'active', 'inactive']).default('draft'),
});

const createRateCardSchema = rateCardPayloadSchema;

const updateRateCardSchema = rateCardPayloadSchema.partial();

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

export const createRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

        const validation = createRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const existingCard = await RateCard.findOne({
            name: validation.data.name,
            companyId,
            isDeleted: false,
        }).lean();

        if (existingCard) {
            throw new ConflictError('Rate card with this name already exists', ErrorCode.BIZ_ALREADY_EXISTS);
        }

        const rateCard = new RateCard({
            ...validation.data,
            companyId,
        });

        await rateCard.save();

        await createAuditLog(
            auth.userId,
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

        const filter: any = {
            isDeleted: false,
            $or: [{ companyId }, { scope: 'global' }]
        };
        if (req.query.status) filter.status = req.query.status;

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const [rateCards, total] = await Promise.all([
            RateCard.find(filter)
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            isDeleted: false,
            $or: [{ companyId }, { scope: 'global' }]
        }).lean();

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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

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

        await rateCard.save();

        await createAuditLog(
            auth.userId,
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

        const validation = calculateRateSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError(validation.error.errors[0].message, ErrorCode.VAL_INVALID_INPUT);
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

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
            endDate,
            rateCard.name
        );

        sendSuccess(res, { stats }, 'Rate card analytics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching rate card analytics:', error);
        next(error);
    }
};

export const getRateCardRevenueSeries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

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
            granularity,
            rateCard.name
        );

        sendSuccess(res, { timeSeries }, 'Revenue time series retrieved successfully');
    } catch (error) {
        logger.error('Error fetching revenue time series:', error);
        next(error);
    }
};

export const exportRateCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

        const rateCards = await RateCard.find({
            companyId,
            isDeleted: false
        }).lean();

        const csvRows: string[] = [];
        const csvSafe = (value: any) => {
            if (value === undefined || value === null) return '';
            let str = String(value);
            if (str.includes('"')) str = str.replace(/"/g, '""');
            if (str.search(/[",\n]/) >= 0) return `"${str}"`;
            return str;
        };

        csvRows.push('Name,Zone,BaseWeight,BasePrice,AdditionalPricePerKg,Status,EffectiveStartDate,EffectiveEndDate,Category,ShipmentType,MinimumFare,MinimumFareCalculatedOn,CODPercentage,CODMinimumCharge,FuelSurcharge,ZoneBType');
        const zones = ['A', 'B', 'C', 'D', 'E'];
        for (const card of rateCards as any[]) {
            const zonePricing = card.zonePricing || {};
            if (!Object.keys(zonePricing).length) {
                throw new ValidationError(`Zone pricing is missing for rate card: ${card.name}`);
            }
            const startDate = card.effectiveDates?.startDate ? new Date(card.effectiveDates.startDate).toISOString().split('T')[0] : '';
            const endDate = card.effectiveDates?.endDate ? new Date(card.effectiveDates.endDate).toISOString().split('T')[0] : '';
            for (const zone of zones) {
                const zoneData = zonePricing[`zone${zone}`];
                if (!zoneData) {
                    throw new ValidationError(`Zone ${zone} pricing is missing for rate card: ${card.name}`);
                }
                csvRows.push([
                    csvSafe(card.name),
                    zone,
                    zoneData.baseWeight ?? '',
                    zoneData.basePrice ?? '',
                    zoneData.additionalPricePerKg ?? '',
                    csvSafe(card.status),
                    startDate,
                    endDate,
                    csvSafe(card.rateCardCategory),
                    csvSafe(card.shipmentType),
                    card.minimumFare ?? '',
                    csvSafe(card.minimumFareCalculatedOn),
                    card.codPercentage ?? '',
                    card.codMinimumCharge ?? '',
                    card.fuelSurcharge ?? '',
                    csvSafe(card.zoneBType)
                ].join(','));
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

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
            const zonePricingUpdateQuery = adjustmentType === 'percentage'
                ? {
                    $mul: {
                        'zonePricing.zoneA.basePrice': 1 + adjustmentValue / 100,
                        'zonePricing.zoneA.additionalPricePerKg': 1 + adjustmentValue / 100,
                        'zonePricing.zoneB.basePrice': 1 + adjustmentValue / 100,
                        'zonePricing.zoneB.additionalPricePerKg': 1 + adjustmentValue / 100,
                        'zonePricing.zoneC.basePrice': 1 + adjustmentValue / 100,
                        'zonePricing.zoneC.additionalPricePerKg': 1 + adjustmentValue / 100,
                        'zonePricing.zoneD.basePrice': 1 + adjustmentValue / 100,
                        'zonePricing.zoneD.additionalPricePerKg': 1 + adjustmentValue / 100,
                        'zonePricing.zoneE.basePrice': 1 + adjustmentValue / 100,
                        'zonePricing.zoneE.additionalPricePerKg': 1 + adjustmentValue / 100,
                    }
                }
                : {
                    $inc: {
                        'zonePricing.zoneA.basePrice': adjustmentValue,
                        'zonePricing.zoneA.additionalPricePerKg': adjustmentValue,
                        'zonePricing.zoneB.basePrice': adjustmentValue,
                        'zonePricing.zoneB.additionalPricePerKg': adjustmentValue,
                        'zonePricing.zoneC.basePrice': adjustmentValue,
                        'zonePricing.zoneC.additionalPricePerKg': adjustmentValue,
                        'zonePricing.zoneD.basePrice': adjustmentValue,
                        'zonePricing.zoneD.additionalPricePerKg': adjustmentValue,
                        'zonePricing.zoneE.basePrice': adjustmentValue,
                        'zonePricing.zoneE.additionalPricePerKg': adjustmentValue,
                    }
                };

            const zonePricingIds = rateCards
                .filter((card: any) => !!card.zonePricing && Object.keys(card.zonePricing || {}).length > 0)
                .map((card: any) => card._id);

            if (zonePricingIds.length !== rateCards.length) {
                throw new ValidationError('Some rate cards do not have zone pricing configured');
            }

            await RateCard.updateMany(
                { _id: { $in: zonePricingIds } },
                zonePricingUpdateQuery as any
            );
            updatedCount = zonePricingIds.length;
        }

        await createAuditLog(
            auth.userId,
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

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
            auth.userId,
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

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
            auth.userId,
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;

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
            auth.userId,
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
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const companyId = auth.companyId;
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
            auth.userId,
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

export const previewRateCardSelection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const input = {
            companyId: auth.companyId,
            customerId: req.query.customerId as string,
            customerGroup: req.query.customerGroup as string,
            effectiveDate: req.query.effectiveDate ? new Date(req.query.effectiveDate as string) : new Date(),
            carrier: req.query.carrier as string,
            serviceType: req.query.serviceType as string
        };

        const result = await RateCardSelectorService.selectRateCard(input);
        sendSuccess(res, { selection: result }, 'Rate card selection preview generated');
    } catch (error) {
        // If not found, returning null selection is also valid for preview
        if (error instanceof NotFoundError) {
            sendSuccess(res, { selection: null }, 'No applicable rate card found');
            return;
        }
        logger.error('Error previewing rate card selection:', error);
        next(error);
    }
};

export const simulateRateCardChange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const simulationService = new RateCardSimulationService();
        const input: SimulationInput = {
            companyId: auth.companyId,
            proposedRateCardId: req.body.proposedRateCardId,
            baselineRateCardId: req.body.baselineRateCardId,
            sampleSize: req.body.sampleSize,
            dateRange: req.body.dateRange ? {
                start: new Date(req.body.dateRange.start),
                end: new Date(req.body.dateRange.end)
            } : undefined,
            filters: req.body.filters
        };

        const result = await simulationService.simulateRateCardChange(input);
        sendSuccess(res, { simulation: result }, 'Rate card simulation completed');
    } catch (error) {
        logger.error('Error simulating rate card change:', error);
        next(error);
    }
};

export const getApplicableRateCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const effectiveDate = req.query.effectiveDate ? new Date(req.query.effectiveDate as string) : new Date();

        const rateCards = await RateCard.find({
            status: 'active',
            isDeleted: false,
            $and: [
                { $or: [{ companyId: auth.companyId }, { scope: 'global' }] },
                { 'effectiveDates.startDate': { $lte: effectiveDate } },
                {
                    $or: [
                        { 'effectiveDates.endDate': { $exists: false } },
                        { 'effectiveDates.endDate': { $gte: effectiveDate } }
                    ]
                }
            ]
        }).sort({ priority: -1 }).lean();

        sendSuccess(res, { rateCards }, 'Applicable rate cards retrieved');
    } catch (error) {
        logger.error('Error fetching applicable rate cards:', error);
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
    previewPrice,
    previewRateCardSelection,
    simulateRateCardChange,
    getApplicableRateCards
};
