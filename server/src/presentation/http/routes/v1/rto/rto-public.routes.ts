/**
 * RTO Public Routes
 *
 * Unauthenticated endpoints for customer RTO tracking.
 */

import { Router } from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import { RTOCustomerPortalController } from '../../../controllers/rto/rto-customer-portal.controller';

const router = Router();

router.get('/track', asyncHandler(RTOCustomerPortalController.trackRTO));

export default router;
