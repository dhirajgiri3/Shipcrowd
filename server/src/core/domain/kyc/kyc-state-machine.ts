import { KYCState } from '../types/kyc-state';
import { ValidationError } from '../../../shared/errors/app.error';

/**
 * KYC state machine: only allowed transitions are permitted.
 * Used to prevent invalid state changes (e.g. VERIFIED -> DRAFT).
 */
export class KYCStateMachine {
    private static readonly ALLOWED_TRANSITIONS: Record<KYCState, KYCState[]> = {
        [KYCState.DRAFT]: [KYCState.SUBMITTED],
        [KYCState.SUBMITTED]: [KYCState.UNDER_REVIEW, KYCState.REJECTED],
        [KYCState.UNDER_REVIEW]: [KYCState.VERIFIED, KYCState.REJECTED, KYCState.ACTION_REQUIRED],
        [KYCState.ACTION_REQUIRED]: [KYCState.SUBMITTED],
        [KYCState.VERIFIED]: [KYCState.EXPIRED, KYCState.ACTION_REQUIRED],
        [KYCState.REJECTED]: [KYCState.SUBMITTED, KYCState.ACTION_REQUIRED],
        [KYCState.EXPIRED]: [KYCState.SUBMITTED],
    };

    static canTransition(from: KYCState, to: KYCState): boolean {
        return this.ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
    }

    static validateTransition(from: KYCState, to: KYCState): void {
        if (!this.canTransition(from, to)) {
            const allowed = this.ALLOWED_TRANSITIONS[from]?.join(', ') || 'none';
            throw new ValidationError(
                `Invalid KYC state transition from ${from} to ${to}. Allowed transitions: ${allowed}`
            );
        }
    }
}
