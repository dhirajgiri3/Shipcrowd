import auditLog, { auditLogMiddleware, auditLogPlugin, createAuditLog } from './system/audit-log.middleware';
import auth, { authenticate, authorize, checkCompany, loginRateLimiter, csrfProtection } from './auth/auth';
import permissions, { checkPermission, getUserPermissions } from './auth/permissions';
import { requireCompany } from './auth/company';

export {
  auditLog,
  auditLogMiddleware,
  auditLogPlugin,
  createAuditLog,
  auth,
  authenticate,
  authorize,
  checkCompany,
  /**
   * @deprecated Use guardChecks helper instead. Will be removed in v2.0.
   * This middleware is kept for backward compatibility only.
   */
  requireCompany,
  loginRateLimiter,
  csrfProtection,
  permissions,
  checkPermission,
  getUserPermissions,
  // New Authentication Middleware
  checkKYC,
  requireAccessTier,
  determineUserTier,
  requireAccess
};

import { checkKYC } from './auth/kyc';
import { requireAccessTier, determineUserTier } from './auth/access-tier.middleware';
import { requireAccess } from './auth/unified-access';
