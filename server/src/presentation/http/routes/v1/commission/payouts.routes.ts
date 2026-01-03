/**
 * Payout Routes
 */

import { Router } from 'express';
import { PayoutController } from '../../../controllers/commission/index.js';
import { authenticate, authorize } from '../../../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public webhook (no auth)
router.post('/webhook', PayoutController.handleWebhook);

// Admin/manager only routes
router.post('/', authorize(['admin', 'manager']), PayoutController.initiatePayout);
router.post('/batch', authorize(['admin', 'manager']), PayoutController.processBatch);
router.get('/', authorize(['admin', 'manager']), PayoutController.listPayouts);
router.get('/:id', authorize(['admin', 'manager']), PayoutController.getPayout);
router.post('/:id/retry', authorize(['admin', 'manager']), PayoutController.retryPayout);
router.post('/:id/cancel', authorize(['admin', 'manager']), PayoutController.cancelPayout);

export default router;
