import crypto from 'crypto';
import mongoose, { Document, Schema } from 'mongoose';
import { fieldEncryption } from 'mongoose-field-encryption';

export type BankVerificationStatus = 'pending' | 'verified' | 'failed';

export interface ISellerBankAccount extends Document {
  companyId: mongoose.Types.ObjectId;
  bankName: string;
  accountHolderName: string;
  accountNumberEncrypted: string;
  accountLast4: string;
  accountFingerprint: string;
  ifscCode: string;
  verificationStatus: BankVerificationStatus;
  verifiedAt?: Date;
  isDefault: boolean;
  razorpayContactId?: string;
  razorpayFundAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VERIFY_STATUSES: BankVerificationStatus[] = ['pending', 'verified', 'failed'];
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

const getFingerprintSecret = (): string => {
  const secret = process.env.BANK_ACCOUNT_FINGERPRINT_SECRET;
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('BANK_ACCOUNT_FINGERPRINT_SECRET is required in production');
  }
  return secret || process.env.ENCRYPTION_KEY || 'shipcrowd-dev-bank-fingerprint-secret';
};

export const normalizeIfsc = (ifsc: string): string => String(ifsc || '').trim().toUpperCase();
export const normalizeAccount = (accountNumber: string): string => String(accountNumber || '').replace(/\s+/g, '');
export const maskAccount = (accountNumber: string): string => `****${normalizeAccount(accountNumber).slice(-4)}`;

export const computeFingerprint = (params: {
  companyId: string | mongoose.Types.ObjectId;
  accountNumber: string;
  ifscCode: string;
}): string => {
  const normalizedAccount = normalizeAccount(params.accountNumber);
  const normalizedIfsc = normalizeIfsc(params.ifscCode);
  const payload = `${String(params.companyId)}:${normalizedAccount}:${normalizedIfsc}`;

  return crypto
    .createHmac('sha256', getFingerprintSecret())
    .update(payload)
    .digest('hex');
};

const SellerBankAccountSchema = new Schema<ISellerBankAccount>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    accountNumberEncrypted: {
      type: String,
      required: true,
      select: false,
    },
    accountLast4: {
      type: String,
      required: true,
      minlength: 4,
      maxlength: 4,
    },
    accountFingerprint: {
      type: String,
      required: true,
      index: true,
      minlength: 64,
      maxlength: 64,
    },
    ifscCode: {
      type: String,
      required: true,
      uppercase: true,
      match: [IFSC_REGEX, 'Invalid IFSC code format'],
    },
    verificationStatus: {
      type: String,
      enum: VERIFY_STATUSES,
      default: 'pending',
      index: true,
    },
    verifiedAt: Date,
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    razorpayContactId: String,
    razorpayFundAccountId: String,
  },
  {
    timestamps: true,
    collection: 'seller_bank_accounts',
  }
);

SellerBankAccountSchema.index(
  { companyId: 1, accountFingerprint: 1, ifscCode: 1 },
  { unique: true, name: 'ux_company_account_fingerprint_ifsc' }
);

SellerBankAccountSchema.index(
  { companyId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    name: 'ux_company_single_default_bank',
  }
);

SellerBankAccountSchema.index(
  { companyId: 1, isDefault: 1, verificationStatus: 1 },
  { name: 'ix_company_default_verified_lookup' }
);

SellerBankAccountSchema.pre('validate', function (next) {
  const normalizedAccount = normalizeAccount(this.accountNumberEncrypted);
  const normalizedIfsc = normalizeIfsc(this.ifscCode);

  if (!ACCOUNT_NUMBER_REGEX.test(normalizedAccount)) {
    return next(new Error('Account number must be 9-18 digits'));
  }
  if (!IFSC_REGEX.test(normalizedIfsc)) {
    return next(new Error('Invalid IFSC code format'));
  }

  this.ifscCode = normalizedIfsc;
  this.accountLast4 = normalizedAccount.slice(-4);

  if (!this.accountFingerprint) {
    this.accountFingerprint = computeFingerprint({
      companyId: this.companyId,
      accountNumber: normalizedAccount,
      ifscCode: normalizedIfsc,
    });
  }

  next();
});

// @ts-ignore
SellerBankAccountSchema.plugin(fieldEncryption, {
  fields: ['accountNumberEncrypted'],
  secret:
    process.env.ENCRYPTION_KEY ||
    '0000000000000000000000000000000000000000000000000000000000000000',
  saltGenerator: () => crypto.randomBytes(8).toString('hex'),
  encryptOnSave: true,
  decryptOnFind: true,
});

const SellerBankAccount = mongoose.model<ISellerBankAccount>(
  'SellerBankAccount',
  SellerBankAccountSchema
);

export default SellerBankAccount;
