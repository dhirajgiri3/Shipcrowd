import { Router } from 'express';
import { EkartWebhookController } from '../../../controllers/webhooks/couriers/ekart.webhook.controller';

const router = Router();

router.post('/', EkartWebhookController.handleWebhook);

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'ekart-webhook' });
});

export default router;

