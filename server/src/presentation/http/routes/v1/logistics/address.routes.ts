import express from 'express';
import { authenticate } from '../../../middleware';
import { checkKYC } from '../../../middleware/auth/kyc';
import * as addressController from '../../../controllers/logistics/address.controller';

const router = express.Router();

// Publicly accessible if authenticated (or maybe allowed for unauthenticated checkout if needed?)
// For now, requiring authentication as per typical internal API usage
router.use(authenticate);

// Validate Pincode and Check Serviceability should check KYC
router.get('/validate-pincode/:pincode', checkKYC, addressController.validatePincode);
router.post('/check-serviceability', checkKYC, addressController.checkServiceability);
router.post('/calculate-distance', checkKYC, addressController.calculateDistance);

export default router;
