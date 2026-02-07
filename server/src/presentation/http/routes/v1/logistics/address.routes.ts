import express from 'express';
import { authenticate } from '../../../middleware';
import { requireAccess } from '../../../middleware/index';
import * as addressController from '../../../controllers/logistics/address.controller';

const router = express.Router();

// Pincode info endpoint - PUBLIC for onboarding (no auth required)
router.get('/pincode/:pincode/info', addressController.getPincodeInfo);

// All routes below require authentication
router.use(authenticate);

// Validate Pincode and Check Serviceability require KYC
router.get('/validate-pincode/:pincode', requireAccess({ kyc: true }), addressController.validatePincode);
router.post('/check-serviceability', requireAccess({ kyc: true }), addressController.checkServiceability);
router.post('/calculate-distance', requireAccess({ kyc: true }), addressController.calculateDistance);
router.get('/suggestions', addressController.getAddressSuggestions);

export default router;
