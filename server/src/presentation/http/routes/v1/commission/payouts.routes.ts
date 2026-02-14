/**
 * Payout Routes
 */

import { Router } from 'express';
import { PayoutController } from '../../../controllers/commission/index';
import { authenticate } from '../../../middleware/index';
import { requireAccess } from '../../../middleware/auth/unified-access';
import verifyRazorpayWebhook from '../../../middleware/webhooks/razorpay-webhook-auth.middleware';

const router = Router();

// Public webhook (no auth)
router.post('/webhook', verifyRazorpayWebhook('commission'), PayoutController.handleWebhook);

// All other routes require authentication
router.use(authenticate);

// All payout routes require KYC verification
// All payout routes require KYC verification
router.use(requireAccess({ kyc: true }));

// Admin/manager only routes
const managerAccess = requireAccess({ teamRoles: ['admin', 'manager'] });

router.post('/', managerAccess, PayoutController.initiatePayout);
router.post('/batch', managerAccess, PayoutController.processBatch);
router.get('/', managerAccess, PayoutController.listPayouts);
router.get('/:id', managerAccess, PayoutController.getPayout);
router.post('/:id/retry', managerAccess, PayoutController.retryPayout);
router.post('/:id/cancel', managerAccess, PayoutController.cancelPayout);

export default router;
