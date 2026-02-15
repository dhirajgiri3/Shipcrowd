/**
 * Webhook Signature Verification Middleware
 * 
 * Verifies HMAC-SHA256 signatures from courier partners to prevent:
 * - Fake weight data injection
 * - Replay attacks
 * - Unauthorized webhook calls
 */

import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AuthenticationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

interface WebhookConfig {
    secret: string;
    algorithm: 'sha256' | 'sha1' | 'md5';
    headerName: string;
}

const WEBHOOK_CONFIGS: Record<string, WebhookConfig> = {
    velocity: {
        secret: process.env.VELOCITY_WEBHOOK_SECRET || '',
        algorithm: 'sha256',
        headerName: 'x-velocity-signature'
    },
    ekart: {
        secret: process.env.EKART_WEBHOOK_SECRET || '',
        algorithm: 'sha256',
        headerName: 'x-ekart-signature'
    },
    delhivery: {
        secret: process.env.DELHIVERY_WEBHOOK_SECRET || '',
        algorithm: 'sha256',
        headerName: 'x-delhivery-signature'
    }
};

/**
 * Middleware factory to verify webhook signatures
 * @param carrier The courier partner name
 */
export function verifyWebhookSignature(carrier: 'velocity' | 'ekart' | 'delhivery') {
    return (req: Request, res: Response, next: NextFunction): void => {
        const config = WEBHOOK_CONFIGS[carrier];
        
        // Skip if no secret configured (allows development without secrets if not in production)
        if (!config.secret) {
            logger.warn(`[WebhookSecurity] No secret configured for ${carrier}, skipping verification`);
            if (process.env.NODE_ENV === 'production') {
                return next(new Error(`Critical: Webhook secret for ${carrier} is missing in production`));
            }
            return next();
        }

        try {
            // Get signature from header
            const signature = req.headers[config.headerName] as string;
            
            if (!signature) {
                logger.warn(`[WebhookSecurity] Missing ${config.headerName} header from ${carrier}`);
                throw new AuthenticationError(`Missing ${config.headerName} header`);
            }
            
            // Calculate expected signature
            const payload = JSON.stringify(req.body);
            const hmac = crypto.createHmac(config.algorithm, config.secret);
            hmac.update(payload);
            const expectedSignature = hmac.digest('hex');
            
            // Timing-safe comparison to prevent timing attacks
            const signatureBuffer = Buffer.from(signature);
            const expectedBuffer = Buffer.from(expectedSignature);
            
            if (signatureBuffer.length !== expectedBuffer.length) {
                logger.error(`[WebhookSecurity] Signature length mismatch for ${carrier}`);
                throw new AuthenticationError('Invalid webhook signature');
            }
            
            if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
                logger.error(`[WebhookSecurity] Signature mismatch for ${carrier}`, {
                    received: signature.substring(0, 10) + '...',
                    expected: expectedSignature.substring(0, 10) + '...'
                });
                throw new AuthenticationError('Invalid webhook signature');
            }
            
            logger.debug(`[WebhookSecurity] Signature verified for ${carrier}`);
            return next();
            
        } catch (error: any) {
            logger.error(`[WebhookSecurity] Verification failed for ${carrier}:`, error.message);
            
            if (error instanceof AuthenticationError) {
                res.status(401).json({ 
                    success: false, 
                    error: error.message,
                    code: 'INVALID_SIGNATURE'
                });
                return;
            }
            
            return next(error);
        }
    };
}
