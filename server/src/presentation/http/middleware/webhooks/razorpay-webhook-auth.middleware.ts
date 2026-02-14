/**
 * Razorpay Webhook Authentication Middleware
 * 
 * Verifies webhook signatures from Razorpay Payouts API
 * Docs: https://razorpay.com/docs/webhooks/signature-verification/
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../../../../shared/logger/winston.logger';

type RazorpayWebhookTarget = 'auto' | 'payment' | 'payout' | 'commission';

const resolveWebhookTarget = (req: Request, explicitTarget: RazorpayWebhookTarget): RazorpayWebhookTarget => {
    if (explicitTarget !== 'auto') {
        return explicitTarget;
    }

    const originalUrl = req.originalUrl || '';
    const path = req.path || '';
    const baseUrl = req.baseUrl || '';

    if (originalUrl.includes('/commission/payouts/webhook') || (baseUrl.includes('/commission/payouts') && path === '/webhook')) {
        return 'commission';
    }

    if (path.includes('/payment')) {
        return 'payment';
    }

    if (path.includes('/payout')) {
        return 'payout';
    }

    return 'auto';
};

const resolveWebhookSecret = (target: RazorpayWebhookTarget): string | undefined => {
    if (target === 'payment') {
        return process.env.RAZORPAY_PAYMENT_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;
    }

    if (target === 'payout') {
        return process.env.RAZORPAY_PAYOUT_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;
    }

    if (target === 'commission') {
        return process.env.RAZORPAY_COMMISSION_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;
    }

    return process.env.RAZORPAY_WEBHOOK_SECRET;
};

/**
 * Middleware to verify Razorpay webhook signatures
 */
export const verifyRazorpayWebhook = (target: RazorpayWebhookTarget = 'auto') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const signature = req.headers['x-razorpay-signature'] as string;

            if (!signature) {
                logger.warn('Razorpay webhook missing signature header');
                res.status(401).json({
                    success: false,
                    error: 'Missing X-Razorpay-Signature header',
                });
                return;
            }

            const resolvedTarget = resolveWebhookTarget(req, target);
            const webhookSecret = resolveWebhookSecret(resolvedTarget);

            if (!webhookSecret) {
                logger.error('Razorpay webhook secret not configured', { target: resolvedTarget });
                res.status(500).json({
                    success: false,
                    error: 'Webhook secret not configured',
                });
                return;
            }

            // Get raw body for signature verification
            // Note: rawBody is captured in app.ts using express.json() verify callback
            const rawBodyBuffer = (req as any).rawBody as Buffer;

            if (!rawBodyBuffer) {
                logger.error('Raw body not available for Razorpay webhook verification', { target: resolvedTarget });
                res.status(500).json({
                    success: false,
                    error: 'Webhook verification failed: raw body not captured',
                });
                return;
            }

            // Convert buffer to string for HMAC calculation
            const rawBody = rawBodyBuffer.toString('utf8');

            // Calculate expected signature
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            // Constant-time comparison to prevent timing attacks
            const isValid = crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );

            if (!isValid) {
                logger.warn('Razorpay webhook signature verification failed', {
                    target: resolvedTarget,
                    receivedSignature: signature.substring(0, 10) + '...',
                });
                res.status(401).json({
                    success: false,
                    error: 'Invalid webhook signature',
                });
                return;
            }

            logger.info('Razorpay webhook signature verified', {
                target: resolvedTarget,
                event: req.body?.event,
            });

            next();
        } catch (error: any) {
            // Handle buffer length mismatch from timingSafeEqual
            if (error.code === 'ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH') {
                logger.warn('Razorpay webhook signature length mismatch');
                res.status(401).json({
                    success: false,
                    error: 'Invalid webhook signature',
                });
                return;
            }

            logger.error('Razorpay webhook verification error', {
                error: error.message,
            });
            res.status(500).json({
                success: false,
                error: 'Webhook verification failed',
            });
        }
    };
};

export default verifyRazorpayWebhook;
