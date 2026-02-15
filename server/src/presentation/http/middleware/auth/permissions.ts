import { NextFunction, Request, Response } from 'express';
import { PermissionService } from '../../../../core/application/services/auth/permission.service';
import { User } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';

type PermissionMap = Record<string, Record<string, boolean>>;

const addPermission = (permissions: PermissionMap, module: string, action: string) => {
  if (!permissions[module]) {
    permissions[module] = {};
  }
  permissions[module][action] = true;
};

const buildPermissionMap = (permissionList: string[]): PermissionMap => {
  const permissions: PermissionMap = {};

  for (const perm of permissionList) {
    if (perm === '*') {
      addPermission(permissions, '*', '*');
      continue;
    }

    const hasColon = perm.includes(':');
    const hasDot = perm.includes('.');
    const separator = hasColon ? ':' : hasDot ? '.' : null;
    if (!separator) {
      continue;
    }

    const [module, action] = perm.split(separator);
    if (!module || !action) continue;
    addPermission(permissions, module, action);
  }

  return permissions;
};

/**
 * Check if the user has the required permission
 * @param module The module to check permission for (e.g., 'orders', 'products')
 * @param action The action to check permission for (e.g., 'view', 'create', 'update', 'delete')
 */
export const checkPermission = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // Admin users have all permissions
      if (isPlatformAdmin(authUser)) {
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

      // RBAC V5 permissions (Role + Membership)
      const permissionList = await PermissionService.resolve(String(user._id), user.companyId?.toString());
      if (
        permissionList.includes(`${module}:${action}`) ||
        permissionList.includes(`${module}.${action}`) ||
        permissionList.includes('*')
      ) {
        next();
        return;
      }
      res.status(403).json({ message: 'Insufficient permissions' });
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
    if (isPlatformAdmin(user)) {
      return {
        isAdmin: true,
        isManager: false,
        permissionList: ['*'],
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

    const permissionList = await PermissionService.resolve(userId, user.companyId?.toString());
    const permissions = buildPermissionMap(permissionList);

    return {
      isAdmin: false,
      isOwner: user.teamRole === 'owner',
      isManager: user.teamRole === 'manager',
      permissionList,
      permissions,
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
