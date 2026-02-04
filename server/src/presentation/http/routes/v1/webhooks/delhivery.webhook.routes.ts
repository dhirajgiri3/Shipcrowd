import { Router } from 'express';
import { DelhiveryWebhookController } from '../../../controllers/webhooks/couriers/delhivery.webhook.controller';
import { verifyDelhiveryWebhook } from '../../../middleware/webhooks/delhivery-webhook-auth.middleware';

const router = Router();

router.post('/', verifyDelhiveryWebhook, DelhiveryWebhookController.handleWebhook);

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'delhivery-webhook' });
});

export default router;
