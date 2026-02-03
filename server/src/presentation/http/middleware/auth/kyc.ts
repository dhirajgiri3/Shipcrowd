import { Request, Response, NextFunction } from 'express';
import { User, KYC } from '../../../../infrastructure/database/mongoose/models';
import { createAuditLog } from '../system/audit-log.middleware';
import logger from '../../../../shared/logger/winston.logger';
import { AuthenticationError, NotFoundError, AuthorizationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';
import { KYCState } from '../../../../core/domain/types/kyc-state';

/**
 * Middleware to check if user has completed KYC verification
 * Apply this middleware to endpoints that require KYC completion
 * 
 * Exemptions:
 * - Platform admins (role === 'admin')
 * - Viewers (teamRole === 'viewer') - read-only access
 * 
 * @example
 * router.post('/orders', authenticate, requireAccess({ roles: ['seller'], kyc: true }), orderController.create);
 */
export const checkKYC = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authUser = req.user;

        // Check if user is authenticated
        if (!authUser) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        // ✅ Platform admin exempt from KYC
        if (isPlatformAdmin(authUser)) {
            next();
            return;
        }

        // Fetch fresh user data with KYC status and company details
        const user = await User.findById(authUser._id).select('kycStatus role teamRole companyId');

        if (!user) {
            throw new NotFoundError('User', ErrorCode.RES_USER_NOT_FOUND);
        }

        // ✅ Viewer role exempt (read-only access, no KYC needed)
        if (user.teamRole === 'viewer') {
            next();
            return;
        }

        // ✅ Check KYC completion
        if (!user.kycStatus?.isComplete) {
            logger.warn(`KYC required for user ${user._id} attempting protected action`, {
                userId: user._id,
                role: user.role,
                teamRole: user.teamRole,
                endpoint: req.path,
                method: req.method,
            });

            // ✅ FEATURE 25: Audit log for KYC denial
            await createAuditLog(
                (user._id as any).toString(),
                user.companyId?.toString(),
                'security',
                'security',
                undefined,
                {
                    reason: 'kyc_required',
                    resource: req.path,
                    method: req.method,
                    message: 'Access denied - KYC not complete',
                },
                req
            );

            throw new AuthorizationError(
                'Complete KYC verification to perform this action',
                ErrorCode.AUTH_KYC_NOT_VERIFIED
            );
        }

        // ✅ FEATURE 14: Cross-Company KYC Bypass Prevention
        // Verify that the user's KYC belongs to their current company
        if (user.companyId) {
            // Stricter check: Must find a verified KYC for THIS specific company
            const kycRecord = await KYC.findOne({
                userId: user._id,
                companyId: user.companyId,
                state: KYCState.VERIFIED, // Use proper Enum state
            }).select('_id state');

            if (!kycRecord) {
                logger.warn(`KYC bypass attempt or missing KYC for company access`, {
                    userId: user._id,
                    userCompanyId: user.companyId,
                    endpoint: req.path,
                });

                throw new AuthorizationError(
                    'Access denied. You must complete KYC for your current company.',
                    ErrorCode.AUTH_KYC_NOT_VERIFIED
                );
            }
        }

        // KYC complete and verified for current company, proceed
        next();
    } catch (error) {
        logger.error('KYC check middleware error:', error);
        // Pass error to global error handler
        next(error);
    }
};

/**
 * List of endpoints that require KYC verification
 * Use this as a reference when applying the checkKYC middleware
 */
export const KYC_REQUIRED_ROUTES = [
    // Orders
    'POST /api/v1/orders',
    'POST /api/v1/orders/bulk',
    'PUT /api/v1/orders/:id',
    'DELETE /api/v1/orders/:id',

    // Shipments
    'POST /api/v1/shipments',
    'POST /api/v1/shipments/bulk',
    'PUT /api/v1/shipments/:id',

    // Financial
    'POST /api/v1/wallet/withdraw',
    'POST /api/v1/payouts',
    'PUT /api/v1/companies/:id/bank',

    // Warehouse
    'POST /api/v1/warehouses',
    'PUT /api/v1/warehouses/:id',
    'DELETE /api/v1/warehouses/:id',

    // Products
    'POST /api/v1/products',
    'PUT /api/v1/products/:id',
    'DELETE /api/v1/products/:id',

    // Integrations (sensitive)
    'POST /api/v1/integrations',
    'PUT /api/v1/integrations/:id',
];

export default checkKYC;
