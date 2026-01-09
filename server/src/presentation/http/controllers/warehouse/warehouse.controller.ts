import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Warehouse, IWarehouse } from '../../../../infrastructure/database/mongoose/models';
import { User } from '../../../../infrastructure/database/mongoose/models';
import { Company } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import mongoose from 'mongoose';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { formatOperatingHours } from '../../../../shared/helpers/formatOperatingHours';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendPaginated,
  sendCreated,
  calculatePagination
} from '../../../../shared/utils/responseHelper';

// Validation schemas
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

export const createWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const companyId = req.params.companyId || req.user.companyId;
    if (!companyId) {
      sendError(res, 'No company ID provided', 403, 'NO_COMPANY');
      return;
    }

    if (req.params.companyId && req.user.companyId !== req.params.companyId && req.user.role !== 'admin') {
      sendError(res, 'You do not have permission to create warehouses for this company', 403, 'INSUFFICIENT_PERMISSIONS');
      return;
    }

    if (req.body.operatingHours) {
      req.body.operatingHours = processOperatingHours(req.body.operatingHours);
    }

    const requestBody = { ...req.body };
    if (requestBody.contactPerson && !requestBody.contactInfo) {
      requestBody.contactInfo = {
        name: requestBody.contactPerson.name,
        phone: requestBody.contactPerson.phone,
        email: requestBody.contactPerson.email,
      };
    }

    const validation = createWarehouseSchema.safeParse(requestBody);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const existingWarehouse = await Warehouse.findOne({
      name: validation.data.name,
      companyId: companyId,
      isDeleted: false,
    }).lean();

    if (existingWarehouse) {
      sendError(res, 'Warehouse with this name already exists', 400, 'DUPLICATE_WAREHOUSE');
      return;
    }

    const warehouseData: any = {
      ...validation.data,
      companyId: companyId,
      isActive: true,
      isDeleted: false,
    };

    if (!warehouseData.contactInfo && validation.data.contactPerson) {
      warehouseData.contactInfo = {
        name: validation.data.contactPerson.name,
        phone: validation.data.contactPerson.phone,
        email: validation.data.contactPerson.email,
      };
    }

    const warehouse = new Warehouse(warehouseData);
    await warehouse.save();

    const warehouseCount = await Warehouse.countDocuments({
      companyId: companyId,
      isDeleted: false,
    });

    if (warehouseCount === 1 || validation.data.isDefault) {
      if (warehouseCount > 1) {
        await Warehouse.updateMany(
          { companyId: companyId, _id: { $ne: warehouse._id }, isDeleted: false },
          { $set: { isDefault: false } }
        );
      }
      warehouse.isDefault = true;
      await warehouse.save();
      await Company.findByIdAndUpdate(companyId, { 'settings.defaultWarehouseId': warehouse._id });
    }

    await createAuditLog(req.user._id, companyId, 'create', 'warehouse', String(warehouse._id), { message: 'Warehouse created' }, req);

    const warehouseObj = warehouse.toObject();
    if (warehouseObj.operatingHours) {
      (warehouseObj as any).formattedHours = formatOperatingHours(warehouseObj.operatingHours);
    }

    sendCreated(res, { warehouse: warehouseObj }, 'Warehouse created successfully');
  } catch (error) {
    logger.error('Error creating warehouse:', error);
    next(error);
  }
};

export const getWarehouses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const companyId = req.params.companyId || req.user.companyId;
    if (!companyId) {
      sendError(res, 'No company ID provided', 403, 'NO_COMPANY');
      return;
    }

    if (req.params.companyId && req.user.companyId !== req.params.companyId && req.user.role !== 'admin') {
      sendError(res, 'You do not have permission to view warehouses for this company', 403, 'INSUFFICIENT_PERMISSIONS');
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const filter: any = { companyId: companyId, isDeleted: false };
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { 'address.city': { $regex: req.query.search, $options: 'i' } },
        { 'address.postalCode': { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [warehouses, total] = await Promise.all([
      Warehouse.find(filter).sort({ isDefault: -1, name: 1 }).skip(skip).limit(limit).lean(),
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
    logger.error('Error fetching warehouses:', error);
    next(error);
  }
};

export const getWarehouseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    if (!req.user.companyId) {
      sendError(res, 'User is not associated with any company', 403, 'NO_COMPANY');
      return;
    }

    const warehouseId = req.params.warehouseId;
    if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
      sendError(res, 'Invalid warehouse ID format', 400, 'INVALID_ID');
      return;
    }

    const warehouse = await Warehouse.findOne({
      _id: warehouseId,
      companyId: req.user.companyId,
      isDeleted: false,
    }).lean();

    if (!warehouse) {
      sendError(res, 'Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
      return;
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
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    if (!req.user.companyId) {
      sendError(res, 'User is not associated with any company', 403, 'NO_COMPANY');
      return;
    }

    const warehouseId = req.params.warehouseId;
    if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
      sendError(res, 'Invalid warehouse ID format', 400, 'INVALID_ID');
      return;
    }

    if (req.body.operatingHours) {
      req.body.operatingHours = processOperatingHours(req.body.operatingHours);
    }

    const validation = updateWarehouseSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const warehouse = await Warehouse.findOne({
      _id: warehouseId,
      companyId: req.user.companyId,
      isDeleted: false,
    });

    if (!warehouse) {
      sendError(res, 'Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
      return;
    }

    if (validation.data.name && validation.data.name !== warehouse.name) {
      const existingWarehouse = await Warehouse.findOne({
        name: validation.data.name,
        companyId: req.user.companyId,
        _id: { $ne: warehouseId },
        isDeleted: false,
      }).lean();

      if (existingWarehouse) {
        sendError(res, 'Warehouse with this name already exists', 400, 'DUPLICATE_WAREHOUSE');
        return;
      }
    }

    if (validation.data.isDefault === true) {
      await Warehouse.updateMany(
        { companyId: req.user.companyId, _id: { $ne: warehouseId }, isDeleted: false },
        { $set: { isDefault: false } }
      );
      await Company.findByIdAndUpdate(req.user.companyId, { 'settings.defaultWarehouseId': warehouseId });
    } else if (validation.data.isDefault === false && warehouse.isDefault) {
      sendError(res, 'Cannot unset the default warehouse. Set another warehouse as default first.', 400, 'CANNOT_UNSET_DEFAULT');
      return;
    }

    const updatedWarehouse = await Warehouse.findByIdAndUpdate(
      warehouseId,
      { $set: validation.data },
      { new: true, runValidators: true }
    );

    if (!updatedWarehouse) {
      sendError(res, 'Warehouse not found after update', 404, 'WAREHOUSE_NOT_FOUND');
      return;
    }

    await createAuditLog(req.user._id, req.user.companyId, 'update', 'warehouse', warehouseId, { message: 'Warehouse updated' }, req);

    const warehouseObj = updatedWarehouse.toObject();
    if (warehouseObj.operatingHours) {
      (warehouseObj as any).formattedHours = formatOperatingHours(warehouseObj.operatingHours);
    }

    sendSuccess(res, { warehouse: warehouseObj }, 'Warehouse updated successfully');
  } catch (error) {
    logger.error('Error updating warehouse:', error);
    next(error);
  }
};

export const deleteWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    if (!req.user.companyId) {
      sendError(res, 'User is not associated with any company', 403, 'NO_COMPANY');
      return;
    }

    const warehouseId = req.params.warehouseId;
    if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
      sendError(res, 'Invalid warehouse ID format', 400, 'INVALID_ID');
      return;
    }

    const autoAssignDefault = req.query.autoAssignDefault === 'true';

    const warehouse = await Warehouse.findOne({
      _id: warehouseId,
      companyId: req.user.companyId,
      isDeleted: false,
    });

    if (!warehouse) {
      sendError(res, 'Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
      return;
    }

    if (warehouse.isDefault) {
      const otherWarehousesCount = await Warehouse.countDocuments({
        companyId: req.user.companyId,
        _id: { $ne: warehouseId },
        isDeleted: false,
      });

      if (otherWarehousesCount === 0) {
        sendError(res, 'Cannot delete the default warehouse as it is the only warehouse', 400, 'ONLY_WAREHOUSE');
        return;
      }

      if (autoAssignDefault) {
        const anotherWarehouse = await Warehouse.findOne({
          companyId: req.user.companyId,
          _id: { $ne: warehouseId },
          isDeleted: false,
        }).sort({ createdAt: -1 });

        if (anotherWarehouse) {
          anotherWarehouse.isDefault = true;
          await anotherWarehouse.save();
          await Company.findByIdAndUpdate(req.user.companyId, { 'settings.defaultWarehouseId': anotherWarehouse._id });
          await createAuditLog(req.user._id, req.user.companyId, 'update', 'warehouse', String(anotherWarehouse._id), { message: 'Warehouse set as default automatically' }, req);
        }
      } else {
        sendError(res, 'Cannot delete the default warehouse. Set another warehouse as default first or add ?autoAssignDefault=true', 400, 'CANNOT_DELETE_DEFAULT');
        return;
      }
    }

    warehouse.isDeleted = true;
    warehouse.isActive = false;
    await warehouse.save();

    await createAuditLog(req.user._id, req.user.companyId, 'delete', 'warehouse', warehouseId, { message: 'Warehouse deleted' }, req);

    sendSuccess(res, null, 'Warehouse deleted successfully');
  } catch (error) {
    logger.error('Error deleting warehouse:', error);
    next(error);
  }
};

export const importWarehouses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const companyId = req.params.companyId || req.user.companyId;
    if (!companyId) {
      sendError(res, 'No company ID provided', 403, 'NO_COMPANY');
      return;
    }

    if (req.params.companyId && req.user.companyId !== req.params.companyId && req.user.role !== 'admin') {
      sendError(res, 'You do not have permission to import warehouses for this company', 403, 'INSUFFICIENT_PERMISSIONS');
      return;
    }

    if (!req.file) {
      sendError(res, 'CSV file is required', 400, 'FILE_REQUIRED');
      return;
    }

    const results: any[] = [];
    const errors: any[] = [];
    const stream = Readable.from(req.file.buffer.toString());

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        const warehouses = [];
        for (const row of results) {
          try {
            if (!row.name || !row.address_line1 || !row.city || !row.state || !row.postal_code || !row.contact_name || !row.contact_phone) {
              errors.push({ row, error: 'Missing required fields' });
              continue;
            }

            const existingWarehouse = await Warehouse.findOne({
              name: row.name,
              companyId: companyId,
              isDeleted: false,
            }).lean();

            if (existingWarehouse) {
              errors.push({ row, error: 'Warehouse with this name already exists' });
              continue;
            }

            let operatingHours;
            if (row.monday_open || row.tuesday_open || row.wednesday_open || row.thursday_open || row.friday_open || row.saturday_open || row.sunday_open) {
              operatingHours = processOperatingHours({
                monday: { open: row.monday_open || null, close: row.monday_close || null },
                tuesday: { open: row.tuesday_open || null, close: row.tuesday_close || null },
                wednesday: { open: row.wednesday_open || null, close: row.wednesday_close || null },
                thursday: { open: row.thursday_open || null, close: row.thursday_close || null },
                friday: { open: row.friday_open || null, close: row.friday_close || null },
                saturday: { open: row.saturday_open || null, close: row.saturday_close || null },
                sunday: { open: row.sunday_open || null, close: row.sunday_close || null }
              });
            }

            const warehouse = new Warehouse({
              name: row.name,
              companyId: companyId,
              address: {
                line1: row.address_line1,
                line2: row.address_line2 || '',
                city: row.city,
                state: row.state,
                country: row.country || 'India',
                postalCode: row.postal_code,
              },
              contactInfo: {
                name: row.contact_name,
                phone: row.contact_phone,
                email: row.contact_email || '',
                alternatePhone: row.alternate_phone || '',
              },
              operatingHours,
              isActive: true,
              isDefault: false,
              isDeleted: false,
            });

            await warehouse.save();
            warehouses.push(warehouse);

            await createAuditLog(req.user!._id, companyId, 'create', 'warehouse', String(warehouse._id), { message: 'Warehouse imported from CSV' }, req);
          } catch (error) {
            errors.push({ row, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        sendSuccess(res, { warehouses, errors, imported: warehouses.length, failed: errors.length }, `Imported ${warehouses.length} warehouses with ${errors.length} errors`);
      });
  } catch (error) {
    logger.error('Error importing warehouses:', error);
    next(error);
  }
};

export default {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  importWarehouses,
};
