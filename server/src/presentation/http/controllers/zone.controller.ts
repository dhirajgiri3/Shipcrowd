import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Zone, { IZone } from '../../../infrastructure/database/mongoose/models/Zone';
import { AuthRequest } from '../middleware/auth';
import logger from '../../../shared/logger/winston.logger';
import { createAuditLog } from '../middleware/auditLog';
import mongoose from 'mongoose';

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

    const existingZone = await Zone.findOne(query).select('name postalCodes');

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
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
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
                .limit(limit),
            Zone.countDocuments(filter),
        ]);

        res.json({
            zones,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
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
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const validatedData = createZoneSchema.parse(req.body);

        // Check for duplicate name
        const existingName = await Zone.findOne({
            name: validatedData.name,
            companyId,
            isDeleted: false,
        });

        if (existingName) {
            res.status(400).json({ message: 'Zone with this name already exists' });
            return;
        }

        // Check for overlapping postal codes
        const { overlaps, conflictingZone } = await checkPincodeOverlap(companyId, validatedData.postalCodes);
        if (overlaps) {
            res.status(400).json({
                message: `Postal codes overlap with existing zone: ${conflictingZone}`,
            });
            return;
        }

        const zone = new Zone({
            ...validatedData,
            companyId,
        });

        await zone.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'create',
            'zone',
            String(zone._id),
            { message: 'Zone created', name: validatedData.name },
            req
        );

        res.status(201).json({
            message: 'Zone created successfully',
            zone,
        });
    } catch (error) {
        logger.error('Error creating zone:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
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
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const zoneId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(zoneId)) {
            res.status(400).json({ message: 'Invalid zone ID format' });
            return;
        }

        const zone = await Zone.findOne({
            _id: zoneId,
            companyId,
            isDeleted: false,
        });

        if (!zone) {
            res.status(404).json({ message: 'Zone not found' });
            return;
        }

        res.json({ zone });
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
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const zoneId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(zoneId)) {
            res.status(400).json({ message: 'Invalid zone ID format' });
            return;
        }

        const validatedData = updateZoneSchema.parse(req.body);

        const zone = await Zone.findOne({
            _id: zoneId,
            companyId,
            isDeleted: false,
        });

        if (!zone) {
            res.status(404).json({ message: 'Zone not found' });
            return;
        }

        // Check duplicate name if name is being changed
        if (validatedData.name && validatedData.name !== zone.name) {
            const existingName = await Zone.findOne({
                name: validatedData.name,
                companyId,
                _id: { $ne: zoneId },
                isDeleted: false,
            });

            if (existingName) {
                res.status(400).json({ message: 'Zone with this name already exists' });
                return;
            }
        }

        // Check for overlapping postal codes if being updated
        if (validatedData.postalCodes) {
            const { overlaps, conflictingZone } = await checkPincodeOverlap(companyId, validatedData.postalCodes, zoneId);
            if (overlaps) {
                res.status(400).json({
                    message: `Postal codes overlap with existing zone: ${conflictingZone}`,
                });
                return;
            }
        }

        // Update fields
        Object.assign(zone, validatedData);
        await zone.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'update',
            'zone',
            zoneId,
            { message: 'Zone updated', changes: Object.keys(validatedData) },
            req
        );

        res.json({
            message: 'Zone updated successfully',
            zone,
        });
    } catch (error) {
        logger.error('Error updating zone:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        next(error);
    }
};

export default {
    getZones,
    createZone,
    getZoneById,
    updateZone,
};
