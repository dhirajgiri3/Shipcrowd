import express, { Request, Response, NextFunction } from 'express';
import { authenticate, csrfProtection } from '../../middleware/auth';
import userController from '../../controllers/user.controller';

const router = express.Router();

// Type assertion for request handlers to make TypeScript happy
type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asHandler = (fn: any): RequestHandler => fn as RequestHandler;

/**
 * @route GET /users/profile
 * @desc Get the current user's profile
 * @access Private
 */
router.get('/profile', authenticate, asHandler(userController.getProfile));

/**
 * @route PATCH /users/profile
 * @desc Update the current user's profile
 * @access Private
 */
router.patch('/profile', authenticate, csrfProtection, asHandler(userController.updateProfile));

/**
 * @route PATCH /users/profile/password
 * @desc Update the current user's password
 * @access Private
 */
router.patch('/profile/password', authenticate, csrfProtection, asHandler(userController.updatePassword));

/**
 * @route GET /users/profile/activity
 * @desc Get the current user's activity log
 * @access Private
 */
router.get('/profile/activity', authenticate, asHandler(userController.getActivityLog));

export default router;
