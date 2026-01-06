/**
 * Razorpay Webhook Authentication Middleware
 * 
 * Verifies webhook signatures from Razorpay Payouts API
 * Docs: https://razorpay.com/docs/webhooks/signature-verification/
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Middleware to verify Razorpay webhook signatures
 */
export const verifyRazorpayWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
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

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            logger.error('RAZORPAY_WEBHOOK_SECRET not configured');
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
            logger.error('Raw body not available for Razorpay webhook verification');
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
                receivedSignature: signature.substring(0, 10) + '...',
            });
            res.status(401).json({
                success: false,
                error: 'Invalid webhook signature',
            });
            return;
        }

        logger.info('Razorpay webhook signature verified', {
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

export default verifyRazorpayWebhook;
