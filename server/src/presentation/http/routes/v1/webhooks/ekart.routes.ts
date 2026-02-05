import { Router } from 'express';
import { EkartWebhookController } from '../../../controllers/webhooks/couriers/ekart.webhook.controller';
import { verifyWebhookSignature } from '../../../middleware/webhooks/webhook-signature.middleware';

const router = Router();

router.post('/', (req, res, next) => verifyWebhookSignature('ekart')(req, res, next), EkartWebhookController.handleWebhook);

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'ekart-webhook' });
});

export default router;

