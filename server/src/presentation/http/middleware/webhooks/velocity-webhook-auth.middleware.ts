import logger from '@/shared/logger/winston.logger';
import { NextFunction, Request, Response } from 'express';
import { VelocityWebhookService } from '../../../../infrastructure/external/couriers/velocity/velocity-webhook.service';

/**
 * Middleware to verify Velocity webhook signature
 */
export const verifyVelocityWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
    try {
        const signature = req.headers['x-velocity-signature'] as string;

        // In local development, we might skip signature verification or use a dummy secret
        // Ideally, this should come from process.env
        const secret = process.env.VELOCITY_WEBHOOK_SECRET || 'test-secret';

        // Capture raw body - crucial for HMAC verification
        // Ensure your express app is configured to preserve raw body, e.g. using specific middleware for this route
        // or attaching rawBody to req.
        const rawBody = (req as any).rawBody || JSON.stringify(req.body);

        if (!signature) {
            logger.warn('Missing Velocity signature header');
            // Depending on strictness, we might allow non-signed requests in dev, but strictly reject in prod
            if (process.env.NODE_ENV === 'production') {
                return res.status(401).json({ success: false, message: 'Missing signature' });
            }
        }

        const isValid = VelocityWebhookService.verifySignature(signature, rawBody, secret);

        if (!isValid && process.env.NODE_ENV === 'production') {
            logger.warn('Invalid Velocity webhook signature');
            return res.status(401).json({ success: false, message: 'Invalid signature' });
        }

        if (!isValid) {
            logger.warn('Invalid Velocity webhook signature (allowed in non-production)');
        }

        next();
    } catch (error) {
        logger.error('Error in Velocity webhook verification middleware', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
