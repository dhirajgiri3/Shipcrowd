/**
 * Webhook Signature Validation Middleware
 * Validates HMAC signatures from external webhook providers
 * Prevents webhook spoofing and replay attacks
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import logger from '../../../../shared/logger/winston.logger';

/**
 * ✅ FEATURE 17: Validate webhook signature from Velocity
 * 
 * Velocity sends webhooks with HMAC-SHA256 signature in header
 * Header: x-velocity-signature
 */
export const validateVelocitySignature = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const signature = req.headers['x-velocity-signature'] as string;
        const secret = process.env.VELOCITY_WEBHOOK_SECRET;

        if (!signature) {
            logger.warn('Missing Velocity webhook signature', {
                ip: req.ip,
                path: req.path,
            });
            res.status(401).json({
                success: false,
                error: 'Missing signature',
                code: 'MISSING_SIGNATURE',
            });
            return;
        }

        if (!secret) {
            logger.error('VELOCITY_WEBHOOK_SECRET not configured');
            res.status(500).json({
                success: false,
                error: 'Server configuration error',
                code: 'CONFIG_ERROR',
            });
            return;
        }

        // ✅ FEATURE 17: Verify HMAC-SHA256 signature
        const payload = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        // Constant-time comparison to prevent timing attacks
        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );

        if (!isValid) {
            logger.warn('Invalid Velocity webhook signature', {
                ip: req.ip,
                path: req.path,
                providedSignature: signature.substring(0, 10) + '...',
            });

            res.status(401).json({
                success: false,
                error: 'Invalid signature',
                code: 'INVALID_SIGNATURE',
            });
            return;
        }

        // Signature valid, proceed
        logger.info('Velocity webhook signature validated', {
            ip: req.ip,
            path: req.path,
        });
        next();
    } catch (error) {
        logger.error('Webhook signature validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
        });
    }
};

/**
 * ✅ FEATURE 17: Validate webhook signature from DeepVue (KYC provider)
 * 
 * DeepVue sends webhooks with HMAC-SHA256 signature and timestamp
 * Headers: x-deepvue-signature, x-deepvue-timestamp
 * 
 * Timestamp is used to prevent replay attacks (5-minute tolerance)
 */
export const validateDeepVueSignature = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const signature = req.headers['x-deepvue-signature'] as string;
        const timestamp = req.headers['x-deepvue-timestamp'] as string;
        const secret = process.env.DEEPVUE_WEBHOOK_SECRET;

        if (!signature || !timestamp) {
            logger.warn('Missing DeepVue webhook signature or timestamp', {
                ip: req.ip,
                path: req.path,
                hasSignature: !!signature,
                hasTimestamp: !!timestamp,
            });
            res.status(401).json({
                success: false,
                error: 'Missing signature headers',
                code: 'MISSING_HEADERS',
            });
            return;
        }

        if (!secret) {
            logger.error('DEEPVUE_WEBHOOK_SECRET not configured');
            res.status(500).json({
                success: false,
                error: 'Server configuration error',
                code: 'CONFIG_ERROR',
            });
            return;
        }

        // ✅ FEATURE 17: Check timestamp (prevent replay attacks)
        const requestTime = parseInt(timestamp);
        if (isNaN(requestTime)) {
            logger.warn('Invalid DeepVue webhook timestamp format', {
                ip: req.ip,
                timestamp,
            });
            res.status(401).json({
                success: false,
                error: 'Invalid timestamp',
                code: 'INVALID_TIMESTAMP',
            });
            return;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = Math.abs(currentTime - requestTime);

        // 5 minutes tolerance (300 seconds)
        if (timeDiff > 300) {
            logger.warn('DeepVue webhook timestamp too old', {
                ip: req.ip,
                timeDiff,
                requestTime,
                currentTime,
            });
            res.status(401).json({
                success: false,
                error: 'Request expired',
                code: 'TIMESTAMP_EXPIRED',
            });
            return;
        }

        // ✅ FEATURE 17: Verify signature with timestamp
        const payload = timestamp + '.' + JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        // Constant-time comparison to prevent timing attacks
        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );

        if (!isValid) {
            logger.warn('Invalid DeepVue webhook signature', {
                ip: req.ip,
                path: req.path,
                timeDiff,
            });
            res.status(401).json({
                success: false,
                error: 'Invalid signature',
                code: 'INVALID_SIGNATURE',
            });
            return;
        }

        // Signature and timestamp valid, proceed
        logger.info('DeepVue webhook signature validated', {
            ip: req.ip,
            path: req.path,
            timeDiff,
        });
        next();
    } catch (error) {
        logger.error('DeepVue signature validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
        });
    }
};

/**
 * Generic webhook signature validator
 * Can be configured for different providers
 */
export const createWebhookValidator = (config: {
    secretEnvVar: string;
    signatureHeader: string;
    timestampHeader?: string;
    algorithm?: 'sha256' | 'sha512';
    timestampTolerance?: number; // seconds
}) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const signature = req.headers[config.signatureHeader] as string;
            const timestamp = config.timestampHeader
                ? req.headers[config.timestampHeader] as string
                : null;
            const secret = process.env[config.secretEnvVar];
            const algorithm = config.algorithm || 'sha256';

            if (!signature) {
                logger.warn(`Missing webhook signature (${config.signatureHeader})`, {
                    ip: req.ip,
                });
                res.status(401).json({ error: 'Missing signature' });
                return;
            }

            if (!secret) {
                logger.error(`${config.secretEnvVar} not configured`);
                res.status(500).json({ error: 'Server configuration error' });
                return;
            }

            // Check timestamp if required
            if (timestamp && config.timestampTolerance) {
                const requestTime = parseInt(timestamp);
                const currentTime = Math.floor(Date.now() / 1000);
                const timeDiff = Math.abs(currentTime - requestTime);

                if (timeDiff > config.timestampTolerance) {
                    logger.warn('Webhook timestamp expired', { timeDiff });
                    res.status(401).json({ error: 'Request expired' });
                    return;
                }
            }

            // Verify signature
            const payload = timestamp
                ? `${timestamp}.${JSON.stringify(req.body)}`
                : JSON.stringify(req.body);

            const expectedSignature = crypto
                .createHmac(algorithm, secret)
                .update(payload)
                .digest('hex');

            const isValid = crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );

            if (!isValid) {
                logger.warn('Invalid webhook signature');
                res.status(401).json({ error: 'Invalid signature' });
                return;
            }

            next();
        } catch (error) {
            logger.error('Webhook validation error:', error);
            res.status(500).json({ error: 'Validation failed' });
        }
    };
};

export default {
    validateVelocitySignature,
    validateDeepVueSignature,
    createWebhookValidator,
};
