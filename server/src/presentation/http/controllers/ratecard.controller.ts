import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import RateCard, { IRateCard } from '../../../infrastructure/database/mongoose/models/RateCard';
import Zone from '../../../infrastructure/database/mongoose/models/Zone';
import { AuthRequest } from '../middleware/auth';
import logger from '../../../shared/logger/winston.logger';
import { createAuditLog } from '../middleware/auditLog';
import mongoose from 'mongoose';

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

/**
 * Validate weight slabs don't overlap
 */
const validateWeightSlabs = (rules: Array<{ minWeight: number; maxWeight: number }>): boolean => {
    if (rules.length <= 1) return true;

    const sorted = [...rules].sort((a, b) => a.minWeight - b.minWeight);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].minWeight < sorted[i - 1].maxWeight) {
            return false; // Overlap detected
        }
    }
    return true;
};

/**
 * Create a new rate card
 * @route POST /api/v1/ratecards
 */
export const createRateCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const validatedData = createRateCardSchema.parse(req.body);

        // Validate weight slabs
        if (validatedData.weightRules && !validateWeightSlabs(validatedData.weightRules)) {
            res.status(400).json({ message: 'Weight slabs cannot overlap' });
            return;
        }

        // Check for duplicate name
        const existingCard = await RateCard.findOne({
            name: validatedData.name,
            companyId,
            isDeleted: false,
        });

        if (existingCard) {
            res.status(400).json({ message: 'Rate card with this name already exists' });
            return;
        }

        // Convert zoneId strings to ObjectIds
        const zoneRules = validatedData.zoneRules?.map(rule => ({
            ...rule,
            zoneId: new mongoose.Types.ObjectId(rule.zoneId),
        }));

        const rateCard = new RateCard({
            ...validatedData,
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
            { message: 'Rate card created', name: validatedData.name },
            req
        );

        res.status(201).json({
            message: 'Rate card created successfully',
            rateCard,
        });
    } catch (error) {
        logger.error('Error creating rate card:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        next(error);
    }
};

/**
 * Get all rate cards
 * @route GET /api/v1/ratecards
 */
export const getRateCards = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        // Filters
        const filter: any = {
            companyId,
            isDeleted: false,
        };

        if (req.query.status) {
            filter.status = req.query.status;
        }

        // Pagination
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const [rateCards, total] = await Promise.all([
            RateCard.find(filter)
                .populate('zoneRules.zoneId', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            RateCard.countDocuments(filter),
        ]);

        res.json({
            rateCards,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error('Error fetching rate cards:', error);
        next(error);
    }
};

/**
 * Get a single rate card by ID
 * @route GET /api/v1/ratecards/:id
 */
export const getRateCardById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            res.status(400).json({ message: 'Invalid rate card ID format' });
            return;
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            companyId,
            isDeleted: false,
        }).populate('zoneRules.zoneId', 'name postalCodes');

        if (!rateCard) {
            res.status(404).json({ message: 'Rate card not found' });
            return;
        }

        res.json({ rateCard });
    } catch (error) {
        logger.error('Error fetching rate card:', error);
        next(error);
    }
};

/**
 * Update a rate card
 * @route PATCH /api/v1/ratecards/:id
 */
export const updateRateCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            res.status(400).json({ message: 'Invalid rate card ID format' });
            return;
        }

        const validatedData = updateRateCardSchema.parse(req.body);

        // Validate weight slabs
        if (validatedData.weightRules && !validateWeightSlabs(validatedData.weightRules)) {
            res.status(400).json({ message: 'Weight slabs cannot overlap' });
            return;
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            companyId,
            isDeleted: false,
        });

        if (!rateCard) {
            res.status(404).json({ message: 'Rate card not found' });
            return;
        }

        // Check duplicate name if name is being changed
        if (validatedData.name && validatedData.name !== rateCard.name) {
            const existingCard = await RateCard.findOne({
                name: validatedData.name,
                companyId,
                _id: { $ne: rateCardId },
                isDeleted: false,
            });

            if (existingCard) {
                res.status(400).json({ message: 'Rate card with this name already exists' });
                return;
            }
        }

        // Update fields
        Object.assign(rateCard, validatedData);

        // Convert zoneId strings to ObjectIds if provided
        if (validatedData.zoneRules) {
            rateCard.zoneRules = validatedData.zoneRules.map(rule => ({
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
            { message: 'Rate card updated', changes: Object.keys(validatedData) },
            req
        );

        res.json({
            message: 'Rate card updated successfully',
            rateCard,
        });
    } catch (error) {
        logger.error('Error updating rate card:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        next(error);
    }
};

/**
 * Calculate shipping rate
 * @route POST /api/v1/ratecards/calculate
 */
export const calculateRate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const validatedData = calculateRateSchema.parse(req.body);

        // Get active rate card
        const rateCard = await RateCard.findOne({
            companyId,
            status: 'active',
            isDeleted: false,
        }).populate('zoneRules.zoneId', 'name postalCodes');

        if (!rateCard) {
            res.status(404).json({ message: 'No active rate card found' });
            return;
        }

        const weight = validatedData.weight;
        const carrier = validatedData.carrier || 'Delhivery';
        const serviceType = validatedData.serviceType;

        // Find applicable base rate
        const baseRate = rateCard.baseRates.find(
            r =>
                r.carrier.toLowerCase() === carrier.toLowerCase() &&
                r.serviceType.toLowerCase() === serviceType &&
                weight >= r.minWeight &&
                weight <= r.maxWeight
        );

        let calculatedRate = baseRate?.basePrice || 50; // Default base

        // Apply weight rules
        const weightRule = rateCard.weightRules.find(
            r => weight >= r.minWeight && weight <= r.maxWeight
        );

        if (weightRule) {
            calculatedRate += weight * weightRule.pricePerKg;
        }

        // Apply zone pricing if destination provided
        let zoneName = 'Unknown';
        if (validatedData.destinationPincode && rateCard.zoneRules) {
            // Find matching zone
            const zone = await Zone.findOne({
                companyId,
                postalCodes: { $regex: `^${validatedData.destinationPincode.slice(0, 3)}` },
                isDeleted: false,
            });

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

        res.json({
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
        });
    } catch (error) {
        logger.error('Error calculating rate:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
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
