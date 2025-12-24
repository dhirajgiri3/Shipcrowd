import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import userController from '../../../controllers/identity/user.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

/**
 * @route GET /users/profile
 * @desc Get the current user's profile
 * @access Private
 */
router.get('/profile', authenticate, asyncHandler(userController.getProfile));

/**
 * @route PATCH /users/profile
 * @desc Update the current user's profile
 * @access Private
 */
router.patch('/profile', authenticate, csrfProtection, asyncHandler(userController.updateProfile));

/**
 * @route PATCH /users/profile/password
 * @desc Update the current user's password
 * @access Private
 */
router.patch('/profile/password', authenticate, csrfProtection, asyncHandler(userController.updatePassword));

/**
 * @route GET /users/profile/activity
 * @desc Get the current user's activity log
 * @access Private
 */
router.get('/profile/activity', authenticate, asyncHandler(userController.getActivityLog));

export default router;
