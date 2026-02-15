import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Warehouse } from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import { formatOperatingHours } from '../../../../shared/helpers/formatOperatingHours';
import logger from '../../../../shared/logger/winston.logger';
import {
calculatePagination,
sendPaginated,
sendSuccess
} from '../../../../shared/utils/responseHelper';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';

// Reusing schemas if possible, or defining new ones if admin has different validation requirements
// For now, assuming admin updates use same schema
const createWarehouseSchema = z.object({
    name: z.string().min(2),
    code: z.string().optional(),
    type: z.string().optional(),
    address: z.object({
        line1: z.string().min(3),
        line2: z.string().optional(),
        city: z.string().min(2),
        state: z.string().min(2),
        country: z.string().min(2).default('India'),
        postalCode: z.string().min(5),
        coordinates: z.object({
            latitude: z.number(),
            longitude: z.number(),
        }).optional(),
    }),
    contactInfo: z.object({
        name: z.string().min(2),
        phone: z.string().min(10),
        email: z.string().email().optional(),
        alternatePhone: z.string().optional(),
    }).optional(),
    contactPerson: z.object({
        name: z.string().min(2),
        phone: z.string().min(10),
        email: z.string().email().optional(),
    }).optional(),
    capacity: z.object({
        area: z.number().optional(),
        areaUnit: z.string().optional(),
        storageCapacity: z.number().optional(),
        storageUnit: z.string().optional(),
    }).optional(),
    operatingHours: z.object({
        monday: z.object({ open: z.string().nullable(), close: z.string().nullable() }),
        tuesday: z.object({ open: z.string().nullable(), close: z.string().nullable() }),
        wednesday: z.object({ open: z.string().nullable(), close: z.string().nullable() }),
        thursday: z.object({ open: z.string().nullable(), close: z.string().nullable() }),
        friday: z.object({ open: z.string().nullable(), close: z.string().nullable() }),
        saturday: z.object({ open: z.string().nullable(), close: z.string().nullable() }),
        sunday: z.object({ open: z.string().nullable(), close: z.string().nullable() }),
    }).optional(),
    isDefault: z.boolean().optional(),
});

const updateWarehouseSchema = createWarehouseSchema.partial();

const processOperatingHours = (operatingHours?: any) => {
    if (!operatingHours) return undefined;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const processed: any = {};
    days.forEach(day => {
        if (!operatingHours[day]) {
            processed[day] = { open: null, close: null };
        } else {
            processed[day] = {
                open: operatingHours[day].open || null,
                close: operatingHours[day].close || null
            };
            if (!processed[day].open || !processed[day].close) {
                processed[day] = { open: null, close: null };
            }
        }
    });
    return processed;
};

/**
 * Get all warehouses (Admin View)
 * Can see warehouses from ALL companies
 */
export const getAllWarehouses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
void auth;

        // Admin check is handled by middleware in routes, but good to be explicit or use it for logic
        // if (!auth.isAdmin && !auth.isSuperAdmin) ... (middleware should catch this)

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
        const skip = (page - 1) * limit;

        const filter: any = { isDeleted: false };

        // Admin filters
        if (req.query.companyId) {
            filter.companyId = req.query.companyId;
        }

        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { 'address.city': { $regex: req.query.search, $options: 'i' } },
                { 'address.postalCode': { $regex: req.query.search, $options: 'i' } },
            ];
        }

        // Populate company details for admin view
        const [warehouses, total] = await Promise.all([
            Warehouse.find(filter)
                .populate('companyId', 'name email phone') // Helpful for admin to know who owns the warehouse
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Warehouse.countDocuments(filter),
        ]);

        const formattedWarehouses = warehouses.map(warehouse => {
            if (warehouse.operatingHours) {
                (warehouse as any).formattedHours = formatOperatingHours(warehouse.operatingHours);
            }
            return warehouse;
        });

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, formattedWarehouses, pagination, 'Warehouses retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin warehouses:', error);
        next(error);
    }
};

export const getWarehouseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
void auth;

        const warehouseId = req.params.warehouseId;
        if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
            throw new ValidationError('Invalid warehouse ID format');
        }

        // Admin can view ANY warehouse
        const warehouse = await Warehouse.findOne({
            _id: warehouseId,
            isDeleted: false,
        })
            .populate('companyId', 'name email phone')
            .lean();

        if (!warehouse) {
            throw new NotFoundError('Warehouse', ErrorCode.RES_WAREHOUSE_NOT_FOUND);
        }

        if (warehouse.operatingHours) {
            (warehouse as any).formattedHours = formatOperatingHours(warehouse.operatingHours);
        }

        sendSuccess(res, { warehouse }, 'Warehouse retrieved successfully');
    } catch (error) {
        logger.error('Error fetching warehouse:', error);
        next(error);
    }
};

export const updateWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        const warehouseId = req.params.warehouseId;
        if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
            throw new ValidationError('Invalid warehouse ID format');
        }

        if (req.body.operatingHours) {
            req.body.operatingHours = processOperatingHours(req.body.operatingHours);
        }

        const validation = updateWarehouseSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.error.errors);
        }

        // Admin can update ANY warehouse
        const warehouse = await Warehouse.findOne({
            _id: warehouseId,
            isDeleted: false,
        });

        if (!warehouse) {
            throw new NotFoundError('Warehouse', ErrorCode.RES_WAREHOUSE_NOT_FOUND);
        }

        // Name uniqueness check (scoped to company of the warehouse, not admin's company)
        if (validation.data.name && validation.data.name !== warehouse.name) {
            const existingWarehouse = await Warehouse.findOne({
                name: validation.data.name,
                companyId: warehouse.companyId, // Check against the warehouse's owner company
                _id: { $ne: warehouseId },
                isDeleted: false,
            }).lean();

            if (existingWarehouse) {
                // Technically strict conflict, but maybe relax for admin if needed. Sticking to safe.
                throw new ValidationError('Warehouse with this name already exists for this company');
            }
        }

        const updatedWarehouse = await Warehouse.findByIdAndUpdate(
            warehouseId,
            { $set: validation.data },
            { new: true, runValidators: true }
        );

        await createAuditLog(auth.userId, auth.companyId || 'admin', 'update', 'warehouse', warehouseId, { message: 'Warehouse updated by Admin' }, req);

        sendSuccess(res, { warehouse: updatedWarehouse?.toObject() }, 'Warehouse updated successfully');
    } catch (error) {
        logger.error('Error updating warehouse:', error);
        next(error);
    }
};

export const deleteWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        const warehouseId = req.params.warehouseId;
        if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
            throw new ValidationError('Invalid warehouse ID format');
        }

        const warehouse = await Warehouse.findOne({
            _id: warehouseId,
            isDeleted: false,
        });

        if (!warehouse) {
            throw new NotFoundError('Warehouse', ErrorCode.RES_WAREHOUSE_NOT_FOUND);
        }

        // Logic for default warehouse deletion prevention (same as regular controller but admin override logic could exist)
        if (warehouse.isDefault) {
            throw new ValidationError('Cannot delete the default warehouse via Admin API yet. Please change default first.');
        }

        warehouse.isDeleted = true;
        warehouse.isActive = false;
        await warehouse.save();

        await createAuditLog(auth.userId, auth.companyId || 'admin', 'delete', 'warehouse', warehouseId, { message: 'Warehouse deleted by Admin' }, req);

        sendSuccess(res, null, 'Warehouse deleted successfully');
    } catch (error) {
        logger.error('Error deleting warehouse:', error);
        next(error);
    }
};

export default {
    getAllWarehouses,
    getWarehouseById,
    updateWarehouse,
    deleteWarehouse
};
