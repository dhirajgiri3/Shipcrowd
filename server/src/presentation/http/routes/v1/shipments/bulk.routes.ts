import { Router } from 'express';
import BulkShipmentController from '../../../controllers/shipments/bulk-shipment.controller';
import { authenticate, requireAccess } from '../../../middleware';
import { AccessTier } from '../../../../../core/domain/types/access-tier';

const router = Router();

router.use(authenticate);

/**
 * @route POST /shipments/bulk/manifest
 * @desc Create bulk manifests grouped by carrier/warehouse
 * @access Private
 */
router.post(
    '/manifest',
    requireAccess({ tier: AccessTier.PRODUCTION }),
    BulkShipmentController.createBulkManifest
);

export default router;
