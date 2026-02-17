import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import * as codRemittanceController from '../../../controllers/finance/cod-remittance.controller';
import { authenticate } from '../../../middleware';
import { requireAccess } from '../../../middleware/auth/unified-access';
import { verifyVelocityWebhookSignature } from '../../../middleware/webhooks/velocity-webhook-auth.middleware';

const router = express.Router();

// Velocity settlement webhook - MUST be BEFORE authenticate middleware
// SECURITY: Public endpoint but signature-verified
router.post(
    '/webhook',
    verifyVelocityWebhookSignature as any,
    asyncHandler(codRemittanceController.handleWebhook)
);

// All routes below require authentication
router.use(authenticate);

// All COD remittance routes require KYC verification
router.use(requireAccess({ kyc: true }));

// Get COD settlement timeline (4-stage pipeline) - MUST be before /:id route
router.get(
    '/timeline',
    codRemittanceController.getTimeline
);

// Get dashboard stats - MUST be before /:id route
router.get(
    '/dashboard',
    codRemittanceController.getDashboard
);

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

// Get remittance details - MUST be after specific routes like /dashboard
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

// Note: /dashboard route is defined ABOVE /:id route to prevent route conflict
// Note: /webhook route is defined BEFORE authenticate middleware at the top of this file

// Request on-demand payout
router.post(
    '/request-payout',
    requireAccess({ roles: ['admin'] }),
    codRemittanceController.requestPayout
);

// Schedule payout
router.post(
    '/schedule-payout',
    requireAccess({ roles: ['admin'] }),
    codRemittanceController.schedulePayout
);

// Multer setup
import multer from 'multer';
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload MIS file for reconciliation
router.post(
    '/upload-mis',
    requireAccess({ roles: ['admin'] }),
    upload.single('file'),
    codRemittanceController.uploadMIS
);

export default router;
