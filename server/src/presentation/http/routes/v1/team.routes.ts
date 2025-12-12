import express from 'express';
import { authenticate, csrfProtection } from '../../middleware/auth';
import { checkPermission } from '../../middleware/permissions';
import teamController from '../../controllers/team.controller';

const router = express.Router();

/**
 * @route GET /team
 * @desc Get all team members for the current user's company
 * @access Private
 */
router.get('/', authenticate, checkPermission('team', 'view'), teamController.getTeamMembers);

/**
 * @route GET /team/invitations
 * @desc Get all pending team invitations for the current user's company
 * @access Private (Manager)
 */
router.get('/invitations', authenticate, checkPermission('team', 'invite'), teamController.getTeamInvitations);

/**
 * @route POST /team/invite
 * @desc Invite a team member
 * @access Private (Manager)
 */
router.post('/invite', authenticate, csrfProtection, checkPermission('team', 'invite'), teamController.inviteTeamMember);

/**
 * @route DELETE /team/invitations/:invitationId
 * @desc Cancel a team invitation
 * @access Private (Manager)
 */
router.delete('/invitations/:invitationId', authenticate, csrfProtection, checkPermission('team', 'invite'), teamController.cancelInvitation);

/**
 * @route POST /team/invitations/:invitationId/resend
 * @desc Resend a team invitation
 * @access Private (Manager)
 */
router.post('/invitations/:invitationId/resend', authenticate, csrfProtection, checkPermission('team', 'invite'), teamController.resendInvitation);

/**
 * @route PATCH /team/members/:userId
 * @desc Update a team member's role
 * @access Private (Manager)
 */
router.patch('/members/:userId', authenticate, csrfProtection, checkPermission('team', 'update'), teamController.updateTeamMember);

/**
 * @route DELETE /team/members/:userId
 * @desc Remove a team member
 * @access Private (Manager)
 */
router.delete('/members/:userId', authenticate, csrfProtection, checkPermission('team', 'remove'), teamController.removeTeamMember);

/**
 * @route GET /team/verify-invitation
 * @desc Verify a team invitation token
 * @access Public
 */
router.get('/verify-invitation', teamController.verifyInvitation);

/**
 * @route GET /team/members/:userId/permissions
 * @desc Get a team member's permissions
 * @access Private (Manager)
 */
router.get('/members/:userId/permissions', authenticate, checkPermission('team', 'update'), teamController.getTeamMemberPermissions);

/**
 * @route PATCH /team/members/:userId/permissions
 * @desc Update a team member's permissions
 * @access Private (Manager)
 */
router.patch('/members/:userId/permissions', authenticate, csrfProtection, checkPermission('team', 'update'), teamController.updateTeamMemberPermissions);

/**
 * @route GET /team/my-permissions
 * @desc Get current user's permissions
 * @access Private
 */
router.get('/my-permissions', authenticate, teamController.getMyPermissions);

/**
 * @route GET /team/members/:userId/activity
 * @desc Get a team member's activity
 * @access Private (Manager)
 */
router.get('/members/:userId/activity', authenticate, checkPermission('team', 'view'), teamController.getTeamMemberActivity);

/**
 * @route GET /team/activity
 * @desc Get company activity
 * @access Private (Manager)
 */
router.get('/activity', authenticate, checkPermission('team', 'view'), teamController.getCompanyActivity);

/**
 * @route GET /team/my-activity
 * @desc Get current user's activity
 * @access Private
 */
router.get('/my-activity', authenticate, teamController.getMyActivity);

export default router;
