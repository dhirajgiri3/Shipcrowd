/**
 * Email Change
 * 
 * Purpose: Request email change for a user
 * 
 * DEPENDENCIES:
 * - Database Models, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import crypto from 'crypto';
import { Request } from 'express';
import mongoose from 'mongoose';
import { IUser, User } from '../../../../infrastructure/database/mongoose/models';
import { createAuditLog } from '../../../../presentation/http/middleware/system/audit-log.middleware';
import logger from '../../../../shared/logger/winston.logger';
import { sendEmailChangeNotification, sendEmailChangeVerification } from '../communication/email.service';

/**
 * Request email change for a user
 * This initiates the email change process by sending a verification email to the new address
 */
export const requestEmailChange = async (
  userId: string | mongoose.Types.ObjectId,
  currentEmail: string,
  newEmail: string,
  req?: Request
): Promise<{ success: boolean; message: string; token?: string }> => {
  try {
    // Check if new email is already in use
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return {
        success: false,
        message: 'Email address is already in use',
      };
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hour expiry

    // Store pending email change information
    user.pendingEmailChange = {
      email: newEmail,
      token: verificationToken,
      tokenExpiry: verificationTokenExpiry,
    };
    await user.save();

    // Send verification email to new address
    await sendEmailChangeVerification(newEmail, user.name, verificationToken);

    // Send notification to current email
    await sendEmailChangeNotification(currentEmail, user.name, newEmail);

    // Log the action
    if (req) {
      await createAuditLog(
        userId,
        user.companyId,
        'email_change',
        'user',
        userId,
        {
          message: 'Email change requested',
          currentEmail,
          newEmail,
          success: true,
        },
        req
      );
    }

    logger.info(`Email change requested for user ${userId} from ${currentEmail} to ${newEmail}`);

    return {
      success: true,
      message: 'Verification email sent to new address',
      token: verificationToken, // Return token for testing purposes
    };
  } catch (error) {
    logger.error('Error requesting email change:', error);
    return {
      success: false,
      message: 'Failed to process email change request',
    };
  }
};

/**
 * Verify email change
 * This completes the email change process after the user verifies the new email
 */
export const verifyEmailChange = async (
  token: string,
  req?: Request
): Promise<{ success: boolean; message: string; email?: string }> => {
  try {
    // Find user with this verification token
    const user = await User.findOne({
      'pendingEmailChange.token': token,
      'pendingEmailChange.tokenExpiry': { $gt: new Date() },
    }) as IUser | null; // Explicitly type the user

    if (!user) {
      return {
        success: false,
        message: 'Invalid or expired verification token',
      };
    }

    const oldEmail = user.email;
    // Add null check for pendingEmailChange
    if (!user.pendingEmailChange) {
      return {
        success: false,
        message: 'No pending email change found',
      };
    }
    const newEmail = user.pendingEmailChange.email;

    // Update user's email
    user.email = newEmail;
    user.pendingEmailChange = undefined;
    await user.save();

    // Log the action
    if (req) {
      // Use explicit type assertion to ensure TypeScript recognizes the correct type
      const userId = String(user._id);
      const companyId = user.companyId ? String(user.companyId) : undefined;

      await createAuditLog(
        userId,
        companyId,
        'email_change',
        'user',
        userId,
        {
          message: 'Email change verified',
          oldEmail,
          newEmail,
          success: true,
        },
        req
      );
    }

    logger.info(`Email changed for user ${user._id} from ${oldEmail} to ${newEmail}`);

    return {
      success: true,
      message: 'Email address updated successfully',
      email: newEmail,
    };
  } catch (error) {
    logger.error('Error verifying email change:', error);
    return {
      success: false,
      message: 'Failed to verify email change',
    };
  }
};

/**
 * Cancel email change
 * This cancels a pending email change request
 */
export const cancelEmailChange = async (
  userId: string | mongoose.Types.ObjectId,
  req?: Request
): Promise<{ success: boolean; message: string }> => {
  try {
    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Check if there's a pending email change
    if (!user.pendingEmailChange) {
      return {
        success: false,
        message: 'No pending email change found',
      };
    }

    const newEmail = user.pendingEmailChange.email;

    // Clear pending email change
    user.pendingEmailChange = undefined;
    await user.save();

    // Log the action
    if (req) {
      await createAuditLog(
        userId,
        user.companyId,
        'email_change',
        'user',
        userId,
        {
          message: 'Email change cancelled',
          currentEmail: user.email,
          cancelledNewEmail: newEmail,
          success: true,
        },
        req
      );
    }

    logger.info(`Email change cancelled for user ${userId}`);

    return {
      success: true,
      message: 'Email change request cancelled',
    };
  } catch (error) {
    logger.error('Error cancelling email change:', error);
    return {
      success: false,
      message: 'Failed to cancel email change request',
    };
  }
};

export default {
  requestEmailChange,
  verifyEmailChange,
  cancelEmailChange,
};
