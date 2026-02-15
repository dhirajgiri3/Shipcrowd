import { EarlyCODController } from '@/presentation/http/controllers/finance/early-cod.controller';
import { authenticate } from '@/presentation/http/middleware';
import express from 'express';

const router = express.Router();

router.use(authenticate);

// GET /api/v1/finance/cod/early-program/eligibility
router.get('/eligibility', EarlyCODController.checkEligibility);

// GET /api/v1/finance/cod/early-program/enrollment
router.get('/enrollment', EarlyCODController.getEnrollment);

// POST /api/v1/finance/cod/early-program/enroll
router.post('/enroll', EarlyCODController.enroll);

// POST /api/v1/finance/cod/early-program/create-batch
router.post('/create-batch', EarlyCODController.createEarlyBatch);

export default router;
