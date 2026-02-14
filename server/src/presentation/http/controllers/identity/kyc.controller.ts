import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { KYC, KYCVerificationAttempt, User, IUser, Company } from '../../../../infrastructure/database/mongoose/models';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import { formatError } from '../../../../shared/errors/error-messages';
import logger from '../../../../shared/logger/winston.logger';
import deepvueService from '../../../../core/application/services/integrations/deepvue.service';
import OnboardingProgressService from '../../../../core/application/services/onboarding/progress.service';
import { sendSuccess, sendPaginated, sendCreated, calculatePagination } from '../../../../shared/utils/responseHelper';
import { withTransaction } from '../../../../shared/utils/transactionHelper';
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, ConflictError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
// Import validation schemas
import { submitKYCSchema, verifyDocumentSchema, invalidateDocumentSchema } from '../../../../shared/validation/schemas';
import { DocumentVerificationState } from '../../../../core/domain/types/document-verification-state';
import { KYCState } from '../../../../core/domain/types/kyc-state';
import { KYCStateMachine } from '../../../../core/domain/kyc/kyc-state-machine';
import { KYC_DEFAULT_PROVIDER } from '../../../../shared/config/kyc.config';
import {
  appendVerificationHistory,
  buildExpiryDate,
  buildKycSnapshot,
  buildVerifiedData,
  createKycInputHash,
  resolveVerificationState,
} from '../../../../shared/utils/kyc-utils';
import { queueKYCApprovedEmail, queueKYCRejectedEmail } from '../../../../core/application/services/communication/email-queue.service';
import { syncRazorpayFundAccount } from '../../../../core/application/services/finance/sync-razorpay-fund-account.service';


/**
 * Helper function to safely get document ID as string
 * @param doc Document with _id property
 * @returns String representation of the ID or empty string if not available
 */
const getDocumentIdString = (doc: any): string => {
  if (!doc || !doc._id) return '';

  if (typeof doc._id.toString === 'function') {
    return doc._id.toString();
  }

  return String(doc._id);
};

/**
 * Helper function to validate user and check company association
 * @param req AuthRequest object
 * @param res Response object
 * @returns User object if valid, null if invalid (response is sent in case of error)
 */
const validateUserAndCompany = async (req: Request, res: Response): Promise<(IUser & { _id: mongoose.Types.ObjectId, companyId: mongoose.Types.ObjectId }) | null> => {
  const auth = guardChecks(req);
  requireCompanyContext(auth);

  // Get the latest user data from the database to ensure we have the most up-to-date companyId
  const userDoc = await User.findById(auth.userId);

  if (!userDoc) {
    throw new NotFoundError('User not found', ErrorCode.RES_USER_NOT_FOUND);
  }

  // Return user with guaranteed companyId from auth
  return userDoc as IUser & { _id: mongoose.Types.ObjectId, companyId: mongoose.Types.ObjectId };
};

/**
 * Helper function to find or create a KYC record for a user
 * @param userId User ID
 * @param companyId Company ID
 * @returns KYC document
 */
const findOrCreateKyc = async (userId: mongoose.Types.ObjectId, companyId: mongoose.Types.ObjectId) => {
  // Find existing KYC record or create a new one
  let kyc = await KYC.findOne({ userId });

  if (!kyc) {
    kyc = new KYC({
      userId,
      companyId,
      documents: {},
      completionStatus: {
        personalKycComplete: false,
        companyInfoComplete: false,
        bankDetailsComplete: false,
        agreementComplete: false,
      },
    });
  }

  return kyc;
};

const DOCUMENT_TYPES = ['pan', 'aadhaar', 'gstin', 'bankAccount'] as const;
type DocumentType = typeof DOCUMENT_TYPES[number];

const recordVerificationAttempt = async (params: {
  userId: mongoose.Types.ObjectId | string;
  companyId?: mongoose.Types.ObjectId | string;
  documentType: DocumentType;
  status: 'success' | 'soft_failed' | 'hard_failed' | 'error';
  attemptId: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}) => {
  try {
    await KYCVerificationAttempt.create({
      userId: params.userId,
      companyId: params.companyId,
      documentType: params.documentType,
      provider: KYC_DEFAULT_PROVIDER,
      status: params.status,
      attemptId: params.attemptId,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      metadata: params.metadata,
      ipAddress: params.req?.ip,
      userAgent: params.req?.headers['user-agent'],
    });
  } catch (error) {
    logger.warn('Failed to record KYC verification attempt', { error });
  }
};

const isDocumentVerified = (doc: any): boolean =>
  resolveVerificationState(doc).state === DocumentVerificationState.VERIFIED;

const refreshCompletionStatus = (kyc: any, gstinRequired = false) => {
  const panVerified = isDocumentVerified(kyc?.documents?.pan);
  const aadhaarVerified = kyc?.documents?.aadhaar ? isDocumentVerified(kyc.documents.aadhaar) : true;
  const bankVerified = isDocumentVerified(kyc?.documents?.bankAccount);
  const gstinVerified = isDocumentVerified(kyc?.documents?.gstin);

  kyc.completionStatus.personalKycComplete = panVerified && aadhaarVerified;
  kyc.completionStatus.bankDetailsComplete = bankVerified;
  kyc.completionStatus.companyInfoComplete = gstinRequired ? gstinVerified : true;
};

const maybeSetSubmittedState = (kyc: any) => {
  const allComplete =
    kyc.completionStatus.personalKycComplete &&
    kyc.completionStatus.companyInfoComplete &&
    kyc.completionStatus.bankDetailsComplete &&
    kyc.completionStatus.agreementComplete;

  if (allComplete) {
    KYCStateMachine.validateTransition(kyc.state, KYCState.SUBMITTED);
    kyc.state = KYCState.SUBMITTED;
    kyc.submittedAt = new Date();
  }
};

/**
 * Submit KYC documents
 * @route POST /kyc
 */
export const submitKYC = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    if (!req.user.companyId) {
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }

    const validatedData = submitKYCSchema.parse(req.body);
    if (!validatedData.pan) {
      throw new ValidationError('PAN is required');
    }

    if (!validatedData.bankAccount) {
      throw new ValidationError('Bank account details are required');
    }

    const kyc = await findOrCreateKyc(
      req.user._id as any,
      req.user.companyId as any
    );

    const ensureVerifiedMatch = (documentType: DocumentType, input: Record<string, string>, label: string) => {
      const doc = (kyc.documents as any)?.[documentType];
      const { state } = resolveVerificationState(doc);

      if (state !== DocumentVerificationState.VERIFIED) {
        throw new ConflictError(`${label} must be verified before submission`, ErrorCode.RES_KYC_CONFLICT);
      }

      const expectedHash = doc?.verification?.inputHash;
      const inputHash = createKycInputHash(documentType, input);

      if (!expectedHash || expectedHash !== inputHash) {
        throw new ConflictError(`${label} does not match verified data. Please re-verify.`, ErrorCode.RES_KYC_CONFLICT);
      }
    };

    ensureVerifiedMatch('pan', { pan: validatedData.pan }, 'PAN');

    const bankIfsc = validatedData.bankAccount.ifsc || validatedData.bankAccount.ifscCode || '';
    if (!bankIfsc) {
      throw new ValidationError('IFSC code is required');
    }
    ensureVerifiedMatch(
      'bankAccount',
      {
        accountNumber: validatedData.bankAccount.accountNumber,
        ifsc: bankIfsc,
      },
      'Bank account'
    );

    if (validatedData.gstin) {
      ensureVerifiedMatch('gstin', { gstin: validatedData.gstin }, 'GSTIN');
    }

    if (validatedData.aadhaar) {
      ensureVerifiedMatch('aadhaar', { aadhaar: validatedData.aadhaar }, 'Aadhaar');
    }

    if (kyc.status === 'rejected') {
      kyc.rejectionReason = undefined;
      KYCStateMachine.validateTransition(kyc.state, KYCState.ACTION_REQUIRED);
      kyc.state = KYCState.ACTION_REQUIRED;
    }

    refreshCompletionStatus(kyc, Boolean(validatedData.gstin));
    maybeSetSubmittedState(kyc);

    await kyc.save();

    await createAuditLog(
      req.user._id,
      req.user.companyId,
      'create',
      'kyc',
      getDocumentIdString(kyc),
      { message: 'KYC documents submitted' },
      req
    );

    // ✅ ONBOARDING HOOK: Update progress
    try {
      if (req.user.companyId) {
        await OnboardingProgressService.updateStep(req.user.companyId.toString(), 'kycSubmitted', req.user._id);
      }
    } catch (err) {
      logger.error('Error updating onboarding progress for KYC submission:', err);
    }

    sendCreated(res, { kyc }, 'KYC documents submitted successfully');
  } catch (error) {
    logger.error('Error submitting KYC:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', errors);
    }
    next(error);
  }
};

/**
 * Get KYC details for the current user
 * @route GET /kyc
 */
export const getKYC = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const kyc = await KYC.findOne({ userId: req.user._id });

    if (!kyc) {
      throw new NotFoundError('KYC record', ErrorCode.RES_RESOURCE_NOT_FOUND);
    }

    const now = new Date();
    let expiredUpdated = false;

    DOCUMENT_TYPES.forEach((documentType) => {
      const doc = (kyc.documents as any)?.[documentType];
      const verification = doc?.verification;

      if (
        verification?.state === DocumentVerificationState.VERIFIED &&
        verification.expiresAt &&
        verification.expiresAt.getTime() <= now.getTime()
      ) {
        verification.state = DocumentVerificationState.EXPIRED;
        doc.verified = false;
        verification.lastCheckedAt = now;
        appendVerificationHistory(doc, {
          id: verification.attemptId || new mongoose.Types.ObjectId().toString(),
          state: DocumentVerificationState.EXPIRED,
          provider: verification.provider,
          verifiedAt: verification.verifiedAt,
          expiresAt: verification.expiresAt,
          attemptId: verification.attemptId,
          inputHash: verification.inputHash,
          createdAt: now,
          reason: 'auto_expired',
        });
        expiredUpdated = true;
      }
    });

    if (expiredUpdated) {
      KYCStateMachine.validateTransition(kyc.state, KYCState.EXPIRED);
      kyc.state = KYCState.EXPIRED;
      refreshCompletionStatus(kyc, Boolean(kyc.documents?.gstin?.number));
      await kyc.save();
    }

    const snapshot = buildKycSnapshot(kyc, now);
    const verifiedData = buildVerifiedData(kyc);

    sendSuccess(res, { kyc, snapshot, verifiedData }, 'KYC retrieved successfully');
  } catch (error) {
    logger.error('Error fetching KYC:', error);
    next(error);
  }
};

/**
 * Verify KYC document (admin only)
 * @route POST /kyc/:kycId/verify
 */
export const verifyKYCDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    if (!isPlatformAdmin(req.user)) {
      throw new AuthorizationError('Access denied', ErrorCode.AUTHZ_FORBIDDEN);
    }

    const auth = guardChecks(req, { requireCompany: false });
    const kycId = req.params.kycId;
    const validatedData = verifyDocumentSchema.parse(req.body);

    const kyc = await KYC.findById(kycId);
    if (!kyc) {
      throw new NotFoundError('KYC record', ErrorCode.RES_RESOURCE_NOT_FOUND);
    }

    // Non-admin path: must verify only own company (admin-only endpoint, but guard for consistency)
    if (!isPlatformAdmin(req.user) && auth.companyId && String(kyc.companyId) !== String(auth.companyId)) {
      throw new AuthorizationError('Cannot verify KYC for a different company', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Platform admin: audit cross-company verification
    if (isPlatformAdmin(req.user) && (auth.companyId == null || String(kyc.companyId) !== String(auth.companyId))) {
      await createAuditLog(
        auth.userId,
        String(kyc.companyId),
        'verify',
        'kyc',
        kycId,
        {
          adminCompanyId: auth.companyId ?? null,
          message: 'Cross-company KYC verification by platform admin',
          adminRole: (req.user as any).role,
        },
        req
      );
    }

    const now = new Date();
    const docKey = validatedData.documentType as DocumentType;
    const doc = (kyc.documents as any)[docKey];

    if (!doc) {
      throw new ValidationError(`${validatedData.documentType} document not found`);
    }

    if (!doc.verification) {
      doc.verification = {
        state: DocumentVerificationState.NOT_STARTED,
      };
    }

    if (validatedData.verified) {
      doc.verified = true;
      doc.verifiedAt = now;
      doc.verification.state = DocumentVerificationState.VERIFIED;
      doc.verification.verifiedAt = now;
      doc.verification.provider = doc.verification.provider || 'manual';
      doc.verification.expiresAt = doc.verification.expiresAt || buildExpiryDate(docKey, now) || undefined;
      doc.verification.lastCheckedAt = now;
      doc.verification.failureReason = undefined;
    } else {
      doc.verified = false;
      doc.verification.state = DocumentVerificationState.HARD_FAILED;
      doc.verification.provider = doc.verification.provider || 'manual';
      doc.verification.lastCheckedAt = now;
      doc.verification.failureReason = validatedData.notes;
    }

    appendVerificationHistory(doc, {
      id: doc.verification.attemptId || new mongoose.Types.ObjectId().toString(),
      state: doc.verification.state,
      provider: doc.verification.provider,
      verifiedAt: doc.verification.verifiedAt,
      expiresAt: doc.verification.expiresAt,
      attemptId: doc.verification.attemptId,
      inputHash: doc.verification.inputHash,
      createdAt: now,
      reason: validatedData.notes,
    });

    if (validatedData.notes) {
      kyc.verificationNotes = validatedData.notes;
    }

    // Check if all documents are verified (for those present)
    const allDocumentsVerified = DOCUMENT_TYPES
      .filter((type) => Boolean((kyc.documents as any)[type]))
      .every((type) => isDocumentVerified((kyc.documents as any)[type]));

    let updatedKYC;

    if (allDocumentsVerified) {
      KYCStateMachine.validateTransition(kyc.state, KYCState.VERIFIED);
      updatedKYC = await withTransaction(async (session) => {
        kyc.state = KYCState.VERIFIED;
        const saved = await kyc.save({ session });

        await User.findByIdAndUpdate(
          kyc.userId,
          {
            'kycStatus.isComplete': true,
            'kycStatus.state': KYCState.VERIFIED,
            'kycStatus.lastUpdated': new Date()
          },
          { session }
        );

        if (kyc.companyId) {
          await OnboardingProgressService.updateStep(kyc.companyId.toString(), 'kycApproved', kyc.userId?.toString());
        }

        return saved;
      });
    } else if (!validatedData.verified) {
      KYCStateMachine.validateTransition(kyc.state, KYCState.ACTION_REQUIRED);
      kyc.state = KYCState.ACTION_REQUIRED;
      updatedKYC = await kyc.save();
    } else {
      updatedKYC = await kyc.save();
    }

    if (allDocumentsVerified) {
      try {
        const user = await User.findById(kyc.userId).select('email name').lean();
        const company = kyc.companyId ? await Company.findById(kyc.companyId).select('name').lean() : null;
        if (user?.email) {
          await queueKYCApprovedEmail(
            user.email,
            (user as any).name || 'User',
            kyc.userId?.toString(),
            kyc.companyId?.toString(),
            {
              companyName: (company as any)?.name || 'Your Company',
              verifiedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            }
          );
          logger.info('KYC approval email queued', { userId: kyc.userId, email: user.email });
        }
      } catch (err) {
        logger.error('Failed to queue KYC approval email', err);
      }
    }

    await createAuditLog(
      req.user._id,
      kyc.companyId,
      'update',
      'kyc',
      kycId,
      {
        message: `KYC ${validatedData.documentType} ${validatedData.verified ? 'verified' : 'rejected'}`,
        documentType: validatedData.documentType,
        verified: validatedData.verified,
      },
      req
    );

    sendSuccess(res, { kyc: updatedKYC }, `${validatedData.documentType} ${validatedData.verified ? 'verified' : 'rejected'} successfully`);
  } catch (error) {
    logger.error('Error verifying KYC document:', error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', errors);
    }
    next(error);
  }
};

/**
 * Reject KYC (admin only)
 * @route POST /kyc/:kycId/reject
 */
export const rejectKYC = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    if (!isPlatformAdmin(req.user)) {
      throw new AuthorizationError('Access denied', ErrorCode.AUTHZ_FORBIDDEN);
    }

    const kycId = req.params.kycId;
    const { reason } = req.body;

    if (!reason) {
      throw new ValidationError('Rejection reason is required');
    }

    const kyc = await KYC.findById(kycId);
    if (!kyc) {
      throw new NotFoundError('KYC record', ErrorCode.RES_RESOURCE_NOT_FOUND);
    }

    KYCStateMachine.validateTransition(kyc.state, KYCState.REJECTED);

    const updatedKYC = await KYC.findByIdAndUpdate(
      kycId,
      {
        $set: {
          state: KYCState.REJECTED,
          rejectionReason: reason,
        },
      },
      { new: true }
    );

    try {
      await User.findByIdAndUpdate(kyc.userId, {
        'kycStatus.isComplete': false,
        'kycStatus.state': KYCState.REJECTED,
        'kycStatus.lastUpdated': new Date(),
      });
    } catch (err) {
      logger.error('Error updating user KYC status after rejection:', err);
    }

    try {
      const user = await User.findById(kyc.userId).select('email name').lean();
      if (user?.email) {
        const resubmitLink = `${process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000'}/seller/kyc`;
        const supportEmail = process.env.SUPPORT_EMAIL || 'support@shipcrowd.com';
        await queueKYCRejectedEmail(
          user.email,
          (user as any).name || 'User',
          reason,
          kyc.userId?.toString(),
          kyc.companyId?.toString(),
          { resubmitLink, supportEmail }
        );
        logger.info('KYC rejection email queued', { userId: kyc.userId, email: user.email });
      }
    } catch (err) {
      logger.error('Failed to queue KYC rejection email', err);
    }

    await createAuditLog(
      req.user._id,
      kyc.companyId,
      'update',
      'kyc',
      kycId,
      { message: 'KYC rejected', reason },
      req
    );

    sendSuccess(res, { kyc: updatedKYC }, 'KYC rejected successfully');
  } catch (error) {
    logger.error('Error rejecting KYC:', error);
    next(error);
  }
};

/**
 * Get all KYCs (admin only)
 * @route GET /kyc/all
 */
/**
 * Get all KYCs with advanced filtering, search, and stats (admin only)
 * @route GET /kyc/all
 */
export const getAllKYCs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    if (!isPlatformAdmin(req.user)) {
      throw new AuthorizationError('Access denied', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const status = req.query.status as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

    // Base Match Stage
    const matchStage: any = {};

    if (status && status !== 'all') {
      matchStage.status = status;
    }

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    // Aggregation Pipeline
    const pipeline: any[] = [
      { $match: matchStage },
      // Lookup User
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      // Lookup Company
      {
        $lookup: {
          from: 'companies',
          localField: 'companyId',
          foreignField: '_id',
          as: 'company'
        }
      },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    ];

    // Search Stage (if applicable)
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': searchRegex },
            { 'user.email': searchRegex },
            { 'company.name': searchRegex },
            { status: searchRegex }
          ]
        }
      });
    }

    // Facet for Data and Stats
    pipeline.push({
      $facet: {
        // Paginated Data
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              status: 1,
              createdAt: 1,
              updatedAt: 1,
              documents: 1,
              userId: { _id: '$user._id', name: '$user.name', email: '$user.email' },
              companyId: { _id: '$company._id', name: '$company.name' },
              completionStatus: 1
            }
          }
        ],
        // Total Count (for pagination)
        totalCount: [{ $count: 'count' }],
        // Global Stats (independent of pagination but respecting filters)
        stats: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
              verified: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
            }
          }
        ]
      }
    });

    const results = await KYC.aggregate(pipeline);

    const data = results[0].data;
    const total = results[0].totalCount[0]?.count || 0;
    const stats = results[0].stats[0] || { total: 0, pending: 0, verified: 0, rejected: 0 };

    const pagination = calculatePagination(total, page, limit);

    sendSuccess(res, {
      kycs: data,
      pagination,
      stats: {
        total: stats.total,
        pending: stats.pending,
        verified: stats.verified,
        rejected: stats.rejected
      }
    }, 'KYCs retrieved successfully');

  } catch (error) {
    logger.error('Error fetching KYCs:', error);
    next(error);
  }
};

/**
 * Verify PAN card in real-time using DeepVue API
 * @route POST /kyc/verify-pan
 */
export const verifyPanCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const { pan, name } = req.body;

    if (!pan) {
      throw new ValidationError('PAN number is required');
    }

    // Validate PAN format
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      throw new ValidationError('Invalid PAN format');
    }

    const attemptId = new mongoose.Types.ObjectId().toString();

    try {
      // Get the latest user data from the database to ensure we have the most up-to-date companyId
      const userDoc = await User.findById(req.user._id);

      if (!userDoc) {
        throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
      }

      // Now we know user exists, we can safely cast it
      const user = userDoc as IUser & { _id: mongoose.Types.ObjectId };

      if (!user.companyId) {
        throw new AuthenticationError('User is not associated with any company. Please create a company first.', ErrorCode.AUTH_REQUIRED);
      }

      // Call DeepVue API to verify PAN
      const verificationResult = await deepvueService.verifyPan(pan, name);

      logger.info('DeepVue PAN verification result:', verificationResult);

      // Find existing KYC record or create a new one
      let kyc = await KYC.findOne({ userId: user._id });

      if (!kyc) {
        kyc = new KYC({
          userId: user._id,
          companyId: user.companyId,
          documents: {},
          completionStatus: {
            personalKycComplete: false,
            companyInfoComplete: false,
            bankDetailsComplete: false,
            agreementComplete: false,
          },
        });
      }

      // Determine if the PAN is valid based on the response structure
      // The new API might have a different structure
      const isValid = verificationResult.valid === true ||
        (verificationResult.data && verificationResult.data.valid === true) ||
        (verificationResult.status === 'success' && verificationResult.data && verificationResult.data.valid !== false);

      // Extract name from the response if available
      const panName = verificationResult.name ||
        (verificationResult.data && verificationResult.data.name) ||
        name || '';

      const now = new Date();
      const inputHash = createKycInputHash('pan', { pan });
      const existingState = resolveVerificationState(kyc.documents?.pan).state;
      const existingHash = kyc.documents?.pan?.verification?.inputHash;
      const sameInput = Boolean(existingHash && existingHash === inputHash);

      const verificationState = isValid
        ? DocumentVerificationState.VERIFIED
        : DocumentVerificationState.SOFT_FAILED;

      const expiresAt = isValid ? buildExpiryDate('pan', now) || undefined : undefined;

      if (isValid || existingState !== DocumentVerificationState.VERIFIED || sameInput) {
        if (!kyc.documents.pan) {
          kyc.documents.pan = {
            number: '',
            image: '',
            verified: false,
          };
        }

        if (isValid) {
          kyc.documents.pan.number = pan;
          kyc.documents.pan.name = panName;
          kyc.documents.pan.verified = true;
          kyc.documents.pan.verifiedAt = now;
          kyc.documents.pan.verificationData = verificationResult;
        } else {
          kyc.documents.pan.verified = false;
          kyc.documents.pan.verifiedAt = undefined;
        }

        kyc.documents.pan.image = kyc.documents.pan.image || '';
        kyc.documents.pan.verification = {
          ...(kyc.documents.pan.verification || {}),
          state: verificationState,
          provider: KYC_DEFAULT_PROVIDER,
          verifiedAt: isValid ? now : undefined,
          expiresAt: expiresAt,
          attemptId,
          inputHash,
          lastCheckedAt: now,
          failureReason: isValid ? undefined : 'verification_failed',
        };

        appendVerificationHistory(kyc.documents.pan, {
          id: attemptId,
          state: verificationState,
          provider: KYC_DEFAULT_PROVIDER,
          verifiedAt: isValid ? now : undefined,
          expiresAt,
          attemptId,
          inputHash,
          createdAt: now,
          reason: isValid ? undefined : 'verification_failed',
        });
      }

      kyc.completionStatus.personalKycComplete =
        isDocumentVerified(kyc.documents.pan) &&
        (kyc.documents.aadhaar ? isDocumentVerified(kyc.documents.aadhaar) : true);

      if (!isValid && kyc.state === KYCState.VERIFIED) {
        KYCStateMachine.validateTransition(kyc.state, KYCState.ACTION_REQUIRED);
        kyc.state = KYCState.ACTION_REQUIRED;
        await User.findByIdAndUpdate(kyc.userId, {
          'kycStatus.isComplete': false,
          'kycStatus.state': KYCState.ACTION_REQUIRED,
          'kycStatus.lastUpdated': new Date(),
        });
      }

      await kyc.save();

      await recordVerificationAttempt({
        userId: user._id,
        companyId: user.companyId,
        documentType: 'pan',
        status: isValid ? 'success' : 'soft_failed',
        attemptId,
        metadata: {
          providerStatus: verificationResult.status,
        },
        req,
      });

      await createAuditLog(
        user._id.toString(),
        user.companyId.toString(),
        'verify',
        'kyc',
        getDocumentIdString(kyc),
        { message: 'PAN verified via DeepVue API', success: isValid },
        req
      );

      sendSuccess(res, {
        verified: isValid,
        verification: {
          state: verificationState,
          verifiedAt: isValid ? now : undefined,
          expiresAt,
          attemptId,
        },
        data: verificationResult.data || verificationResult,
      }, 'PAN verification completed');
    } catch (error) {
      logger.error('Error in DeepVue PAN verification:', error);

      await recordVerificationAttempt({
        userId: req.user?._id as any,
        companyId: req.user?.companyId as any,
        documentType: 'pan',
        status: 'error',
        attemptId: attemptId || new mongoose.Types.ObjectId().toString(),
        errorMessage: error instanceof Error ? error.message : 'PAN verification error',
        req,
      });

      throw new AppError('PAN verification failed', ErrorCode.EXT_SERVICE_ERROR, 400);
    }
  } catch (error) {
    logger.error('Error verifying PAN:', error);
    next(error);
  }
};



/**
 * Verify GSTIN in real-time using DeepVue API
 * @route POST /kyc/verify-gstin
 */
export const verifyGstin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const { gstin } = req.body;

    if (!gstin) {
      throw new ValidationError('GSTIN is required');
    }

    // Validate GSTIN format
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      throw new ValidationError('Invalid GSTIN format');
    }

    const attemptId = new mongoose.Types.ObjectId().toString();

    try {
      // Get the latest user data from the database to ensure we have the most up-to-date companyId
      const userDoc = await User.findById(req.user._id);

      if (!userDoc) {
        throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
      }

      // Now we know user exists, we can safely cast it
      const user = userDoc as IUser & { _id: mongoose.Types.ObjectId };

      if (!user.companyId) {
        throw new AuthenticationError('User is not associated with any company. Please create a company first.', ErrorCode.AUTH_REQUIRED);
      }

      // Call DeepVue API to verify GSTIN
      const verificationResult = await deepvueService.verifyGstin(gstin);

      logger.info('DeepVue GSTIN verification result:', verificationResult);

      // Find existing KYC record or create a new one
      let kyc = await KYC.findOne({ userId: user._id });

      if (!kyc) {
        kyc = new KYC({
          userId: user._id,
          companyId: user.companyId,
          status: 'pending',
          documents: {},
          completionStatus: {
            personalKycComplete: false,
            companyInfoComplete: false,
            bankDetailsComplete: false,
            agreementComplete: false,
          },
        });
      }

      // Determine if the GSTIN is valid based on the response structure
      const isValid = verificationResult.valid === true ||
        (verificationResult.data && verificationResult.data.valid === true) ||
        (verificationResult.status === 'success' && verificationResult.data && verificationResult.data.valid !== false);

      // Extract business information from the response
      const data = verificationResult.data || {};

      // Ensure addresses are properly formatted as an array of objects
      let formattedAddresses = [];
      if (Array.isArray(data.addresses)) {
        formattedAddresses = data.addresses.map((addr: any) => {
          // If the address is already an object with the right properties, use it
          if (typeof addr === 'object' && addr !== null && 'type' in addr && 'address' in addr) {
            return {
              type: addr.type || 'Unknown',
              address: addr.address || '',
              businessNature: addr.businessNature || ''
            };
          }
          // Otherwise, create a default object
          return {
            type: 'Unknown',
            address: typeof addr === 'string' ? addr : 'Unknown address',
            businessNature: ''
          };
        });
      } else if (typeof data.addresses === 'string') {
        // Handle case where addresses might be a stringified JSON array
        try {
          const parsedAddresses = JSON.parse(data.addresses);
          if (Array.isArray(parsedAddresses)) {
            formattedAddresses = parsedAddresses.map((addr: any) => {
              if (typeof addr === 'object' && addr !== null) {
                return {
                  type: addr.type || 'Unknown',
                  address: addr.address || '',
                  businessNature: addr.businessNature || ''
                };
              }
              return {
                type: 'Unknown',
                address: typeof addr === 'string' ? addr : 'Unknown address',
                businessNature: ''
              };
            });
          }
        } catch (e) {
          logger.error('Error parsing addresses string:', e);
          // If parsing fails, create a single address entry
          formattedAddresses = [{
            type: 'Unknown',
            address: data.addresses,
            businessNature: ''
          }];
        }
      }

      // Log the formatted addresses for debugging
      logger.info('Formatted GSTIN addresses:', formattedAddresses);

      const now = new Date();
      const inputHash = createKycInputHash('gstin', { gstin });
      const existingState = resolveVerificationState(kyc.documents?.gstin).state;
      const existingHash = kyc.documents?.gstin?.verification?.inputHash;
      const sameInput = Boolean(existingHash && existingHash === inputHash);

      const verificationState = isValid
        ? DocumentVerificationState.VERIFIED
        : DocumentVerificationState.SOFT_FAILED;

      const expiresAt = isValid ? buildExpiryDate('gstin', now) || undefined : undefined;

      if (isValid || existingState !== DocumentVerificationState.VERIFIED || sameInput) {
        if (!kyc.documents.gstin) {
          kyc.documents.gstin = {
            number: '',
            verified: false,
          };
        }

        if (isValid) {
          kyc.documents.gstin.number = gstin;
          kyc.documents.gstin.verified = true;
          kyc.documents.gstin.verifiedAt = now;
          kyc.documents.gstin.verificationData = verificationResult;
          kyc.documents.gstin.businessName = data.tradeName || '';
          kyc.documents.gstin.legalName = data.legalName || '';
          kyc.documents.gstin.status = data.status || '';
          kyc.documents.gstin.registrationType = data.registrationType || '';
          kyc.documents.gstin.businessType = Array.isArray(data.businessType) ? data.businessType : [];
          kyc.documents.gstin.addresses = formattedAddresses;
          kyc.documents.gstin.registrationDate = data.registrationDate || '';
          kyc.documents.gstin.lastUpdated = data.lastUpdated || '';
        } else {
          kyc.documents.gstin.verified = false;
          kyc.documents.gstin.verifiedAt = undefined;
          kyc.documents.gstin.businessName = undefined;
          kyc.documents.gstin.legalName = undefined;
          kyc.documents.gstin.status = undefined;
          kyc.documents.gstin.registrationType = undefined;
          kyc.documents.gstin.businessType = [];
          kyc.documents.gstin.addresses = [];
          kyc.documents.gstin.registrationDate = undefined;
          kyc.documents.gstin.lastUpdated = undefined;
        }

        kyc.documents.gstin.verification = {
          ...(kyc.documents.gstin.verification || {}),
          state: verificationState,
          provider: KYC_DEFAULT_PROVIDER,
          verifiedAt: isValid ? now : undefined,
          expiresAt,
          attemptId,
          inputHash,
          lastCheckedAt: now,
          failureReason: isValid ? undefined : 'verification_failed',
        };

        appendVerificationHistory(kyc.documents.gstin, {
          id: attemptId,
          state: verificationState,
          provider: KYC_DEFAULT_PROVIDER,
          verifiedAt: isValid ? now : undefined,
          expiresAt,
          attemptId,
          inputHash,
          createdAt: now,
          reason: isValid ? undefined : 'verification_failed',
        });
      }

      const gstinDoc = kyc.documents.gstin;

      // Log the enhanced GSTIN information
      logger.info('Enhanced GSTIN information:', {
        gstin,
        businessName: gstinDoc?.businessName,
        legalName: gstinDoc?.legalName,
        status: gstinDoc?.status,
        addressCount: gstinDoc?.addresses?.length || 0
      });

      // Update company info completion status
      kyc.completionStatus.companyInfoComplete = gstinDoc ? isDocumentVerified(gstinDoc) : false;

      if (!isValid && kyc.state === KYCState.VERIFIED) {
        KYCStateMachine.validateTransition(kyc.state, KYCState.ACTION_REQUIRED);
        kyc.state = KYCState.ACTION_REQUIRED;
        await User.findByIdAndUpdate(kyc.userId, {
          'kycStatus.isComplete': false,
          'kycStatus.state': KYCState.ACTION_REQUIRED,
          'kycStatus.lastUpdated': new Date(),
        });
      }

      await kyc.save();

      await recordVerificationAttempt({
        userId: user._id,
        companyId: user.companyId,
        documentType: 'gstin',
        status: isValid ? 'success' : 'soft_failed',
        attemptId,
        metadata: {
          providerStatus: verificationResult.status,
        },
        req,
      });

      await createAuditLog(
        user._id.toString(),
        user.companyId.toString(),
        'verify',
        'kyc',
        getDocumentIdString(kyc),
        { message: 'GSTIN verified via DeepVue API', success: isValid },
        req
      );

      // Prepare a more user-friendly response with the enhanced information
      const enhancedResponse = {
        message: 'GSTIN verification completed',
        verified: isValid,
        verification: {
          state: verificationState,
          verifiedAt: isValid ? now : undefined,
          expiresAt,
          attemptId,
        },
        businessInfo: {
          gstin: gstin,
          businessName: gstinDoc?.businessName || '',
          legalName: gstinDoc?.legalName || '',
          status: gstinDoc?.status || '',
          registrationType: gstinDoc?.registrationType || '',
          businessType: gstinDoc?.businessType || [],
          addresses: formattedAddresses, // Use the formatted addresses
          registrationDate: gstinDoc?.registrationDate || '',
          lastUpdated: gstinDoc?.lastUpdated || '',
        },
        // Include the raw data for debugging or advanced use cases
        rawData: verificationResult.data || verificationResult,
      };

      sendSuccess(res, enhancedResponse, 'Bank account verification completed');
    } catch (error) {
      logger.error('Error in DeepVue GSTIN verification:', error);

      await recordVerificationAttempt({
        userId: req.user?._id as any,
        companyId: req.user?.companyId as any,
        documentType: 'gstin',
        status: 'error',
        attemptId: attemptId || new mongoose.Types.ObjectId().toString(),
        errorMessage: error instanceof Error ? error.message : 'GSTIN verification error',
        req,
      });

      throw new AppError('GSTIN verification failed', ErrorCode.EXT_SERVICE_ERROR, 400);
    }
  } catch (error) {
    logger.error('Error verifying GSTIN:', error);
    next(error);
  }
};

/**
 * Verify bank account in real-time using DeepVue API
 * @route POST /kyc/verify-bank-account
 */
export const verifyBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await validateUserAndCompany(req, res);
    if (!user) return;

    const { accountNumber, ifsc: rawIfsc, accountHolderName: rawHolderName } = req.body;

    if (!accountNumber || !rawIfsc) {
      throw new ValidationError('Account number and IFSC code are required');
    }

    // Normalize and validate account number (digits only, 9-18)
    const accountNumberClean = String(accountNumber).trim();
    if (!/^\d{9,18}$/.test(accountNumberClean)) {
      throw new ValidationError('Invalid account number format. Account number should be 9-18 digits.');
    }

    // Normalize IFSC to uppercase and validate
    const ifsc = String(rawIfsc).trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      throw new ValidationError('Invalid IFSC code format. IFSC should be in the format AAAA0XXXXXX.');
    }

    // Sanitize account holder name (optional but validated if provided)
    const accountHolderName = rawHolderName
      ? String(rawHolderName).trim().slice(0, 100).replace(/[<>'"&]/g, '')
      : undefined;

    const attemptId = new mongoose.Types.ObjectId().toString();

    try {
      // First verify the IFSC code to get bank details
      let bankDetails = null;
      try {
        const ifscResult = await deepvueService.verifyIfsc(ifsc);
        if (ifscResult.status === 'success' && ifscResult.data) {
          bankDetails = {
            bankName: ifscResult.data.bankName || ifscResult.data.bank_name || '',
            branch: ifscResult.data.branch || '',
            address: ifscResult.data.address || '',
            city: ifscResult.data.city || '',
            state: ifscResult.data.state || '',
          };
          logger.info(`IFSC verification successful for ${ifsc}`);
        }
      } catch (ifscError) {
        logger.error(`Error verifying IFSC ${ifsc}:`, ifscError);
        // Continue with bank account verification even if IFSC verification fails
      }

      // Call DeepVue API to verify bank account
      const verificationResult = await deepvueService.verifyBankAccount(accountNumberClean, ifsc, accountHolderName);

      // Find or create KYC record
      let kyc = await findOrCreateKyc(user._id, user.companyId);

      // Determine if the bank account is valid based on the response structure
      const isValid = verificationResult.status === 'success' ||
        (verificationResult.data && verificationResult.data.accountExists === true) ||
        (verificationResult.data && verificationResult.data.account_exists === true);

      // Extract account holder name from the response
      const holderName = verificationResult.data?.accountHolderName ||
        verificationResult.data?.name_at_bank ||
        verificationResult.data?.account_holder_name ||
        accountHolderName || '';

      // Extract cleaned account holder name if available
      const holderNameClean = verificationResult.data?.accountHolderNameClean ||
        (verificationResult.data?.name_information?.name_at_bank_cleaned) ||
        holderName;

      // Extract bank name from the response or use the one from IFSC verification
      const bankNameValue = verificationResult.data?.bankName ||
        verificationResult.data?.bank_name ||
        (bankDetails?.bankName) ||
        '';

      // Extract UTR and amount deposited if available
      const utr = verificationResult.data?.utr || '';
      const amountDeposited = verificationResult.data?.amountDeposited || verificationResult.data?.amount_deposited || 0;

      const now = new Date();
      const inputHash = createKycInputHash('bankAccount', { accountNumber: accountNumberClean, ifsc });
      const existingState = resolveVerificationState(kyc.documents?.bankAccount).state;
      const existingHash = kyc.documents?.bankAccount?.verification?.inputHash;
      const sameInput = Boolean(existingHash && existingHash === inputHash);

      const verificationState = isValid
        ? DocumentVerificationState.VERIFIED
        : DocumentVerificationState.SOFT_FAILED;

      const expiresAt = isValid ? buildExpiryDate('bankAccount', now) || undefined : undefined;

      if (isValid || existingState !== DocumentVerificationState.VERIFIED || sameInput) {
        if (!kyc.documents.bankAccount) {
          kyc.documents.bankAccount = {
            accountNumber: '',
            ifscCode: '',
            accountHolderName: '',
            bankName: '',
            verified: false,
          };
        }

        if (isValid) {
          kyc.documents.bankAccount.accountNumber = accountNumberClean;
          kyc.documents.bankAccount.ifscCode = ifsc;
          kyc.documents.bankAccount.accountHolderName = holderName;
          kyc.documents.bankAccount.bankName = bankNameValue;
          kyc.documents.bankAccount.verified = true;
          kyc.documents.bankAccount.verifiedAt = now;
          kyc.documents.bankAccount.verificationData = {
            ...verificationResult,
            ifscDetails: bankDetails,
            nameClean: holderNameClean,
            utr,
            amountDeposited,
            verificationTimestamp: now.toISOString(),
          };
        } else {
          kyc.documents.bankAccount.verified = false;
          kyc.documents.bankAccount.verifiedAt = undefined;
          kyc.documents.bankAccount.accountHolderName = '';
          kyc.documents.bankAccount.bankName = '';
        }

        kyc.documents.bankAccount.verification = {
          ...(kyc.documents.bankAccount.verification || {}),
          state: verificationState,
          provider: KYC_DEFAULT_PROVIDER,
          verifiedAt: isValid ? now : undefined,
          expiresAt,
          attemptId,
          inputHash,
          lastCheckedAt: now,
          failureReason: isValid ? undefined : 'verification_failed',
        };

        appendVerificationHistory(kyc.documents.bankAccount, {
          id: attemptId,
          state: verificationState,
          provider: KYC_DEFAULT_PROVIDER,
          verifiedAt: isValid ? now : undefined,
          expiresAt,
          attemptId,
          inputHash,
          createdAt: now,
          reason: isValid ? undefined : 'verification_failed',
        });
      }

      // Update bank details completion status
      kyc.completionStatus.bankDetailsComplete = isDocumentVerified(kyc.documents.bankAccount);

      if (!isValid && kyc.state === KYCState.VERIFIED) {
        KYCStateMachine.validateTransition(kyc.state, KYCState.ACTION_REQUIRED);
        kyc.state = KYCState.ACTION_REQUIRED;
        await User.findByIdAndUpdate(kyc.userId, {
          'kycStatus.isComplete': false,
          'kycStatus.state': KYCState.ACTION_REQUIRED,
          'kycStatus.lastUpdated': new Date(),
        });
      }

      await kyc.save();

      await recordVerificationAttempt({
        userId: user._id,
        companyId: user.companyId,
        documentType: 'bankAccount',
        status: isValid ? 'success' : 'soft_failed',
        attemptId,
        metadata: {
          providerStatus: verificationResult.status,
        },
        req,
      });

      // Create audit log
      await createAuditLog(
        user._id.toString(),
        user.companyId.toString(),
        'verify',
        'kyc',
        getDocumentIdString(kyc),
        {
          message: 'Bank account verified via DeepVue API',
          success: isValid,
          accountNumber: `****${accountNumberClean.slice(-4)}`,
          ifsc,
          bankName: bankNameValue
        },
        req
      );

      // Sync verified bank to Company.billingInfo for payouts and Bank Accounts page
      if (isValid && user.companyId) {
        try {
          const company = await Company.findById(user.companyId);
          if (company) {
            company.billingInfo = {
              ...company.billingInfo,
              bankName: bankNameValue,
              accountNumber: accountNumberClean,
              ifscCode: ifsc,
              accountHolderName: holderName,
              bankVerifiedAt: now,
            };
            // Sync Razorpay fund account for COD payouts (idempotent, non-blocking)
            await syncRazorpayFundAccount(company, {
              accountNumber: accountNumberClean,
              ifscCode: ifsc,
              accountHolderName: holderName,
            });
            await company.save();
            logger.info('Synced verified bank to Company.billingInfo', {
              companyId: user.companyId,
              accountNumber: `****${accountNumberClean.slice(-4)}`,
            });
          }
        } catch (syncErr: any) {
          logger.error('Failed to sync bank to Company.billingInfo', {
            companyId: user.companyId,
            error: syncErr?.message,
          });
          // Non-blocking: KYC is saved; Company sync can be retried manually
        }
      }

      // Prepare an enhanced response with more details
      const enhancedResponse = {
        message: isValid ? 'Bank account verification completed successfully' : 'Bank account verification failed',
        verified: isValid,
        verification: {
          state: verificationState,
          verifiedAt: isValid ? now : undefined,
          expiresAt,
          attemptId,
        },
        data: {
          accountNumber: `****${accountNumberClean.slice(-4)}`, // Mask account number for security
          ifsc,
          accountHolderName: holderName,
          accountHolderNameClean: holderNameClean,
          bankName: bankNameValue,
          bankDetails: bankDetails,
          utr: utr,
          amountDeposited: amountDeposited,
          transactionId: verificationResult.transactionId || verificationResult.transaction_id || '',
        },
      };

      sendSuccess(res, enhancedResponse, 'Bank account verification completed');
    } catch (error) {
      logger.error('Error in DeepVue bank account verification:', error);
      await recordVerificationAttempt({
        userId: user?._id,
        companyId: user?.companyId,
        documentType: 'bankAccount',
        status: 'error',
        attemptId: attemptId || new mongoose.Types.ObjectId().toString(),
        errorMessage: error instanceof Error ? error.message : 'Bank verification error',
        req,
      });
      throw new AppError('Bank account verification failed', ErrorCode.EXT_SERVICE_ERROR, 400);
    }
  } catch (error) {
    logger.error('Error verifying bank account:', error);
    next(error);
  }
};

/**
 * Update agreement acceptance status
 * @route POST /kyc/agreement
 */
export const updateAgreement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const { agreed } = req.body;

    if (agreed !== true) {
      throw new ValidationError('Agreement acceptance is required');
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const userDoc = await User.findById(req.user._id);

    if (!userDoc) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    // Now we know user exists, we can safely cast it
    const user = userDoc as IUser & { _id: mongoose.Types.ObjectId };

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company. Please create a company first.', ErrorCode.AUTH_REQUIRED);
    }

    // Find existing KYC record or create a new one
    let kyc = await KYC.findOne({ userId: user._id });

    if (!kyc) {
      kyc = new KYC({
        userId: user._id,
        companyId: user.companyId,
        documents: {},
        completionStatus: {
          personalKycComplete: false,
          companyInfoComplete: false,
          bankDetailsComplete: false,
          agreementComplete: false,
        },
      });
    }

    // Update agreement status
    kyc.completionStatus.agreementComplete = true;

    // Check if all steps are complete
    const allComplete =
      kyc.completionStatus.personalKycComplete &&
      kyc.completionStatus.companyInfoComplete &&
      kyc.completionStatus.bankDetailsComplete &&
      kyc.completionStatus.agreementComplete;

    // If all steps are complete, update the overall status (optimistic lock to prevent race)
    if (allComplete) {
      KYCStateMachine.validateTransition(kyc.state, KYCState.SUBMITTED);
      const currentVersion = kyc.__v;
      const submittedAt = new Date();

      await withTransaction(async (session) => {
        const updated = await KYC.findOneAndUpdate(
          { _id: kyc._id, __v: currentVersion },
          {
            $set: {
              'completionStatus.agreementComplete': true,
              state: KYCState.SUBMITTED,
              submittedAt,
            },
            $inc: { __v: 1 },
          },
          { session, new: true }
        );

        if (!updated) {
          throw new ConflictError('KYC modified by another request. Please try again.');
        }

        // Refresh in-memory doc for audit/success
        Object.assign(kyc, updated.toObject?.() ?? updated);
      });
    } else {
      await kyc.save();
    }

    await createAuditLog(
      user._id.toString(),
      user.companyId?.toString() || '',
      'update',
      'kyc',
      getDocumentIdString(kyc),
      { message: 'Agreement accepted' },
      req
    );

    sendSuccess(res, { kycComplete: allComplete }, 'Agreement status updated');
  } catch (error) {
    logger.error('Error updating agreement status:', error);
    next(error);
  }
};

/**
 * Invalidate a verified KYC document (user-initiated re-verification)
 * @route POST /kyc/invalidate
 */
export const invalidateKYCDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await validateUserAndCompany(req, res);
    if (!user) return;

    const { documentType, reason } = invalidateDocumentSchema.parse(req.body);

    const kyc = await KYC.findOne({ userId: user._id });
    if (!kyc) {
      throw new NotFoundError('KYC record', ErrorCode.RES_RESOURCE_NOT_FOUND);
    }

    const doc = (kyc.documents as any)[documentType];
    if (!doc) {
      throw new ValidationError(`${documentType} document not found`);
    }

    const now = new Date();

    // Clear sensitive fields to avoid retaining unverified data
    if (documentType === 'pan') {
      doc.number = '';
      doc.name = undefined;
      doc.verificationData = undefined;
    }
    if (documentType === 'gstin') {
      doc.number = '';
      doc.businessName = undefined;
      doc.legalName = undefined;
      doc.status = undefined;
      doc.registrationType = undefined;
      doc.businessType = [];
      doc.addresses = [];
      doc.registrationDate = undefined;
      doc.lastUpdated = undefined;
      doc.verificationData = undefined;
    }
    if (documentType === 'bankAccount') {
      doc.accountNumber = '';
      doc.ifscCode = '';
      doc.accountHolderName = '';
      doc.bankName = '';
      doc.verificationData = undefined;
    }
    if (documentType === 'aadhaar') {
      doc.number = '';
      doc.frontImage = '';
      doc.backImage = '';
      doc.verificationData = undefined;
    }

    doc.verified = false;
    doc.verifiedAt = undefined;
    doc.verification = {
      ...(doc.verification || {}),
      state: DocumentVerificationState.REVOKED,
      revokedAt: now,
      lastCheckedAt: now,
      failureReason: reason,
    };

    appendVerificationHistory(doc, {
      id: new mongoose.Types.ObjectId().toString(),
      state: DocumentVerificationState.REVOKED,
      provider: doc.verification?.provider,
      verifiedAt: doc.verification?.verifiedAt,
      expiresAt: doc.verification?.expiresAt,
      attemptId: doc.verification?.attemptId,
      inputHash: doc.verification?.inputHash,
      createdAt: now,
      reason: reason || 'user_invalidated',
    });

    refreshCompletionStatus(kyc, Boolean(kyc.documents?.gstin?.number));
    KYCStateMachine.validateTransition(kyc.state, KYCState.ACTION_REQUIRED);
    kyc.state = KYCState.ACTION_REQUIRED;

    await kyc.save();

    await User.findByIdAndUpdate(kyc.userId, {
      'kycStatus.isComplete': false,
      'kycStatus.state': KYCState.ACTION_REQUIRED,
      'kycStatus.lastUpdated': new Date(),
    });

    await createAuditLog(
      user._id.toString(),
      user.companyId?.toString() || '',
      'update',
      'kyc',
      getDocumentIdString(kyc),
      {
        message: 'KYC document invalidated',
        documentType,
        reason: reason || 'user_invalidated',
      },
      req
    );

    sendSuccess(res, { kyc }, 'KYC document invalidated');
  } catch (error) {
    logger.error('Error invalidating KYC document:', error);
    next(error);
  }
};

/**
 * Verify Aadhaar in real-time using DeepVue API (one-step verification)
 * @route POST /kyc/verify-aadhaar
 */
export const verifyAadhaar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const { aadhaar } = req.body;

    if (!aadhaar) {
      throw new ValidationError('Aadhaar number is required');
    }

    // Validate Aadhaar format
    if (!/^\d{12}$/.test(aadhaar)) {
      throw new ValidationError('Invalid Aadhaar format');
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const userDoc = await User.findById(req.user._id);

    if (!userDoc) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    // Now we know user exists, we can safely cast it
    const user = userDoc as IUser & { _id: mongoose.Types.ObjectId };

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company. Please create a company first.', ErrorCode.AUTH_REQUIRED);
    }

    const attemptId = new mongoose.Types.ObjectId().toString();

    // Call DeepVue API for basic Aadhaar verification
    let verificationResult: any;
    try {
      verificationResult = await deepvueService.verifyAadhaar(aadhaar);
    } catch (error) {
      await recordVerificationAttempt({
        userId: user._id,
        companyId: user.companyId,
        documentType: 'aadhaar',
        status: 'error',
        attemptId,
        errorMessage: error instanceof Error ? error.message : 'Aadhaar verification error',
        req,
      });

      throw new AppError('Aadhaar verification failed', ErrorCode.EXT_SERVICE_ERROR, 400);
    }

    const isValid = verificationResult.status === 'success' || (verificationResult.code === 200 && verificationResult.data);

    // Find existing KYC record or create a new one
    let kyc = await KYC.findOne({ userId: user._id });

    if (!kyc) {
      kyc = new KYC({
        userId: user._id,
        companyId: user.companyId,
        status: 'pending',
        documents: {},
        completionStatus: {
          personalKycComplete: false,
          companyInfoComplete: false,
          bankDetailsComplete: false,
          agreementComplete: false,
        },
      });
    }

    const now = new Date();
    const inputHash = createKycInputHash('aadhaar', { aadhaar });
    const existingState = resolveVerificationState(kyc.documents?.aadhaar).state;
    const existingHash = kyc.documents?.aadhaar?.verification?.inputHash;
    const sameInput = Boolean(existingHash && existingHash === inputHash);

    const verificationState = isValid
      ? DocumentVerificationState.VERIFIED
      : DocumentVerificationState.SOFT_FAILED;

    const expiresAt = isValid ? buildExpiryDate('aadhaar', now) || undefined : undefined;

    if (isValid || existingState !== DocumentVerificationState.VERIFIED || sameInput) {
      if (!kyc.documents.aadhaar) {
        kyc.documents.aadhaar = {
          number: '',
          verified: false,
          frontImage: '',
          backImage: '',
        };
      }

      if (isValid) {
        kyc.documents.aadhaar.number = aadhaar;
        kyc.documents.aadhaar.verified = true;
        kyc.documents.aadhaar.verifiedAt = now;
        kyc.documents.aadhaar.verificationData = verificationResult.data;
      } else {
        kyc.documents.aadhaar.verified = false;
        kyc.documents.aadhaar.verifiedAt = undefined;
      }

      kyc.documents.aadhaar.verification = {
        ...(kyc.documents.aadhaar.verification || {}),
        state: verificationState,
        provider: KYC_DEFAULT_PROVIDER,
        verifiedAt: isValid ? now : undefined,
        expiresAt,
        attemptId,
        inputHash,
        lastCheckedAt: now,
        failureReason: isValid ? undefined : 'verification_failed',
      };

      appendVerificationHistory(kyc.documents.aadhaar, {
        id: attemptId,
        state: verificationState,
        provider: KYC_DEFAULT_PROVIDER,
        verifiedAt: isValid ? now : undefined,
        expiresAt,
        attemptId,
        inputHash,
        createdAt: now,
        reason: isValid ? undefined : 'verification_failed',
      });
    }

    kyc.completionStatus.personalKycComplete =
      isDocumentVerified(kyc.documents.pan) &&
      (kyc.documents.aadhaar ? isDocumentVerified(kyc.documents.aadhaar) : true);

    if (!isValid && kyc.state === KYCState.VERIFIED) {
      KYCStateMachine.validateTransition(kyc.state, KYCState.ACTION_REQUIRED);
      kyc.state = KYCState.ACTION_REQUIRED;
      await User.findByIdAndUpdate(kyc.userId, {
        'kycStatus.isComplete': false,
        'kycStatus.state': KYCState.ACTION_REQUIRED,
        'kycStatus.lastUpdated': new Date(),
      });
    }

    await kyc.save();

    await recordVerificationAttempt({
      userId: user._id,
      companyId: user.companyId,
      documentType: 'aadhaar',
      status: isValid ? 'success' : 'soft_failed',
      attemptId,
      metadata: {
        providerStatus: verificationResult.status,
      },
      req,
    });

    if (!isValid) {
      throw new AppError(verificationResult.message || 'Failed to verify Aadhaar', ErrorCode.EXT_SERVICE_ERROR, 400);
    }

    await createAuditLog(
      user._id.toString(),
      user.companyId?.toString() || '',
      'verify',
      'kyc',
      getDocumentIdString(kyc),
      { message: 'Aadhaar verification completed' },
      req
    );

    // Prepare response data
    const responseData = {
      aadhaarNumber: aadhaar,
      verified: true,
      verification: {
        state: verificationState,
        verifiedAt: now,
        expiresAt,
        attemptId,
      },
      ageRange: verificationResult.data.age_range || '',
      state: verificationResult.data.state || '',
      gender: verificationResult.data.gender || '',
      lastDigits: verificationResult.data.last_digits || '',
      isMobile: verificationResult.data.is_mobile || false,
    };

    sendSuccess(res, responseData, 'Aadhaar verification successful');
  } catch (error) {
    logger.error('Error verifying Aadhaar:', error);
    next(error);
  }
};

/**
 * Verify IFSC code in real-time using DeepVue API
 * @route POST /kyc/verify-ifsc
 */
export const verifyIfscCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate user (authentication check only, no need for company association)
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const { ifsc: rawIfsc } = req.body;

    if (!rawIfsc) {
      throw new ValidationError('IFSC code is required');
    }

    // Normalize to uppercase and validate
    const ifsc = String(rawIfsc).trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      throw new ValidationError('Invalid IFSC code format. IFSC should be in the format AAAA0XXXXXX.');
    }

    try {
      // Call DeepVue API to verify IFSC code (real API only in production)
      const verificationResult = await deepvueService.verifyIfsc(ifsc);

      // Determine if the IFSC is valid based on the response structure
      const isValid = verificationResult.status === 'success' ||
        (verificationResult.data && verificationResult.data.valid === true);

      if (isValid && verificationResult.data) {
        // Extract bank details from the response
        const bankDetails = {
          ifsc: verificationResult.data.ifsc || ifsc,
          bankName: verificationResult.data.bankName || verificationResult.data.bank_name || '',
          branch: verificationResult.data.branch || '',
          address: verificationResult.data.address || '',
          city: verificationResult.data.city || '',
          state: verificationResult.data.state || '',
          valid: true,
        };

        sendSuccess(res, bankDetails, 'IFSC verification completed successfully');
      } else {
        throw new ValidationError(verificationResult.message || 'Invalid IFSC code');
      }
    } catch (error) {
      logger.error('Error in DeepVue IFSC verification:', error);
      throw new AppError('IFSC verification failed', ErrorCode.EXT_SERVICE_ERROR, 400);
    }
  } catch (error) {
    logger.error('Error verifying IFSC:', error);
    next(error);
  }
};

export default {
  submitKYC,
  getKYC,
  verifyKYCDocument,
  rejectKYC,
  getAllKYCs,
  verifyPanCard,
  verifyAadhaar,
  verifyGstin,
  verifyBankAccount,
  verifyIfscCode,
  updateAgreement,
  invalidateKYCDocument,
};
