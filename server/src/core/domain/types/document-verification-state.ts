/**
 * Document Verification State
 *
 * Tracks the lifecycle of an individual KYC document verification.
 */
export enum DocumentVerificationState {
  NOT_STARTED = 'not_started',
  PENDING_PROVIDER = 'pending_provider',
  VERIFIED = 'verified',
  SOFT_FAILED = 'soft_failed',
  HARD_FAILED = 'hard_failed',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}
