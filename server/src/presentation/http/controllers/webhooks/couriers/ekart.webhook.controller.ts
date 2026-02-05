import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sendSuccess } from '@/shared/utils/responseHelper';
import { ValidationError } from '@/shared/errors/app.error';
import { EkartWebhookService } from '@/infrastructure/external/couriers/ekart/ekart.webhook.service';
import logger from '@/shared/logger/winston.logger';

const processed = new Map<string, number>();
const TTL_MS = 24 * 60 * 60 * 1000;

function getIdempotencyKey(payload: any): string {
    const raw = `${payload.tracking_id || ''}|${payload.event || ''}|${payload.status || ''}|${payload.timestamp || ''}`;
    return crypto.createHash('md5').update(raw).digest('hex');
}

export class EkartWebhookController {
    static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const payload = req.body;

            if (!payload || !payload.tracking_id) {
                throw new ValidationError('Invalid payload: Missing tracking_id');
            }

            const key = getIdempotencyKey(payload);
            if (processed.has(key)) {
                sendSuccess(res, { status: 'skipped', message: 'Duplicate webhook ignored' });
                return;
            }

            processed.set(key, Date.now());
            setTimeout(() => processed.delete(key), TTL_MS);

            const result = await EkartWebhookService.processWebhook(payload);

            sendSuccess(res, { status: result.success ? 'success' : 'failed', message: result.message });
        } catch (error) {
            logger.error('Ekart webhook error', { error });
            next(error);
        }
    }
}

export default EkartWebhookController;
