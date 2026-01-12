import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { KYC } from '../../../../infrastructure/database/mongoose/models';
import { User, IUser } from '../../../../infrastructure/database/mongoose/models';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import { formatError } from '../../../../shared/errors/error-messages';
import logger from '../../../../shared/logger/winston.logger';
import deepvueService from '../../../../core/application/services/integrations/deepvue.service';
import OnboardingProgressService from '../../../../core/application/services/onboarding/progress.service';
import { sendSuccess, sendPaginated, sendCreated, calculatePagination } from '../../../../shared/utils/responseHelper';
import { withTransaction } from '../../../../shared/utils/transactionHelper';
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, ConflictError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
// Import validation schemas
import { panSchema, aadhaarSchema, gstinSchema, bankAccountSchema, submitKYCSchema, verifyDocumentSchema } from '../../../../shared/validation/schemas';


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
  if (!req.user) {
    throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
  }

  // Get the latest user data from the database to ensure we have the most up-to-date companyId
  const userDoc = await User.findById(req.user._id);

  if (!userDoc) {
    throw new NotFoundError('User not found', ErrorCode.RES_USER_NOT_FOUND);
  }

  // Now we know user exists, we can safely cast it
  const user = userDoc as IUser & { _id: mongoose.Types.ObjectId };

  if (!user.companyId) {
    throw new AuthenticationError('User is not associated with any company. Please create a company first.', ErrorCode.AUTH_REQUIRED);
  }

  // Return user with guaranteed companyId
  return user as IUser & { _id: mongoose.Types.ObjectId, companyId: mongoose.Types.ObjectId };
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

  return kyc;
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

    // Check if KYC already exists for this user
    let kyc = await KYC.findOne({ userId: req.user._id });

    if (kyc) {
      // Update existing KYC
      const updateData: any = {};

      if (validatedData.pan) {
        updateData['documents.pan'] = {
          ...validatedData.pan,
          verified: false,
        };
      }

      if (validatedData.aadhaar) {
        updateData['documents.aadhaar'] = {
          ...validatedData.aadhaar,
          verified: false,
        };
      }

      if (validatedData.gstin) {
        updateData['documents.gstin'] = {
          ...validatedData.gstin,
          verified: false,
        };
      }

      if (validatedData.bankAccount) {
        updateData['documents.bankAccount'] = {
          ...validatedData.bankAccount,
          verified: false,
        };
      }

      // Set status to pending if it was rejected before
      if (kyc.status === 'rejected') {
        updateData.status = 'pending';
        updateData.rejectionReason = undefined;
      }

      kyc = await KYC.findByIdAndUpdate(kyc._id, { $set: updateData }, { new: true });
    } else {
      // Create new KYC
      kyc = new KYC({
        userId: req.user._id,
        companyId: req.user.companyId,
        status: 'pending',
        documents: {
          ...(validatedData.pan && { pan: { ...validatedData.pan, verified: false } }),
          ...(validatedData.aadhaar && { aadhaar: { ...validatedData.aadhaar, verified: false } }),
          ...(validatedData.gstin && { gstin: { ...validatedData.gstin, verified: false } }),
          ...(validatedData.bankAccount && { bankAccount: { ...validatedData.bankAccount, verified: false } }),
        },
      });

      await kyc.save();
    }

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

    sendSuccess(res, { kyc }, 'KYC retrieved successfully');
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

    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Access denied', ErrorCode.AUTHZ_FORBIDDEN);
    }

    const kycId = req.params.kycId;
    const validatedData = verifyDocumentSchema.parse(req.body);

    const kyc = await KYC.findById(kycId);
    if (!kyc) {
      throw new NotFoundError('KYC record', ErrorCode.RES_RESOURCE_NOT_FOUND);
    }

    // Update the document verification status
    const updateData: any = {};
    const documentPath = `documents.${validatedData.documentType}`;

    if (!kyc.documents[validatedData.documentType]) {
      throw new ValidationError(`${validatedData.documentType} document not found`);
    }

    updateData[`${documentPath}.verified`] = validatedData.verified;
    if (validatedData.verified) {
      updateData[`${documentPath}.verifiedAt`] = new Date();
    }

    if (validatedData.notes) {
      updateData.verificationNotes = validatedData.notes;
    }

    // Check if all documents are verified
    const allDocumentsVerified = Object.keys(kyc.documents)
      .filter(key => {
        return ['pan', 'aadhaar', 'gstin', 'bankAccount'].includes(key) &&
          kyc.documents[key as 'pan' | 'aadhaar' | 'gstin' | 'bankAccount'] !== undefined;
      })
      .every(key => {
        const docKey = key as 'pan' | 'aadhaar' | 'gstin' | 'bankAccount';
        if (docKey === validatedData.documentType) {
          return validatedData.verified;
        }
        return kyc.documents[docKey]?.verified || false;
      });

    if (allDocumentsVerified) {
      updateData.status = 'verified';

      // ✅ ONBOARDING HOOK: Update progress
      try {
        // Fix KYC Deadlock: Update user KYC status
        await User.findByIdAndUpdate(kyc.userId, {
          'kycStatus.isComplete': true,
          'kycStatus.lastUpdated': new Date()
        });

        if (kyc.companyId) {
          await OnboardingProgressService.updateStep(kyc.companyId.toString(), 'kycApproved', kyc.userId?.toString());
        }
      } catch (err) {
        logger.error('Error updating onboarding progress/user status for KYC approval:', err);
      }
    }

    const updatedKYC = await KYC.findByIdAndUpdate(kycId, { $set: updateData }, { new: true });

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

    if (req.user.role !== 'admin') {
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

    const updatedKYC = await KYC.findByIdAndUpdate(
      kycId,
      {
        $set: {
          status: 'rejected',
          rejectionReason: reason,
        },
      },
      { new: true }
    );

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
export const getAllKYCs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Access denied', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filtering
    const filter: any = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }

    // Get KYCs with user and company info
    const kycs = await KYC.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('companyId', 'name');

    // Get total count
    const total = await KYC.countDocuments(filter);

    const pagination = calculatePagination(total, page, limit);
    sendPaginated(res, kycs, pagination, 'KYCs retrieved successfully');
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

      // Determine if the PAN is valid based on the response structure
      // The new API might have a different structure
      const isValid = verificationResult.valid === true ||
        (verificationResult.data && verificationResult.data.valid === true) ||
        (verificationResult.status === 'success' && verificationResult.data && verificationResult.data.valid !== false);

      // Extract name from the response if available
      const panName = verificationResult.name ||
        (verificationResult.data && verificationResult.data.name) ||
        name || '';

      // Update PAN details
      const panData: {
        number: string;
        image: string;
        verified: boolean;
        verificationData?: any;
        verifiedAt?: Date;
        name?: string;
      } = {
        number: pan,
        image: '', // Required field, set to empty string if not available
        verified: isValid,
        verificationData: verificationResult,
        verifiedAt: new Date(),
        name: panName,
      };

      // Update KYC document
      kyc.documents.pan = panData;

      // Check if personal KYC is complete
      if (kyc.documents.aadhaar && kyc.documents.aadhaar.verified && kyc.documents.pan.verified) {
        kyc.completionStatus.personalKycComplete = true;
      }

      await kyc.save();

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
        data: verificationResult.data || verificationResult,
      }, 'PAN verification completed');
    } catch (error) {
      logger.error('Error in DeepVue PAN verification:', error);

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

      // Update GSTIN details with enhanced information
      kyc.documents.gstin = {
        number: gstin,
        verified: isValid,
        verificationData: verificationResult,
        verifiedAt: new Date(),
        businessName: data.tradeName || '',
        legalName: data.legalName || '',
        status: data.status || '',
        registrationType: data.registrationType || '',
        businessType: Array.isArray(data.businessType) ? data.businessType : [],
        addresses: formattedAddresses,
        registrationDate: data.registrationDate || '',
        lastUpdated: data.lastUpdated || '',
      };

      // Log the enhanced GSTIN information
      logger.info('Enhanced GSTIN information:', {
        gstin,
        businessName: kyc.documents.gstin.businessName,
        legalName: kyc.documents.gstin.legalName,
        status: kyc.documents.gstin.status,
        addressCount: kyc.documents.gstin.addresses?.length || 0
      });

      // Update company info completion status
      kyc.completionStatus.companyInfoComplete = true;

      await kyc.save();

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
        businessInfo: {
          gstin: gstin,
          businessName: kyc.documents.gstin.businessName,
          legalName: kyc.documents.gstin.legalName,
          status: kyc.documents.gstin.status,
          registrationType: kyc.documents.gstin.registrationType,
          businessType: kyc.documents.gstin.businessType,
          addresses: formattedAddresses, // Use the formatted addresses
          registrationDate: kyc.documents.gstin.registrationDate,
          lastUpdated: kyc.documents.gstin.lastUpdated,
        },
        // Include the raw data for debugging or advanced use cases
        rawData: verificationResult.data || verificationResult,
      };

      sendSuccess(res, enhancedResponse, 'GSTIN verification completed');
    } catch (error) {
      logger.error('Error in DeepVue GSTIN verification:', error);

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

    const { accountNumber, ifsc, accountHolderName } = req.body;

    if (!accountNumber || !ifsc) {
      throw new ValidationError('Account number and IFSC code are required');
    }

    // Validate account number format (basic validation)
    if (!/^\d{9,18}$/.test(accountNumber)) {
      throw new ValidationError('Invalid account number format. Account number should be 9-18 digits.');
    }

    // Validate IFSC code format
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      throw new ValidationError('Invalid IFSC code format. IFSC should be in the format AAAA0XXXXXX.');
    }

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
      const verificationResult = await deepvueService.verifyBankAccount(accountNumber, ifsc, accountHolderName);

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

      // Update bank account details with enhanced information
      kyc.documents.bankAccount = {
        accountNumber,
        ifscCode: ifsc,
        accountHolderName: holderName,
        bankName: bankNameValue,
        verified: isValid,
        verificationData: {
          ...verificationResult,
          ifscDetails: bankDetails,
          nameClean: holderNameClean,
          utr,
          amountDeposited,
          verificationTimestamp: new Date().toISOString(),
        },
        verifiedAt: new Date(),
      };

      // Update bank details completion status
      kyc.completionStatus.bankDetailsComplete = isValid;

      await kyc.save();

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
          accountNumber: `****${accountNumber.slice(-4)}`,
          ifsc,
          bankName: bankNameValue
        },
        req
      );

      // Prepare an enhanced response with more details
      const enhancedResponse = {
        message: isValid ? 'Bank account verification completed successfully' : 'Bank account verification failed',
        verified: isValid,
        data: {
          accountNumber: `****${accountNumber.slice(-4)}`, // Mask account number for security
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

      sendSuccess(res, enhancedResponse, 'GSTIN verification completed');
    } catch (error) {
      logger.error('Error in DeepVue bank account verification:', error);
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

    // Update agreement status
    kyc.completionStatus.agreementComplete = true;

    // Check if all steps are complete
    const allComplete =
      kyc.completionStatus.personalKycComplete &&
      kyc.completionStatus.companyInfoComplete &&
      kyc.completionStatus.bankDetailsComplete &&
      kyc.completionStatus.agreementComplete;

    // If all steps are complete, update the overall status
    if (allComplete) {
      await withTransaction(async (session) => {
        // ✅ FEATURE 4: Require admin approval instead of auto-verification
        kyc.status = 'pending'; // Changed from 'verified' to 'pending'
        kyc.submittedAt = new Date(); // Track submission time
        await kyc.save({ session });

        // ❌ DO NOT auto-update user KYC status - wait for admin approval
        // User kycStatus will be updated when admin approves via approveKYC endpoint
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

    // Call DeepVue API for basic Aadhaar verification
    const verificationResult = await deepvueService.verifyAadhaar(aadhaar);

    // Check if the response indicates success
    if (verificationResult.status === 'success' || (verificationResult.code === 200 && verificationResult.data)) {
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

      // Update Aadhaar details
      if (!kyc.documents.aadhaar) {
        kyc.documents.aadhaar = {
          number: aadhaar,
          verified: true,
          frontImage: '',
          backImage: '',
          verifiedAt: new Date()
        };
      } else {
        kyc.documents.aadhaar.number = aadhaar;
        kyc.documents.aadhaar.verified = true;
        kyc.documents.aadhaar.verifiedAt = new Date();
      }

      // Store verification data
      kyc.documents.aadhaar.verificationData = verificationResult.data;

      // Check if personal KYC is complete
      if (kyc.documents.pan && kyc.documents.pan.verified) {
        kyc.completionStatus.personalKycComplete = true;
      }

      await kyc.save();

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
        ageRange: verificationResult.data.age_range || '',
        state: verificationResult.data.state || '',
        gender: verificationResult.data.gender || '',
        lastDigits: verificationResult.data.last_digits || '',
        isMobile: verificationResult.data.is_mobile || false,
      };

      sendSuccess(res, responseData, 'Aadhaar verification successful');
    } else {
      throw new AppError(verificationResult.message || 'Failed to verify Aadhaar', ErrorCode.EXT_SERVICE_ERROR, 400);
    }
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

    const { ifsc } = req.body;

    if (!ifsc) {
      throw new ValidationError('IFSC code is required');
    }

    // Validate IFSC code format
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      throw new ValidationError('Invalid IFSC code format. IFSC should be in the format AAAA0XXXXXX.');
    }

    try {
      // Call DeepVue API to verify IFSC code
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
};
