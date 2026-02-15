import express from 'express';
import teamController from '../../../controllers/organization/team.controller';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/index';

const router = express.Router();

// All team routes require authentication and KYC
router.use(authenticate);
router.use(requireAccess({ kyc: true }));

/**
 * @route GET /team
 * @desc Get all team members for the current user's company
 * @access Private
 */
router.get(
    '/',
    authenticate,
    requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager', 'member', 'viewer'] }),
    teamController.getTeamMembers
);

/**
 * @route GET /team/invitations
 * @desc Get all pending team invitations
 * @access Private (Manager+)
 */
router.get(
    '/invitations',
    authenticate,
    requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager'] }),
    teamController.getTeamInvitations
);

/**
 * @route POST /team/invite
 * @desc Invite a team member
 * @access Private (Manager+)
 */
router.post(
    '/invite',
    authenticate,
    csrfProtection,
    requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager'] }),
    teamController.inviteTeamMember
);

/**
 * @route DELETE /team/invitations/:invitationId
 * @desc Cancel a team invitation
 * @access Private (Manager+)
 */
router.delete(
    '/invitations/:invitationId',
    authenticate,
    csrfProtection,
    requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager'] }),
    teamController.cancelInvitation
);

/**
 * @route POST /team/invitations/:invitationId/resend
 * @desc Resend a team invitation
 * @access Private (Manager+)
 */
router.post(
    '/invitations/:invitationId/resend',
    authenticate,
    csrfProtection,
    requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager'] }),
    teamController.resendInvitation
);

/**
 * @route PATCH /team/members/:userId
 * @desc Update a team member's role
 * @access Private (Manager+)
 */
router.patch(
    '/members/:userId',
    authenticate,
    csrfProtection,
    requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager'] }),
    teamController.updateTeamMember
);

/**
 * @route DELETE /team/members/:userId
 * @desc Remove a team member
 * @access Private (Manager+)
 */
router.delete(
    '/members/:userId',
    authenticate,
    csrfProtection,
    requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager'] }),
    teamController.removeTeamMember
);

/**
 * @route GET /team/verify-invitation
 * @desc Verify a team invitation token
 * @access Public
 */
router.get('/verify-invitation', teamController.verifyInvitation);

/**
 * @route GET /team/members/:userId/permissions
 * @desc Get a team member's permissions
 * @access Private (Manager+)
 */
router.get(
    '/members/:userId/permissions',
    authenticate,
    requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager'] }),
    teamController.getTeamMemberPermissions
);

/**
 * @route PATCH /team/members/:userId/permissions
 * @desc Update a team member's permissions
 * @access Private (Manager+)
 */
router.patch(
    '/members/:userId/permissions',
    authenticate,
    csrfProtection,
    requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager'] }),
    teamController.updateTeamMemberPermissions
);

/**
 * @route GET /team/my-permissions
 * @desc Get current user's permissions
 * @access Private
 */
router.get('/my-permissions', authenticate, teamController.getMyPermissions);

/**
 * @route GET /team/members/:userId/activity
 * @desc Get a team member's activity
 * @access Private (Manager+)
 */
router.get(
    '/members/:userId/activity',
    authenticate,
    requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager'] }),
    teamController.getTeamMemberActivity
);

/**
 * @route GET /team/activity
 * @desc Get company activity
 * @access Private (Manager+)
 */
router.get(
    '/activity',
    authenticate,
    requireAccess({ companyMatch: true, teamRoles: ['owner', 'admin', 'manager'] }),
    teamController.getCompanyActivity
);

/**
 * @route GET /team/my-activity
 * @desc Get current user's activity
 * @access Private
 */
router.get('/my-activity', authenticate, teamController.getMyActivity);

export default router;
