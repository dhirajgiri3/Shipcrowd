import express from 'express';
import { authenticate } from '../../../middleware';
import { requireAccess } from '../../../middleware/auth/unified-access';
import * as codRemittanceController from '../../../controllers/finance/cod-remittance.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All COD remittance routes require KYC verification
router.use(requireAccess({ kyc: true }));

// Get eligible shipments for remittance
router.get(
    '/eligible-shipments',
    codRemittanceController.getEligibleShipments
);

// Create new remittance batch
router.post(
    '/create',
    codRemittanceController.createRemittanceBatch
);

// List all remittances
router.get(
    '/',
    codRemittanceController.listRemittances
);

// Get remittance details
router.get(
    '/:id',
    codRemittanceController.getRemittanceDetails
);

// Approve remittance (admin action)
router.post(
    '/:id/approve',
    requireAccess({ roles: ['admin'] }),
    codRemittanceController.approveRemittance
);

// Initiate payout (admin action)
router.post(
    '/:id/initiate-payout',
    requireAccess({ roles: ['admin'] }),
    codRemittanceController.initiatePayout
);

// Cancel remittance
router.post(
    '/:id/cancel',
    requireAccess({ roles: ['admin'] }),
    codRemittanceController.cancelRemittance
);

// --- New Routes ---

// Get dashboard stats
router.get(
    '/dashboard',
    codRemittanceController.getDashboard
);

// Velocity settlement webhook (Public but signature verified) -- Note: remove auth if public
router.post(
    '/webhook',
    // TODO: Verify signature
    codRemittanceController.handleWebhook
);

// Request on-demand payout
router.post(
    '/request-payout',
    codRemittanceController.requestPayout
);

// Schedule payout
router.post(
    '/schedule-payout',
    codRemittanceController.schedulePayout
);

export default router;
