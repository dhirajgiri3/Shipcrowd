import { Request, Response, NextFunction } from 'express';
import logger from '../../../../shared/logger/winston.logger';

const WEBHOOK_TOKEN = process.env.DELHIVERY_WEBHOOK_TOKEN || '';

export const verifyDelhiveryWebhook = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers['x-delhivery-token'] as string || req.headers['x-api-key'] as string;

    if (!WEBHOOK_TOKEN) {
        logger.warn('DELHIVERY_WEBHOOK_TOKEN not configured - allowing in development only');
        if (process.env.NODE_ENV === 'production') {
            res.status(500).json({ error: 'Webhook token not configured' });
            return;
        }
        next();
        return;
    }

    if (!token || token !== WEBHOOK_TOKEN) {
        logger.warn('Invalid Delhivery webhook token', { tokenPresent: !!token });
        res.status(401).json({ error: 'Invalid webhook token' });
        return;
    }

    next();
};
