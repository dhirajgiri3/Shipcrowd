import express from 'express';
import auditController from '../../../controllers/system/audit.controller';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

// All audit routes require authentication
router.use(authenticate);

/**
 * @route GET /audit/me
 * @desc Get audit logs for the current user
 * @access Private
 */
router.get('/me', auditController.getMyAuditLogs);

/**
 * @route GET /audit/company
 * @desc Get audit logs for a company (admin only)
 * @access Private (Admin)
 */
router.get('/company', auditController.getCompanyAuditLogs);
router.post('/company/export', auditController.exportCompanyAuditLogs);

/**
 * @route GET /audit/security
 * @desc Get security audit logs for a user
 * @access Private
 */
router.get('/security', auditController.getSecurityAuditLogs);

export default router;
