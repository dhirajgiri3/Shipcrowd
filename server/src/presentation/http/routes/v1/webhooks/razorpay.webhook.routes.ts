import express from 'express';
import * as razorpayPayoutWebhook from '../../../controllers/webhooks/razorpay-payout.webhook.controller';

const router = express.Router();

// Razorpay payout webhook (no authentication - verified via signature)
router.post('/payout', razorpayPayoutWebhook.handlePayoutWebhook);

export default router;
