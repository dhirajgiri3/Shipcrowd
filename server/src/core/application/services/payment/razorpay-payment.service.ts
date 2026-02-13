/**
 * Razorpay Payment Service
 * Handles payment processing for Auto-Recharge feature
 */

import Razorpay from 'razorpay';
import logger from '../../../../shared/logger/winston.logger';
import { ExternalServiceError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

export interface CreatePaymentOptions {
    amount: number; // in rupees
    currency: string;
    notes?: Record<string, string>;
    description?: string;
}

export interface PaymentVerificationResult {
    id: string;
    amount: number; // in rupees
    currency: string;
    status: string;
    method?: string;
    captured: boolean;
}

export class RazorpayPaymentService {
    private static instance: RazorpayPaymentService;
    private razorpay: Razorpay | null = null;

    private constructor() {
        // Lazy initialization. Wallet features that do not need Razorpay
        // must keep working even when Razorpay env vars are absent.
        this.initializeClientIfConfigured();
    }

    static getInstance(): RazorpayPaymentService {
        if (!RazorpayPaymentService.instance) {
            RazorpayPaymentService.instance = new RazorpayPaymentService();
        }
        return RazorpayPaymentService.instance;
    }

    private initializeClientIfConfigured(): void {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            logger.warn('Razorpay credentials not configured. Payment APIs will be unavailable until configured.');
            return;
        }

        this.razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        logger.info('Razorpay Payment Service initialized');
    }

    private getClient(): Razorpay {
        if (!this.razorpay) {
            this.initializeClientIfConfigured();
        }

        if (!this.razorpay) {
            throw new ExternalServiceError(
                'Razorpay',
                'Razorpay credentials not configured',
                ErrorCode.EXT_PAYMENT_FAILURE
            );
        }

        return this.razorpay;
    }

    /**
     * Create a payment order for auto-recharge
     * Note: In production, this will be replaced with saved payment method charging
     * For now, creates an order that needs to be captured
     */
    async createOrder(options: CreatePaymentOptions): Promise<{ id: string; amount: number; status: string }> {
        try {
            const order = await this.getClient().orders.create({
                amount: Math.round(options.amount * 100), // Convert to paise
                currency: options.currency || 'INR',
                notes: options.notes || {},
                receipt: `auto_recharge_${Date.now()}`,
            });

            logger.info('Razorpay order created for auto-recharge', {
                orderId: order.id,
                amount: options.amount,
            });

            return {
                id: order.id,
                amount: Number(order.amount) / 100,
                status: order.status,
            };
        } catch (error: any) {
            logger.error('Failed to create Razorpay order', {
                error: error.message,
                amount: options.amount,
            });
            throw new ExternalServiceError(
                'Razorpay',
                `Failed to create payment order: ${error.message}`,
                ErrorCode.EXT_PAYMENT_FAILURE
            );
        }
    }

    /**
     * Verify payment status
     * @param paymentId Razorpay payment ID
     * @returns Payment verification result
     */
    async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
        try {
            const payment = await this.getClient().payments.fetch(paymentId);

            return {
                id: payment.id,
                amount: Number(payment.amount) / 100, // Convert from paise to rupees
                currency: payment.currency,
                status: payment.status,
                method: payment.method,
                captured: payment.captured || false,
            };
        } catch (error: any) {
            logger.error('Failed to verify Razorpay payment', {
                paymentId,
                error: error.message,
            });
            throw new ExternalServiceError(
                'Razorpay',
                `Failed to verify payment: ${error.message}`,
                ErrorCode.EXT_PAYMENT_FAILURE
            );
        }
    }

    /**
     * Charge using saved payment method
     * NOTE: This is a placeholder for future implementation
     * Razorpay doesn't support direct charging of saved cards without user intervention
     * 
     * Options:
     * 1. Use Razorpay Subscriptions for recurring payments
     * 2. Use UPI Autopay (mandate-based)
     * 3. Use saved cards with 3D Secure for each transaction
     * 
     * For now, we'll create an order and expect webhook notification
     */
    async chargeWithSavedMethod(
        paymentMethodId: string,
        amount: number,
        notes?: Record<string, string>
    ): Promise<{ orderId: string; amount: number; status: string }> {
        logger.warn('Saved payment method charging not yet implemented', {
            paymentMethodId,
            amount,
        });

        // Create order that customer will need to complete
        // In production, this should be integrated with:
        // - Razorpay Subscriptions for recurring payments
        // - UPI Autopay for mandate-based payments
        const order = await this.createOrder({
            amount,
            currency: 'INR',
            notes: {
                ...notes,
                paymentMethodId,
                type: 'auto-recharge',
            },
        });

        return {
            orderId: order.id,
            amount: order.amount,
            status: order.status,
        };
    }
}

// Export singleton
export default RazorpayPaymentService.getInstance();
