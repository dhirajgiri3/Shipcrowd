import express from 'express';
import { authenticate } from '@/presentation/http/middleware';
import { CODDiscrepancyController } from '@/presentation/http/controllers/finance/cod-discrepancy.controller';

const router = express.Router();

router.use(authenticate);

// GET /api/v1/finance/cod/discrepancies
router.get('/', CODDiscrepancyController.getDiscrepancies);

// GET /api/v1/finance/cod/discrepancies/:id
router.get('/:id', CODDiscrepancyController.getDiscrepancy);

// POST /api/v1/finance/cod/discrepancies/:id/resolve
router.post('/:id/resolve', CODDiscrepancyController.resolveDiscrepancy);

export default router;
