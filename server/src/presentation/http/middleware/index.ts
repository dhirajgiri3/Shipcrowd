import { determineUserTier, requireAccessTier } from './auth/access-tier.middleware';
import auth, { authenticate, checkCompany, csrfProtection, loginRateLimiter } from './auth/auth';
import { requireCompany } from './auth/company';
import { checkKYC } from './auth/kyc';
import permissions, { checkPermission, getUserPermissions } from './auth/permissions';
import { requireCompleteCompany } from './auth/require-complete-company.middleware';
import { requireAccess } from './auth/unified-access';
import auditLog, { auditLogMiddleware, auditLogPlugin, createAuditLog } from './system/audit-log.middleware';

export {
auditLog,
auditLogMiddleware,
auditLogPlugin, auth,
authenticate,
checkCompany,
// New Authentication Middleware
checkKYC, checkPermission, createAuditLog, csrfProtection, determineUserTier, getUserPermissions, loginRateLimiter, permissions, requireAccess, requireAccessTier,
/**
* @deprecated Use guardChecks helper instead. Will be removed in v2.0.
* This middleware is kept for backward compatibility only.
*/
requireCompany, requireCompleteCompany
};

