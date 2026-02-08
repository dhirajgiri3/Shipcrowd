/**
 * Admin Rate Card Controller
 *
 * Platform-wide rate card management for admins and super admins.
 * Allows viewing, creating, updating, and managing rate cards across all companies.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RateCard, AuditLog } from '../../../../infrastructure/database/mongoose/models';
import Shipment from '../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import mongoose from 'mongoose';
import {
    guardChecks,
    requirePlatformAdmin,
} from '../../../../shared/helpers/controller.helpers';
import {
    sendSuccess,
    sendPaginated,
    sendCreated,
    calculatePagination
} from '../../../../shared/utils/responseHelper';
import { ValidationError, NotFoundError, ConflictError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
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

const createAdminRateCardSchema = z.object({
    name: z.string().min(2),
    companyId: z.string().min(1), // Admin must specify company
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

const updateAdminRateCardSchema = createAdminRateCardSchema.partial();

/**
 * Get all rate cards (platform-wide)
 * Admin can see rate cards across all companies
 *
 * @route GET /api/v1/admin/ratecards
 * @access Admin, Super Admin
 */
export const getAdminRateCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        // Build filter
        const filter: any = { isDeleted: false };

        // Optional filters
        if (req.query.status) filter.status = req.query.status;
        if (req.query.companyId) filter.companyId = new mongoose.Types.ObjectId(req.query.companyId as string);
        if (req.query.search) {
            filter.name = { $regex: req.query.search, $options: 'i' };
        }
        if (req.query.category) {
            filter.rateCardCategory = req.query.category;
        }
        if (req.query.carrier) {
            filter['baseRates.carrier'] = req.query.carrier;
        }

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const [rateCards, total] = await Promise.all([
            RateCard.find(filter)
                .populate('zoneRules.zoneId', 'name')
                .populate('companyId', 'name email phone') // Include company details
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            RateCard.countDocuments(filter),
        ]);

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, rateCards, pagination, 'Rate cards retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin rate cards:', error);
        next(error);
    }
};

/**
 * Get single rate card by ID (any company)
 *
 * @route GET /api/v1/admin/ratecards/:id
 * @access Admin, Super Admin
 */
export const getAdminRateCardById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            isDeleted: false,
        })
            .populate('zoneRules.zoneId', 'name postalCodes')
            .populate('companyId', 'name email phone')
            .lean();

        if (!rateCard) {
            throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        sendSuccess(res, { rateCard }, 'Rate card retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin rate card:', error);
        next(error);
    }
};

/**
 * Get rate card analytics (any company)
 *
 * @route GET /api/v1/admin/ratecards/:id/analytics
 * @access Admin, Super Admin
 */
export const getAdminRateCardAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            isDeleted: false,
        }).lean();

        if (!rateCard) {
            throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const stats = await RateCardAnalyticsService.getRateCardUsageStats(
            rateCardId,
            startDate,
            endDate
        );

        sendSuccess(res, { stats }, 'Rate card analytics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin rate card analytics:', error);
        next(error);
    }
};

/**
 * Get rate card revenue series (any company)
 *
 * @route GET /api/v1/admin/ratecards/:id/revenue-series
 * @access Admin, Super Admin
 */
export const getAdminRateCardRevenueSeries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            isDeleted: false,
        }).lean();

        if (!rateCard) {
            throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(req.query.endDate as string);
        const granularity = (req.query.granularity as 'day' | 'week' | 'month') || 'day';

        if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
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
        logger.error('Error fetching admin rate card revenue series:', error);
        next(error);
    }
};

/**
 * Get rate card change history via audit logs (any company)
 *
 * @route GET /api/v1/admin/ratecards/:id/history
 * @access Admin, Super Admin
 */
export const getAdminRateCardHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            AuditLog.find({
                resource: 'ratecard',
                resourceId: rateCardId,
                isDeleted: false,
            })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email')
                .lean(),
            AuditLog.countDocuments({
                resource: 'ratecard',
                resourceId: rateCardId,
                isDeleted: false,
            }),
        ]);

        const formattedLogs = logs.map(log => ({
            id: log._id,
            user: log.userId,
            action: log.action,
            resource: log.resource,
            resourceId: log.resourceId,
            details: log.details,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            timestamp: log.timestamp,
        }));

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, formattedLogs, pagination, 'Rate card history retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin rate card history:', error);
        next(error);
    }
};

/**
 * Create rate card for a specific company
 *
 * @route POST /api/v1/admin/ratecards
 * @access Admin, Super Admin
 */
export const createAdminRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const validation = createAdminRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        // Validate companyId
        if (!mongoose.Types.ObjectId.isValid(validation.data.companyId)) {
            throw new ValidationError('Invalid company ID format');
        }

        const companyId = validation.data.companyId;

        // Check for duplicate name in the same company
        const existingCard = await RateCard.findOne({
            name: validation.data.name,
            companyId,
            isDeleted: false,
        }).lean();

        if (existingCard) {
            throw new ConflictError('Rate card with this name already exists for this company', ErrorCode.BIZ_ALREADY_EXISTS);
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
            auth.userId,
            companyId,
            'create',
            'ratecard',
            String(rateCard._id),
            { message: 'Rate card created by admin', name: validation.data.name },
            req
        );

        // Populate company info before returning
        await rateCard.populate('companyId', 'name email phone');

        sendCreated(res, { rateCard }, 'Rate card created successfully');
    } catch (error) {
        logger.error('Error creating admin rate card:', error);
        next(error);
    }
};

/**
 * Update rate card (any company)
 *
 * @route PATCH /api/v1/admin/ratecards/:id
 * @access Admin, Super Admin
 */
export const updateAdminRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        const validation = updateAdminRateCardSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            isDeleted: false,
        });

        if (!rateCard) {
            throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        // Check for duplicate name if name is being changed
        if (validation.data.name && validation.data.name !== rateCard.name) {
            const existingCard = await RateCard.findOne({
                name: validation.data.name,
                companyId: rateCard.companyId,
                isDeleted: false,
                _id: { $ne: rateCardId },
            }).lean();

            if (existingCard) {
                throw new ConflictError('Rate card with this name already exists for this company', ErrorCode.BIZ_ALREADY_EXISTS);
            }
        }

        // Update fields
        Object.assign(rateCard, validation.data);

        if (validation.data.zoneRules) {
            rateCard.zoneRules = validation.data.zoneRules.map(rule => ({
                ...rule,
                zoneId: new mongoose.Types.ObjectId(rule.zoneId),
            })) as any;
        }

        await rateCard.save();

        await createAuditLog(
            auth.userId,
            String(rateCard.companyId),
            'update',
            'ratecard',
            String(rateCard._id),
            { message: 'Rate card updated by admin', changes: validation.data },
            req
        );

        await rateCard.populate('companyId', 'name email phone');

        sendSuccess(res, { rateCard }, 'Rate card updated successfully');
    } catch (error) {
        logger.error('Error updating admin rate card:', error);
        next(error);
    }
};

/**
 * Delete rate card (any company)
 *
 * @route DELETE /api/v1/admin/ratecards/:id
 * @access Admin, Super Admin
 */
export const deleteAdminRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        const rateCard = await RateCard.findOne({
            _id: rateCardId,
            isDeleted: false,
        });

        if (!rateCard) {
            throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        // Soft delete
        rateCard.isDeleted = true;
        await rateCard.save();

        await createAuditLog(
            auth.userId,
            String(rateCard.companyId),
            'delete',
            'ratecard',
            String(rateCard._id),
            { message: 'Rate card deleted by admin', name: rateCard.name },
            req
        );

        sendSuccess(res, { id: rateCardId }, 'Rate card deleted successfully');
    } catch (error) {
        logger.error('Error deleting admin rate card:', error);
        next(error);
    }
};

/**
 * Get platform-wide rate card statistics
 *
 * @route GET /api/v1/admin/ratecards/stats
 * @access Admin, Super Admin
 */
export const getAdminRateCardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [total, active, inactive, draft, byCompany, avgRatePerKgResult, revenue30dResult] = await Promise.all([
            RateCard.countDocuments({ isDeleted: false }),
            RateCard.countDocuments({ isDeleted: false, status: 'active' }),
            RateCard.countDocuments({ isDeleted: false, status: 'inactive' }),
            RateCard.countDocuments({ isDeleted: false, status: 'draft' }),
            RateCard.aggregate([
                { $match: { isDeleted: false } },
                { $group: { _id: '$companyId', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'companies',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'company'
                    }
                },
                { $unwind: '$company' },
                {
                    $project: {
                        companyId: '$_id',
                        companyName: '$company.name',
                        count: 1,
                        _id: 0
                    }
                }
            ]),
            RateCard.aggregate([
                { $match: { isDeleted: false, status: 'active' } },
                { $unwind: '$baseRates' },
                {
                    $project: {
                        pricePerKg: {
                            $cond: [
                                { $gt: ['$baseRates.maxWeight', 0] },
                                { $divide: ['$baseRates.basePrice', '$baseRates.maxWeight'] },
                                0
                            ]
                        }
                    }
                },
                { $group: { _id: null, avgRatePerKg: { $avg: '$pricePerKg' } } }
            ]),
            Shipment.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        createdAt: { $gte: thirtyDaysAgo },
                        'pricingDetails.totalPrice': { $exists: true },
                        'pricingDetails.rateCardId': { $exists: true }
                    }
                },
                { $group: { _id: null, revenue30d: { $sum: '$pricingDetails.totalPrice' } } }
            ])
        ]);

        const avgRatePerKg = avgRatePerKgResult?.[0]?.avgRatePerKg || 0;
        const revenue30d = revenue30dResult?.[0]?.revenue30d || 0;

        const stats = {
            total,
            active,
            inactive,
            draft,
            avgRatePerKg: Math.round(avgRatePerKg * 100) / 100,
            revenue30d: Math.round(revenue30d * 100) / 100,
            topCompanies: byCompany,
        };

        sendSuccess(res, stats, 'Rate card statistics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin rate card stats:', error);
        next(error);
    }
};

/**
 * Clone rate card (any company)
 *
 * @route POST /api/v1/admin/ratecards/:id/clone
 * @access Admin, Super Admin
 */
export const cloneAdminRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const rateCardId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(rateCardId)) {
            throw new ValidationError('Invalid rate card ID format');
        }

        const originalCard = await RateCard.findOne({
            _id: rateCardId,
            isDeleted: false,
        }).lean();

        if (!originalCard) {
            throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
        }

        // Create clone with modified name
        const cloneName = `${originalCard.name} (Copy)`;
        const { _id, createdAt, updatedAt, ...cardData } = originalCard;

        const clonedCard = new RateCard({
            ...cardData,
            name: cloneName,
            status: 'draft', // Always start as draft
        });

        await clonedCard.save();

        await createAuditLog(
            auth.userId,
            String(originalCard.companyId),
            'create',
            'ratecard',
            String(clonedCard._id),
            { message: 'Rate card cloned by admin', originalId: rateCardId },
            req
        );

        await clonedCard.populate('companyId', 'name email phone');

        sendCreated(res, { rateCard: clonedCard }, 'Rate card cloned successfully');
    } catch (error) {
        logger.error('Error cloning admin rate card:', error);
        next(error);
    }
};

export default {
    getAdminRateCards,
    getAdminRateCardById,
    getAdminRateCardAnalytics,
    getAdminRateCardRevenueSeries,
    getAdminRateCardHistory,
    createAdminRateCard,
    updateAdminRateCard,
    deleteAdminRateCard,
    getAdminRateCardStats,
    cloneAdminRateCard,
};
