import { Router } from 'express';
import { DelhiveryWebhookController } from '../../../controllers/webhooks/couriers/delhivery.webhook.controller';
import { verifyWebhookSignature } from '../../../middleware/webhooks/webhook-signature.middleware';

const router = Router();

router.post('/', (req, res, next) => verifyWebhookSignature('delhivery')(req, res, next), DelhiveryWebhookController.handleWebhook);

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'delhivery-webhook' });
});

export default router;
