import express from 'express';
import { authenticate } from '../../../middleware';
import * as addressController from '../../../controllers/logistics/address.controller';

const router = express.Router();

// Publicly accessible if authenticated (or maybe allowed for unauthenticated checkout if needed?)
// For now, requiring authentication as per typical internal API usage
router.use(authenticate);

router.get('/validate-pincode/:pincode', addressController.validatePincode);
router.post('/check-serviceability', addressController.checkServiceability);
router.post('/calculate-distance', addressController.calculateDistance);

export default router;
