import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import { kycRateLimiter } from '../../../../../shared/config/rateLimit.config';
import kycController from '../../../controllers/identity/kyc.controller';
import deepvueService from '../../../../../core/application/services/integrations/deepvue.service';

const router = express.Router();

/**
 * Helper function to wrap controller methods and handle type issues
 */
const wrapController = (controller: any): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = controller(req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch((err: Error) => next(err));
      }
    } catch (err) {
      next(err);
    }
  };
};

/**
 * @route POST /kyc
 * @desc Submit KYC documents
 * @access Private
 */
router.post('/', authenticate, csrfProtection, wrapController(kycController.submitKYC));

/**
 * @route GET /kyc
 * @desc Get user's KYC details
 * @access Private
 */
router.get('/', authenticate, wrapController(kycController.getKYC));

/**
 * @route GET /kyc/all
 * @desc Get all KYCs (admin only)
 * @access Private (Admin)
 */
router.get('/all', authenticate, requireAccess({ roles: ['admin'] }), wrapController(kycController.getAllKYCs));

/**
 * @route POST /kyc/:kycId/verify
 * @desc Verify a KYC document (admin only)
 * @access Private (Admin)
 */
router.post('/:kycId/verify', authenticate, requireAccess({ roles: ['admin'] }), csrfProtection, wrapController(kycController.verifyKYCDocument));

/**
 * @route POST /kyc/:kycId/reject
 * @desc Reject a KYC (admin only)
 * @access Private (Admin)
 */
router.post('/:kycId/reject', authenticate, requireAccess({ roles: ['admin'] }), csrfProtection, wrapController(kycController.rejectKYC));

/**
 * SECURITY: Requires SANDBOX tier - users must complete onboarding
 * @route POST /kyc/verify-pan
 * @desc Verify PAN card in real-time using DeepVue API
 * @access Private
 */
router.post('/verify-pan', kycRateLimiter, authenticate, csrfProtection,
  requireAccess({ tier: AccessTier.SANDBOX }),
  wrapController(kycController.verifyPanCard));

/**
 * SECURITY: Requires SANDBOX tier
 * @route POST /kyc/verify-aadhaar
 * @desc Verify Aadhaar in real-time using DeepVue API
 * @access Private
 */
router.post('/verify-aadhaar', kycRateLimiter, authenticate, csrfProtection,
  requireAccess({ tier: AccessTier.SANDBOX }),
  wrapController(kycController.verifyAadhaar));

/**
 * SECURITY: Requires SANDBOX tier, rate limited
 * @route POST /kyc/verify-gstin
 * @desc Verify GSTIN in real-time using DeepVue API
 * @access Private
 */
router.post('/verify-gstin', kycRateLimiter, authenticate, csrfProtection,
  requireAccess({ tier: AccessTier.SANDBOX }),
  wrapController(kycController.verifyGstin));

/**
 * SECURITY: Requires SANDBOX tier, rate limited, real DeepVue API only (no mocks in prod)
 * @route POST /kyc/verify-bank-account
 * @desc Verify bank account in real-time using DeepVue API
 * @access Private
 */
router.post('/verify-bank-account', kycRateLimiter, authenticate, csrfProtection,
  requireAccess({ tier: AccessTier.SANDBOX }),
  wrapController(kycController.verifyBankAccount));

/**
 * SECURITY: Requires SANDBOX tier, rate limited, real DeepVue API only (no mocks in prod)
 * @route POST /kyc/verify-ifsc
 * @desc Verify IFSC code in real-time using DeepVue API
 * @access Private
 */
router.post('/verify-ifsc', kycRateLimiter, authenticate, csrfProtection,
  requireAccess({ tier: AccessTier.SANDBOX }),
  wrapController(kycController.verifyIfscCode));

/**
 * @route POST /kyc/agreement
 * @desc Update agreement acceptance status
 * @access Private
 */
router.post('/agreement', authenticate, csrfProtection, wrapController(kycController.updateAgreement));

/**
 * @route POST /kyc/invalidate
 * @desc Invalidate a verified KYC document (re-verification)
 * @access Private
 */
router.post('/invalidate', authenticate, csrfProtection, wrapController(kycController.invalidateKYCDocument));

/**
 * @route GET /kyc/test-deepvue
 * @desc Test DeepVue API connection
 * @access Private (Admin)
 */
router.get('/test-deepvue', authenticate, requireAccess({ roles: ['admin'] }), wrapController(async (_req: Request, res: Response) => {
  try {
    const result = await deepvueService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

export default router;
