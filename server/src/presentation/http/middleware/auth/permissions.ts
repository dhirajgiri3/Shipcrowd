import { Request, Response, NextFunction } from 'express';
import { TeamPermission } from '../../../../infrastructure/database/mongoose/models';
import { User } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';
import { PermissionService } from '../../../../core/application/services/auth/permission.service';

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

const mergePermissionMaps = (base: PermissionMap, overrides: PermissionMap): PermissionMap => {
  const merged: PermissionMap = { ...base };
  Object.keys(overrides).forEach((moduleKey) => {
    merged[moduleKey] = { ...(merged[moduleKey] || {}), ...overrides[moduleKey] };
  });
  return merged;
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
      if (permissionList.includes(`${module}:${action}`) || permissionList.includes(`${module}.${action}`) || permissionList.includes('*')) {
        next();
        return;
      }

      // For staff members, check specific permissions
      const permission = await TeamPermission.findOne({ userId: user._id });

      if (!permission) {
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
    const permissionMap = buildPermissionMap(permissionList);

    const permissionOverride = await TeamPermission.findOne({ userId });
    const permissions = permissionOverride?.permissions
      ? mergePermissionMaps(permissionMap, permissionOverride.permissions as PermissionMap)
      : permissionMap;

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
