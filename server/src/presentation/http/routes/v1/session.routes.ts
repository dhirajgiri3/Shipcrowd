import express from 'express';
import sessionController from '../../controllers/session.controller';
import { authenticate } from '../../middleware/auth';

const router = express.Router();

// All session routes require authentication
router.use(authenticate);

/**
 * @route GET /sessions
 * @desc Get all active sessions for the current user
 * @access Private
 */
router.get('/', sessionController.getSessions);

/**
 * @route DELETE /sessions/:sessionId
 * @desc Revoke a specific session
 * @access Private
 */
router.delete('/:sessionId', sessionController.terminateSession);

/**
 * @route DELETE /sessions
 * @desc Revoke all sessions except the current one
 * @access Private
 */
router.delete('/', sessionController.terminateAllSessions);

export default router;
