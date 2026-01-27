import express from 'express';
import callLogController from '@/presentation/http/controllers/crm/call-log.controller';
import { authenticate } from '@/presentation/http/middleware/auth/auth';
import { requireCompany } from '@/presentation/http/middleware/auth/company';

const router = express.Router();

// All routes require authentication and company scope
router.use(authenticate);
router.use(requireCompany);

// Create a new call log (manual)
router.post('/', callLogController.createCallLog);

// Get logs for the authenticated user (or specified rep)
router.get('/', callLogController.getMyLogs);

// Update call outcome (e.g. after call is done)
router.patch('/:id/outcome', callLogController.updateOutcome);

export default router;
