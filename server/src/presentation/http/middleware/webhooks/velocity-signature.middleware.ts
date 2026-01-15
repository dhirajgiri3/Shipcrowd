/**
 * Velocity Webhook Signature Verification Middleware
 * 
 * ISSUE #2: Validates HMAC signature on Velocity settlement webhooks
 * to prevent forged webhook events.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../../../../shared/logger/winston.logger';

export const verifyVelocityWebhookSignature = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const signature = req.headers['x-velocity-signature'] as string;
    const timestamp = req.headers['x-velocity-timestamp'] as string;
    const secret = process.env.VELOCITY_WEBHOOK_SECRET;

    // Check if secret is configured
    if (!secret) {
        logger.error('VELOCITY_WEBHOOK_SECRET not configured - rejecting webhook');
        res.status(500).json({
            success: false,
            error: 'Webhook verification not configured'
        });
        return;
    }

    // Validate signature is present
    if (!signature) {
        logger.warn('Velocity webhook received without signature', {
            ip: req.ip,
            path: req.path,
        });
        res.status(400).json({
            success: false,
            error: 'Missing signature header'
        });
        return;
    }

    try {
        // Build the signed payload
        const payload = timestamp
            ? `${timestamp}.${JSON.stringify(req.body)}`
            : JSON.stringify(req.body);

        // Compute expected signature
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        // Use constant-time comparison to prevent timing attacks
        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );

        if (!isValid) {
            logger.warn('Invalid Velocity webhook signature', {
                ip: req.ip,
                path: req.path,
            });
            res.status(401).json({
                success: false,
                error: 'Invalid signature'
            });
            return;
        }

        // Optional: Check timestamp to prevent replay attacks (5 min tolerance)
        if (timestamp) {
            const webhookTime = parseInt(timestamp, 10) * 1000;
            const now = Date.now();
            const tolerance = 5 * 60 * 1000; // 5 minutes

            if (Math.abs(now - webhookTime) > tolerance) {
                logger.warn('Velocity webhook timestamp too old', {
                    webhookTime: new Date(webhookTime).toISOString(),
                    now: new Date(now).toISOString(),
                });
                res.status(401).json({
                    success: false,
                    error: 'Webhook timestamp expired'
                });
                return;
            }
        }

        logger.info('Velocity webhook signature verified successfully');
        next();
    } catch (error) {
        logger.error('Error verifying Velocity webhook signature', { error });
        res.status(500).json({
            success: false,
            error: 'Signature verification failed'
        });
    }
};

export default verifyVelocityWebhookSignature;
