import express from 'express';
import accountController from '../../../controllers/identity/account.controller';
import { authenticate } from '../../../middleware/auth/auth';

const router = express.Router();

// All account routes require authentication
router.use(authenticate);

/**
 * @route POST /account/deactivate
 * @desc Deactivate user account
 * @access Private
 */
router.post('/deactivate', accountController.deactivateUserAccount);

/**
 * @route POST /account/reactivate
 * @desc Reactivate user account
 * @access Private
 */
router.post('/reactivate', accountController.reactivateUserAccount);

/**
 * @route POST /account/delete
 * @desc Schedule account deletion
 * @access Private
 */
router.post('/delete', accountController.scheduleAccountDeletionHandler);

/**
 * @route POST /account/cancel-deletion
 * @desc Cancel scheduled account deletion
 * @access Private
 */
router.post('/cancel-deletion', accountController.cancelScheduledDeletionHandler);

export default router;
