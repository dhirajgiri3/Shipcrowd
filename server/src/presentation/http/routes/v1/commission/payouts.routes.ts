/**
 * Payout Routes
 */

import { Router } from 'express';
import { PayoutController } from '../../../controllers/commission/index';
import { authenticate, authorize } from '../../../middleware/index';

const router = Router();

// Public webhook (no auth)
router.post('/webhook', PayoutController.handleWebhook);

// All other routes require authentication
router.use(authenticate);

// Admin/manager only routes
router.post('/', authorize(['admin', 'manager']), PayoutController.initiatePayout);
router.post('/batch', authorize(['admin', 'manager']), PayoutController.processBatch);
router.get('/', authorize(['admin', 'manager']), PayoutController.listPayouts);
router.get('/:id', authorize(['admin', 'manager']), PayoutController.getPayout);
router.post('/:id/retry', authorize(['admin', 'manager']), PayoutController.retryPayout);
router.post('/:id/cancel', authorize(['admin', 'manager']), PayoutController.cancelPayout);

export default router;
