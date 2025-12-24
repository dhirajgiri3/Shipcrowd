import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import shipmentController from '../../../controllers/shipping/shipment.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route POST /api/v1/shipments
 * @desc Create a new shipment from an order
 * @access Private
 */
router.post('/', authenticate, csrfProtection, asyncHandler(shipmentController.createShipment));

/**
 * @route GET /api/v1/shipments
 * @desc Get all shipments with pagination and filters
 * @access Private
 */
router.get('/', authenticate, asyncHandler(shipmentController.getShipments));

/**
 * @route GET /api/v1/shipments/tracking/:trackingNumber
 * @desc Track a shipment by AWB/tracking number
 * @access Private
 */
router.get('/tracking/:trackingNumber', authenticate, asyncHandler(shipmentController.trackShipment));

/**
 * @route GET /api/v1/shipments/:shipmentId
 * @desc Get a single shipment by ID
 * @access Private
 */
router.get('/:shipmentId', authenticate, asyncHandler(shipmentController.getShipmentById));

/**
 * @route PATCH /api/v1/shipments/:shipmentId/status
 * @desc Update shipment status
 * @access Private
 */
router.patch('/:shipmentId/status', authenticate, csrfProtection, asyncHandler(shipmentController.updateShipmentStatus));

/**
 * @route DELETE /api/v1/shipments/:shipmentId
 * @desc Soft delete a shipment
 * @access Private
 */
router.delete('/:shipmentId', authenticate, csrfProtection, asyncHandler(shipmentController.deleteShipment));

export default router;
