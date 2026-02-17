import { EarlyCODController } from '@/presentation/http/controllers/finance/early-cod.controller';
import { authenticate } from '@/presentation/http/middleware';
import { requireAccess } from '@/presentation/http/middleware/auth/unified-access';
import express from 'express';

const router = express.Router();

router.use(authenticate);

// GET /api/v1/finance/cod/early-program/eligibility
router.get('/eligibility', EarlyCODController.checkEligibility);

// GET /api/v1/finance/cod/early-program/enrollment
router.get('/enrollment', EarlyCODController.getEnrollment);

// POST /api/v1/finance/cod/early-program/enroll
router.post('/enroll', requireAccess({ kyc: true }), EarlyCODController.enroll);

// POST /api/v1/finance/cod/early-program/create-batch
router.post('/create-batch', requireAccess({ kyc: true }), EarlyCODController.createEarlyBatch);

export default router;
