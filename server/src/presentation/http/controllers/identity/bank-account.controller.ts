import { Request, Response, NextFunction } from 'express';
import { Company } from '../../../../infrastructure/database/mongoose/models';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import { z } from 'zod';

// Schema for Bank Account
const bankAccountSchema = z.object({
    bankName: z.string().min(2),
    accountNumber: z.string().min(8),
    ifscCode: z.string().min(4),
    accountHolderName: z.string().min(2), // We might map this to existing fields or ignore if not present in Company model
    isDefault: z.boolean().optional()
});

/**
 * Bank Account Controller
 * Manages bank accounts for the seller.
 * Note: Currently maps to Company.billingInfo (Single Account).
 * Future: Migrate to dedicated BankAccount model if multiple accounts needed.
 */

export const getBankAccounts = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const company = await Company.findById(auth.companyId).select('billingInfo');

        if (!company) {
            throw new NotFoundError('Company not found', ErrorCode.RES_COMPANY_NOT_FOUND);
        }

        const billing = company.billingInfo || {};

        // Adapter: Return as array [1] if exists, else []
        const accounts = [];
        if (billing.accountNumber && billing.ifscCode) {
            accounts.push({
                _id: 'primary', // Virtual ID for the single account
                bankName: billing.bankName || 'Unknown Bank',
                accountNumber: billing.accountNumber,
                ifscCode: billing.ifscCode,
                isDefault: true,
                isVerified: true // Assume verified for now if it exists in billingInfo (usually populated during KYC)
            });
        }

        sendSuccess(res, { accounts }, 'Bank accounts retrieved successfully');
    } catch (error) {
        logger.error('Error fetching bank accounts:', error);
        next(error);
    }
};

export const addBankAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = bankAccountSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Invalid bank account details', validation.error.errors);
        }

        const company = await Company.findById(auth.companyId);
        if (!company) {
            throw new NotFoundError('Company not found', ErrorCode.RES_COMPANY_NOT_FOUND);
        }

        // Update billingInfo (replaces existing since we only support one)
        company.billingInfo = {
            ...company.billingInfo,
            bankName: validation.data.bankName,
            accountNumber: validation.data.accountNumber,
            ifscCode: validation.data.ifscCode,
        };

        // ✅ P0 FIX: Sync with Razorpay Fund Account (idempotent)
        try {
            // Only create if not already exists
            if (!company.financial?.razorpayFundAccountId) {
                const { RazorpayPayoutProvider } = await import('../../../../infrastructure/payment/razorpay/razorpay-payout.provider.js');
                const razorpayProvider = new RazorpayPayoutProvider();

                const fundAccount = await razorpayProvider.createFundAccount(
                    {
                        accountNumber: validation.data.accountNumber,
                        ifscCode: validation.data.ifscCode,
                        accountHolderName: validation.data.accountHolderName || company.name,
                    },
                    company._id.toString()
                );

                // Store Razorpay references
                company.financial = {
                    razorpayContactId: fundAccount.contact_id,
                    razorpayFundAccountId: fundAccount.id,
                    lastPayoutAt: company.financial?.lastPayoutAt,
                    totalPayoutsReceived: company.financial?.totalPayoutsReceived || 0,
                };

                logger.info('Razorpay fund account created and synced', {
                    companyId: company._id,
                    fundAccountId: fundAccount.id,
                });
            } else {
                logger.info('Razorpay fund account already exists, skipping creation', {
                    companyId: company._id,
                    fundAccountId: company.financial.razorpayFundAccountId,
                });
            }
        } catch (razorpayError: any) {
            // Log error but don't block bank account save
            // This allows manual retry or async processing
            logger.error('Failed to create Razorpay fund account', {
                companyId: company._id,
                error: razorpayError.message,
                stack: razorpayError.stack,
            });
            // TODO: Queue for retry or alert admin
        }

        await company.save();

        sendSuccess(res, {
            account: {
                _id: 'primary',
                ...validation.data,
                isDefault: true,
                isVerified: false, // New accounts might need verification
                razorpayFundAccountId: company.financial?.razorpayFundAccountId,
            }
        }, 'Bank account added successfully');

    } catch (error) {
        logger.error('Error adding bank account:', error);
        next(error);
    }
};

export const deleteBankAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        // We strictly don't allow deleting the primary KYC account easily without replacement
        // But for this API, we can clear the fields if requested

        const company = await Company.findById(auth.companyId);
        if (!company) {
            throw new NotFoundError('Company not found', ErrorCode.RES_COMPANY_NOT_FOUND);
        }

        // Clear bank details
        company.billingInfo.bankName = undefined;
        company.billingInfo.accountNumber = undefined;
        company.billingInfo.ifscCode = undefined;

        await company.save();

        sendSuccess(res, null, 'Bank account removed successfully');
    } catch (error) {
        logger.error('Error removing bank account:', error);
        next(error);
    }
};


export default {
    getBankAccounts,
    addBankAccount,
    deleteBankAccount
};
