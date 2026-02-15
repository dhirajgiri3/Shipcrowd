import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { PermissionService } from '../../../../core/application/services/auth/permission.service';
import { AuthTokenService } from '../../../../core/application/services/auth/token.service';
import emailService from '../../../../core/application/services/communication/email.service';
import activityService from '../../../../core/application/services/user/activity.service';
import { Company, Membership, Role, TeamInvitation, User } from '../../../../infrastructure/database/mongoose/models';
import { AuthenticationError, AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import { calculatePagination, sendCreated, sendPaginated, sendSuccess } from '../../../../shared/utils/responseHelper';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';
import { getUserPermissions } from '../../middleware/auth/permissions';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';

// Helper function to wrap controller methods that expect AuthRequest
const withAuth = (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return handler(req as Request, res, next);
  };
};

// Define validation schemas
const inviteTeamMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['admin', 'manager', 'member', 'viewer', 'warehouse_manager']),
  permissions: z.array(z.string()).optional(),
  warehouseId: z.string().optional(),
  invitationMessage: z.string().optional(),
});

const updateTeamMemberSchema = z.object({
  teamRole: z.enum(['owner', 'admin', 'manager', 'member', 'viewer']),
  teamStatus: z.enum(['active', 'suspended']).optional(),
});

const updatePermissionsSchema = z.object({
  permissions: z.object({
    orders: z.object({
      view: z.boolean().optional(),
      create: z.boolean().optional(),
      update: z.boolean().optional(),
      delete: z.boolean().optional(),
    }).optional(),
    products: z.object({
      view: z.boolean().optional(),
      create: z.boolean().optional(),
      update: z.boolean().optional(),
      delete: z.boolean().optional(),
    }).optional(),
    warehouses: z.object({
      view: z.boolean().optional(),
      create: z.boolean().optional(),
      update: z.boolean().optional(),
      delete: z.boolean().optional(),
    }).optional(),
    customers: z.object({
      view: z.boolean().optional(),
      create: z.boolean().optional(),
      update: z.boolean().optional(),
      delete: z.boolean().optional(),
    }).optional(),
    team: z.object({
      view: z.boolean().optional(),
      invite: z.boolean().optional(),
      update: z.boolean().optional(),
      remove: z.boolean().optional(),
    }).optional(),
    reports: z.object({
      view: z.boolean().optional(),
      export: z.boolean().optional(),
    }).optional(),
    settings: z.object({
      view: z.boolean().optional(),
      update: z.boolean().optional(),
    }).optional(),
  }),
});

const extractPermissionList = (permissions: Record<string, Record<string, boolean | undefined>> | undefined) => {
  const allowed: string[] = [];
  const denied: string[] = [];

  if (!permissions) {
    return { allowed, denied };
  }

  Object.entries(permissions).forEach(([module, actions]) => {
    if (!actions) return;
    Object.entries(actions).forEach(([action, value]) => {
      if (value === true) allowed.push(`${module}.${action}`);
      if (value === false) denied.push(`${module}.${action}`);
    });
  });

  return {
    allowed: Array.from(new Set(allowed)),
    denied: Array.from(new Set(denied)),
  };
};

/**
 * Get all team members for a company
 * @route GET /team or GET /companies/:companyId/team
 */
export const getTeamMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    // Determine which company ID to use - from URL params or from user's record
    let companyId: mongoose.Types.ObjectId;

    // If companyId is provided in URL params, use that instead
    if (req.params.companyId) {
      // Check if user has access to this company
      if (!isPlatformAdmin(user) && (!user.companyId || user.companyId.toString() !== req.params.companyId)) {
        throw new AuthorizationError('Access denied to this company', ErrorCode.AUTHZ_FORBIDDEN);
      }
      // Convert string ID to ObjectId
      companyId = new mongoose.Types.ObjectId(req.params.companyId);
    } else if (!user.companyId) {
      // If no companyId in params and user doesn't have a company
      throw new ValidationError('User is not associated with any company', { field: 'companyId', message: 'User is not associated with any company' });
    } else {
      // Use user's company ID
      companyId = user.companyId;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filtering
    const filter: any = {
      companyId: companyId,
      isDeleted: false
    };

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Get team members
    const teamMembers = await User.find(filter)
      .select('-password -security')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await User.countDocuments(filter);

    const pagination = calculatePagination(total, page, limit);
    sendPaginated(res, teamMembers, pagination, 'Team members retrieved successfully');
  } catch (error) {
    logger.error('Error fetching team members:', error);
    next(error);
  }
};

/**
 * Get all pending team invitations for a company
 * @route GET /team/invitations
 */
export const getTeamInvitations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }

    // Only managers can see invitations
    if (user.teamRole !== 'manager') {
      throw new AuthorizationError('Only managers can view team invitations', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get pending invitations
    const invitations = await TeamInvitation.find({
      companyId: user.companyId,
      status: 'pending'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('invitedBy', 'name email');

    // Get total count
    const total = await TeamInvitation.countDocuments({
      companyId: user.companyId,
      status: 'pending'
    });

    const pagination = calculatePagination(total, page, limit);
    sendPaginated(res, invitations, pagination, 'Team invitations retrieved successfully');
  } catch (error) {
    logger.error('Error fetching team invitations:', error);
    next(error);
  }
};

/**
 * Invite a team member
 * @route POST /team/invite or POST /companies/:companyId/team/invite
 */
export const inviteTeamMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    // Determine which company ID to use - from URL params or from user's record
    let companyId: mongoose.Types.ObjectId;

    // If companyId is provided in URL params, use that instead
    if (req.params.companyId) {
      // Check if user has access to this company
      if (!isPlatformAdmin(user) && (!user.companyId || user.companyId.toString() !== req.params.companyId)) {
        throw new AuthorizationError('Access denied to this company', ErrorCode.AUTHZ_FORBIDDEN);
      }
      // Convert string ID to ObjectId
      companyId = new mongoose.Types.ObjectId(req.params.companyId);
    } else if (!user.companyId) {
      // If no companyId in params and user doesn't have a company
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    } else {
      // Use user's company ID
      companyId = user.companyId;
    }

    // Check if user has permission to invite team members based on role hierarchy
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      throw new AuthorizationError('You do not have permission to invite team members', ErrorCode.AUTHZ_FORBIDDEN);
    }

    const validatedData = inviteTeamMemberSchema.parse(req.body);

    // Role hierarchy validation - users can only invite members with equal or lower roles
    if (
      (user.teamRole === 'manager' && ['admin'].includes(validatedData.role))
    ) {
      throw new AuthorizationError('You cannot invite team members with higher privileges than your own role', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      // If user exists and is already in this company
      if (existingUser.companyId && existingUser.companyId.toString() === companyId.toString()) {
        throw new ConflictError('User is already a member of this company', ErrorCode.BIZ_CONFLICT);
      }

      // If user exists but is in another company
      throw new ConflictError('User is already registered with another company', ErrorCode.BIZ_CONFLICT);
    }

    // Check if there's already a pending invitation
    const existingInvitation = await TeamInvitation.findOne({
      email: validatedData.email,
      companyId: companyId,
      status: 'pending'
    });

    if (existingInvitation) {
      throw new ConflictError('An invitation has already been sent to this email', ErrorCode.BIZ_CONFLICT);
    }

    // Get company details for the invitation email
    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found', ErrorCode.RES_COMPANY_NOT_FOUND);
    }

    // ✅ PHASE 1 FIX: Generate hashed token for team invitation
    const { raw: rawToken, hashed: hashedToken } = AuthTokenService.generateSecureToken();

    // Create new invitation
    const invitation = new TeamInvitation({
      email: validatedData.email,
      companyId: companyId,
      invitedBy: user._id,
      teamRole: validatedData.role,
      invitationMessage: validatedData.invitationMessage,
      token: hashedToken, // ✅ Store HASH
    });

    await invitation.save();

    // Send invitation email
    const emailSent = await emailService.sendTeamInvitationEmail(
      validatedData.email,
      company.name,
      validatedData.role,
      rawToken, // ✅ Send RAW token
      validatedData.invitationMessage
    );

    await createAuditLog(
      req.user._id,
      companyId,
      'create',
      'team_invitation',
      String(invitation._id), // Convert _id to string for type safety
      { message: `Team invitation sent to ${validatedData.email}` },
      req
    );

    sendCreated(res, { invitation, emailSent }, 'Team invitation sent successfully');
  } catch (error) {
    logger.error('Error inviting team member:', error);
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors[0].message);
    }
    next(error);
  }
};

/**
 * Cancel a team invitation
 * @route DELETE /team/invitations/:invitationId
 */
export const cancelInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const invitationId = req.params.invitationId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }

    // Only managers can cancel invitations
    if (user.teamRole !== 'manager') {
      throw new AuthorizationError('Only managers can cancel team invitations', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Find the invitation
    const invitation = await TeamInvitation.findById(invitationId);

    if (!invitation) {
      throw new NotFoundError('Invitation not found', ErrorCode.RES_NOT_FOUND);
    }

    // Check if the invitation belongs to the user's company
    if (invitation.companyId.toString() !== user.companyId.toString()) {
      throw new AuthorizationError('Access denied to this invitation', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Check if the invitation is still pending
    if (invitation.status !== 'pending') {
      throw new ValidationError('Only pending invitations can be cancelled', ErrorCode.VAL_INVALID_INPUT);
    }

    // Update invitation status to expired
    invitation.status = 'expired';
    await invitation.save();

    await createAuditLog(
      req.user._id,
      user.companyId,
      'update',
      'team_invitation',
      String(invitation._id), // Convert _id to string for type safety
      { message: `Team invitation to ${invitation.email} cancelled` },
      req
    );

    sendSuccess(res, null, 'Team invitation cancelled successfully');
  } catch (error) {
    logger.error('Error cancelling team invitation:', error);
    next(error);
  }
};

/**
 * Resend a team invitation
 * @route POST /team/invitations/:invitationId/resend
 */
export const resendInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const invitationId = req.params.invitationId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }

    // Only managers can resend invitations
    if (user.teamRole !== 'manager') {
      throw new AuthorizationError('Only managers can resend team invitations', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Find the invitation
    const invitation = await TeamInvitation.findById(invitationId);

    if (!invitation) {
      throw new NotFoundError('Invitation not found', ErrorCode.RES_NOT_FOUND);
    }

    // Check if the invitation belongs to the user's company
    if (invitation.companyId.toString() !== user.companyId.toString()) {
      throw new AuthorizationError('Access denied to this invitation', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Check if the invitation is expired
    if (invitation.status !== 'pending' && invitation.status !== 'expired') {
      throw new ValidationError('Only pending or expired invitations can be resent', ErrorCode.VAL_INVALID_INPUT);
    }

    // Get company details for the invitation email
    const company = await Company.findById(user.companyId);
    if (!company) {
      throw new NotFoundError('Company not found', ErrorCode.RES_COMPANY_NOT_FOUND);
    }

    // ✅ PHASE 1 FIX: Hash team invitation token before storage
    const { raw: rawToken, hashed: hashedToken } = AuthTokenService.generateSecureToken();

    invitation.token = hashedToken; // ✅ Store HASH
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    invitation.status = 'pending';
    await invitation.save();

    // Send invitation email
    const emailSent = await emailService.sendTeamInvitationEmail(
      invitation.email,
      company.name,
      invitation.teamRole,
      rawToken // ✅ Send RAW token
    );

    await createAuditLog(
      req.user._id,
      user.companyId,
      'update',
      'team_invitation',
      String(invitation._id), // Convert _id to string for type safety
      { message: `Team invitation to ${invitation.email} resent` },
      req
    );

    sendSuccess(res, {
      message: 'Team invitation resent successfully',
      invitation,
      emailSent
    }, 'Team invitation resent successfully');
  } catch (error) {
    logger.error('Error resending team invitation:', error);
    next(error);
  }
};

/**
 * Update a team member's role
 * @route PATCH /team/members/:userId
 */
export const updateTeamMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const targetUserId = req.params.userId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
    }

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }

    // Check if user has permission to update team members based on role hierarchy
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      throw new AuthorizationError('You do not have permission to update team members', ErrorCode.AUTHZ_FORBIDDEN);
    }

    const validatedData = updateTeamMemberSchema.parse(req.body);

    // Find the target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundError('Team member not found', ErrorCode.RES_USER_NOT_FOUND);
    }

    // Check if the target user belongs to the same company
    if (!targetUser.companyId || targetUser.companyId.toString() !== user.companyId.toString()) {
      throw new AuthorizationError('Access denied to this team member', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Prevent users from changing their own role
    if (String(targetUser._id) === String(user._id)) {
      throw new ValidationError('You cannot change your own role', ErrorCode.VAL_INVALID_INPUT);
    }

    // Role hierarchy validation - users can only manage members with equal or lower roles
    if (
      // Current user is manager trying to modify an owner or admin
      (user.teamRole === 'manager' && ['owner', 'admin'].includes(targetUser.teamRole || '')) ||
      // Current user is admin trying to modify an owner
      (user.teamRole === 'admin' && targetUser.teamRole === 'owner') ||
      // Trying to promote someone to a role higher than the current user
      (user.teamRole === 'manager' && ['admin'].includes(validatedData.teamRole))
    ) {
      throw new AuthorizationError('You cannot modify team members with higher privileges than your own role', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Prevent removing the last owner
    if (
      targetUser.teamRole === 'owner' &&
      validatedData.teamRole !== 'owner' &&
      validatedData.teamRole !== undefined
    ) {
      // Count how many owners the company has
      const ownersCount = await User.countDocuments({
        companyId: user.companyId,
        teamRole: 'owner',
        isDeleted: false
      });

      if (ownersCount <= 1) {
        throw new ValidationError('Cannot change the role of the last owner. Transfer ownership to another user first.', ErrorCode.VAL_INVALID_INPUT);
      }
    }

    // Update the team member's role and status
    if (validatedData.teamRole) {
      targetUser.teamRole = validatedData.teamRole;
    }

    if (validatedData.teamStatus) {
      // Only owners and admins can suspend users
      if (validatedData.teamStatus === 'suspended' &&
        user.teamRole !== 'owner' && user.teamRole !== 'admin') {
        throw new AuthorizationError('Only owners and admins can suspend team members', ErrorCode.AUTHZ_FORBIDDEN);
      }

      // Prevent suspending the last owner
      if (validatedData.teamStatus === 'suspended' && targetUser.teamRole === 'owner') {
        const ownersCount = await User.countDocuments({
          companyId: user.companyId,
          teamRole: 'owner',
          isDeleted: false
        });

        if (ownersCount <= 1) {
          throw new ValidationError('Cannot suspend the last owner. Transfer ownership to another user first.', ErrorCode.VAL_INVALID_INPUT);
        }
      }

      targetUser.teamStatus = validatedData.teamStatus;
    }

    await targetUser.save();

    // Create appropriate audit log message
    let auditMessage = '';
    if (validatedData.teamRole && validatedData.teamStatus) {
      auditMessage = `Team member role updated to ${validatedData.teamRole} and status to ${validatedData.teamStatus}`;
    } else if (validatedData.teamRole) {
      auditMessage = `Team member role updated to ${validatedData.teamRole}`;
    } else if (validatedData.teamStatus) {
      auditMessage = `Team member status updated to ${validatedData.teamStatus}`;
    } else {
      auditMessage = 'Team member updated';
    }

    await createAuditLog(
      req.user._id,
      user.companyId,
      'update',
      'user',
      String(targetUser._id), // Convert _id to string for type safety
      { message: auditMessage },
      req
    );

    sendSuccess(res, {
      message: 'Team member updated successfully',
      teamMember: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        teamRole: targetUser.teamRole,
        teamStatus: targetUser.teamStatus
      }
    }, 'Team member updated successfully');
  } catch (error) {
    logger.error('Error updating team member:', error);
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors[0].message);
    }
    next(error);
  }
};

/**
 * Remove a team member
 * @route DELETE /team/members/:userId
 */
export const removeTeamMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const targetUserId = req.params.userId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User not found', ErrorCode.RES_USER_NOT_FOUND);
    }

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }

    // Check if user has permission to remove team members based on role hierarchy
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      throw new AuthorizationError('You do not have permission to remove team members', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Find the target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundError('Team member not found', ErrorCode.RES_USER_NOT_FOUND);
    }

    // Check if the target user belongs to the same company
    if (!targetUser.companyId || targetUser.companyId.toString() !== user.companyId.toString()) {
      throw new AuthorizationError('Access denied to this team member', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Prevent users from removing themselves
    if (String(targetUser._id) === String(user._id)) {
      throw new ValidationError('You cannot remove yourself from the team', ErrorCode.VAL_INVALID_INPUT);
    }

    // Role hierarchy validation - users can only remove members with equal or lower roles
    if (
      // Current user is manager trying to remove an owner or admin
      (user.teamRole === 'manager' && ['owner', 'admin'].includes(targetUser.teamRole || '')) ||
      // Current user is admin trying to remove an owner
      (user.teamRole === 'admin' && targetUser.teamRole === 'owner')
    ) {
      throw new AuthorizationError('You cannot remove team members with higher privileges than your own role', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Prevent removing the last owner
    if (targetUser.teamRole === 'owner') {
      // Count how many owners the company has
      const ownersCount = await User.countDocuments({
        companyId: user.companyId,
        teamRole: 'owner',
        isDeleted: false
      });

      if (ownersCount <= 1) {
        throw new ValidationError('Cannot remove the last owner. Transfer ownership to another user first.', ErrorCode.VAL_INVALID_INPUT);
      }
    }

    // Remove the team member from the company
    targetUser.companyId = undefined;
    targetUser.teamRole = undefined;
    await targetUser.save();

    await createAuditLog(
      req.user._id,
      user.companyId,
      'delete',
      'user',
      String(targetUser._id), // Convert _id to string for type safety
      { message: `Team member ${targetUser.name} removed from company` },
      req
    );

    sendSuccess(res, {
      message: 'Team member removed successfully',
    }, 'Team member removed successfully');
  } catch (error) {
    logger.error('Error removing team member:', error);
    next(error);
  }
};

/**
 * Verify a team invitation token
 * @route GET /team/verify-invitation
 */
export const verifyInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.query.token as string;

    if (!token) {
      throw new ValidationError('Invitation token is required', ErrorCode.VAL_INVALID_INPUT);
    }

    // ✅ PHASE 1 FIX: Hash incoming token for comparison
    const hashedToken = AuthTokenService.hashToken(token);

    // Find the invitation
    const invitation = await TeamInvitation.findOne({
      token: hashedToken, // ✅ Compare with HASH
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('companyId', 'name').populate('invitedBy', 'name email');

    if (!invitation) {
      throw new NotFoundError('Invalid or expired invitation', ErrorCode.RES_NOT_FOUND);
    }

    // Return invitation details
    // Return invitation details
    sendSuccess(res, {
      valid: true,
      invitation: {
        email: invitation.email,
        teamRole: invitation.teamRole,
        company: (invitation.companyId as any).name,
        expiresAt: invitation.expiresAt,
        invitationMessage: invitation.invitationMessage,
        invitedBy: invitation.invitedBy ? {
          name: (invitation.invitedBy as any).name,
          email: (invitation.invitedBy as any).email,
        } : undefined,
      }
    }, 'Invitation verified successfully');
  } catch (error) {
    logger.error('Error verifying team invitation:', error);
    next(error);
  }
};

/**
 * Get a team member's permissions
 * @route GET /team/members/:userId/permissions
 */
export const getTeamMemberPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const targetUserId = req.params.userId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User not found', ErrorCode.RES_USER_NOT_FOUND);
    }

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }

    // Check if user has permission to view team member permissions
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      throw new AuthorizationError('You do not have permission to view team member permissions', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Find the target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundError('Team member not found', ErrorCode.RES_USER_NOT_FOUND);
    }

    // Check if the target user belongs to the same company
    if (!targetUser.companyId || targetUser.companyId.toString() !== user.companyId.toString()) {
      throw new AuthorizationError('Access denied to this team member', ErrorCode.AUTHZ_FORBIDDEN);
      return;
    }

    // Get the user's permissions
    const permissions = await getUserPermissions(targetUserId);

    sendSuccess(res, {
      userId: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      teamRole: targetUser.teamRole,
      ...permissions
    }, 'Team member permissions retrieved successfully');
  } catch (error) {
    logger.error('Error getting team member permissions:', error);
    next(error);
  }
};

/**
 * Update a team member's permissions
 * @route PATCH /team/members/:userId/permissions
 */
export const updateTeamMemberPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const targetUserId = req.params.userId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User not found', ErrorCode.RES_USER_NOT_FOUND);
    }

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }

    const actorPermissions = await PermissionService.resolve(String(user._id), user.companyId?.toString());
    const canManagePermissions = isPlatformAdmin(user) ||
      actorPermissions.includes('roles.assign') ||
      actorPermissions.includes('users.manage') ||
      actorPermissions.includes('*');

    if (!canManagePermissions) {
      throw new AuthorizationError('You do not have permission to update team member permissions', ErrorCode.AUTHZ_FORBIDDEN);
    }

    const validatedData = updatePermissionsSchema.parse(req.body);

    // Find the target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundError('Team member not found', ErrorCode.RES_USER_NOT_FOUND);
    }

    // Check if the target user belongs to the same company
    if (!targetUser.companyId || targetUser.companyId.toString() !== user.companyId.toString()) {
      throw new AuthorizationError('Access denied to this team member', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Users with elevated roles have all permissions by default, can't be modified
    if (targetUser.teamRole === 'owner' || targetUser.teamRole === 'admin' || targetUser.teamRole === 'manager') {
      throw new ValidationError(`Cannot modify permissions for users with ${targetUser.teamRole} role`, ErrorCode.VAL_INVALID_INPUT);
    }

    // Role hierarchy validation - users can only manage permissions of members with equal or lower roles
    if (
      // Current user is manager trying to modify permissions of an owner or admin
      (user.teamRole === 'manager' && ['owner', 'admin'].includes(targetUser.teamRole || ''))
    ) {
      throw new AuthorizationError('You cannot modify permissions of team members with higher privileges than your own role', ErrorCode.AUTHZ_FORBIDDEN);
    }

    const { allowed, denied } = extractPermissionList(validatedData.permissions as any);
    if (denied.length > 0) {
      throw new ValidationError(
        'RBAC V5 does not support explicit permission denials. Change the team role to restrict access instead.',
        ErrorCode.VAL_INVALID_INPUT
      );
    }

    const membership = await Membership.findOne({
      userId: targetUser._id,
      companyId: user.companyId,
      status: 'active'
    });

    if (!membership) {
      throw new NotFoundError('Active membership not found for team member', ErrorCode.RES_NOT_FOUND);
    }

    const customRoleName = `custom:${user.companyId}:${targetUser._id}`;
    let customRole = await Role.findOne({ name: customRoleName, scope: 'company' });

    if (allowed.length === 0) {
      if (customRole) {
        const customRoleId = customRole._id as mongoose.Types.ObjectId;
        membership.roles = membership.roles.filter(
          (roleId: any) => roleId.toString() !== customRoleId.toString()
        );
        await membership.save();
        await customRole.deleteOne();
      }

      await PermissionService.invalidate(String(targetUser._id), user.companyId?.toString());

      sendSuccess(res, {
        message: 'Custom permissions removed. Team member now inherits role defaults.',
        userId: targetUser._id,
        permissions: []
      }, 'Team member permissions updated successfully');
      return;
    }

    if (!customRole) {
      customRole = await Role.create({
        name: customRoleName,
        scope: 'company',
        permissions: allowed,
        isSystem: false,
        isDeprecated: false,
      });
    } else {
      customRole.permissions = allowed;
      await customRole.save();
    }

    const customRoleId = customRole._id as mongoose.Types.ObjectId;
    if (!membership.roles.some((roleId: any) => roleId.toString() === customRoleId.toString())) {
      membership.roles.push(customRoleId);
      await membership.save();
    }

    await PermissionService.invalidate(String(targetUser._id), user.companyId?.toString());

    await createAuditLog(
      req.user._id,
      user.companyId,
      'update',
      'team_permission',
      String(customRoleId),
      { message: `Team member permissions updated for ${targetUser.name}` },
      req
    );

    sendSuccess(res, {
      message: 'Team member permissions updated successfully',
      userId: targetUser._id,
      permissions: allowed
    }, 'Team member permissions updated successfully');
  } catch (error) {
    logger.error('Error updating team member permissions:', error);
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors[0].message);
    }
    next(error);
  }
};

/**
 * Get current user's permissions
 * @route GET /team/my-permissions
 */
export const getMyPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // Get the user's permissions
    const permissions = await getUserPermissions(req.user._id);

    sendSuccess(res, permissions, 'User permissions retrieved successfully');
  } catch (error) {
    logger.error('Error getting user permissions:', error);
    next(error);
  }
};

/**
 * Get team member activity
 * @route GET /team/members/:userId/activity
 */
export const getTeamMemberActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const targetUserId = req.params.userId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User not found', ErrorCode.RES_USER_NOT_FOUND);
    }

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }

    // Check if user has permission to view team member activity
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      throw new AuthorizationError('You do not have permission to view team member activity', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Find the target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundError('Team member not found', ErrorCode.RES_USER_NOT_FOUND);
    }

    // Check if the target user belongs to the same company
    if (!targetUser.companyId || targetUser.companyId.toString() !== user.companyId.toString()) {
      throw new AuthorizationError('Access denied to this team member', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const action = req.query.action as string;
    const module = req.query.module as string;

    // Get team member activity
    const result = await activityService.getTeamMemberActivity(
      targetUserId,
      user.companyId.toString(),
      {
        page,
        limit,
        startDate,
        endDate,
        action,
        module,
      }
    );

    // Track this activity
    await activityService.trackActivity(
      req.user._id,
      user.companyId.toString(),
      'view',
      'team',
      { targetUserId, action: 'view_activity' },
      req
    );

    sendSuccess(res, {
      userId: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      activities: result.activities,
      pagination: result.pagination,
    }, 'Team member activity retrieved successfully');
  } catch (error) {
    logger.error('Error getting team member activity:', error);
    next(error);
  }
};

/**
 * Get company activity
 * @route GET /team/activity
 */
export const getCompanyActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User not found', ErrorCode.RES_USER_NOT_FOUND);
    }

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
      return;
    }

    // Check if user has permission to view company activity
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      throw new AuthorizationError('You do not have permission to view company activity', ErrorCode.AUTHZ_FORBIDDEN);
    }

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const action = req.query.action as string;
    const module = req.query.module as string;
    const userId = req.query.userId as string;

    // Get company activity
    const result = await activityService.getCompanyActivity(
      user.companyId.toString(),
      {
        page,
        limit,
        startDate,
        endDate,
        action,
        module,
        userId,
      }
    );

    // Track this activity
    await activityService.trackActivity(
      req.user._id,
      user.companyId.toString(),
      'view',
      'team',
      { action: 'view_company_activity' },
      req
    );

    sendSuccess(res, {
      activities: result.activities,
      pagination: result.pagination,
    }, 'Company activity retrieved successfully');
  } catch (error) {
    logger.error('Error getting company activity:', error);
    next(error);
  }
};

/**
 * Get my activity
 * @route GET /team/my-activity
 */
export const getMyActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User not found', ErrorCode.RES_USER_NOT_FOUND);
    }

    if (!user.companyId) {
      throw new AuthenticationError('User is not associated with any company', ErrorCode.AUTH_REQUIRED);
    }

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const action = req.query.action as string;
    const module = req.query.module as string;

    // Get team member activity
    const result = await activityService.getTeamMemberActivity(
      req.user._id,
      user.companyId.toString(),
      {
        page,
        limit,
        startDate,
        endDate,
        action,
        module,
      }
    );

    // Track this activity
    await activityService.trackActivity(
      req.user._id,
      user.companyId.toString(),
      'view',
      'team',
      { action: 'view_own_activity' },
      req
    );

    sendSuccess(res, {
      activities: result.activities,
      pagination: result.pagination,
    }, 'User activity retrieved successfully');
  } catch (error) {
    logger.error('Error getting user activity:', error);
    next(error);
  }
};

export default {
  getTeamMembers: withAuth(getTeamMembers),
  getTeamInvitations: withAuth(getTeamInvitations),
  inviteTeamMember: withAuth(inviteTeamMember),
  cancelInvitation: withAuth(cancelInvitation),
  resendInvitation: withAuth(resendInvitation),
  updateTeamMember: withAuth(updateTeamMember),
  removeTeamMember: withAuth(removeTeamMember),
  verifyInvitation,
  getTeamMemberPermissions: withAuth(getTeamMemberPermissions),
  updateTeamMemberPermissions: withAuth(updateTeamMemberPermissions),
  getMyPermissions: withAuth(getMyPermissions),
  getTeamMemberActivity: withAuth(getTeamMemberActivity),
  getCompanyActivity: withAuth(getCompanyActivity),
  getMyActivity: withAuth(getMyActivity)
};
