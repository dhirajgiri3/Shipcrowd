import { Request, Response, NextFunction } from 'express';
import { User } from '../../../../infrastructure/database/mongoose/models';
import { AuthRequest } from './auth';
import { createAuditLog } from '../system/audit-log.middleware';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Middleware to check if user has completed KYC verification
 * Apply this middleware to endpoints that require KYC completion
 * 
 * Exemptions:
 * - Platform admins (role === 'admin')
 * - Viewers (teamRole === 'viewer') - read-only access
 * 
 * @example
 * router.post('/orders', authenticate, authorize(['seller']), checkKYC, orderController.create);
 */
export const checkKYC = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authUser = (req as AuthRequest).user;

        // Check if user is authenticated
        if (!authUser) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTHENTICATION_REQUIRED',
            });
            return;
        }

        // ✅ Platform admin exempt from KYC
        if (authUser.role === 'admin') {
            next();
            return;
        }

        // Fetch fresh user data with KYC status and company details
        const user = await User.findById(authUser._id).select('kycStatus role teamRole companyId');

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND',
            });
            return;
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

            res.status(403).json({
                success: false,
                message: 'Complete KYC verification to perform this action',
                code: 'KYC_REQUIRED',
                data: {
                    kycUrl: '/kyc',
                    kycStatus: {
                        isComplete: user.kycStatus?.isComplete || false,
                        lastUpdated: user.kycStatus?.lastUpdated,
                    },
                },
            });
            return;
        }

        // ✅ FEATURE 14: Cross-Company KYC Bypass Prevention
        // Verify that the user's KYC belongs to their current company
        // This prevents users from switching companies and bypassing KYC
        if (user.companyId) {
            const { KYC } = await import('../../../../infrastructure/database/mongoose/models/index.js');

            const kycRecord = await KYC.findOne({
                userId: user._id,
                status: 'verified',
            }).select('companyId status');

            if (kycRecord && kycRecord.companyId) {
                // Check if KYC companyId matches user's current companyId
                if (kycRecord.companyId.toString() !== user.companyId.toString()) {
                    logger.warn(`Cross-company KYC bypass attempt detected`, {
                        userId: user._id,
                        userCompanyId: user.companyId,
                        kycCompanyId: kycRecord.companyId,
                        endpoint: req.path,
                    });

                    res.status(403).json({
                        success: false,
                        message: 'Your KYC verification is associated with a different company. Please complete KYC for your current company.',
                        code: 'KYC_COMPANY_MISMATCH',
                        data: {
                            kycUrl: '/kyc',
                            requiresNewKYC: true,
                        },
                    });
                    return;
                }
            }
        }

        // KYC complete and verified for current company, proceed
        next();
    } catch (error) {
        logger.error('KYC check middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
        });
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
