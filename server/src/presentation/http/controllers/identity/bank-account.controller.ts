import { Request, Response, NextFunction } from 'express';
import { Company } from '../../../../infrastructure/database/mongoose/models';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import { z } from 'zod';
import { syncRazorpayFundAccount } from '../../../../core/application/services/finance/sync-razorpay-fund-account.service';

// Indian bank account validation: 9-18 digits only
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;
// IFSC: 4 letters + 0 + 6 alphanumeric (e.g. SBIN0001234)
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// Account holder: letters, spaces, dots; 2-100 chars; no script/HTML
const ACCOUNT_HOLDER_REGEX = /^[\p{L}\s.]{2,100}$/u;
const BANK_NAME_MAX_LENGTH = 100;

const sanitizeString = (s: string, maxLen: number): string =>
    String(s ?? '').trim().slice(0, maxLen);

// Schema for Bank Account - strict validation, no mocks
const bankAccountSchema = z.object({
    bankName: z.string()
        .min(2, 'Bank name must be at least 2 characters')
        .max(BANK_NAME_MAX_LENGTH)
        .transform((s) => sanitizeString(s, BANK_NAME_MAX_LENGTH)),
    accountNumber: z.string()
        .regex(ACCOUNT_NUMBER_REGEX, 'Account number must be 9-18 digits'),
    ifscCode: z.string()
        .transform((s) => String(s ?? '').trim().toUpperCase())
        .refine((s) => IFSC_REGEX.test(s), 'Invalid IFSC format (e.g. SBIN0001234)'),
    accountHolderName: z.string()
        .min(2, 'Account holder name must be at least 2 characters')
        .max(100)
        .transform((s) => sanitizeString(s, 100))
        .refine((s) => ACCOUNT_HOLDER_REGEX.test(s), 'Account holder name contains invalid characters'),
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
                accountHolderName: billing.accountHolderName,
                isDefault: true,
                isVerified: !!billing.bankVerifiedAt,
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
        // Note: Add without verification does not set bankVerifiedAt; use Verify flow for that
        company.billingInfo = {
            ...company.billingInfo,
            bankName: validation.data.bankName,
            accountNumber: validation.data.accountNumber,
            ifscCode: validation.data.ifscCode,
            accountHolderName: validation.data.accountHolderName,
        };

        // Sync with Razorpay Fund Account (idempotent, non-blocking)
        await syncRazorpayFundAccount(company, {
            accountNumber: String(validation.data.accountNumber),
            ifscCode: String(validation.data.ifscCode),
            accountHolderName: String(validation.data.accountHolderName || company.name || 'Company'),
        });

        await company.save();

        const data = validation.data;
        sendSuccess(res, {
            account: {
                _id: 'primary',
                bankName: data.bankName,
                accountNumber: data.accountNumber,
                ifscCode: data.ifscCode,
                accountHolderName: data.accountHolderName,
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

        // Ensure billingInfo exists before clearing
        if (!company.billingInfo) {
            company.billingInfo = {};
        }
        // Clear bank details
        company.billingInfo.bankName = undefined;
        company.billingInfo.accountNumber = undefined;
        company.billingInfo.ifscCode = undefined;
        company.billingInfo.accountHolderName = undefined;
        company.billingInfo.bankVerifiedAt = undefined;

        // Clear Razorpay references (preserve payout history)
        if (company.financial) {
            company.financial.razorpayContactId = undefined;
            company.financial.razorpayFundAccountId = undefined;
        }

        await company.save();

        sendSuccess(res, null, 'Bank account removed successfully');
    } catch (error) {
        logger.error('Error removing bank account:', error);
        next(error);
    }
};

export const setDefaultBankAccount = async (
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

        if (!company.billingInfo?.accountNumber || !company.billingInfo?.ifscCode) {
            throw new NotFoundError('No bank account found to set as default', ErrorCode.RES_COMPANY_NOT_FOUND);
        }

        // Single-account model: account is always default, no DB change needed
        sendSuccess(res, {
            account: {
                _id: 'primary',
                isDefault: true,
            },
        }, 'Default account updated');
    } catch (error) {
        logger.error('Error setting default bank account:', error);
        next(error);
    }
};

export default {
    getBankAccounts,
    addBankAccount,
    deleteBankAccount,
    setDefaultBankAccount,
};
