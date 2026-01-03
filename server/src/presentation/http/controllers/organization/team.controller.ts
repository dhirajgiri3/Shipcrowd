import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../../../../infrastructure/database/mongoose/models/user.model';
import Company from '../../../../infrastructure/database/mongoose/models/company.model';
import TeamInvitation from '../../../../infrastructure/database/mongoose/models/team-invitation.model';
import TeamPermission from '../../../../infrastructure/database/mongoose/models/team-permission.model';
import { AuthRequest } from '../../middleware/auth/auth';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import emailService from '../../../../core/application/services/communication/email.service';
import { getUserPermissions } from '../../middleware/auth/permissions';
import activityService from '../../../../core/application/services/user/activity.service';
import { sendSuccess, sendError, sendValidationError, sendPaginated, sendCreated, calculatePagination } from '../../../../shared/utils/responseHelper';

// Helper function to wrap controller methods that expect AuthRequest
const withAuth = (handler: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return handler(req as AuthRequest, res, next);
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

/**
 * Get all team members for a company
 * @route GET /team or GET /companies/:companyId/team
 */
export const getTeamMembers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Determine which company ID to use - from URL params or from user's record
    let companyId: mongoose.Types.ObjectId;

    // If companyId is provided in URL params, use that instead
    if (req.params.companyId) {
      // Check if user has access to this company
      if (user.role !== 'admin' && (!user.companyId || user.companyId.toString() !== req.params.companyId)) {
        res.status(403).json({ message: 'Access denied to this company' });
        return;
      }
      // Convert string ID to ObjectId
      companyId = new mongoose.Types.ObjectId(req.params.companyId);
    } else if (!user.companyId) {
      // If no companyId in params and user doesn't have a company
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
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
export const getTeamInvitations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    // Only managers can see invitations
    if (user.teamRole !== 'manager') {
      res.status(403).json({ message: 'Only managers can view team invitations' });
      return;
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

    res.json({
      invitations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching team invitations:', error);
    next(error);
  }
};

/**
 * Invite a team member
 * @route POST /team/invite or POST /companies/:companyId/team/invite
 */
export const inviteTeamMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Determine which company ID to use - from URL params or from user's record
    let companyId: mongoose.Types.ObjectId;

    // If companyId is provided in URL params, use that instead
    if (req.params.companyId) {
      // Check if user has access to this company
      if (user.role !== 'admin' && (!user.companyId || user.companyId.toString() !== req.params.companyId)) {
        res.status(403).json({ message: 'Access denied to this company' });
        return;
      }
      // Convert string ID to ObjectId
      companyId = new mongoose.Types.ObjectId(req.params.companyId);
    } else if (!user.companyId) {
      // If no companyId in params and user doesn't have a company
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    } else {
      // Use user's company ID
      companyId = user.companyId;
    }

    // Check if user has permission to invite team members based on role hierarchy
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      res.status(403).json({ message: 'You do not have permission to invite team members' });
      return;
    }

    const validatedData = inviteTeamMemberSchema.parse(req.body);

    // Role hierarchy validation - users can only invite members with equal or lower roles
    if (
      (user.teamRole === 'manager' && ['admin'].includes(validatedData.role))
    ) {
      res.status(403).json({
        message: 'You cannot invite team members with higher privileges than your own role'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      // If user exists and is already in this company
      if (existingUser.companyId && existingUser.companyId.toString() === companyId.toString()) {
        res.status(400).json({ message: 'User is already a member of this company' });
        return;
      }

      // If user exists but is in another company
      res.status(400).json({ message: 'User is already registered with another company' });
      return;
    }

    // Check if there's already a pending invitation
    const existingInvitation = await TeamInvitation.findOne({
      email: validatedData.email,
      companyId: companyId,
      status: 'pending'
    });

    if (existingInvitation) {
      res.status(400).json({ message: 'An invitation has already been sent to this email' });
      return;
    }

    // Get company details for the invitation email
    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ message: 'Company not found' });
      return;
    }

    // Create new invitation
    const invitation = new TeamInvitation({
      email: validatedData.email,
      companyId: companyId,
      invitedBy: user._id,
      teamRole: validatedData.role,
      invitationMessage: validatedData.invitationMessage,
      // Token and expiresAt are set by default in the schema
    });

    await invitation.save();

    // Send invitation email
    const emailSent = await emailService.sendTeamInvitationEmail(
      validatedData.email,
      company.name,
      validatedData.role,
      invitation.token,
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
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Cancel a team invitation
 * @route DELETE /team/invitations/:invitationId
 */
export const cancelInvitation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const invitationId = req.params.invitationId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    // Only managers can cancel invitations
    if (user.teamRole !== 'manager') {
      res.status(403).json({ message: 'Only managers can cancel team invitations' });
      return;
    }

    // Find the invitation
    const invitation = await TeamInvitation.findById(invitationId);

    if (!invitation) {
      res.status(404).json({ message: 'Invitation not found' });
      return;
    }

    // Check if the invitation belongs to the user's company
    if (invitation.companyId.toString() !== user.companyId.toString()) {
      res.status(403).json({ message: 'Access denied to this invitation' });
      return;
    }

    // Check if the invitation is still pending
    if (invitation.status !== 'pending') {
      res.status(400).json({ message: 'Only pending invitations can be cancelled' });
      return;
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

    res.json({
      message: 'Team invitation cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling team invitation:', error);
    next(error);
  }
};

/**
 * Resend a team invitation
 * @route POST /team/invitations/:invitationId/resend
 */
export const resendInvitation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const invitationId = req.params.invitationId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    // Only managers can resend invitations
    if (user.teamRole !== 'manager') {
      res.status(403).json({ message: 'Only managers can resend team invitations' });
      return;
    }

    // Find the invitation
    const invitation = await TeamInvitation.findById(invitationId);

    if (!invitation) {
      res.status(404).json({ message: 'Invitation not found' });
      return;
    }

    // Check if the invitation belongs to the user's company
    if (invitation.companyId.toString() !== user.companyId.toString()) {
      res.status(403).json({ message: 'Access denied to this invitation' });
      return;
    }

    // Check if the invitation is expired
    if (invitation.status !== 'pending' && invitation.status !== 'expired') {
      res.status(400).json({ message: 'Only pending or expired invitations can be resent' });
      return;
    }

    // Get company details for the invitation email
    const company = await Company.findById(user.companyId);
    if (!company) {
      res.status(404).json({ message: 'Company not found' });
      return;
    }

    // Update invitation with new token and expiry
    invitation.token = crypto.randomBytes(32).toString('hex');
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    invitation.status = 'pending';
    await invitation.save();

    // Send invitation email
    const emailSent = await emailService.sendTeamInvitationEmail(
      invitation.email,
      company.name,
      invitation.teamRole,
      invitation.token
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

    res.json({
      message: 'Team invitation resent successfully',
      invitation,
      emailSent
    });
  } catch (error) {
    logger.error('Error resending team invitation:', error);
    next(error);
  }
};

/**
 * Update a team member's role
 * @route PATCH /team/members/:userId
 */
export const updateTeamMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const targetUserId = req.params.userId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    // Check if user has permission to update team members based on role hierarchy
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      res.status(403).json({ message: 'You do not have permission to update team members' });
      return;
    }

    const validatedData = updateTeamMemberSchema.parse(req.body);

    // Find the target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      res.status(404).json({ message: 'Team member not found' });
      return;
    }

    // Check if the target user belongs to the same company
    if (!targetUser.companyId || targetUser.companyId.toString() !== user.companyId.toString()) {
      res.status(403).json({ message: 'Access denied to this team member' });
      return;
    }

    // Prevent users from changing their own role
    if (String(targetUser._id) === String(user._id)) {
      res.status(400).json({ message: 'You cannot change your own role' });
      return;
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
      res.status(403).json({
        message: 'You cannot modify team members with higher privileges than your own role'
      });
      return;
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
        res.status(400).json({
          message: 'Cannot change the role of the last owner. Transfer ownership to another user first.'
        });
        return;
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
        res.status(403).json({ message: 'Only owners and admins can suspend team members' });
        return;
      }

      // Prevent suspending the last owner
      if (validatedData.teamStatus === 'suspended' && targetUser.teamRole === 'owner') {
        const ownersCount = await User.countDocuments({
          companyId: user.companyId,
          teamRole: 'owner',
          isDeleted: false
        });

        if (ownersCount <= 1) {
          res.status(400).json({
            message: 'Cannot suspend the last owner. Transfer ownership to another user first.'
          });
          return;
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

    res.json({
      message: 'Team member updated successfully',
      teamMember: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        teamRole: targetUser.teamRole,
        teamStatus: targetUser.teamStatus
      }
    });
  } catch (error) {
    logger.error('Error updating team member:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Remove a team member
 * @route DELETE /team/members/:userId
 */
export const removeTeamMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const targetUserId = req.params.userId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    // Check if user has permission to remove team members based on role hierarchy
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      res.status(403).json({ message: 'You do not have permission to remove team members' });
      return;
    }

    // Find the target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      res.status(404).json({ message: 'Team member not found' });
      return;
    }

    // Check if the target user belongs to the same company
    if (!targetUser.companyId || targetUser.companyId.toString() !== user.companyId.toString()) {
      res.status(403).json({ message: 'Access denied to this team member' });
      return;
    }

    // Prevent users from removing themselves
    if (String(targetUser._id) === String(user._id)) {
      res.status(400).json({ message: 'You cannot remove yourself from the team' });
      return;
    }

    // Role hierarchy validation - users can only remove members with equal or lower roles
    if (
      // Current user is manager trying to remove an owner or admin
      (user.teamRole === 'manager' && ['owner', 'admin'].includes(targetUser.teamRole || '')) ||
      // Current user is admin trying to remove an owner
      (user.teamRole === 'admin' && targetUser.teamRole === 'owner')
    ) {
      res.status(403).json({
        message: 'You cannot remove team members with higher privileges than your own role'
      });
      return;
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
        res.status(400).json({
          message: 'Cannot remove the last owner. Transfer ownership to another user first.'
        });
        return;
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

    res.json({
      message: 'Team member removed successfully',
    });
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
      res.status(400).json({ message: 'Invitation token is required' });
      return;
    }

    // Find the invitation
    const invitation = await TeamInvitation.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('companyId', 'name').populate('invitedBy', 'name email');

    if (!invitation) {
      res.status(404).json({ message: 'Invalid or expired invitation' });
      return;
    }

    // Return invitation details
    res.json({
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
    });
  } catch (error) {
    logger.error('Error verifying team invitation:', error);
    next(error);
  }
};

/**
 * Get a team member's permissions
 * @route GET /team/members/:userId/permissions
 */
export const getTeamMemberPermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const targetUserId = req.params.userId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    // Check if user has permission to view team member permissions
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      res.status(403).json({ message: 'You do not have permission to view team member permissions' });
      return;
    }

    // Find the target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      res.status(404).json({ message: 'Team member not found' });
      return;
    }

    // Check if the target user belongs to the same company
    if (!targetUser.companyId || targetUser.companyId.toString() !== user.companyId.toString()) {
      res.status(403).json({ message: 'Access denied to this team member' });
      return;
    }

    // Get the user's permissions
    const permissions = await getUserPermissions(targetUserId);

    res.json({
      userId: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      teamRole: targetUser.teamRole,
      ...permissions
    });
  } catch (error) {
    logger.error('Error getting team member permissions:', error);
    next(error);
  }
};

/**
 * Update a team member's permissions
 * @route PATCH /team/members/:userId/permissions
 */
export const updateTeamMemberPermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const targetUserId = req.params.userId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    // Check if user has permission to update team member permissions
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      res.status(403).json({ message: 'You do not have permission to update team member permissions' });
      return;
    }

    const validatedData = updatePermissionsSchema.parse(req.body);

    // Find the target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      res.status(404).json({ message: 'Team member not found' });
      return;
    }

    // Check if the target user belongs to the same company
    if (!targetUser.companyId || targetUser.companyId.toString() !== user.companyId.toString()) {
      res.status(403).json({ message: 'Access denied to this team member' });
      return;
    }

    // Users with elevated roles have all permissions by default, can't be modified
    if (targetUser.teamRole === 'owner' || targetUser.teamRole === 'admin' || targetUser.teamRole === 'manager') {
      res.status(400).json({
        message: `Cannot modify permissions for users with ${targetUser.teamRole} role`
      });
      return;
    }

    // Role hierarchy validation - users can only manage permissions of members with equal or lower roles
    if (
      // Current user is manager trying to modify permissions of an owner or admin
      (user.teamRole === 'manager' && ['owner', 'admin'].includes(targetUser.teamRole || ''))
    ) {
      res.status(403).json({
        message: 'You cannot modify permissions of team members with higher privileges than your own role'
      });
      return;
    }

    // Find or create permissions document
    let permission = await TeamPermission.findOne({ userId: targetUser._id });

    if (!permission) {
      permission = new TeamPermission({
        userId: targetUser._id,
        companyId: targetUser.companyId,
      });
    }

    // Update permissions with the provided values
    // We need to do a deep merge to preserve existing permissions that weren't specified
    const updatePermissions = (source: any, target: any) => {
      if (!source) return;

      Object.keys(source).forEach(key => {
        if (typeof source[key] === 'object' && source[key] !== null) {
          if (!target[key]) target[key] = {};
          updatePermissions(source[key], target[key]);
        } else if (source[key] !== undefined) {
          target[key] = source[key];
        }
      });
    };

    updatePermissions(validatedData.permissions, permission.permissions);
    await permission.save();

    await createAuditLog(
      req.user._id,
      user.companyId,
      'update',
      'team_permission',
      String(permission._id), // Convert _id to string for type safety
      { message: `Team member permissions updated for ${targetUser.name}` },
      req
    );

    res.json({
      message: 'Team member permissions updated successfully',
      userId: targetUser._id,
      permissions: permission.permissions
    });
  } catch (error) {
    logger.error('Error updating team member permissions:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Get current user's permissions
 * @route GET /team/my-permissions
 */
export const getMyPermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Get the user's permissions
    const permissions = await getUserPermissions(req.user._id);

    res.json(permissions);
  } catch (error) {
    logger.error('Error getting user permissions:', error);
    next(error);
  }
};

/**
 * Get team member activity
 * @route GET /team/members/:userId/activity
 */
export const getTeamMemberActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const targetUserId = req.params.userId;

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    // Check if user has permission to view team member activity
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      res.status(403).json({ message: 'You do not have permission to view team member activity' });
      return;
    }

    // Find the target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      res.status(404).json({ message: 'Team member not found' });
      return;
    }

    // Check if the target user belongs to the same company
    if (!targetUser.companyId || targetUser.companyId.toString() !== user.companyId.toString()) {
      res.status(403).json({ message: 'Access denied to this team member' });
      return;
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

    res.json({
      userId: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      activities: result.activities,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error getting team member activity:', error);
    next(error);
  }
};

/**
 * Get company activity
 * @route GET /team/activity
 */
export const getCompanyActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    // Check if user has permission to view company activity
    if (user.teamRole !== 'owner' && user.teamRole !== 'admin' && user.teamRole !== 'manager') {
      res.status(403).json({ message: 'You do not have permission to view company activity' });
      return;
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

    res.json({
      activities: result.activities,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error getting company activity:', error);
    next(error);
  }
};

/**
 * Get my activity
 * @route GET /team/my-activity
 */
export const getMyActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Get the latest user data from the database to ensure we have the most up-to-date companyId
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
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

    res.json({
      activities: result.activities,
      pagination: result.pagination,
    });
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
  verifyInvitation,  // This one might not need auth, check implementation
  getTeamMemberPermissions: withAuth(getTeamMemberPermissions),
  updateTeamMemberPermissions: withAuth(updateTeamMemberPermissions),
  getMyPermissions: withAuth(getMyPermissions),
  getTeamMemberActivity: withAuth(getTeamMemberActivity),
  getCompanyActivity: withAuth(getCompanyActivity),
  getMyActivity: withAuth(getMyActivity)
};
