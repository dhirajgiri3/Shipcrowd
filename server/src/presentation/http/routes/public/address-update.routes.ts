import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AddressUpdateController } from '../../controllers/public/address-update.controller';

const router = Router();

/**
 * Public routes for address update via magic link
 * No authentication required - security via JWT token
 */

/**
 * Rate limiter for address update endpoints
 * Prevents brute force token guessing and DoS attacks
 */
const addressUpdateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20, // 20 requests per IP per 15 minutes
    message: { message: 'Too many address update requests, please try again later' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'test',
});

// Apply rate limiting to all routes
router.use(addressUpdateLimiter);

// GET /public/update-address/:token - Display address update form
router.get('/update-address/:token', AddressUpdateController.getAddressUpdateForm);

// POST /public/update-address/:token - Submit address update
router.post('/update-address/:token', AddressUpdateController.updateAddress);

export default router;
