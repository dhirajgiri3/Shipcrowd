/**
 * NDR Public Routes
 *
 * Unauthenticated endpoints for customer self-service.
 */

import { Router } from 'express';
import { NDRCustomerPortalController } from '@/presentation/http/controllers/ndr/ndr-customer-portal.controller';

const router = Router();

// Load NDR details by token
router.get('/:token', NDRCustomerPortalController.getNDRDetails);

// Update address
router.post('/:token/update-address', NDRCustomerPortalController.updateAddress);

// Reschedule delivery
router.post('/:token/reschedule', NDRCustomerPortalController.rescheduleDelivery);

// Cancel order
router.post('/:token/cancel', NDRCustomerPortalController.cancelOrder);

export default router;
