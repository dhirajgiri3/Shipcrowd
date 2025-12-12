import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Company, { ICompany } from '../../../infrastructure/database/mongoose/models/Company';
import User from '../../../infrastructure/database/mongoose/models/User';
import { AuthRequest } from '../middleware/auth';
import logger from '../../../shared/logger/winston.logger';
import { createAuditLog } from '../middleware/auditLog';
import mongoose from 'mongoose';

// Define validation schemas
const createCompanySchema = z.object({
  name: z.string().min(2),
  address: z.object({
    line1: z.string().min(3),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().min(2).default('India'),
    postalCode: z.string().min(5),
  }),
  billingInfo: z
    .object({
      gstin: z.string().optional(),
      pan: z.string().optional(),
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      upiId: z.string().optional(),
    })
    .optional(),
  branding: z
    .object({
      logo: z.string().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      emailTemplate: z.string().optional(),
    })
    .optional(),
});

const updateCompanySchema = createCompanySchema.partial();

/**
 * Get a company by ID
 * @route GET /companies/:companyId
 */
export const getCompanyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.params.companyId;
    // Convert to ObjectId if it's a valid ObjectId string
    const companyObjectId = mongoose.Types.ObjectId.isValid(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : companyId;

    const authReq = req as AuthRequest;

    // Check if user has access to this company
    if (authReq.user && authReq.user.role !== 'admin') {
      // Get the latest user data from the database to ensure we have the most up-to-date companyId
      const user = await User.findById(authReq.user._id);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      if (!user.companyId) {
        res.status(403).json({ message: 'User is not associated with any company' });
        return;
      }

      if (user.companyId.toString() !== companyId) {
        res.status(403).json({ message: 'Access denied to this company' });
        return;
      }
    }

    const company = await Company.findById(companyObjectId) as ICompany | null;

    if (!company) {
      res.status(404).json({ message: 'Company not found' });
      return;
    }

    res.json({ company: company.toObject() });
  } catch (error) {
    logger.error('Error fetching company:', error);
    next(error);
  }
};

/**
 * Create a new company
 * @route POST /companies
 */
export const createCompany = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Only admin can create companies for others, sellers can create their own
    if (req.user.role !== 'admin' && req.user.companyId) {
      res.status(403).json({ message: 'User already has a company' });
      return;
    }

    const validatedData = createCompanySchema.parse(req.body);

    // Check if company with same name already exists
    const existingCompany = await Company.findOne({ name: validatedData.name });
    if (existingCompany) {
      res.status(400).json({ message: 'Company with this name already exists' });
      return;
    }

    // Create new company
    const company = new Company({
      ...validatedData,
      isActive: true,
      isDeleted: false,
    });

    await company.save();

    // Type assertion after save
    const savedCompany = company as ICompany;

    // If user is not admin, associate the company with the user
    if (req.user.role !== 'admin') {
      await User.findByIdAndUpdate(req.user._id, {
        companyId: savedCompany._id,
        teamRole: 'manager',
      });
    }

    await createAuditLog(
      req.user._id,
      savedCompany._id,
      'create',
      'company',
      savedCompany._id.toString(),
      { message: 'Company created' },
      req
    );

    res.status(201).json({
      message: 'Company created successfully',
      company: company.toObject(),
    });
  } catch (error) {
    logger.error('Error creating company:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Update a company
 * @route PUT /companies/:companyId
 */
export const updateCompany = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const companyId = req.params.companyId;
    // Convert to ObjectId if it's a valid ObjectId string
    const companyObjectId = mongoose.Types.ObjectId.isValid(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : companyId;

    // Check if user has access to this company
    if (req.user.role !== 'admin') {
      // Get the latest user data from the database to ensure we have the most up-to-date companyId
      const user = await User.findById(req.user._id);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      if (!user.companyId) {
        res.status(403).json({ message: 'User is not associated with any company' });
        return;
      }

      if (user.companyId.toString() !== companyId) {
        res.status(403).json({ message: 'Access denied to this company' });
        return;
      }
    }

    const validatedData = updateCompanySchema.parse(req.body);

    // Check if company exists
    const company = await Company.findById(companyObjectId) as ICompany | null;
    if (!company) {
      res.status(404).json({ message: 'Company not found' });
      return;
    }

    // If name is being changed, check if it's unique
    if (validatedData.name && validatedData.name !== company.name) {
      const existingCompany = await Company.findOne({ name: validatedData.name });
      if (existingCompany) {
        res.status(400).json({ message: 'Company with this name already exists' });
        return;
      }
    }

    // Update company
    const updatedCompany = await Company.findByIdAndUpdate(
      companyObjectId,
      { $set: validatedData },
      { new: true, runValidators: true }
    ) as ICompany | null;

    if (!updatedCompany) {
      res.status(404).json({ message: 'Company not found after update' });
      return;
    }

    await createAuditLog(
      req.user._id,
      companyObjectId,
      'update',
      'company',
      companyObjectId,
      { message: 'Company updated' },
      req
    );

    res.json({
      message: 'Company updated successfully',
      company: updatedCompany.toObject(),
    });
  } catch (error) {
    logger.error('Error updating company:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Get all companies (admin only)
 * @route GET /companies
 */
export const getAllCompanies = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Only admin can see all companies
    if (req.user.role !== 'admin') {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filtering
    const filter: any = { isDeleted: false };
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    // Get companies
    const companies = await Company.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit) as ICompany[];

    // Get total count
    const total = await Company.countDocuments(filter);

    res.json({
      companies: companies.map(company => company.toObject()),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching companies:', error);
    next(error);
  }
};

export default {
  getCompanyById,
  createCompany,
  updateCompany,
  getAllCompanies,
};
