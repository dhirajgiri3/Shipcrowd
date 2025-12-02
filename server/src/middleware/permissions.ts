import { Request, Response, NextFunction } from 'express';
import TeamPermission from '../models/TeamPermission';
import User from '../models/User';
import { AuthRequest } from './auth';
import logger from '../utils/logger';

/**
 * Check if the user has the required permission
 * @param module The module to check permission for (e.g., 'orders', 'products')
 * @param action The action to check permission for (e.g., 'view', 'create', 'update', 'delete')
 */
export const checkPermission = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = (req as AuthRequest).user;
      if (!authUser) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // Admin users have all permissions
      if (authUser.role === 'admin') {
        next();
        return;
      }

      // Get the latest user data from the database
      const user = await User.findById(authUser._id);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      if (!user.companyId) {
        res.status(403).json({ message: 'User is not associated with any company' });
        return;
      }

      // Company owners, admins, and managers have elevated permissions
      if (user.teamRole === 'owner' || user.teamRole === 'admin' || user.teamRole === 'manager') {
        // For critical operations, ensure proper role hierarchy
        if ((module === 'team' && (action === 'remove' || action === 'manage_roles' || action === 'manage_permissions')) &&
            user.teamRole !== 'owner' && user.teamRole !== 'admin') {
          // Only owners and admins can manage roles and remove team members
          res.status(403).json({ message: 'This action requires owner or admin privileges' });
          return;
        }

        next();
        return;
      }

      // For staff members, check specific permissions
      const permission = await TeamPermission.findOne({ userId: user._id });

      if (!permission) {
        // If no specific permissions are set, deny access
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      // Check if the user has the required permission
      const hasPermission = permission.permissions[module as keyof typeof permission.permissions]?.[action as keyof typeof permission.permissions[keyof typeof permission.permissions]];

      if (!hasPermission) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (error) {
      logger.error('Error checking permission:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

/**
 * Get user permissions
 */
export const getUserPermissions = async (userId: string): Promise<any> => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      return null;
    }

    // Admin users have all permissions
    if (user.role === 'admin') {
      return {
        isAdmin: true,
        isManager: false,
        permissions: {
          orders: { view: true, create: true, update: true, delete: true },
          products: { view: true, create: true, update: true, delete: true },
          warehouses: { view: true, create: true, update: true, delete: true },
          customers: { view: true, create: true, update: true, delete: true },
          team: { view: true, invite: true, update: true, remove: true },
          reports: { view: true, export: true },
          settings: { view: true, update: true },
        },
      };
    }

    // Role-based permissions
    if (user.teamRole) {
      const isOwner = user.teamRole === 'owner';
      const isAdmin = user.teamRole === 'admin';
      const isManager = user.teamRole === 'manager';

      // Base permissions for all roles
      const basePermissions = {
        orders: { view: true, create: false, update: false, delete: false },
        products: { view: true, create: false, update: false, delete: false },
        warehouses: { view: true, create: false, update: false, delete: false },
        customers: { view: true, create: false, update: false, delete: false },
        team: { view: true, invite: false, update: false, remove: false, manage_roles: false, manage_permissions: false },
        reports: { view: true, export: false },
        settings: { view: false, update: false },
      };

      // Owner permissions (full access)
      if (isOwner) {
        return {
          isAdmin: false,
          isOwner: true,
          isManager: false,
          permissions: {
            orders: { view: true, create: true, update: true, delete: true },
            products: { view: true, create: true, update: true, delete: true },
            warehouses: { view: true, create: true, update: true, delete: true },
            customers: { view: true, create: true, update: true, delete: true },
            team: { view: true, invite: true, update: true, remove: true, manage_roles: true, manage_permissions: true },
            reports: { view: true, export: true },
            settings: { view: true, update: true },
          },
        };
      }

      // Admin permissions (almost full access)
      if (isAdmin) {
        return {
          isAdmin: false,
          isOwner: false,
          isManager: false,
          isCompanyAdmin: true,
          permissions: {
            orders: { view: true, create: true, update: true, delete: true },
            products: { view: true, create: true, update: true, delete: true },
            warehouses: { view: true, create: true, update: true, delete: true },
            customers: { view: true, create: true, update: true, delete: true },
            team: { view: true, invite: true, update: true, remove: true, manage_roles: true, manage_permissions: true },
            reports: { view: true, export: true },
            settings: { view: true, update: true },
          },
        };
      }

      // Manager permissions
      if (isManager) {
        return {
          isAdmin: false,
          isOwner: false,
          isManager: true,
          permissions: {
            orders: { view: true, create: true, update: true, delete: true },
            products: { view: true, create: true, update: true, delete: true },
            warehouses: { view: true, create: true, update: true, delete: true },
            customers: { view: true, create: true, update: true, delete: true },
            team: { view: true, invite: true, update: true, remove: false, manage_roles: false, manage_permissions: false },
            reports: { view: true, export: true },
            settings: { view: true, update: true },
          },
        };
      }

      // Member permissions (standard team member)
      if (user.teamRole === 'member') {
        return {
          isAdmin: false,
          isOwner: false,
          isManager: false,
          permissions: {
            orders: { view: true, create: true, update: true, delete: false },
            products: { view: true, create: true, update: true, delete: false },
            warehouses: { view: true, create: false, update: false, delete: false },
            customers: { view: true, create: true, update: true, delete: false },
            team: { view: true, invite: false, update: false, remove: false, manage_roles: false, manage_permissions: false },
            reports: { view: true, export: false },
            settings: { view: false, update: false },
          },
        };
      }

      // Viewer permissions (read-only)
      if (user.teamRole === 'viewer') {
        return {
          isAdmin: false,
          isOwner: false,
          isManager: false,
          permissions: {
            orders: { view: true, create: false, update: false, delete: false },
            products: { view: true, create: false, update: false, delete: false },
            warehouses: { view: true, create: false, update: false, delete: false },
            customers: { view: true, create: false, update: false, delete: false },
            team: { view: true, invite: false, update: false, remove: false, manage_roles: false, manage_permissions: false },
            reports: { view: true, export: false },
            settings: { view: false, update: false },
          },
        };
      }
    }

    // For staff members, get specific permissions
    const permission = await TeamPermission.findOne({ userId });

    if (!permission) {
      // Default permissions for staff members
      return {
        isAdmin: false,
        isManager: false,
        permissions: {
          orders: { view: true, create: false, update: false, delete: false },
          products: { view: true, create: false, update: false, delete: false },
          warehouses: { view: true, create: false, update: false, delete: false },
          customers: { view: true, create: false, update: false, delete: false },
          team: { view: false, invite: false, update: false, remove: false },
          reports: { view: true, export: false },
          settings: { view: false, update: false },
        },
      };
    }

    return {
      isAdmin: false,
      isManager: false,
      permissions: permission.permissions,
    };
  } catch (error) {
    logger.error('Error getting user permissions:', error);
    return null;
  }
};

export default {
  checkPermission,
  getUserPermissions,
};
