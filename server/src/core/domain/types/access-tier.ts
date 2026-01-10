/**
 * Access Tiers for Progressive Access
 * 
 * EXPLORER: Just registered. Limited read-only access to dashboard. No shipping.
 * SANDBOX: Email verified. Can create test shipments, setup company. No real money.
 * PRODUCTION: KYC Verified. Full access to live shipping and payments.
 */
export enum AccessTier {
    EXPLORER = 'explorer',
    SANDBOX = 'sandbox',
    PRODUCTION = 'production'
}
