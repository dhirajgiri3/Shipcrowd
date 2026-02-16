import express from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import zoneController from '../../../controllers/shipping/zone.controller';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';

const router = express.Router();

/**
 * @route GET /api/v1/zones
 * @desc Get all zones
 * @access Private
 */
router.get('/', authenticate, asyncHandler(zoneController.getZones));

/**
 * @route POST /api/v1/zones
 * @desc Create a new zone
 * @access Private
 */
router.post('/', authenticate, csrfProtection, asyncHandler(zoneController.createZone));

/**
 * @route GET /api/v1/zones/:id
 * @desc Get a zone by ID
 * @access Private
 */
router.get('/:id', authenticate, asyncHandler(zoneController.getZoneById));

/**
 * @route PATCH /api/v1/zones/:id
 * @desc Update a zone
 * @access Private
 */
router.patch('/:id', authenticate, csrfProtection, asyncHandler(zoneController.updateZone));
router.put('/:id', authenticate, csrfProtection, asyncHandler(zoneController.updateZone));
router.delete('/:id', authenticate, csrfProtection, asyncHandler(zoneController.deleteZone));

export default router;
