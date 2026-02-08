import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { CompanyGroup } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { guardChecks, requirePlatformAdmin } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess, sendCreated, sendPaginated, calculatePagination } from '../../../../shared/utils/responseHelper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

const companyGroupSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  companyIds: z.array(z.string()).default([]),
});

const updateCompanyGroupSchema = companyGroupSchema.partial();

const toObjectIds = (ids: string[]) => ids.map((id) => new mongoose.Types.ObjectId(id));

export const getCompanyGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req, { requireCompany: false });
    requirePlatformAdmin(auth);

    const filter: any = { isDeleted: false };
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      CompanyGroup.find(filter)
        .populate('companyIds', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CompanyGroup.countDocuments(filter),
    ]);

    const pagination = calculatePagination(total, page, limit);
    sendPaginated(res, groups, pagination, 'Company groups retrieved successfully');
  } catch (error) {
    logger.error('Error fetching company groups:', error);
    next(error);
  }
};

export const createCompanyGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req, { requireCompany: false });
    requirePlatformAdmin(auth);

    const validation = companyGroupSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const invalidId = validation.data.companyIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidId) {
      throw new ValidationError('Invalid company ID format', ErrorCode.VAL_INVALID_INPUT);
    }

    const group = new CompanyGroup({
      name: validation.data.name.trim(),
      description: validation.data.description?.trim(),
      companyIds: toObjectIds(validation.data.companyIds),
      createdBy: auth.userId,
      isDeleted: false,
    });

    await group.save();

    await group.populate('companyIds', 'name');
    sendCreated(res, { group }, 'Company group created successfully');
  } catch (error) {
    logger.error('Error creating company group:', error);
    next(error);
  }
};

export const updateCompanyGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req, { requireCompany: false });
    requirePlatformAdmin(auth);

    const groupId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ValidationError('Invalid company group ID format');
    }

    const validation = updateCompanyGroupSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    if (validation.data.companyIds) {
      const invalidId = validation.data.companyIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalidId) {
        throw new ValidationError('Invalid company ID format', ErrorCode.VAL_INVALID_INPUT);
      }
    }

    const group = await CompanyGroup.findOneAndUpdate(
      { _id: groupId, isDeleted: false },
      {
        $set: {
          ...(validation.data.name ? { name: validation.data.name.trim() } : {}),
          ...(validation.data.description !== undefined ? { description: validation.data.description?.trim() } : {}),
          ...(validation.data.companyIds ? { companyIds: toObjectIds(validation.data.companyIds) } : {}),
        }
      },
      { new: true }
    ).populate('companyIds', 'name');

    if (!group) {
      throw new NotFoundError('Company group', ErrorCode.RES_NOT_FOUND);
    }

    sendSuccess(res, { group }, 'Company group updated successfully');
  } catch (error) {
    logger.error('Error updating company group:', error);
    next(error);
  }
};

export const deleteCompanyGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req, { requireCompany: false });
    requirePlatformAdmin(auth);

    const groupId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ValidationError('Invalid company group ID format');
    }

    const group = await CompanyGroup.findOneAndUpdate(
      { _id: groupId, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!group) {
      throw new NotFoundError('Company group', ErrorCode.RES_NOT_FOUND);
    }

    sendSuccess(res, { id: groupId }, 'Company group deleted successfully');
  } catch (error) {
    logger.error('Error deleting company group:', error);
    next(error);
  }
};

export default {
  getCompanyGroups,
  createCompanyGroup,
  updateCompanyGroup,
  deleteCompanyGroup,
};
