/**
 * KYC State Machine Enum
 * 
 * Represents the lifecycle states of a KYC application.
 */
export enum KYCState {
    DRAFT = 'draft',                 // Initial state, data collection
    SUBMITTED = 'submitted',         // Submitted by user, pending review
    UNDER_REVIEW = 'under_review',   // Being reviewed by admin/compliance
    ACTION_REQUIRED = 'action_required', // Documents rejected/missing info, sent back to user
    VERIFIED = 'verified',           // Successfully verified
    REJECTED = 'rejected',           // Permanently rejected
    EXPIRED = 'expired'              // Periodic re-KYC needed
}
