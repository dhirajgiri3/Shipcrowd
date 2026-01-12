import express from 'express';
import { authenticate, authorize } from '../../../middleware';
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

// Approve remittance (admin action)
router.post(
    '/:id/approve',
    authorize(['ADMIN']),
    codRemittanceController.approveRemittance
);

// Initiate payout (admin action)
router.post(
    '/:id/initiate-payout',
    authorize(['ADMIN']),
    codRemittanceController.initiatePayout
);

// Cancel remittance
router.post(
    '/:id/cancel',
    authorize(['ADMIN']),
    codRemittanceController.cancelRemittance
);

export default router;
