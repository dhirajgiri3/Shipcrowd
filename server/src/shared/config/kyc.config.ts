/**
 * KYC Configuration
 *
 * Centralized settings for KYC verification policies.
 */

const readNumber = (key: string, fallback: number): number => {
  const raw = process.env[key];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const KYC_DEFAULT_PROVIDER = process.env.KYC_PROVIDER || 'deepvue';

// Expiry policy (in days). Tune via env if needed.
export const KYC_EXPIRY_DAYS = {
  pan: readNumber('KYC_PAN_EXPIRY_DAYS', 3650), // ~10 years (revocable)
  aadhaar: readNumber('KYC_AADHAAR_EXPIRY_DAYS', 365),
  gstin: readNumber('KYC_GSTIN_EXPIRY_DAYS', 365),
  bankAccount: readNumber('KYC_BANK_EXPIRY_DAYS', 365),
} as const;

export const KYC_VERIFICATION_HISTORY_LIMIT = readNumber('KYC_VERIFICATION_HISTORY_LIMIT', 25);
