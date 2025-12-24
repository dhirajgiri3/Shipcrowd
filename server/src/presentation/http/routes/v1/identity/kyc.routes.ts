import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { authenticate, authorize, csrfProtection } from '../../../middleware/auth/auth';
import kycController from '../../../controllers/identity/kyc.controller';
import deepvueService from '../../../../../core/application/services/integrations/deepvue.service';

const router = express.Router();

/**
 * Helper function to wrap controller methods and handle type issues
 * This ensures proper return types for Express route handlers
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
router.get('/all', authenticate, authorize('admin'), wrapController(kycController.getAllKYCs));

/**
 * @route POST /kyc/:kycId/verify
 * @desc Verify a KYC document (admin only)
 * @access Private (Admin)
 */
router.post('/:kycId/verify', authenticate, authorize('admin'), csrfProtection, wrapController(kycController.verifyKYCDocument));

/**
 * @route POST /kyc/:kycId/reject
 * @desc Reject a KYC (admin only)
 * @access Private (Admin)
 */
router.post('/:kycId/reject', authenticate, authorize('admin'), csrfProtection, wrapController(kycController.rejectKYC));

/**
 * @route POST /kyc/verify-pan
 * @desc Verify PAN card in real-time using DeepVue API
 * @access Private
 */
router.post('/verify-pan', authenticate, csrfProtection, wrapController(kycController.verifyPanCard));

/**
 * @route POST /kyc/verify-aadhaar
 * @desc Verify Aadhaar in real-time using DeepVue API
 * @access Private
 */
router.post('/verify-aadhaar', authenticate, csrfProtection, wrapController(kycController.verifyAadhaar));

/**
 * @route POST /kyc/verify-gstin
 * @desc Verify GSTIN in real-time using DeepVue API
 * @access Private
 */
router.post('/verify-gstin', authenticate, csrfProtection, wrapController(kycController.verifyGstin));

/**
 * @route POST /kyc/verify-bank-account
 * @desc Verify bank account in real-time using DeepVue API
 * @access Private
 */
router.post('/verify-bank-account', authenticate, csrfProtection, wrapController(kycController.verifyBankAccount));

/**
 * @route POST /kyc/verify-ifsc
 * @desc Verify IFSC code in real-time using DeepVue API
 * @access Private
 */
router.post('/verify-ifsc', authenticate, csrfProtection, wrapController(kycController.verifyIfscCode));

/**
 * @route POST /kyc/agreement
 * @desc Update agreement acceptance status
 * @access Private
 */
router.post('/agreement', authenticate, csrfProtection, wrapController(kycController.updateAgreement));

/**
 * @route GET /kyc/test-deepvue
 * @desc Test DeepVue API connection
 * @access Private (Admin)
 */
router.get('/test-deepvue', authenticate, authorize('admin'), wrapController(async (_req: Request, res: Response) => {
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
