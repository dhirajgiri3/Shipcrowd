import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
Company,
SellerBankAccount,
} from '../../../../infrastructure/database/mongoose/models';
import {
computeFingerprint,
normalizeAccount,
normalizeIfsc,
} from '../../../../infrastructure/database/mongoose/models/finance/payouts/seller-bank-account.model';
import { ConflictError, NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_HOLDER_REGEX = /^[\p{L}\s.]{2,100}$/u;
const BANK_NAME_MAX_LENGTH = 100;

const normalizeTrimmed = (s: unknown, maxLen: number): string =>
    String(s ?? '').trim().slice(0, maxLen);

const bankAccountSchema = z.object({
    bankName: z.string().transform((s) => normalizeTrimmed(s, BANK_NAME_MAX_LENGTH)).refine((s) => s.length >= 2, 'Bank name must be at least 2 characters'),
    accountNumber: z.string().transform((s) => normalizeAccount(s)).refine((s) => ACCOUNT_NUMBER_REGEX.test(s), 'Account number must be 9-18 digits'),
    ifscCode: z.string().transform((s) => normalizeIfsc(s)).refine((s) => IFSC_REGEX.test(s), 'Invalid IFSC format (e.g. SBIN0001234)'),
    accountHolderName: z.string().transform((s) => normalizeTrimmed(s, 100)).refine((s) => s.length >= 2, 'Account holder name must be at least 2 characters').refine((s) => ACCOUNT_HOLDER_REGEX.test(s), 'Account holder name contains invalid characters'),
});

interface BankAccountDTO {
    id: string;
    bankName: string;
    accountHolderName?: string;
    maskedAccountNumber: string;
    accountLast4: string;
    ifscCode: string;
    verificationStatus: 'pending' | 'verified' | 'failed';
    verifiedAt?: Date;
    isDefault: boolean;
}

const toDto = (account: any): BankAccountDTO => ({
    id: String(account._id),
    bankName: account.bankName,
    accountHolderName: account.accountHolderName,
    maskedAccountNumber: `****${account.accountLast4}`,
    accountLast4: account.accountLast4,
    ifscCode: account.ifscCode,
    verificationStatus: account.verificationStatus,
    verifiedAt: account.verifiedAt,
    isDefault: account.isDefault,
});

const isDuplicateKeyError = (error: any): boolean => error?.code === 11000;

export const getBankAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const accounts = await SellerBankAccount.find({ companyId: auth.companyId })
            .sort({ isDefault: -1, verifiedAt: -1, createdAt: -1 })
            .select('bankName accountHolderName accountLast4 ifscCode verificationStatus verifiedAt isDefault')
            .lean();

        sendSuccess(res, { accounts: accounts.map((a) => toDto(a as any)) }, 'Bank accounts retrieved successfully');
    } catch (error) {
        logger.error('Error fetching bank accounts:', error);
        next(error);
    }
};

export const addBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = bankAccountSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Invalid bank account details', validation.error.errors);
        }

        const company = await Company.findById(auth.companyId).select('_id');
        if (!company) {
            throw new NotFoundError('Company', ErrorCode.RES_COMPANY_NOT_FOUND);
        }

        const accountNumber = validation.data.accountNumber;
        const ifscCode = validation.data.ifscCode;
        const fingerprint = computeFingerprint({
            companyId: auth.companyId,
            accountNumber,
            ifscCode,
        });

        try {
            const created = await SellerBankAccount.create({
                companyId: auth.companyId,
                bankName: validation.data.bankName,
                accountHolderName: validation.data.accountHolderName,
                accountNumberEncrypted: accountNumber,
                accountLast4: accountNumber.slice(-4),
                accountFingerprint: fingerprint,
                ifscCode,
                verificationStatus: 'pending',
                verifiedAt: undefined,
                isDefault: false,
            });

            sendSuccess(res, { account: toDto(created) }, 'Bank account added successfully');
        } catch (error: any) {
            if (isDuplicateKeyError(error)) {
                const existing = await SellerBankAccount.findOne({
                    companyId: auth.companyId,
                    accountFingerprint: fingerprint,
                    ifscCode,
                }).select('bankName accountHolderName accountLast4 ifscCode verificationStatus verifiedAt isDefault');
                if (existing) {
                    sendSuccess(res, { account: toDto(existing) }, 'Bank account already exists');
                    return;
                }
                throw new ConflictError('This bank account already exists for your company', ErrorCode.BIZ_CONFLICT);
            }
            throw error;
        }
    } catch (error) {
        logger.error('Error adding bank account:', error);
        next(error);
    }
};

export const deleteBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await mongoose.startSession();
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ValidationError('Invalid bank account id');
        }

        const executeDeleteTx = async () => {
            await session.withTransaction(async () => {
                const target = await SellerBankAccount.findOne({ _id: id, companyId: auth.companyId }).session(session);
                if (!target) {
                    return;
                }

                const wasDefault = target.isDefault;
                await SellerBankAccount.deleteOne({ _id: target._id, companyId: auth.companyId }).session(session);

                if (wasDefault) {
                    const replacement = await SellerBankAccount.findOne({
                        companyId: auth.companyId,
                        verificationStatus: 'verified',
                    })
                        .sort({ verifiedAt: -1, createdAt: -1 })
                        .session(session);

                    if (replacement) {
                        replacement.isDefault = true;
                        await replacement.save({ session });
                    }
                }
            });
        };

        try {
            await executeDeleteTx();
        } catch (error: any) {
            if (isDuplicateKeyError(error)) {
                await executeDeleteTx();
            } else {
                throw error;
            }
        }

        sendSuccess(res, null, 'Bank account removed successfully');
    } catch (error) {
        logger.error('Error removing bank account:', error);
        next(error);
    } finally {
        await session.endSession();
    }
};

export const setDefaultBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await mongoose.startSession();
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ValidationError('Invalid bank account id');
        }

        const executeDefaultTx = async () => {
            await session.withTransaction(async () => {
                const target = await SellerBankAccount.findOne({ _id: id, companyId: auth.companyId }).session(session);
                if (!target) {
                    throw new NotFoundError('Bank account', ErrorCode.BIZ_NOT_FOUND);
                }
                if (target.verificationStatus !== 'verified') {
                    throw new ConflictError('Only verified bank accounts can be set as default', ErrorCode.BIZ_CONFLICT);
                }

                await SellerBankAccount.updateMany({ companyId: auth.companyId, isDefault: true }, { $set: { isDefault: false } }, { session });
                target.isDefault = true;
                await target.save({ session });
            });
        };

        try {
            await executeDefaultTx();
        } catch (error: any) {
            if (isDuplicateKeyError(error)) {
                await executeDefaultTx();
            } else {
                throw error;
            }
        }

        sendSuccess(res, { account: { id, isDefault: true } }, 'Default account updated');
    } catch (error) {
        logger.error('Error setting default bank account:', error);
        next(error);
    } finally {
        await session.endSession();
    }
};

export default {
    getBankAccounts,
    addBankAccount,
    deleteBankAccount,
    setDefaultBankAccount,
};
