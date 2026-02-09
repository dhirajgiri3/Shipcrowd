import express from 'express';
import { authenticate } from '../../../middleware';
import { requireAccess } from '../../../middleware/auth/unified-access';
import * as reconciliationController from '../../../controllers/finance/reconciliation.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All reconciliation routes require KYC verification
router.use(requireAccess({ kyc: true }));

// List reconciliation reports
router.get(
    '/reports',
    reconciliationController.listReconciliationReports
);

// Get reconciliation report details
router.get(
    '/reports/:id',
    reconciliationController.getReconciliationReportDetails
);

router.post(
    '/carrier-billing/import',
    reconciliationController.importCarrierBilling
);

router.get(
    '/pricing-variance-cases',
    reconciliationController.listPricingVarianceCases
);

router.patch(
    '/pricing-variance-cases/:id',
    reconciliationController.updatePricingVarianceCase
);

export default router;
