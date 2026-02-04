import crypto from 'crypto';
import { DocumentVerificationState } from '../../core/domain/types/document-verification-state';
import { KYC_EXPIRY_DAYS, KYC_VERIFICATION_HISTORY_LIMIT } from '../config/kyc.config';

export type KycDocumentType = 'pan' | 'aadhaar' | 'gstin' | 'bankAccount';

const getHashSecret = (): string => {
  const secret = process.env.KYC_HASH_SECRET || process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('KYC_HASH_SECRET or ENCRYPTION_KEY must be set for KYC input hashing');
  }
  return secret;
};

const normalizeAlphaNumeric = (value: string): string =>
  value.replace(/\s+/g, '').toUpperCase();

const normalizeDigits = (value: string): string =>
  value.replace(/\D/g, '');

export const createKycInputHash = (docType: KycDocumentType, input: Record<string, string> | string): string => {
  let normalized = '';

  switch (docType) {
    case 'pan': {
      const pan = typeof input === 'string' ? input : input.pan || input.number || '';
      normalized = normalizeAlphaNumeric(pan);
      break;
    }
    case 'gstin': {
      const gstin = typeof input === 'string' ? input : input.gstin || input.number || '';
      normalized = normalizeAlphaNumeric(gstin);
      break;
    }
    case 'aadhaar': {
      const aadhaar = typeof input === 'string' ? input : input.aadhaar || input.number || '';
      normalized = normalizeDigits(aadhaar);
      break;
    }
    case 'bankAccount': {
      const accountNumber = typeof input === 'string' ? input : input.accountNumber || '';
      const ifsc = typeof input === 'string' ? '' : input.ifsc || input.ifscCode || '';
      normalized = `${normalizeDigits(accountNumber)}|${normalizeAlphaNumeric(ifsc)}`;
      break;
    }
    default:
      normalized = typeof input === 'string' ? input : JSON.stringify(input);
  }

  return crypto
    .createHmac('sha256', getHashSecret())
    .update(`${docType}:${normalized}`)
    .digest('hex');
};

export const buildExpiryDate = (docType: KycDocumentType, verifiedAt: Date = new Date()): Date | null => {
  const days = KYC_EXPIRY_DAYS[docType];
  if (!days) return null;
  const expiresAt = new Date(verifiedAt);
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
};

export const resolveVerificationState = (
  doc: any,
  now: Date = new Date()
): { state: DocumentVerificationState; expiresAt?: Date | null } => {
  const verification = doc?.verification || {};
  const baseState: DocumentVerificationState =
    verification.state ||
    (doc?.verified ? DocumentVerificationState.VERIFIED : DocumentVerificationState.NOT_STARTED);

  const expiresAt: Date | null | undefined = verification.expiresAt || null;
  const isExpired = Boolean(expiresAt && expiresAt.getTime() <= now.getTime());

  if (baseState === DocumentVerificationState.VERIFIED && isExpired) {
    return { state: DocumentVerificationState.EXPIRED, expiresAt };
  }

  return { state: baseState, expiresAt };
};

export const appendVerificationHistory = (doc: any, record: any): void => {
  if (!doc) return;
  if (!doc.verificationHistory) {
    doc.verificationHistory = [];
  }

  doc.verificationHistory.push(record);

  if (doc.verificationHistory.length > KYC_VERIFICATION_HISTORY_LIMIT) {
    doc.verificationHistory = doc.verificationHistory.slice(-KYC_VERIFICATION_HISTORY_LIMIT);
  }
};

export const maskPan = (pan?: string): string | undefined => {
  if (!pan) return undefined;
  if (pan.length < 6) return `${pan[0]}***`;
  return `${pan.slice(0, 2)}****${pan.slice(-2)}`;
};

export const maskGstin = (gstin?: string): string | undefined => {
  if (!gstin) return undefined;
  if (gstin.length < 6) return `${gstin[0]}***`;
  return `${gstin.slice(0, 2)}****${gstin.slice(-2)}`;
};

export const maskAccount = (accountNumber?: string): string | undefined => {
  if (!accountNumber) return undefined;
  const digits = accountNumber.replace(/\D/g, '');
  if (digits.length <= 4) return `****${digits}`;
  return `****${digits.slice(-4)}`;
};

export const buildKycSnapshot = (kyc: any, now: Date = new Date()) => {
  const buildDocumentSnapshot = (docType: KycDocumentType, doc: any) => {
    const verification = doc?.verification || {};
    const { state, expiresAt } = resolveVerificationState(doc, now);

    return {
      state,
      verifiedAt: verification.verifiedAt || doc?.verifiedAt || null,
      expiresAt: expiresAt || null,
      lastCheckedAt: verification.lastCheckedAt || null,
      provider: verification.provider || null,
      canRetry: [
        DocumentVerificationState.NOT_STARTED,
        DocumentVerificationState.SOFT_FAILED,
        DocumentVerificationState.EXPIRED,
        DocumentVerificationState.REVOKED,
      ].includes(state),
      masked: docType === 'pan'
        ? maskPan(doc?.number)
        : docType === 'gstin'
          ? maskGstin(doc?.number)
          : docType === 'bankAccount'
            ? maskAccount(doc?.accountNumber)
            : undefined,
    };
  };

  return {
    pan: buildDocumentSnapshot('pan', kyc?.documents?.pan),
    aadhaar: buildDocumentSnapshot('aadhaar', kyc?.documents?.aadhaar),
    gstin: buildDocumentSnapshot('gstin', kyc?.documents?.gstin),
    bankAccount: buildDocumentSnapshot('bankAccount', kyc?.documents?.bankAccount),
  };
};

export const buildVerifiedData = (kyc: any) => {
  const now = new Date();
  const panState = resolveVerificationState(kyc?.documents?.pan, now).state;
  const gstinState = resolveVerificationState(kyc?.documents?.gstin, now).state;
  const bankState = resolveVerificationState(kyc?.documents?.bankAccount, now).state;

  return {
    pan: panState === DocumentVerificationState.VERIFIED
      ? {
        number: kyc?.documents?.pan?.number,
        name: kyc?.documents?.pan?.name,
      }
      : undefined,
    gstin: gstinState === DocumentVerificationState.VERIFIED
      ? {
        number: kyc?.documents?.gstin?.number,
        businessName: kyc?.documents?.gstin?.businessName,
        status: kyc?.documents?.gstin?.status,
      }
      : undefined,
    bankAccount: bankState === DocumentVerificationState.VERIFIED
      ? {
        accountNumber: kyc?.documents?.bankAccount?.accountNumber,
        ifscCode: kyc?.documents?.bankAccount?.ifscCode,
        accountHolderName: kyc?.documents?.bankAccount?.accountHolderName,
        bankName: kyc?.documents?.bankAccount?.bankName,
      }
      : undefined,
  };
};
