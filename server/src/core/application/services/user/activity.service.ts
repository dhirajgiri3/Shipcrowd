import { Request } from 'express';
import { TeamActivity } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Track team member activity
 */
export const trackActivity = async (
  userId: string,
  companyId: string | undefined,
  action: 'login' | 'logout' | 'view' | 'create' | 'update' | 'delete' | 'export' | 'import' | 'other',
  module: 'orders' | 'products' | 'warehouses' | 'customers' | 'team' | 'reports' | 'settings' | 'system',
  details: Record<string, any> = {},
  req?: Request
): Promise<boolean> => {
  try {
    if (!userId || !action || !module) {
      logger.warn('Missing required parameters for activity tracking');
      return false;
    }

    // Skip activity tracking if no company is associated
    if (!companyId) {
      return false;
    }

    const activity = new TeamActivity({
      userId,
      companyId,
      action,
      module,
      details,
      ipAddress: req?.ip || undefined,
      userAgent: req?.headers['user-agent'] || undefined,
    });

    await activity.save();
    return true;
  } catch (error) {
    logger.error('Error tracking activity:', error);
    return false;
  }
};

/**
 * Get team member activity
 */
export const getTeamMemberActivity = async (
  userId: string,
  companyId: string,
  options: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    action?: string;
    module?: string;
  } = {}
): Promise<{
  activities: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}> => {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {
      userId,
      companyId,
    };

    if (options.startDate) {
      filter.createdAt = { $gte: options.startDate };
    }

    if (options.endDate) {
      filter.createdAt = { ...filter.createdAt, $lte: options.endDate };
    }

    if (options.action) {
      filter.action = options.action;
    }

    if (options.module) {
      filter.module = options.module;
    }

    // Get activities
    const activities = await TeamActivity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await TeamActivity.countDocuments(filter);

    return {
      activities,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Error getting team member activity:', error);
    return {
      activities: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
      },
    };
  }
};

/**
 * Get company activity
 */
export const getCompanyActivity = async (
  companyId: string,
  options: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    action?: string;
    module?: string;
    userId?: string;
  } = {}
): Promise<{
  activities: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}> => {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {
      companyId,
    };

    if (options.startDate) {
      filter.createdAt = { $gte: options.startDate };
    }

    if (options.endDate) {
      filter.createdAt = { ...filter.createdAt, $lte: options.endDate };
    }

    if (options.action) {
      filter.action = options.action;
    }

    if (options.module) {
      filter.module = options.module;
    }

    if (options.userId) {
      filter.userId = options.userId;
    }

    // Get activities
    const activities = await TeamActivity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');

    // Get total count
    const total = await TeamActivity.countDocuments(filter);

    return {
      activities,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Error getting company activity:', error);
    return {
      activities: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
      },
    };
  }
};

export default {
  trackActivity,
  getTeamMemberActivity,
  getCompanyActivity,
};
