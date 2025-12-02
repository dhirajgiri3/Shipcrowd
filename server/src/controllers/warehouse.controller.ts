import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Warehouse, { IWarehouse } from '../models/Warehouse';
import User from '../models/User';
import Company from '../models/Company';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { createAuditLog } from '../middleware/auditLog';
import mongoose from 'mongoose';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { formatOperatingHours } from '../utils/formatOperatingHours';

// Define validation schemas
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
    coordinates: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .optional(),
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
  operatingHours: z
    .object({
      monday: z.object({
        open: z.string().nullable(),
        close: z.string().nullable()
      }),
      tuesday: z.object({
        open: z.string().nullable(),
        close: z.string().nullable()
      }),
      wednesday: z.object({
        open: z.string().nullable(),
        close: z.string().nullable()
      }),
      thursday: z.object({
        open: z.string().nullable(),
        close: z.string().nullable()
      }),
      friday: z.object({
        open: z.string().nullable(),
        close: z.string().nullable()
      }),
      saturday: z.object({
        open: z.string().nullable(),
        close: z.string().nullable()
      }),
      sunday: z.object({
        open: z.string().nullable(),
        close: z.string().nullable()
      }),
    })
    .optional(),
  isDefault: z.boolean().optional(),
});

const updateWarehouseSchema = createWarehouseSchema.partial();

/**
 * Create a new warehouse
 * @route POST /warehouses
 */
/**
 * Helper function to process operating hours
 * Converts empty strings to null and handles closed days
 */
const processOperatingHours = (operatingHours?: any) => {
  if (!operatingHours) return undefined;

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const processed: any = {};

  days.forEach(day => {
    if (!operatingHours[day]) {
      processed[day] = { open: null, close: null };
    } else {
      // Handle case where open or close is empty string, null, or undefined
      processed[day] = {
        open: operatingHours[day].open || null,
        close: operatingHours[day].close || null
      };

      // If either open or close is null, treat the day as closed
      if (!processed[day].open || !processed[day].close) {
        processed[day] = { open: null, close: null };
      }
    }
  });

  return processed;
};

export const createWarehouse = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Get company ID from either the URL parameter or the user's company
    const companyId = req.params.companyId || req.user.companyId;

    // Check if user has a company
    if (!companyId) {
      res.status(403).json({ message: 'No company ID provided' });
      return;
    }

    // Verify that the user belongs to the company or is an admin
    if (req.params.companyId && req.user.companyId !== req.params.companyId && req.user.role !== 'admin') {
      res.status(403).json({ message: 'You do not have permission to create warehouses for this company' });
      return;
    }

    // Process the request body to handle operating hours properly
    if (req.body.operatingHours) {
      req.body.operatingHours = processOperatingHours(req.body.operatingHours);
    }

    // Process the request body to handle contactPerson vs contactInfo
    const requestBody = { ...req.body };

    // If contactPerson is provided but contactInfo is not, map it to contactInfo
    if (requestBody.contactPerson && !requestBody.contactInfo) {
      requestBody.contactInfo = {
        name: requestBody.contactPerson.name,
        phone: requestBody.contactPerson.phone,
        email: requestBody.contactPerson.email,
      };
    }

    // Add capacity field if provided
    if (requestBody.capacity) {
      requestBody.capacity = {
        area: requestBody.capacity.area,
        areaUnit: requestBody.capacity.areaUnit,
        storageCapacity: requestBody.capacity.storageCapacity,
        storageUnit: requestBody.capacity.storageUnit,
      };
    }

    const validatedData = createWarehouseSchema.parse(requestBody);

    // Check if warehouse with same name already exists for this company
    const existingWarehouse = await Warehouse.findOne({
      name: validatedData.name,
      companyId: companyId,
      isDeleted: false,
    });

    if (existingWarehouse) {
      res.status(400).json({ message: 'Warehouse with this name already exists' });
      return;
    }

    // Create new warehouse with properly mapped fields
    const warehouseData = {
      ...validatedData,
      companyId: companyId,
      isActive: true,
      isDeleted: false,
    };

    // Ensure contactInfo is present
    if (!warehouseData.contactInfo && validatedData.contactPerson) {
      warehouseData.contactInfo = {
        name: validatedData.contactPerson.name,
        phone: validatedData.contactPerson.phone,
        email: validatedData.contactPerson.email,
      };
    }

    const warehouse = new Warehouse(warehouseData);

    await warehouse.save();

    // If this is the first warehouse or isDefault is true, set it as the default warehouse
    const warehouseCount = await Warehouse.countDocuments({
      companyId: companyId,
      isDeleted: false,
    });

    if (warehouseCount === 1 || validatedData.isDefault) {
      // Set all other warehouses as non-default
      if (warehouseCount > 1) {
        await Warehouse.updateMany(
          {
            companyId: companyId,
            _id: { $ne: warehouse._id },
            isDeleted: false,
          },
          { $set: { isDefault: false } }
        );
      }

      // Set this warehouse as default
      warehouse.isDefault = true;
      await warehouse.save();

      // Update company settings
      await Company.findByIdAndUpdate(companyId, {
        'settings.defaultWarehouseId': warehouse._id,
      });
    }

    // Convert _id to a compatible type for the audit log
    const warehouseIdForAudit = String(warehouse._id);

    await createAuditLog(
      req.user._id,
      companyId,
      'create',
      'warehouse',
      warehouseIdForAudit,
      { message: 'Warehouse created' },
      req
    );

    // Format the warehouse object for response
    const warehouseObj = warehouse.toObject();

    // Add formatted operating hours if they exist
    if (warehouseObj.operatingHours) {
      (warehouseObj as any).formattedHours = formatOperatingHours(warehouseObj.operatingHours);
    }

    res.status(201).json({
      message: 'Warehouse created successfully',
      warehouse: warehouseObj,
    });
  } catch (error) {
    logger.error('Error creating warehouse:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Get all warehouses for the current user's company
 * @route GET /warehouses
 */
export const getWarehouses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Get company ID from either the URL parameter or the user's company
    const companyId = req.params.companyId || req.user.companyId;

    // Check if user has a company
    if (!companyId) {
      res.status(403).json({ message: 'No company ID provided' });
      return;
    }

    // Verify that the user belongs to the company or is an admin
    if (req.params.companyId && req.user.companyId !== req.params.companyId && req.user.role !== 'admin') {
      res.status(403).json({ message: 'You do not have permission to view warehouses for this company' });
      return;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filtering
    const filter: any = {
      companyId: companyId,
      isDeleted: false,
    };

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { 'address.city': { $regex: req.query.search, $options: 'i' } },
        { 'address.postalCode': { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Get warehouses
    const warehouses = await Warehouse.find(filter)
      .sort({ isDefault: -1, name: 1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Warehouse.countDocuments(filter);

    // Format warehouses for response
    const formattedWarehouses = warehouses.map(warehouse => {
      const warehouseObj = warehouse.toObject();

      // Add formatted operating hours if they exist
      if (warehouseObj.operatingHours) {
        (warehouseObj as any).formattedHours = formatOperatingHours(warehouseObj.operatingHours);
      }

      return warehouseObj;
    });

    res.json({
      warehouses: formattedWarehouses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching warehouses:', error);
    next(error);
  }
};

/**
 * Get a warehouse by ID
 * @route GET /warehouses/:warehouseId
 */
export const getWarehouseById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Check if user has a company
    if (!req.user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    const warehouseId = req.params.warehouseId;
    // Convert to ObjectId if it's a valid ObjectId string
    const warehouseObjectId = mongoose.Types.ObjectId.isValid(warehouseId)
      ? new mongoose.Types.ObjectId(warehouseId)
      : warehouseId;

    // Get warehouse
    const warehouse = await Warehouse.findOne({
      _id: warehouseObjectId,
      companyId: req.user.companyId,
      isDeleted: false,
    });

    if (!warehouse) {
      res.status(404).json({ message: 'Warehouse not found' });
      return;
    }

    // Format the warehouse object for response
    const warehouseObj = warehouse.toObject();

    // Add formatted operating hours if they exist
    if (warehouseObj.operatingHours) {
      (warehouseObj as any).formattedHours = formatOperatingHours(warehouseObj.operatingHours);
    }

    res.json({ warehouse: warehouseObj });
  } catch (error) {
    logger.error('Error fetching warehouse:', error);
    next(error);
  }
};

/**
 * Update a warehouse
 * @route PATCH /warehouses/:warehouseId
 */
export const updateWarehouse = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Check if user has a company
    if (!req.user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    const warehouseId = req.params.warehouseId;
    // Convert to ObjectId if it's a valid ObjectId string
    const warehouseObjectId = mongoose.Types.ObjectId.isValid(warehouseId)
      ? new mongoose.Types.ObjectId(warehouseId)
      : warehouseId;

    // Process the request body to handle operating hours properly
    if (req.body.operatingHours) {
      req.body.operatingHours = processOperatingHours(req.body.operatingHours);
    }

    const validatedData = updateWarehouseSchema.parse(req.body);

    // Check if warehouse exists
    const warehouse = await Warehouse.findOne({
      _id: warehouseObjectId,
      companyId: req.user.companyId,
      isDeleted: false,
    });

    if (!warehouse) {
      res.status(404).json({ message: 'Warehouse not found' });
      return;
    }

    // If name is being changed, check if it's unique
    if (validatedData.name && validatedData.name !== warehouse.name) {
      const existingWarehouse = await Warehouse.findOne({
        name: validatedData.name,
        companyId: req.user.companyId,
        _id: { $ne: warehouseObjectId },
        isDeleted: false,
      });

      if (existingWarehouse) {
        res.status(400).json({ message: 'Warehouse with this name already exists' });
        return;
      }
    }

    // Handle isDefault flag
    if (validatedData.isDefault === true) {
      // Set all other warehouses as non-default
      await Warehouse.updateMany(
        {
          companyId: req.user.companyId,
          _id: { $ne: warehouseObjectId },
          isDeleted: false,
        },
        { $set: { isDefault: false } }
      );

      // Update company settings
      await Company.findByIdAndUpdate(req.user.companyId, {
        'settings.defaultWarehouseId': warehouseObjectId,
      });
    } else if (validatedData.isDefault === false && warehouse.isDefault) {
      // If trying to unset the default warehouse, prevent it
      res.status(400).json({ message: 'Cannot unset the default warehouse. Set another warehouse as default first.' });
      return;
    }

    // Update warehouse
    const updatedWarehouse = await Warehouse.findByIdAndUpdate(
      warehouseObjectId,
      { $set: validatedData },
      { new: true, runValidators: true }
    );

    if (!updatedWarehouse) {
      res.status(404).json({ message: 'Warehouse not found after update' });
      return;
    }

    await createAuditLog(
      req.user._id,
      req.user.companyId,
      'update',
      'warehouse',
      warehouseObjectId,
      { message: 'Warehouse updated' },
      req
    );

    // Format the warehouse object for response
    const warehouseObj = updatedWarehouse.toObject();

    // Add formatted operating hours if they exist
    if (warehouseObj.operatingHours) {
      (warehouseObj as any).formattedHours = formatOperatingHours(warehouseObj.operatingHours);
    }

    res.json({
      message: 'Warehouse updated successfully',
      warehouse: warehouseObj,
    });
  } catch (error) {
    logger.error('Error updating warehouse:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Delete a warehouse (soft delete)
 * @route DELETE /warehouses/:warehouseId
 */
export const deleteWarehouse = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Check if user has a company
    if (!req.user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    // Check if auto-assign flag is set
    const autoAssignDefault = req.query.autoAssignDefault === 'true';

    const warehouseId = req.params.warehouseId;
    // Convert to ObjectId if it's a valid ObjectId string
    const warehouseObjectId = mongoose.Types.ObjectId.isValid(warehouseId)
      ? new mongoose.Types.ObjectId(warehouseId)
      : warehouseId;

    // Check if warehouse exists
    const warehouse = await Warehouse.findOne({
      _id: warehouseObjectId,
      companyId: req.user.companyId,
      isDeleted: false,
    });

    if (!warehouse) {
      res.status(404).json({ message: 'Warehouse not found' });
      return;
    }

    // Check if this is the default warehouse
    if (warehouse.isDefault) {
      // Check if there are other warehouses that could be set as default
      const otherWarehousesCount = await Warehouse.countDocuments({
        companyId: req.user.companyId,
        _id: { $ne: warehouseObjectId },
        isDeleted: false,
      });

      if (otherWarehousesCount === 0) {
        res.status(400).json({
          message: 'Cannot delete the default warehouse as it is the only warehouse. Create another warehouse first.'
        });
        return;
      }

      // If autoAssignDefault is true, automatically set another warehouse as default
      if (autoAssignDefault) {
        // Find another warehouse to set as default
        const anotherWarehouse = await Warehouse.findOne({
          companyId: req.user.companyId,
          _id: { $ne: warehouseObjectId },
          isDeleted: false,
        }).sort({ createdAt: -1 }); // Get the most recently created one

        if (anotherWarehouse) {
          // Set the new warehouse as default
          anotherWarehouse.isDefault = true;
          await anotherWarehouse.save();

          // Update company settings
          await Company.findByIdAndUpdate(req.user.companyId, {
            'settings.defaultWarehouseId': anotherWarehouse._id,
          });

          // Create audit log for changing default warehouse
          const newDefaultWarehouseId = mongoose.Types.ObjectId.isValid(String(anotherWarehouse._id))
            ? new mongoose.Types.ObjectId(String(anotherWarehouse._id))
            : String(anotherWarehouse._id);

          await createAuditLog(
            req.user._id,
            req.user.companyId,
            'update',
            'warehouse',
            newDefaultWarehouseId,
            { message: 'Warehouse set as default automatically during deletion of previous default' },
            req
          );

          // Now we can proceed with deletion
        } else {
          // This shouldn't happen since we checked otherWarehousesCount > 0
          res.status(400).json({
            message: 'Failed to find another warehouse to set as default.'
          });
          return;
        }
      } else {
        // Get other warehouses to suggest in the error message
        const otherWarehouses = await Warehouse.find({
          companyId: req.user.companyId,
          _id: { $ne: warehouseObjectId },
          isDeleted: false,
        }).limit(3).select('_id name');

        const warehousesList = otherWarehouses.map(w => `"${w.name}" (ID: ${w._id})`).join(', ');

        res.status(400).json({
          message: 'Cannot delete the default warehouse. Set another warehouse as default first.',
          hint: `You can set another warehouse as default by updating it with { "isDefault": true } or add ?autoAssignDefault=true to automatically assign a new default`,
          availableWarehouses: otherWarehouses.length > 0 ?
            `Available warehouses: ${warehousesList}${otherWarehouses.length < otherWarehousesCount ? ' and more...' : ''}` :
            undefined
        });
        return;
      }
    }

    // Soft delete warehouse
    warehouse.isDeleted = true;
    warehouse.isActive = false;
    await warehouse.save();

    await createAuditLog(
      req.user._id,
      req.user.companyId,
      'delete',
      'warehouse',
      warehouseObjectId,
      { message: 'Warehouse deleted' },
      req
    );

    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    logger.error('Error deleting warehouse:', error);
    next(error);
  }
};

/**
 * Import warehouses from CSV
 * @route POST /warehouses/import
 */
export const importWarehouses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Get company ID from either the URL parameter or the user's company
    const companyId = req.params.companyId || req.user.companyId;

    // Check if user has a company
    if (!companyId) {
      res.status(403).json({ message: 'No company ID provided' });
      return;
    }

    // Verify that the user belongs to the company or is an admin
    if (req.params.companyId && req.user.companyId !== req.params.companyId && req.user.role !== 'admin') {
      res.status(403).json({ message: 'You do not have permission to import warehouses for this company' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'CSV file is required' });
      return;
    }

    const results: any[] = [];
    const errors: any[] = [];
    const stream = Readable.from(req.file.buffer.toString());

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        // Process CSV data
        const warehouses = [];
        for (const row of results) {
          try {
            // Validate required fields
            if (!row.name || !row.address_line1 || !row.city || !row.state || !row.postal_code || !row.contact_name || !row.contact_phone) {
              errors.push({ row, error: 'Missing required fields' });
              continue;
            }

            // Check if warehouse with same name already exists
            const existingWarehouse = await Warehouse.findOne({
              name: row.name,
              companyId: companyId,
              isDeleted: false,
            });

            if (existingWarehouse) {
              errors.push({ row, error: 'Warehouse with this name already exists' });
              continue;
            }

            // Process operating hours if provided in CSV
            let operatingHours;
            if (row.monday_open || row.tuesday_open || row.wednesday_open ||
                row.thursday_open || row.friday_open || row.saturday_open || row.sunday_open) {
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

            // Create warehouse object
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

            // Convert the MongoDB document _id to a proper type for audit log
            const warehouseId = mongoose.Types.ObjectId.isValid(String(warehouse._id))
              ? new mongoose.Types.ObjectId(String(warehouse._id))
              : String(warehouse._id);

            await createAuditLog(
              req.user!._id,
              companyId,
              'create',
              'warehouse',
              warehouseId,
              { message: 'Warehouse imported from CSV' },
              req
            );
          } catch (error) {
            errors.push({ row, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        res.json({
          message: `Imported ${warehouses.length} warehouses with ${errors.length} errors`,
          warehouses,
          errors,
        });
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
