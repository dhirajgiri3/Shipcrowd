import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import analyticsController from '../../../controllers/analytics/analytics.controller';
import walletController from '../../../controllers/finance/wallet.controller';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

/**
 * @route GET /api/v1/finance/billing/overview
 * @desc Get billing overview (Revenue Stats)
 * @access Private
 */
router.get('/overview', authenticate, asyncHandler(analyticsController.getRevenueStats));

/**
 * @route GET /api/v1/finance/billing/recharges/pending
 * @desc Get pending recharges (Adapter using Transaction History)
 * @access Private
 */
router.get(
    '/recharges/pending',
    authenticate,
    async (req, res, next) => {
        // Adapter: Filter for recharges that might be pending
        // Since getPendingRecharges doesn't exist, we filter transaction history
        if (!req.query) req.query = {};
        req.query.type = 'credit';
        req.query.status = 'pending'; // Assuming status field exists or logic handled here
        return walletController.getTransactionHistory(req, res, next);
    }
);

// Mount Invoice Routes (Week 8) if needed, otherwise just this wrapper
// router.use('/invoices', invoiceRoutes);

export default router;
