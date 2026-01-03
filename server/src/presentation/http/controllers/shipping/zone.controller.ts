import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Zone, IZone } from '../../../../infrastructure/database/mongoose/models';
import { AuthRequest } from '../../middleware/auth/auth';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
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
const transitTimeSchema = z.object({
    carrier: z.string().min(1),
    serviceType: z.string().min(1),
    minDays: z.number().int().min(0),
    maxDays: z.number().int().min(0),
});

const createZoneSchema = z.object({
    name: z.string().min(2),
    postalCodes: z.array(z.string()).min(1),
    serviceability: z.object({
        carriers: z.array(z.string()).min(1),
        serviceTypes: z.array(z.string()).min(1),
    }),
    transitTimes: z.array(transitTimeSchema).optional(),
});

const updateZoneSchema = createZoneSchema.partial();

/**
 * Check for overlapping postal codes across zones
 */
const checkPincodeOverlap = async (
    companyId: string,
    postalCodes: string[],
    excludeZoneId?: string
): Promise<{ overlaps: boolean; conflictingZone?: string }> => {
    const query: any = {
        companyId,
        isDeleted: false,
        postalCodes: { $in: postalCodes },
    };

    if (excludeZoneId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeZoneId) };
    }

    const existingZone = await Zone.findOne(query).select('name postalCodes').lean();

    if (existingZone) {
        return { overlaps: true, conflictingZone: existingZone.name };
    }

    return { overlaps: false };
};

/**
 * Get all zones
 * @route GET /api/v1/zones
 */
export const getZones = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

        // Pagination
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const filter: any = {
            companyId,
            isDeleted: false,
        };

        // Search by name or pincode
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { postalCodes: { $regex: req.query.search, $options: 'i' } },
            ];
        }

        const [zones, total] = await Promise.all([
            Zone.find(filter)
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Zone.countDocuments(filter),
        ]);

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, zones, pagination, 'Zones retrieved successfully');
    } catch (error) {
        logger.error('Error fetching zones:', error);
        next(error);
    }
};

/**
 * Create a new zone
 * @route POST /api/v1/zones
 */
export const createZone = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

        const validation = createZoneSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        // Check for duplicate name
        const existingName = await Zone.findOne({
            name: validation.data.name,
            companyId,
            isDeleted: false,
        }).lean();

        if (existingName) {
            sendError(res, 'Zone with this name already exists', 400, 'DUPLICATE_ZONE_NAME');
            return;
        }

        // Check for overlapping postal codes
        const { overlaps, conflictingZone } = await checkPincodeOverlap(companyId, validation.data.postalCodes);
        if (overlaps) {
            sendError(res, `Postal codes overlap with existing zone: ${conflictingZone}`, 400, 'POSTAL_CODE_OVERLAP');
            return;
        }

        const zone = new Zone({
            ...validation.data,
            companyId,
        });

        await zone.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'create',
            'zone',
            String(zone._id),
            { message: 'Zone created', name: validation.data.name },
            req
        );

        sendCreated(res, { zone }, 'Zone created successfully');
    } catch (error) {
        logger.error('Error creating zone:', error);
        next(error);
    }
};

/**
 * Get a zone by ID
 * @route GET /api/v1/zones/:id
 */
export const getZoneById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

        const zoneId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(zoneId)) {
            sendError(res, 'Invalid zone ID format', 400, 'INVALID_ID');
            return;
        }

        const zone = await Zone.findOne({
            _id: zoneId,
            companyId,
            isDeleted: false,
        }).lean();

        if (!zone) {
            sendError(res, 'Zone not found', 404, 'ZONE_NOT_FOUND');
            return;
        }

        sendSuccess(res, { zone }, 'Zone retrieved successfully');
    } catch (error) {
        logger.error('Error fetching zone:', error);
        next(error);
    }
};

/**
 * Update a zone
 * @route PATCH /api/v1/zones/:id
 */
export const updateZone = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

        const zoneId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(zoneId)) {
            sendError(res, 'Invalid zone ID format', 400, 'INVALID_ID');
            return;
        }

        const validation = updateZoneSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        const zone = await Zone.findOne({
            _id: zoneId,
            companyId,
            isDeleted: false,
        });

        if (!zone) {
            sendError(res, 'Zone not found', 404, 'ZONE_NOT_FOUND');
            return;
        }

        // Check duplicate name if name is being changed
        if (validation.data.name && validation.data.name !== zone.name) {
            const existingName = await Zone.findOne({
                name: validation.data.name,
                companyId,
                _id: { $ne: zoneId },
                isDeleted: false,
            }).lean();

            if (existingName) {
                sendError(res, 'Zone with this name already exists', 400, 'DUPLICATE_ZONE_NAME');
                return;
            }
        }

        // Check for overlapping postal codes if being updated
        if (validation.data.postalCodes) {
            const { overlaps, conflictingZone } = await checkPincodeOverlap(companyId, validation.data.postalCodes, zoneId);
            if (overlaps) {
                sendError(res, `Postal codes overlap with existing zone: ${conflictingZone}`, 400, 'POSTAL_CODE_OVERLAP');
                return;
            }
        }

        // Update fields
        Object.assign(zone, validation.data);
        await zone.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'update',
            'zone',
            zoneId,
            { message: 'Zone updated', changes: Object.keys(validation.data) },
            req
        );

        sendSuccess(res, { zone }, 'Zone updated successfully');
    } catch (error) {
        logger.error('Error updating zone:', error);
        next(error);
    }
};

export default {
    getZones,
    createZone,
    getZoneById,
    updateZone,
};
