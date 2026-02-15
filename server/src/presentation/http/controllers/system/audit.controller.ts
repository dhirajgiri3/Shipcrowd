import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Parser } from 'json2csv';
import { AuditLog } from '../../../../infrastructure/database/mongoose/models';
import { AuthenticationError, AuthorizationError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import { parseQueryDateRange } from '../../../../shared/utils/dateRange';
import { calculatePagination, sendPaginated } from '../../../../shared/utils/responseHelper';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';

const getAuditLogsSchema = z.object({
  page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
});

const exportAuditLogsSchema = z.object({
  format: z.enum(['csv']).default('csv'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  filters: z.object({
    action: z.string().optional(),
    entity: z.string().optional(),
    resource: z.string().optional(),
    search: z.string().optional(),
  }).optional(),
});

export const getMyAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const validation = getAuditLogsSchema.safeParse(req.query);
    if (!validation.success) {
      const details = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    const { page, limit, startDate, endDate, action, resource } = validation.data;
    const parsedDateRange = parseQueryDateRange(startDate, endDate);

    const query: any = { userId: req.user._id, isDeleted: false };

    if (parsedDateRange.startDate || parsedDateRange.endDate) {
      query.timestamp = {};
      if (parsedDateRange.startDate) query.timestamp.$gte = parsedDateRange.startDate;
      if (parsedDateRange.endDate) query.timestamp.$lte = parsedDateRange.endDate;
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

export const getCompanyAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);
    if (!isPlatformAdmin(req.user!)) {
      throw new AuthorizationError('Insufficient permissions', ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS);
    }
    requireCompanyContext(auth);

    const validation = getAuditLogsSchema.safeParse(req.query);
    if (!validation.success) {
      const details = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    const { page, limit, startDate, endDate, action, resource, resourceId, userId, search } = validation.data;
    const parsedDateRange = parseQueryDateRange(startDate, endDate);

    const query: any = { companyId: auth.companyId, isDeleted: false };

    if (parsedDateRange.startDate || parsedDateRange.endDate) {
      query.timestamp = {};
      if (parsedDateRange.startDate) query.timestamp.$gte = parsedDateRange.startDate;
      if (parsedDateRange.endDate) query.timestamp.$lte = parsedDateRange.endDate;
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

export const getSecurityAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
    }

    const validation = getAuditLogsSchema.safeParse(req.query);
    if (!validation.success) {
      const details = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
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

export const exportCompanyAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const validation = exportAuditLogsSchema.safeParse(req.body);
    if (!validation.success) {
      const details = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    const parsedDateRange = parseQueryDateRange(validation.data.startDate, validation.data.endDate);
    const query: any = { companyId: auth.companyId, isDeleted: false };

    const action = validation.data.filters?.action;
    const resource = validation.data.filters?.resource || validation.data.filters?.entity;
    const search = validation.data.filters?.search;

    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (parsedDateRange.startDate || parsedDateRange.endDate) {
      query.timestamp = {};
      if (parsedDateRange.startDate) query.timestamp.$gte = parsedDateRange.startDate;
      if (parsedDateRange.endDate) query.timestamp.$lte = parsedDateRange.endDate;
    }
    if (search) {
      query.$or = [
        { resource: { $regex: search, $options: 'i' } },
        { 'details.message': { $regex: search, $options: 'i' } },
      ];
    }

    const rows = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(500000)
      .populate('userId', 'name email')
      .lean();

    const csvRows = rows.map((log: any) => ({
      audit_log_id: String(log._id),
      timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : '',
      user_id: log.userId?._id ? String(log.userId._id) : String(log.userId || ''),
      user_name: log.userId?.name || '',
      user_email: log.userId?.email || '',
      action: log.action || '',
      resource: log.resource || '',
      resource_id: log.resourceId ? String(log.resourceId) : '',
      ip_address: log.ipAddress || '',
      user_agent: log.userAgent || '',
      message: log.details?.message || '',
    }));

    const parser = new Parser({ fields: csvRows.length > 0 ? Object.keys(csvRows[0]) : [] });
    const csv = csvRows.length > 0 ? parser.parse(csvRows) : '';
    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting audit logs:', error);
    next(error);
  }
};

const auditController = {
  getMyAuditLogs,
  getCompanyAuditLogs,
  getSecurityAuditLogs,
  exportCompanyAuditLogs,
};

export default auditController;
