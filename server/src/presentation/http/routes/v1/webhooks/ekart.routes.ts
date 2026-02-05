import { Router } from 'express';
import { EkartWebhookController } from '../../../controllers/webhooks/couriers/ekart.webhook.controller.js';
import { EkartWebhookService } from '../../../../../infrastructure/external/couriers/ekart/ekart.webhook.service.js';

const router = Router();

const verifyEkartSignature = (req: any, res: any, next: any) => {
    const signature = req.headers['x-ekart-signature'] as string;
    const secret = process.env.EKART_WEBHOOK_SECRET;

    // Skip verification in test environment or if not configured
    if (process.env.NODE_ENV === 'test' || !secret) {
        return next();
    }

    if (!signature) {
        return res.status(401).json({ status: 'error', message: 'Missing signature' });
    }

    // Use rawBody if available (from global middleware), otherwise stringify body (fallback)
    // Note: Re-stringifying JSON can be flaky due to key ordering, but it's a common fallback
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

    // Verify signature using service
    // We need to import the service first - will be added by import update
    if (!EkartWebhookService.verifySignature(signature, rawBody, secret)) {
        return res.status(401).json({ status: 'error', message: 'Invalid signature' });
    }

    next();
};

router.post('/', verifyEkartSignature, EkartWebhookController.handleWebhook);

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'ekart-webhook' });
});

export default router;

