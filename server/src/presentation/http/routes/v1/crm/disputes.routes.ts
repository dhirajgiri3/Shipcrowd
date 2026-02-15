import disputeController from '@/presentation/http/controllers/crm/dispute.controller';
import { authenticate } from '@/presentation/http/middleware/auth/auth';
import { requirePermission } from '@/presentation/http/middleware/auth/require-permission.middleware';
import { Router } from 'express';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================================================
// List and Create
// ============================================================================

/**
 * GET /api/v1/crm/disputes
 * Get all disputes for a company (with pagination and filtering)
 */
router.get('/', requirePermission('crm_disputes:read'), disputeController.findAll);

/**
 * POST /api/v1/crm/disputes
 * Create a new dispute
 */
router.post('/', requirePermission('crm_disputes:create'), disputeController.create);

// ============================================================================
// Metrics and Analytics
// ============================================================================

/**
 * GET /api/v1/crm/disputes/metrics
 * Get dispute metrics by type
 */
router.get('/metrics', requirePermission('crm_disputes:read_metrics'), disputeController.getMetrics);

/**
 * GET /api/v1/crm/disputes/open
 * Get all open disputes for a company
 */
router.get('/open', requirePermission('crm_disputes:read'), disputeController.getOpenDisputes);

/**
 * GET /api/v1/crm/disputes/summary
 * Get resolution summary with optional date filters
 */
router.get('/summary', requirePermission('crm_disputes:read_analytics'), disputeController.getResolutionSummary);

// ============================================================================
// Specific Dispute Operations (place after metrics to avoid conflicts)
// ============================================================================

/**
 * GET /api/v1/crm/disputes/:id
 * Get a specific dispute by ID
 */
router.get('/:id', requirePermission('crm_disputes:read'), disputeController.findById);

/**
 * POST /api/v1/crm/disputes/:id/investigate
 * Start investigation on a dispute
 */
router.post(
  '/:id/investigate',
  requirePermission('crm_disputes:investigate'),
  disputeController.startInvestigation
);

/**
 * POST /api/v1/crm/disputes/:id/complete-investigation
 * Complete investigation on a dispute
 */
router.post(
  '/:id/complete-investigation',
  requirePermission('crm_disputes:investigate'),
  disputeController.completeInvestigation
);

/**
 * POST /api/v1/crm/disputes/:id/resolve
 * Resolve a dispute with decision and optional refund
 */
router.post(
  '/:id/resolve',
  requirePermission('crm_disputes:resolve'),
  disputeController.resolve
);

/**
 * POST /api/v1/crm/disputes/:id/evidence
 * Add evidence to a dispute
 */
router.post(
  '/:id/evidence',
  requirePermission('crm_disputes:update'),
  disputeController.addEvidence
);

export default router;
