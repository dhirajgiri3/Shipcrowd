import express from 'express';
import { authenticate } from '../../../middleware';
import { requireAccess } from '../../../middleware/auth/unified-access';
import * as reconciliationController from '../../../controllers/finance/reconciliation.controller';
import { requireFeatureFlag } from '../../../middleware/system/feature-flag.middleware';

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
    requireFeatureFlag('enable_service_level_pricing'),
    reconciliationController.importCarrierBilling
);

router.get(
    '/pricing-variance-cases',
    requireFeatureFlag('enable_service_level_pricing'),
    reconciliationController.listPricingVarianceCases
);

router.patch(
    '/pricing-variance-cases/:id',
    requireFeatureFlag('enable_service_level_pricing'),
    reconciliationController.updatePricingVarianceCase
);

export default router;
