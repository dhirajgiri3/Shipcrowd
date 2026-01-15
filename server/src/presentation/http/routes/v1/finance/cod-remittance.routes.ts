import express from 'express';
import { authenticate } from '../../../middleware';
import { requireAccess } from '../../../middleware/auth/unified-access';
import { verifyVelocityWebhookSignature } from '../../../middleware/webhooks/velocity-signature.middleware';
import * as codRemittanceController from '../../../controllers/finance/cod-remittance.controller';

const router = express.Router();

// Velocity settlement webhook - MUST be BEFORE authenticate middleware
// SECURITY: Public endpoint but signature-verified
router.post(
    '/webhook',
    verifyVelocityWebhookSignature,
    codRemittanceController.handleWebhook
);

// All routes below require authentication
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

// Note: /webhook route is defined BEFORE authenticate middleware at the top of this file

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
