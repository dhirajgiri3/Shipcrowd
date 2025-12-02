import express from 'express';
import profileController from '../controllers/profile.controller';
import { authenticate, csrfProtection } from '../middleware/auth';

const router = express.Router();

// All profile routes require authentication
router.use(authenticate);

/**
 * @route GET /profile/completion
 * @desc Get profile completion status
 * @access Private
 */
router.get('/completion', profileController.getProfileCompletion);

/**
 * @route PATCH /profile/basic
 * @desc Update basic profile information
 * @access Private
 */
router.patch('/basic', csrfProtection, profileController.updateBasicProfile);

/**
 * @route PATCH /profile/address
 * @desc Update address information
 * @access Private
 */
router.patch('/address', csrfProtection, profileController.updateAddressProfile);

/**
 * @route PATCH /profile/personal
 * @desc Update personal information
 * @access Private
 */
router.patch('/personal', csrfProtection, profileController.updatePersonalProfile);

/**
 * @route PATCH /profile/social
 * @desc Update social links
 * @access Private
 */
router.patch('/social', csrfProtection, profileController.updateSocialProfile);

/**
 * @route PATCH /profile/preferences
 * @desc Update preferences
 * @access Private
 */
router.patch('/preferences', csrfProtection, profileController.updatePreferencesProfile);

/**
 * @route GET /profile/prompts
 * @desc Get profile completion prompts
 * @access Private
 */
router.get('/prompts', profileController.getProfilePrompts);

/**
 * @route POST /profile/dismiss-prompt
 * @desc Dismiss profile completion prompt
 * @access Private
 */
router.post('/dismiss-prompt', csrfProtection, profileController.dismissProfilePrompt);

export default router;
