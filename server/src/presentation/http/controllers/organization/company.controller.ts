import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Company, ICompany } from '../../../../infrastructure/database/mongoose/models';
import { User } from '../../../../infrastructure/database/mongoose/models';
import { TeamInvitation } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import { generateAccessToken } from '../../../../shared/helpers/jwt';
import { sendOwnerInvitationEmail } from '../../../../core/application/services/communication/email.service';
import mongoose from 'mongoose';
import { AuthTokenService } from '../../../../core/application/services/auth/token.service';
import { AuthenticationError, ValidationError, DatabaseError, AuthorizationError, ConflictError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess, sendPaginated, sendCreated, calculatePagination } from '../../../../shared/utils/responseHelper';
import CompanyOnboardingService from '../../../../core/application/services/organization/company-onboarding.service';

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

const updateCompanySchema = createCompanySchema.partial().extend({
  settings: z.object({
    defaultRateCardId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    defaultWarehouseId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    notificationEmail: z.string().email().optional(),
    notificationPhone: z.string().optional(),
    autoGenerateInvoice: z.boolean().optional(),
    currency: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
});

const assignRateCardSchema = z.object({
  rateCardId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid rate card ID'),
});

export const getCompanyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.params.companyId;
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new ValidationError('Invalid company ID format', ErrorCode.VAL_INVALID_INPUT);
    }

    const authReq = req as Request;

    if (authReq.user && authReq.user.role !== 'admin') {
      const user = await User.findById(authReq.user._id).lean();

      if (!user) {
        throw new ValidationError('User not found', ErrorCode.RES_USER_NOT_FOUND);
      }

      if (!user.companyId) {
        throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
      }

      if (user.companyId.toString() !== companyId) {
        throw new AuthorizationError('Access denied to this company', ErrorCode.AUTHZ_FORBIDDEN);
      }
    }

    const company = await Company.findById(companyId).lean() as ICompany | null;

    if (!company) {
      throw new ValidationError('Company not found', ErrorCode.RES_COMPANY_NOT_FOUND);
    }

    sendSuccess(res, { company }, 'Company retrieved successfully');
  } catch (error) {
    logger.error('Error fetching company:', error);
    next(error);
  }
};

export const createCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    if (req.user.role !== 'admin' && req.user.companyId) {
      throw new ConflictError('User already has a company', ErrorCode.BIZ_CONFLICT);
    }

    const validation = createCompanySchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const existingCompany = await Company.findOne({ name: validation.data.name }).lean();
    if (existingCompany) {
      throw new ConflictError('Company with this name already exists', ErrorCode.BIZ_CONFLICT);
    }
    const company = new Company({
      ...validation.data,
      isActive: true,
      isDeleted: false,
    });

    await company.save();
    const savedCompany = company as ICompany;

    // Auto-setup: Create default zones and rate card for new company
    // This runs asynchronously and won't block company creation if it fails
    CompanyOnboardingService.setupNewCompany(savedCompany._id).catch(err => {
      logger.error(`[CompanyCreation] Onboarding failed for company ${savedCompany._id}:`, err);
    });

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

export const updateCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const companyId = req.params.companyId;
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new ValidationError('Invalid company ID format', ErrorCode.VAL_INVALID_INPUT);
    }

    if (req.user.role !== 'admin') {
      const user = await User.findById(req.user._id).lean();

      if (!user) {
        throw new ValidationError('User not found', ErrorCode.RES_USER_NOT_FOUND);
      }

      if (!user.companyId) {
        throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
      }

      if (user.companyId.toString() !== companyId) {
        throw new AuthorizationError('Access denied to this company', ErrorCode.AUTHZ_FORBIDDEN);
      }
    }

    const validation = updateCompanySchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const company = await Company.findById(companyId) as ICompany | null;
    if (!company) {
      throw new ValidationError('Company not found', ErrorCode.RES_COMPANY_NOT_FOUND);
    }

    if (validation.data.name && validation.data.name !== company.name) {
      const existingCompany = await Company.findOne({ name: validation.data.name }).lean();
      if (existingCompany) {
        throw new ConflictError('Company with this name already exists', ErrorCode.BIZ_CONFLICT);
      }
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      { $set: validation.data },
      { new: true, runValidators: true }
    ) as ICompany | null;

    if (!updatedCompany) {
      throw new NotFoundError('Company not found after update', ErrorCode.RES_COMPANY_NOT_FOUND);
    }

    await createAuditLog(req.user._id, companyId, 'update', 'company', companyId, { message: 'Company updated' }, req);

    sendSuccess(res, { company: updatedCompany.toObject() }, 'Company updated successfully');
  } catch (error) {
    logger.error('Error updating company:', error);
    next(error);
  }
};

export const getAllCompanies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Access denied', ErrorCode.AUTHZ_FORBIDDEN);
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

export const inviteCompanyOwner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Only admins can invite company owners', ErrorCode.AUTHZ_FORBIDDEN);
    }

    const companyId = req.params.companyId;
    const { email, name, message } = req.body;

    if (!email || !name) {
      throw new ValidationError('Email and name are required', ErrorCode.VAL_INVALID_INPUT);
    }

    const company = await Company.findById(companyId).lean();
    if (!company) {
      throw new ValidationError('Company not found', ErrorCode.RES_COMPANY_NOT_FOUND);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existingUser) {
      throw new ConflictError('User with this email already exists', ErrorCode.BIZ_CONFLICT);
    }
    const existingInvitation = await TeamInvitation.findOne({
      email: email.toLowerCase(),
      companyId,
      status: 'pending'
    }).lean();

    if (existingInvitation) {
      throw new ConflictError('Invitation already sent to this email', ErrorCode.BIZ_CONFLICT);
    }

    // ✅ PHASE 1 FIX: Generate hashed token for team invitation
    const { raw: rawToken, hashed: hashedToken } = AuthTokenService.generateSecureToken();

    const invitation = new TeamInvitation({
      email: email.toLowerCase(),
      companyId,
      invitedBy: req.user._id,
      teamRole: 'owner',
      invitationMessage: message || undefined,
      token: hashedToken, // ✅ Store HASH
    });

    await invitation.save();

    await sendOwnerInvitationEmail(email, name, company.name, rawToken); // ✅ Send RAW token

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

export const updateCompanyStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Only admins can update company status', ErrorCode.AUTHZ_FORBIDDEN);
    }

    const companyId = req.params.companyId;
    const { status, reason } = req.body;

    const validStatuses = ['pending_verification', 'kyc_submitted', 'approved', 'suspended', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      throw new ValidationError('Invalid status', ErrorCode.VAL_INVALID_INPUT);
    }

    const company = await Company.findByIdAndUpdate(
      companyId,
      { $set: { status } },
      { new: true, runValidators: true }
    ) as ICompany | null;

    if (!company) {
      throw new ValidationError('Company not found', ErrorCode.RES_COMPANY_NOT_FOUND);
    }

    await createAuditLog(req.user._id, companyId, 'update', 'company', companyId, { message: `Company status updated to ${status}`, status, reason }, req);

    sendSuccess(res, { company: company.toObject() }, 'Company status updated successfully');
  } catch (error) {
    logger.error('Error updating company status:', error);
    next(error);
  }
};

export const getCompanyStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Access denied', ErrorCode.AUTHZ_FORBIDDEN);
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

export const assignRateCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const companyId = req.params.companyId;
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new ValidationError('Invalid company ID format', ErrorCode.VAL_INVALID_INPUT);
    }

    const validation = assignRateCardSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message, ErrorCode.VAL_INVALID_INPUT);
    }

    // Verify rate card exists
    const RateCard = (await import('../../../../infrastructure/database/mongoose/models')).RateCard;
    const rateCard = await RateCard.findOne({
      _id: validation.data.rateCardId,
      isDeleted: false,
      status: 'active'
    });

    if (!rateCard) {
      throw new NotFoundError('Rate card', ErrorCode.RES_RATECARD_NOT_FOUND);
    }

    // Update company
    const company = await Company.findOneAndUpdate(
      { _id: companyId, isDeleted: false },
      { $set: { 'settings.defaultRateCardId': validation.data.rateCardId } },
      { new: true }
    );

    if (!company) {
      throw new NotFoundError('Company', ErrorCode.RES_COMPANY_NOT_FOUND);
    }

    await createAuditLog(
      req.user._id,
      companyId,
      'update',
      'company',
      companyId,
      { message: 'Rate card assigned', rateCardId: validation.data.rateCardId },
      req
    );

    sendSuccess(res, { company }, 'Rate card assigned successfully');
  } catch (error) {
    logger.error('Error assigning rate card:', error);
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
  assignRateCard,
};
