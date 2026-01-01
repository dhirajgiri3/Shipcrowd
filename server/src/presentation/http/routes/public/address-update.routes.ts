import { Router } from 'express';
import AddressUpdateController from '../../controllers/public/AddressUpdateController';

const router = Router();

/**
 * Public routes for address update via magic link
 * No authentication required - security via JWT token
 */

// GET address update form data
router.get('/:token', AddressUpdateController.getAddressUpdateForm);

// POST address update submission
router.post('/:token', AddressUpdateController.updateAddress);

export default router;
