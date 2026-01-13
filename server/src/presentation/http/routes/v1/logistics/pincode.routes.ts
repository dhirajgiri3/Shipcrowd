import { Router } from 'express';
import { authenticate } from '../../../middleware';
import { checkKYC } from '../../../middleware/auth/kyc';
import * as pincodeController from '../../../controllers/logistics/pincode.controller';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * GET /api/v1/logistics/pincode/:pincode
 * Get details for a specific pincode
 */
router.get('/:pincode', pincodeController.getPincodeDetails);

/**
 * GET /api/v1/logistics/pincode/all
 * Get all pincodes (paginated)
 * Requires KYC verification
 */
router.get('/all', checkKYC, pincodeController.getAllPincodes);

/**
 * POST /api/v1/logistics/pincode/bulk-validate
 * Validate multiple pincodes at once
 */
router.post('/bulk-validate', pincodeController.bulkValidatePincodes);

/**
 * GET /api/v1/logistics/pincode/search
 * Search pincodes by city or state
 */
router.get('/search', pincodeController.searchPincodes);

/**
 * GET /api/v1/logistics/pincode/stats
 * Get cache statistics (admin only)
 */
router.get('/stats', checkKYC, pincodeController.getCacheStats);

export default router;
