import express from 'express';
import { authenticate } from '../../../middleware';
import * as codRemittanceController from '../../../controllers/finance/cod-remittance.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

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

// Approve remittance (admin action - can add role check if needed)
router.post(
    '/:id/approve',
    codRemittanceController.approveRemittance
);

// Initiate payout (admin action)
router.post(
    '/:id/initiate-payout',
    codRemittanceController.initiatePayout
);

// Cancel remittance
router.post(
    '/:id/cancel',
    codRemittanceController.cancelRemittance
);

export default router;
