import { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { User } from '../../../../infrastructure/database/mongoose/models';
import Company from '../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import { getAccessTokenFromRequest } from '../../../../shared/helpers/auth-cookies';
import { verifyAccessToken } from '../../../../shared/helpers/jwt';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';
import { csrfProtection as strictCsrfProtection } from './csrf';

import logger from '../../../../shared/logger/winston.logger';

/**
 * Middleware to verify JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from cookie first, then fallback to Authorization header/query
    let token = getAccessTokenFromRequest(req);

    if (!token) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Verify token (enforce blacklist for immediate logout/revocation)
    const payload = await verifyAccessToken(token, true);

    // Fetch full user data from database for access tier checks
    const dbUser = await User.findById(payload.userId)
      .select('_id role companyId isEmailVerified kycStatus teamRole teamStatus isSuspended suspensionReason suspendedAt suspensionExpiresAt isBanned banReason bannedAt')
      .lean();

    if (!dbUser) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    // Check if user is banned
    if (dbUser.isBanned) {
      logger.error('Access denied: User is banned', {
        userId: payload.userId,
        bannedAt: dbUser.bannedAt,
        reason: dbUser.banReason,
      });

      res.status(403).json({
        success: false,
        message: 'Your account has been permanently banned. Please contact support if you believe this is an error.',
        code: 'USER_BANNED',
        data: {
          bannedAt: dbUser.bannedAt,
          reason: dbUser.banReason,
          contactSupport: true,
        },
      });
      return;
    }

    // Check if user is suspended
    if (dbUser.isSuspended) {
      // Check if suspension has expired
      if (dbUser.suspensionExpiresAt && new Date() > dbUser.suspensionExpiresAt) {
        // Auto-unsuspend
        await User.updateOne(
          { _id: dbUser._id },
          {
            $set: {
              isSuspended: false,
              isActive: true,
            },
            $unset: {
              suspensionReason: 1,
              suspendedAt: 1,
              suspendedBy: 1,
              suspensionExpiresAt: 1,
            },
          }
        );
        logger.info('User auto-unsuspended after expiration', {
          userId: payload.userId,
        });
      } else {
        logger.warn('Access denied: User is suspended', {
          userId: payload.userId,
          suspendedAt: dbUser.suspendedAt,
          expiresAt: dbUser.suspensionExpiresAt,
          reason: dbUser.suspensionReason,
        });

        res.status(403).json({
          success: false,
          message: dbUser.suspensionExpiresAt
            ? `Your account is temporarily suspended until ${dbUser.suspensionExpiresAt.toISOString()}. ${dbUser.suspensionReason || ''}`
            : `Your account is suspended. ${dbUser.suspensionReason || 'Please contact support for assistance.'}`,
          code: 'USER_SUSPENDED',
          data: {
            suspendedAt: dbUser.suspendedAt,
            expiresAt: dbUser.suspensionExpiresAt,
            reason: dbUser.suspensionReason,
            contactSupport: true,
          },
        });
        return;
      }
    }

    // Set full user object in request for downstream middleware
    req.user = {
      _id: dbUser._id.toString(),
      role: dbUser.role,
      companyId: dbUser.companyId?.toString(),
      isEmailVerified: dbUser.isEmailVerified,
      kycStatus: dbUser.kycStatus,
      teamRole: dbUser.teamRole,
      teamStatus: dbUser.teamStatus,
    };

    // Block access if user's company is suspended
    if (dbUser.companyId) {
      const company = await Company.findById(dbUser.companyId).select('isSuspended suspendedAt suspensionReason');

      if (company?.isSuspended) {
        logger.warn('Access denied: Company is suspended', {
          userId: payload.userId,
          companyId: dbUser.companyId,
          suspendedAt: company.suspendedAt,
        });

        res.status(403).json({
          success: false,
          message: 'Your company account is suspended. Please contact support for assistance.',
          code: 'COMPANY_SUSPENDED',
          data: {
            suspendedAt: company.suspendedAt,
            contactSupport: true,
          },
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user belongs to the specified company
 */
export const checkCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Admin can access any company
  if (isPlatformAdmin(user)) {
    next();
    return;
  }

  const companyId = req.params.companyId || req.body.companyId;

  if (!companyId) {
    res.status(400).json({ message: 'Company ID is required' });
    return;
  }

  try {
    // Get the latest user data from the database
    const dbUser = await User.findById(user._id);

    if (!dbUser || !dbUser.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    if (dbUser.companyId.toString() !== companyId.toString()) {
      res.status(403).json({ message: 'Access denied to this company' });
      return;
    }

    // Update the request user object with the latest companyId
    user.companyId = dbUser.companyId.toString();

    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Rate limiter for login attempts
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' },
});

// Keep export name for backward compatibility with existing route imports,
// but delegate to the centralized Redis-backed middleware.
export const csrfProtection = strictCsrfProtection;

export default {
  authenticate,
  checkCompany,
  loginRateLimiter,
  csrfProtection,
};
