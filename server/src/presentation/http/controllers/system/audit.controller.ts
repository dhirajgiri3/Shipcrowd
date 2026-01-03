import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { AuditLog } from '../../../../infrastructure/database/mongoose/models';
import { AuthRequest } from '../../middleware/auth/auth';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendError, sendValidationError, sendPaginated, calculatePagination } from '../../../../shared/utils/responseHelper';

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

export const getMyAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = getAuditLogsSchema.safeParse(req.query);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const { page, limit, startDate, endDate, action, resource } = validation.data;

    const query: any = { userId: req.user._id, isDeleted: false };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    if (action) query.action = action;
    if (resource) query.resource = resource;

    const skip = (page - 1) * limit;

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

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

    const pagination = calculatePagination(total, page, limit);
    sendPaginated(res, formattedLogs, pagination, 'Audit logs retrieved successfully');
  } catch (error) {
    logger.error('Error getting audit logs:', error);
    next(error);
  }
};

export const getCompanyAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    if (req.user.role !== 'admin') {
      sendError(res, 'Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
      return;
    }

    const validation = getAuditLogsSchema.safeParse(req.query);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const { page, limit, startDate, endDate, action, resource, resourceId, userId, search } = validation.data;

    const query: any = { companyId: req.user.companyId, isDeleted: false };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    if (action) query.action = action;
    if (resource) query.resource = resource;

    if (resourceId) {
      if (mongoose.Types.ObjectId.isValid(resourceId)) {
        query.resourceId = new mongoose.Types.ObjectId(resourceId);
      } else {
        query.resourceId = resourceId;
      }
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    if (search) {
      query.$or = [
        { 'details.message': { $regex: search, $options: 'i' } },
        { resource: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).populate('userId', 'name email').lean(),
      AuditLog.countDocuments(query),
    ]);

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

    const pagination = calculatePagination(total, page, limit);
    sendPaginated(res, formattedLogs, pagination, 'Company audit logs retrieved successfully');
  } catch (error) {
    logger.error('Error getting company audit logs:', error);
    next(error);
  }
};

export const getSecurityAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      return;
    }

    const validation = getAuditLogsSchema.safeParse(req.query);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.path.join('.'),
      }));
      sendValidationError(res, errors);
      return;
    }

    const { page, limit } = validation.data;

    const query: any = {
      userId: req.user._id,
      isDeleted: false,
      action: {
        $in: ['login', 'logout', 'password_change', 'email_change', 'account_lock', 'account_unlock', 'session_revoke', 'security']
      },
    };

    const skip = (page - 1) * limit;

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

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
        success: log.details?.success !== false,
      };
    });

    const pagination = calculatePagination(total, page, limit);
    sendPaginated(res, formattedLogs, pagination, 'Security audit logs retrieved successfully');
  } catch (error) {
    logger.error('Error getting security audit logs:', error);
    next(error);
  }
};

const auditController = {
  getMyAuditLogs,
  getCompanyAuditLogs,
  getSecurityAuditLogs,
};

export default auditController;
