import express, { Request, Response, NextFunction } from 'express';
import { authenticate, csrfProtection } from '../../middleware/auth';
import zoneController from '../../controllers/zone.controller';

const router = express.Router();

// Type assertion for request handlers
type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asHandler = (fn: any): RequestHandler => fn as RequestHandler;

/**
 * @route GET /api/v1/zones
 * @desc Get all zones
 * @access Private
 */
router.get('/', authenticate, asHandler(zoneController.getZones));

/**
 * @route POST /api/v1/zones
 * @desc Create a new zone
 * @access Private
 */
router.post('/', authenticate, csrfProtection, asHandler(zoneController.createZone));

/**
 * @route GET /api/v1/zones/:id
 * @desc Get a zone by ID
 * @access Private
 */
router.get('/:id', authenticate, asHandler(zoneController.getZoneById));

/**
 * @route PATCH /api/v1/zones/:id
 * @desc Update a zone
 * @access Private
 */
router.patch('/:id', authenticate, csrfProtection, asHandler(zoneController.updateZone));

export default router;
