import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';
import { ValidationError } from '../../../../../shared/errors/app.error';
import { WebhookProcessorService } from '../../../../../core/application/services/courier/webhook-processor.service';
import { DelhiveryStatusMapper } from '../../../../../infrastructure/external/couriers/delhivery/delhivery-status.mapper';

const processed = new Map<string, number>();
const TTL_MS = 24 * 60 * 60 * 1000;

function getIdempotencyKey(payload: any): string {
    const shipment = payload?.Shipment || payload?.shipment || payload || {};
    const status = shipment?.Status || {};
    const raw = `${shipment.AWB || ''}|${status.StatusType || ''}|${status.Status || ''}|${status.StatusDateTime || ''}`;
    return crypto.createHash('md5').update(raw).digest('hex');
}

export class DelhiveryWebhookController {
    private static mapper = new DelhiveryStatusMapper();

    static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const payload = req.body;

            if (!payload || !payload.Shipment || !payload.Shipment.AWB) {
                throw new ValidationError('Invalid payload: Missing AWB');
            }

            const key = getIdempotencyKey(payload);
            if (processed.has(key)) {
                sendSuccess(res, { status: 'skipped', message: 'Duplicate webhook ignored' });
                return;
            }

            processed.set(key, Date.now());
            setTimeout(() => processed.delete(key), TTL_MS);

            const result = await WebhookProcessorService.processWebhook(
                this.mapper,
                payload
            );

            sendSuccess(res, { status: result.status, message: result.message });
        } catch (error) {
            next(error);
        }
    }
}

export default DelhiveryWebhookController;
