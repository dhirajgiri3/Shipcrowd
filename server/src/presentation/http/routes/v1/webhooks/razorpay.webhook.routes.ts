import express from 'express';
import * as razorpayPayoutWebhook from '../../../controllers/webhooks/payment/razorpay-payout.webhook.controller';
import * as razorpayPaymentWebhook from '../../../controllers/webhooks/payment/razorpay-payment.webhook.controller';
import verifyRazorpayWebhook from '../../../middleware/webhooks/razorpay-webhook-auth.middleware';

const router = express.Router();

// Apply verification middleware to all Razorpay webhooks
router.use(verifyRazorpayWebhook);

// Razorpay payout webhook
router.post('/payout', razorpayPayoutWebhook.handlePayoutWebhook);

// Razorpay payment webhook (Auto-Recharge)
router.post('/payment', razorpayPaymentWebhook.handlePaymentWebhook);

export default router;
