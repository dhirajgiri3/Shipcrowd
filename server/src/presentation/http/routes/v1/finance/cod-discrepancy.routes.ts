import { CODDiscrepancyController } from '@/presentation/http/controllers/finance/cod-discrepancy.controller';
import { authenticate } from '@/presentation/http/middleware';
import { requireAccess } from '@/presentation/http/middleware/auth/unified-access';
import express from 'express';

const router = express.Router();

router.use(authenticate);

// GET /api/v1/finance/cod/discrepancies
router.get('/', CODDiscrepancyController.getDiscrepancies);

// GET /api/v1/finance/cod/discrepancies/:id
router.get('/:id', CODDiscrepancyController.getDiscrepancy);

// POST /api/v1/finance/cod/discrepancies/:id/resolve
router.post('/:id/resolve', requireAccess({ kyc: true }), CODDiscrepancyController.resolveDiscrepancy);

export default router;
