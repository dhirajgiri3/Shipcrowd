import mongoose from 'mongoose';
import crypto from 'crypto';
import { User, IUser } from '../../../../infrastructure/database/mongoose/models';
import { Session } from '../../../../infrastructure/database/mongoose/models';
import { createAuditLog } from '../../../../presentation/http/middleware/system/audit-log.middleware';
import { Request } from 'express';
import logger from '../../../../shared/logger/winston.logger';
import { NotFoundError, DatabaseError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

/**
 * Deactivate a user account
 * This temporarily disables the account but keeps all data intact
 */
export const deactivateAccount = async (
  userId: string | mongoose.Types.ObjectId,
  reason: string,
  req?: Request
): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`Account deactivation failed: User ${userId} not found`);
      return false;
    }

    // Update user status
    user.isActive = false;
    user.deactivationReason = reason;
    await user.save();

    // Revoke all active sessions
    await Session.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true }
    );

    // Log the action
    if (req) {
      await createAuditLog(
        userId,
        user.companyId,
        'other',
        'user',
        userId,
        {
          message: 'Account deactivated',
          reason,
          success: true,
        },
        req
      );
    }

    logger.info(`Account deactivated: User ${userId}`);
    return true;
  } catch (error) {
    logger.error('Error deactivating account:', error);
    return false;
  }
};

/**
 * Reactivate a user account
 * This restores a previously deactivated account
 */
export const reactivateAccount = async (
  userId: string | mongoose.Types.ObjectId,
  req?: Request
): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`Account reactivation failed: User ${userId} not found`);
      return false;
    }

    // Check if account is deleted
    if (user.isDeleted) {
      logger.error(`Account reactivation failed: User ${userId} is deleted`);
      return false;
    }

    // Update user status
    user.isActive = true;
    user.deactivationReason = undefined;
    await user.save();

    // Log the action
    if (req) {
      await createAuditLog(
        userId,
        user.companyId,
        'other',
        'user',
        userId,
        {
          message: 'Account reactivated',
          success: true,
        },
        req
      );
    }

    logger.info(`Account reactivated: User ${userId}`);
    return true;
  } catch (error) {
    logger.error('Error reactivating account:', error);
    return false;
  }
};

/**
 * Schedule account deletion
 * This marks the account for deletion after a grace period (30 days by default)
 */
export const scheduleAccountDeletion = async (
  userId: string | mongoose.Types.ObjectId,
  reason: string,
  gracePeriodDays: number = 30,
  req?: Request
): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`Account deletion scheduling failed: User ${userId} not found`);
      return false;
    }

    // Calculate scheduled deletion date
    const scheduledDeletionDate = new Date();
    scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + gracePeriodDays);

    // Update user status
    user.isActive = false;
    user.deletionReason = reason;
    user.scheduledDeletionDate = scheduledDeletionDate;
    await user.save();

    // Revoke all active sessions
    await Session.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true }
    );

    // Log the action
    if (req) {
      await createAuditLog(
        userId,
        user.companyId,
        'other',
        'user',
        userId,
        {
          message: 'Account deletion scheduled',
          reason,
          scheduledDeletionDate,
          gracePeriodDays,
          success: true,
        },
        req
      );
    }

    logger.info(`Account deletion scheduled: User ${userId} for ${scheduledDeletionDate}`);
    return true;
  } catch (error) {
    logger.error('Error scheduling account deletion:', error);
    return false;
  }
};

/**
 * Cancel scheduled account deletion
 * This cancels a previously scheduled deletion and reactivates the account
 */
export const cancelScheduledDeletion = async (
  userId: string | mongoose.Types.ObjectId,
  req?: Request
): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`Cancellation of scheduled deletion failed: User ${userId} not found`);
      return false;
    }

    // Check if deletion is scheduled
    if (!user.scheduledDeletionDate) {
      logger.error(`Cancellation of scheduled deletion failed: User ${userId} has no scheduled deletion`);
      return false;
    }

    // Update user status
    user.isActive = true;
    user.deletionReason = undefined;
    user.scheduledDeletionDate = undefined;
    await user.save();

    // Log the action
    if (req) {
      await createAuditLog(
        userId,
        user.companyId,
        'other',
        'user',
        userId,
        {
          message: 'Scheduled account deletion cancelled',
          success: true,
        },
        req
      );
    }

    logger.info(`Scheduled account deletion cancelled: User ${userId}`);
    return true;
  } catch (error) {
    logger.error('Error cancelling scheduled account deletion:', error);
    return false;
  }
};

/**
 * Permanently delete or anonymize a user account
 * This either completely removes the account or anonymizes personal data
 */
export const permanentlyDeleteAccount = async (
  userId: string | mongoose.Types.ObjectId,
  anonymize: boolean = true,
  req?: Request
): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`Permanent account deletion failed: User ${userId} not found`);
      return false;
    }

    if (anonymize) {
      // Anonymize user data instead of deleting
      const anonymizedEmail = `deleted-${Date.now()}-${user._id}@anonymized.com`;
      const anonymizedName = `Deleted User ${user._id instanceof mongoose.Types.ObjectId ? user._id.toString() : String(user._id).substring(0, 8)}`;

      user.email = anonymizedEmail;
      user.name = anonymizedName;
      user.password = crypto.randomBytes(16).toString('hex'); // Random password
      user.profile = {
        phone: undefined,
        avatar: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
        postalCode: undefined,
      };
      user.oauth = {};
      user.isActive = false;
      user.isDeleted = true;
      user.anonymized = true;
      await user.save();

      // Log the action
      if (req) {
        await createAuditLog(
          userId,
          user.companyId,
          'delete',
          'user',
          userId,
          {
            message: 'Account anonymized',
            success: true,
          },
          req
        );
      }

      logger.info(`Account anonymized: User ${userId}`);
    } else {
      // Hard delete the user
      await User.deleteOne({ _id: userId });

      // Log the action (to a separate system since the user is gone)
      logger.info(`Account permanently deleted: User ${userId}`);
    }

    // Delete all sessions
    await Session.deleteMany({ userId });

    return true;
  } catch (error) {
    logger.error('Error permanently deleting account:', error);
    return false;
  }
};

export default {
  deactivateAccount,
  reactivateAccount,
  scheduleAccountDeletion,
  cancelScheduledDeletion,
  permanentlyDeleteAccount,
};
