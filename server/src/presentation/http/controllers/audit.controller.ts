import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import AuditLog from '../../../infrastructure/database/mongoose/models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import logger from '../../../shared/logger/winston.logger';

// Define validation schemas
const getAuditLogsSchema = z.object({
  page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)),
  startDate: z.string().optional().transform(val => (val ? new Date(val) : undefined)),
  endDate: z.string().optional().transform(val => (val ? new Date(val) : undefined)),
  action: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
});

/**
 * Get audit logs for the current user
 * @route GET /audit/me
 */
export const getMyAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user exists
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = getAuditLogsSchema.parse(req.query);
    const { page, limit, startDate, endDate, action, resource } = validatedData;

    // Build query
    const query: any = {
      userId: req.user._id,
      isDeleted: false,
    };

    // Add date range if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    // Add action filter if provided
    if (action) query.action = action;

    // Add resource filter if provided
    if (resource) query.resource = resource;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await AuditLog.countDocuments(query);

    // Get audit logs
    const auditLogs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format response
    const formattedLogs = auditLogs.map(log => ({
      id: log._id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.timestamp,
    }));

    res.json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error getting audit logs:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Get audit logs for a company (admin only)
 * @route GET /audit/company
 */
export const getCompanyAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user exists
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Check if user is admin or has appropriate permissions
    // Note: teamRole is not in the type definition, so we need to check it differently
    const isAdmin = req.user.role === 'admin';

    // Get user from database to check team role if needed
    if (!isAdmin) {
      // Since teamRole is not in the type definition, we'll just check for admin role
      res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      return;
    }

    const validatedData = getAuditLogsSchema.parse(req.query);
    const { page, limit, startDate, endDate, action, resource, resourceId, userId, search } = validatedData;

    // Build query
    const query: any = {
      companyId: req.user.companyId,
      isDeleted: false,
    };

    // Add date range if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    // Add action filter if provided
    if (action) query.action = action;

    // Add resource filter if provided
    if (resource) query.resource = resource;

    // Add resourceId filter if provided
    if (resourceId) {
      if (mongoose.Types.ObjectId.isValid(resourceId)) {
        query.resourceId = new mongoose.Types.ObjectId(resourceId);
      } else {
        query.resourceId = resourceId;
      }
    }

    // Add userId filter if provided
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        { 'details.message': { $regex: search, $options: 'i' } },
        { resource: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await AuditLog.countDocuments(query);

    // Get audit logs with user information
    const auditLogs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .lean();

    // Format response
    const formattedLogs = auditLogs.map(log => ({
      id: log._id,
      user: log.userId,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.timestamp,
    }));

    res.json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error getting company audit logs:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

/**
 * Get security audit logs for a user
 * @route GET /audit/security
 */
export const getSecurityAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user exists
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validatedData = getAuditLogsSchema.parse(req.query);
    const { page, limit } = validatedData;

    // Build query for security-related events
    const query: any = {
      userId: req.user._id,
      isDeleted: false,
      action: {
        $in: [
          'login', 'logout', 'password_change', 'email_change',
          'account_lock', 'account_unlock', 'session_revoke', 'security'
        ]
      },
    };

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await AuditLog.countDocuments(query);

    // Get security audit logs
    const auditLogs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format response with user-friendly messages
    const formattedLogs = auditLogs.map(log => {
      let actionDescription = '';
      switch (log.action) {
        case 'login': actionDescription = 'Logged in'; break;
        case 'logout': actionDescription = 'Logged out'; break;
        case 'password_change': actionDescription = 'Changed password'; break;
        case 'email_change': actionDescription = 'Changed email address'; break;
        case 'account_lock': actionDescription = 'Account locked'; break;
        case 'account_unlock': actionDescription = 'Account unlocked'; break;
        case 'session_revoke': actionDescription = 'Session terminated'; break;
        case 'security': actionDescription = 'Security event'; break;
        default: actionDescription = log.action;
      }

      return {
        id: log._id,
        action: log.action,
        actionDescription,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        success: log.details?.success !== false, // Default to true if not explicitly false
      };
    });

    res.json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error getting security audit logs:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    next(error);
  }
};

const auditController = {
  getMyAuditLogs,
  getCompanyAuditLogs,
  getSecurityAuditLogs,
};

export default auditController;
