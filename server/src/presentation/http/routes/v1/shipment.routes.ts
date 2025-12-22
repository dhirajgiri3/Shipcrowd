import express, { Request, Response, NextFunction } from 'express';
import { authenticate, csrfProtection } from '../../middleware/auth';
import shipmentController from '../../controllers/shipment.controller';

const router = express.Router();

// Type assertion for request handlers
type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asHandler = (fn: any): RequestHandler => fn as RequestHandler;

/**
 * @route POST /api/v1/shipments
 * @desc Create a new shipment from an order
 * @access Private
 */
router.post('/', authenticate, csrfProtection, asHandler(shipmentController.createShipment));

/**
 * @route GET /api/v1/shipments
 * @desc Get all shipments with pagination and filters
 * @access Private
 */
router.get('/', authenticate, asHandler(shipmentController.getShipments));

/**
 * @route GET /api/v1/shipments/tracking/:trackingNumber
 * @desc Track a shipment by AWB/tracking number
 * @access Private
 */
router.get('/tracking/:trackingNumber', authenticate, asHandler(shipmentController.trackShipment));

/**
 * @route GET /api/v1/shipments/:shipmentId
 * @desc Get a single shipment by ID
 * @access Private
 */
router.get('/:shipmentId', authenticate, asHandler(shipmentController.getShipmentById));

/**
 * @route PATCH /api/v1/shipments/:shipmentId/status
 * @desc Update shipment status
 * @access Private
 */
router.patch('/:shipmentId/status', authenticate, csrfProtection, asHandler(shipmentController.updateShipmentStatus));

/**
 * @route DELETE /api/v1/shipments/:shipmentId
 * @desc Soft delete a shipment
 * @access Private
 */
router.delete('/:shipmentId', authenticate, csrfProtection, asHandler(shipmentController.deleteShipment));

export default router;
