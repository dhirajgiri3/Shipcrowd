/**
 * Razorpay Payout Provider
 * 
 * Integration with Razorpay Payouts API for commission disbursement
 * Uses direct HTTP calls for RazorpayX Payouts API
 * Docs: https://razorpay.com/docs/api/payouts/
 */

import crypto from 'crypto';
import { AppError } from '../../../shared/errors/index';
import logger from '../../../shared/logger/winston.logger';

// Razorpay types
export interface FundAccount {
    id: string;
    entity: 'fund_account';
    contact_id: string;
    account_type: 'bank_account';
    bank_account: {
        name: string;
        ifsc: string;
        account_number: string;
    };
    active: boolean;
    created_at: number;
}

export interface RazorpayPayout {
    id: string;
    entity: 'payout';
    fund_account_id: string;
    amount: number;
    currency: string;
    notes: Record<string, string>;
    fees: number;
    tax: number;
    status: 'queued' | 'pending' | 'processing' | 'processed' | 'reversed' | 'cancelled' | 'rejected';
    purpose: string;
    utr: string | null;
    mode: 'IMPS' | 'NEFT' | 'RTGS' | 'UPI';
    reference_id: string | null;
    narration: string;
    created_at: number;
    failure_reason?: string; // Added to interface to allow direct access
    reversed_at?: number; // Added for reversal support
}

export interface PayoutStatus {
    id: string;
    status: string;
    utr: string | null;
    failure_reason?: string;
}

export interface WebhookEvent {
    entity: string;
    account_id: string;
    event: string;
    contains: string[];
    payload: {
        payout: {
            entity: RazorpayPayout;
        };
    };
    created_at: number;
}

interface RazorpayContact {
    id: string;
    entity: 'contact';
    name: string;
    type: string;
    reference_id: string;
    active: boolean;
}

export class RazorpayPayoutProvider {
    private baseUrl = 'https://api.razorpay.com/v1';
    private keyId: string;
    private keySecret: string;
    private accountNumber: string;

    constructor() {
        this.keyId = process.env.RAZORPAY_KEY_ID || '';
        this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
        this.accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER || '';

        if (!this.keyId || !this.keySecret) {
            logger.warn('Razorpay credentials not configured - payout features disabled');
        } else {
            logger.info('Razorpay Payout Provider initialized');
        }
    }

    /**
     * Make authenticated API request to Razorpay
     */
    private async request<T>(
        method: 'GET' | 'POST',
        endpoint: string,
        body?: Record<string, unknown>
    ): Promise<T> {
        const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                (errorData as any).error?.description ||
                `Razorpay API error: ${response.status}`
            );
        }

        return response.json() as Promise<T>;
    }

    /**
     * Create a contact for a sales representative
     */
    async createContact(name: string, referenceId: string): Promise<RazorpayContact> {
        try {
            const contact = await this.request<RazorpayContact>('POST', '/contacts', {
                name,
                type: 'vendor',
                reference_id: referenceId,
            });

            logger.info('Contact created', { contactId: contact.id, referenceId });
            return contact;
        } catch (error: any) {
            logger.error('Failed to create contact', { error: error.message });
            throw new AppError(`Failed to create contact: ${error.message}`, 'RAZORPAY_ERROR', 500);
        }
    }

    /**
     * Create a fund account for a sales representative
     */
    async createFundAccount(
        bankDetails: {
            accountNumber: string;
            ifscCode: string;
            accountHolderName: string;
        },
        salesRepId: string,
        contactId?: string
    ): Promise<FundAccount> {
        try {
            // Create contact if not provided
            let finalContactId = contactId;
            if (!finalContactId) {
                const contact = await this.createContact(bankDetails.accountHolderName, salesRepId);
                finalContactId = contact.id;
            }

            // Create fund account
            const fundAccount = await this.request<FundAccount>('POST', '/fund_accounts', {
                contact_id: finalContactId,
                account_type: 'bank_account',
                bank_account: {
                    name: bankDetails.accountHolderName,
                    ifsc: bankDetails.ifscCode,
                    account_number: bankDetails.accountNumber,
                },
            });

            logger.info('Fund account created', {
                salesRepId,
                fundAccountId: fundAccount.id,
            });

            return fundAccount;
        } catch (error: any) {
            logger.error('Failed to create fund account', {
                salesRepId,
                error: error.message,
            });
            throw new AppError(
                `Failed to create fund account: ${error.message}`,
                'RAZORPAY_ERROR',
                500
            );
        }
    }

    /**
     * Create a payout
     */
    async createPayout(payoutData: {
        fundAccountId: string;
        amount: number;
        currency: string;
        mode: 'IMPS' | 'NEFT' | 'RTGS';
        purpose: string;
        referenceId: string;
        narration: string;
        notes?: Record<string, string>;
    }): Promise<RazorpayPayout> {
        try {
            const payout = await this.request<RazorpayPayout>('POST', '/payouts', {
                account_number: this.accountNumber,
                fund_account_id: payoutData.fundAccountId,
                amount: Math.round(payoutData.amount * 100), // Convert to paise
                currency: payoutData.currency,
                mode: payoutData.mode,
                purpose: payoutData.purpose,
                queue_if_low_balance: true,
                reference_id: payoutData.referenceId,
                narration: payoutData.narration.substring(0, 30), // Max 30 chars
                notes: payoutData.notes || {},
            });

            logger.info('Payout created', {
                payoutId: payout.id,
                amount: payoutData.amount,
                status: payout.status,
            });

            return payout;
        } catch (error: any) {
            logger.error('Failed to create payout', {
                fundAccountId: payoutData.fundAccountId,
                amount: payoutData.amount,
                error: error.message,
            });
            throw new AppError(
                `Failed to create payout: ${error.message}`,
                'RAZORPAY_ERROR',
                500
            );
        }
    }

    /**
     * Get payout status
     */
    async getPayoutStatus(razorpayPayoutId: string): Promise<RazorpayPayout> {
        try {
            const payout = await this.request<RazorpayPayout>('GET', `/payouts/${razorpayPayoutId}`);

            return payout;
        } catch (error: any) {
            logger.error('Failed to fetch payout status', {
                razorpayPayoutId,
                error: error.message,
            });
            throw new AppError(
                `Failed to fetch payout status: ${error.message}`,
                'RAZORPAY_ERROR',
                500
            );
        }
    }

    /**
     * Cancel a payout (only if status is queued)
     */
    async cancelPayout(razorpayPayoutId: string): Promise<void> {
        try {
            await this.request<void>('POST', `/payouts/${razorpayPayoutId}/cancel`);
            logger.info('Payout cancelled', { razorpayPayoutId });
        } catch (error: any) {
            logger.error('Failed to cancel payout', {
                razorpayPayoutId,
                error: error.message,
            });
            throw new AppError(
                `Failed to cancel payout: ${error.message}`,
                'RAZORPAY_ERROR',
                500
            );
        }
    }

    /**
     * Handle webhook event
     */
    async handleWebhook(
        payload: unknown,
        signature: string,
        webhookSecret: string
    ): Promise<WebhookEvent> {
        try {
            // Verify webhook signature
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(payload))
                .digest('hex');

            if (signature !== expectedSignature) {
                throw new AppError('Invalid webhook signature', 'UNAUTHORIZED', 401);
            }

            const event = payload as WebhookEvent;

            logger.info('Webhook received', {
                event: event.event,
                payoutId: event.payload?.payout?.entity?.id,
            });

            return event;
        } catch (error: any) {
            logger.error('Webhook verification failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Validate bank account (basic validation)
     */
    async validateBankAccount(bankDetails: {
        accountNumber: string;
        ifscCode: string;
    }): Promise<{ valid: boolean; name?: string }> {
        try {
            // Basic IFSC validation
            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            if (!ifscRegex.test(bankDetails.ifscCode)) {
                return { valid: false };
            }

            // Account number validation (8-20 digits)
            const accRegex = /^\d{8,20}$/;
            if (!accRegex.test(bankDetails.accountNumber)) {
                return { valid: false };
            }

            logger.info('Bank details validated (basic)', { ifsc: bankDetails.ifscCode });
            return { valid: true };
        } catch (error: any) {
            logger.error('Bank validation failed', { error: error.message });
            return { valid: false };
        }
    }
}
