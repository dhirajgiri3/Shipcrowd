import { Router } from 'express';
import KYCWebhookController from '../../../controllers/kyc/kyc-webhook.controller';
import { authenticate } from '../../../middleware/auth/auth';

const router = Router();

/**
 * KYC Webhook Routes
 * Handles webhooks from KYC verification providers
 */

// IDfy webhook (public - verified by signature)
router.post(
    '/webhooks/idfy',
    KYCWebhookController.handleIDfyWebhook
);

// DigiLocker webhook (public - verified by signature)
router.post(
    '/webhooks/digilocker',
    KYCWebhookController.handleDigiLockerWebhook
);

// Manual KYC approval (admin only)
router.post(
    '/manual-approval/:companyId',
    authenticate,
    // TODO: Add admin role middleware
    KYCWebhookController.manualApproval
);

export default router;
