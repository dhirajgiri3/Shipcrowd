import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Company, { ICompany } from '../../../../infrastructure/database/mongoose/models/Company';
import User from '../../../../infrastructure/database/mongoose/models/User';
import TeamInvitation from '../../../../infrastructure/database/mongoose/models/TeamInvitation';
import { AuthRequest } from '../../middleware/auth/auth';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/auditLog';
import { generateAccessToken } from '../../../../shared/helpers/jwt';
import { sendOwnerInvitationEmail } from '../../../../core/application/services/communication/email.service';
import mongoose from 'mongoose';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendPaginated,
  sendCreated,
  calculatePagination
} from '../../../../shared/utils/responseHelper';

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
  billingInfo: z.object({
    gstin: z.string().optional(),
    pan: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    upiId: z.string().optional(),
  }).optional(),
  branding: z.object({
    logo: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    emailTemplate: z.string().optional(),
  }).optional(),
});

const updateCompanySchema = createCompanySchema.partial();

export const getCompanyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.params.companyId;
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      sendError(res, 'Invalid company ID format', 400, 'INVALID_ID');
      return;
    }

    const authReq = req as AuthRequest;

    if (authReq.user && authReq.user.role !== 'admin') {
      const user = await User.findById(authReq.user._id).lean();

      if (!user) {
        sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
        return;
      }

      if (!user.companyId) {
        sendError(res, 'User is not associated with any company', 403, 'NO_COMPANY');
        return;
      }

      if (user.companyId.toString() !== companyId) {
        sendError(res, 'Access denied to this company', 403, 'ACCESS_DENIED');
        return;
      }
    }

    const company = await Company.findById(companyId).lean() as ICompany | null;

    if (!company) {
      sendError(res, 'Company not found', 404, 'COMPANY_NOT_FOUND');
      return;
    }

    sendSuccess(res, { company }, 'Company retrieved successfully');
  } catch (error) {
    logger.error('Error fetching company:', error);
    next(error);
  }
};

export const createCompany = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    if (req.user.role !== 'admin' && req.user.companyId) {
      sendError(res, 'User already has a company', 403, 'COMPANY_EXISTS');
      return;
    }

    const validation = createCompanySchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const existingCompany = await Company.findOne({ name: validation.data.name }).lean();
    if (existingCompany) {
      sendError(res, 'Company with this name already exists', 400, 'DUPLICATE_COMPANY');
      return;
    }

    const company = new Company({
      ...validation.data,
      isActive: true,
      isDeleted: false,
    });

    await company.save();
    const savedCompany = company as ICompany;

    if (req.user.role !== 'admin') {
      await User.findByIdAndUpdate(req.user._id, {
        companyId: savedCompany._id,
        teamRole: 'owner',
      });

      const newAccessToken = generateAccessToken(
        req.user._id,
        req.user.role,
        savedCompany._id.toString()
      );

      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });
    }

    await createAuditLog(req.user._id, savedCompany._id, 'create', 'company', savedCompany._id.toString(), { message: 'Company created' }, req);

    sendCreated(res, { company: company.toObject() }, 'Company created successfully');
  } catch (error) {
    logger.error('Error creating company:', error);
    next(error);
  }
};

export const updateCompany = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const companyId = req.params.companyId;
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      sendError(res, 'Invalid company ID format', 400, 'INVALID_ID');
      return;
    }

    if (req.user.role !== 'admin') {
      const user = await User.findById(req.user._id).lean();

      if (!user) {
        sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
        return;
      }

      if (!user.companyId) {
        sendError(res, 'User is not associated with any company', 403, 'NO_COMPANY');
        return;
      }

      if (user.companyId.toString() !== companyId) {
        sendError(res, 'Access denied to this company', 403, 'ACCESS_DENIED');
        return;
      }
    }

    const validation = updateCompanySchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const company = await Company.findById(companyId) as ICompany | null;
    if (!company) {
      sendError(res, 'Company not found', 404, 'COMPANY_NOT_FOUND');
      return;
    }

    if (validation.data.name && validation.data.name !== company.name) {
      const existingCompany = await Company.findOne({ name: validation.data.name }).lean();
      if (existingCompany) {
        sendError(res, 'Company with this name already exists', 400, 'DUPLICATE_COMPANY');
        return;
      }
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      { $set: validation.data },
      { new: true, runValidators: true }
    ) as ICompany | null;

    if (!updatedCompany) {
      sendError(res, 'Company not found after update', 404, 'COMPANY_NOT_FOUND');
      return;
    }

    await createAuditLog(req.user._id, companyId, 'update', 'company', companyId, { message: 'Company updated' }, req);

    sendSuccess(res, { company: updatedCompany.toObject() }, 'Company updated successfully');
  } catch (error) {
    logger.error('Error updating company:', error);
    next(error);
  }
};

export const getAllCompanies = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    if (req.user.role !== 'admin') {
      sendError(res, 'Access denied', 403, 'INSUFFICIENT_PERMISSIONS');
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const filter: any = { isDeleted: false };
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    const [companies, total] = await Promise.all([
      Company.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean() as Promise<ICompany[]>,
      Company.countDocuments(filter),
    ]);

    const pagination = calculatePagination(total, page, limit);
    sendPaginated(res, companies, pagination, 'Companies retrieved successfully');
  } catch (error) {
    logger.error('Error fetching companies:', error);
    next(error);
  }
};

export const inviteCompanyOwner = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    if (req.user.role !== 'admin') {
      sendError(res, 'Only admins can invite company owners', 403, 'INSUFFICIENT_PERMISSIONS');
      return;
    }

    const companyId = req.params.companyId;
    const { email, name, message } = req.body;

    if (!email || !name) {
      sendError(res, 'Email and name are required', 400, 'MISSING_FIELDS');
      return;
    }

    const company = await Company.findById(companyId).lean();
    if (!company) {
      sendError(res, 'Company not found', 404, 'COMPANY_NOT_FOUND');
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existingUser) {
      sendError(res, 'User with this email already exists', 400, 'USER_EXISTS');
      return;
    }

    const existingInvitation = await TeamInvitation.findOne({
      email: email.toLowerCase(),
      companyId,
      status: 'pending'
    }).lean();

    if (existingInvitation) {
      sendError(res, 'Invitation already sent to this email', 400, 'INVITATION_EXISTS');
      return;
    }

    const invitation = new TeamInvitation({
      email: email.toLowerCase(),
      companyId,
      invitedBy: req.user._id,
      teamRole: 'owner',
      invitationMessage: message || undefined,
    });

    await invitation.save();

    await sendOwnerInvitationEmail(email, name, company.name, invitation.token);

    await createAuditLog(req.user._id, companyId, 'invite', 'company', companyId, { message: `Invited ${email} as company owner`, email }, req);

    sendCreated(res, {
      invitation: {
        email: invitation.email,
        companyId: invitation.companyId,
        teamRole: invitation.teamRole,
        expiresAt: invitation.expiresAt,
      },
    }, 'Owner invitation sent successfully');
  } catch (error) {
    logger.error('Error inviting company owner:', error);
    next(error);
  }
};

export const updateCompanyStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    if (req.user.role !== 'admin') {
      sendError(res, 'Only admins can update company status', 403, 'INSUFFICIENT_PERMISSIONS');
      return;
    }

    const companyId = req.params.companyId;
    const { status, reason } = req.body;

    const validStatuses = ['pending_verification', 'kyc_submitted', 'approved', 'suspended', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      sendError(res, 'Invalid status', 400, 'INVALID_STATUS');
      return;
    }

    const company = await Company.findByIdAndUpdate(
      companyId,
      { $set: { status } },
      { new: true, runValidators: true }
    ) as ICompany | null;

    if (!company) {
      sendError(res, 'Company not found', 404, 'COMPANY_NOT_FOUND');
      return;
    }

    await createAuditLog(req.user._id, companyId, 'update', 'company', companyId, { message: `Company status updated to ${status}`, status, reason }, req);

    sendSuccess(res, { company: company.toObject() }, 'Company status updated successfully');
  } catch (error) {
    logger.error('Error updating company status:', error);
    next(error);
  }
};

export const getCompanyStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    if (req.user.role !== 'admin') {
      sendError(res, 'Access denied', 403, 'INSUFFICIENT_PERMISSIONS');
      return;
    }

    const [stats, totalCompanies, activeCompanies] = await Promise.all([
      Company.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Company.countDocuments({ isDeleted: false }),
      Company.countDocuments({ isDeleted: false, isActive: true }),
    ]);

    const statsByStatus = stats.reduce((acc: any, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    sendSuccess(res, {
      total: totalCompanies,
      active: activeCompanies,
      byStatus: {
        pending_verification: statsByStatus.pending_verification || 0,
        kyc_submitted: statsByStatus.kyc_submitted || 0,
        approved: statsByStatus.approved || 0,
        suspended: statsByStatus.suspended || 0,
        rejected: statsByStatus.rejected || 0,
      },
    }, 'Company statistics retrieved successfully');
  } catch (error) {
    logger.error('Error fetching company stats:', error);
    next(error);
  }
};

export default {
  getCompanyById,
  createCompany,
  updateCompany,
  getAllCompanies,
  inviteCompanyOwner,
  updateCompanyStatus,
  getCompanyStats,
};
