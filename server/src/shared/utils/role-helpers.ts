/**
 * Role Helpers
 * 
 * Purpose: Utility functions for checking user roles and permissions
 * This provides clear, consistent role checking across the codebase.
 * 
 * USAGE:
 * import { isPlatformAdmin, isCompanyAdmin, canManageUser } from '@/shared/utils/role-helpers';
 */

import { IUser } from '../../infrastructure/database/mongoose/models';

// Role hierarchy levels for comparison
const TEAM_ROLE_HIERARCHY: Record<string, number> = {
    owner: 4,
    admin: 3,
    manager: 2,
    warehouse_manager: 2,
    member: 1,
    inventory_manager: 1,
    picker: 1,
    packer: 1,
    viewer: 0,
};

/**
 * Check if user is a platform-level admin (Shipcrowd staff)
 * Platform admins have access to all companies and admin features
 */
export const isPlatformAdmin = (user: IUser | { role?: string }): boolean => {
    return user.role === 'admin' || user.role === 'super_admin';
};

/**
 * Check if user is a company-level admin (owner or admin team role)
 * Company admins can manage team members and company settings
 */
export const isCompanyAdmin = (user: IUser | { teamRole?: string }): boolean => {
    return user.teamRole === 'admin' || user.teamRole === 'owner';
};

/**
 * Check if user is a company owner
 * Owners have the highest level of access within a company
 */
export const isCompanyOwner = (user: IUser | { teamRole?: string }): boolean => {
    return user.teamRole === 'owner';
};

/**
 * Check if user is a company manager or higher
 * Managers can assign tasks and manage basic team operations
 */
export const isCompanyManager = (user: IUser | { teamRole?: string }): boolean => {
    return user.teamRole === 'manager' || isCompanyAdmin(user);
};

/**
 * Check if manager can manage (modify/remove) target user
 * Based on role hierarchy: owner > admin > manager > member > viewer
 */
export const canManageUser = (
    manager: IUser | { teamRole?: string },
    target: IUser | { teamRole?: string }
): boolean => {
    const managerLevel = TEAM_ROLE_HIERARCHY[manager.teamRole || 'viewer'] || 0;
    const targetLevel = TEAM_ROLE_HIERARCHY[target.teamRole || 'viewer'] || 0;
    return managerLevel > targetLevel;
};

/**
 * Check if user can assign a specific role to another user
 * Users can only assign roles lower than their own
 */
export const canAssignRole = (
    user: IUser | { teamRole?: string },
    roleToAssign: string
): boolean => {
    const userLevel = TEAM_ROLE_HIERARCHY[user.teamRole || 'viewer'] || 0;
    const roleLevel = TEAM_ROLE_HIERARCHY[roleToAssign] || 0;
    return userLevel > roleLevel;
};

/**
 * Check if user has a specific permission
 * Platform admins have all permissions by default
 */
export const hasPermission = (
    user: { role?: string; permissions?: string[] },
    permission: string
): boolean => {
    if (isPlatformAdmin(user)) return true;
    return user.permissions?.includes(permission) || false;
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (
    user: { role?: string; permissions?: string[] },
    permissions: string[]
): boolean => {
    if (isPlatformAdmin(user)) return true;
    return permissions.some(p => user.permissions?.includes(p));
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (
    user: { role?: string; permissions?: string[] },
    permissions: string[]
): boolean => {
    if (isPlatformAdmin(user)) return true;
    return permissions.every(p => user.permissions?.includes(p));
};

/**
 * Get the numeric level for a team role
 * Useful for comparisons
 */
export const getTeamRoleLevel = (teamRole?: string): number => {
    return TEAM_ROLE_HIERARCHY[teamRole || 'viewer'] || 0;
};

/**
 * Check if user belongs to a specific company
 */
export const belongsToCompany = (
    user: IUser | { companyId?: string | { toString(): string } },
    companyId: string
): boolean => {
    if (!user.companyId) return false;
    const userCompanyId = typeof user.companyId === 'string'
        ? user.companyId
        : user.companyId.toString();
    return userCompanyId === companyId;
};

/**
 * Check if user can access another company's resources
 * Only platform admins can access other companies
 */
export const canAccessCompany = (
    user: IUser | { role?: string; companyId?: string | { toString(): string } },
    targetCompanyId: string
): boolean => {
    if (isPlatformAdmin(user)) return true;
    return belongsToCompany(user, targetCompanyId);
};

export default {
    isPlatformAdmin,
    isCompanyAdmin,
    isCompanyOwner,
    isCompanyManager,
    canManageUser,
    canAssignRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getTeamRoleLevel,
    belongsToCompany,
    canAccessCompany,
    TEAM_ROLE_HIERARCHY,
};
