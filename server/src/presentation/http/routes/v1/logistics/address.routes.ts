import express from 'express';
import { authenticate } from '../../../middleware';
import { checkKYC } from '../../../middleware/auth/kyc';
import * as addressController from '../../../controllers/logistics/address.controller';

const router = express.Router();

// Pincode info endpoint - PUBLIC for onboarding (no auth required)
router.get('/pincode/:pincode/info', addressController.getPincodeInfo);

// All routes below require authentication
router.use(authenticate);

// Validate Pincode and Check Serviceability should check KYC
router.get('/validate-pincode/:pincode', checkKYC, addressController.validatePincode);
router.post('/check-serviceability', checkKYC, addressController.checkServiceability);
router.post('/calculate-distance', checkKYC, addressController.calculateDistance);
router.get('/suggestions', addressController.getAddressSuggestions);

export default router;
