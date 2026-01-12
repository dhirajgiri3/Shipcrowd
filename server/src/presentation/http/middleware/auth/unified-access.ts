import { Request, Response, NextFunction } from 'express';
import { User, KYC } from '../../../../infrastructure/database/mongoose/models';
import { AccessTier } from '../../../../core/domain/types/access-tier';
import { determineUserTier } from './access-tier.middleware';
import logger from '../../../../shared/logger/winston.logger';
import { KYCState } from '../../../../core/domain/types/kyc-state';

type UserRole = 'admin' | 'seller' | 'staff';
type TeamRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'warehouse_manager' | 'inventory_manager' | 'picker' | 'packer';

interface AccessOptions {
    /** Allowed platform roles. Default: all authenticated users */
    roles?: UserRole[];
    /** Allowed team roles. Default: all team members */
    teamRoles?: TeamRole[];
    /** Minimum access tier required */
    tier?: AccessTier;
    /** Require KYC explicitly (alias for tier=PRODUCTION) */
    kyc?: boolean;
    /** Ensure user belongs to the company specified in params/body */
    companyMatch?: boolean;
}

/**
 * Unified Access Control Middleware
 * Consolidates Authentication, Role Check, Tier Check, KYC Check, and Company Scope
 */
export const requireAccess = (options: AccessOptions) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as any; // Cast to any to avoid strict type checks on partial User model

            // 1. Authentication Check
            if (!user) {
                res.status(401).json({
                    success: false,
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Authentication required'
                });
                return;
            }

            // 2. Platform Role Check
            if (options.roles && !options.roles.includes(user.role)) {
                res.status(403).json({
                    success: false,
                    code: 'INSUFFICIENT_ROLE',
                    message: 'Insufficient platform privileges'
                });
                return;
            }

            // 3. Access Tier Check
            if (options.tier) {
                const currentTier = determineUserTier(user);
                const getLevel = (t: AccessTier) => {
                    if (t === AccessTier.PRODUCTION) return 3;
                    if (t === AccessTier.SANDBOX) return 2;
                    return 1;
                };

                if (getLevel(currentTier) < getLevel(options.tier)) {
                    res.status(403).json({
                        success: false,
                        code: 'INSUFFICIENT_ACCESS_TIER',
                        message: `This feature requires ${options.tier} access`,
                        data: {
                            currentTier,
                            requiredTier: options.tier
                        }
                    });
                    return;
                }
            }

            // 4. KYC Check (Explicit or via Tier)
            if (options.kyc || options.tier === AccessTier.PRODUCTION) {
                // Check if user has completed KYC in general
                if (!user.kycStatus?.isComplete && user.kycStatus?.state !== KYCState.VERIFIED) {
                    res.status(403).json({
                        success: false,
                        code: 'KYC_REQUIRED',
                        message: 'KYC Verification required'
                    });
                    return;
                }

                // Cross-Company Security Check
                if (user.companyId) {
                    const kycRecord = await KYC.findOne({
                        userId: user._id,
                        companyId: user.companyId,
                        state: KYCState.VERIFIED
                    }).select('_id');

                    if (!kycRecord && user.role !== 'admin') {
                        res.status(403).json({
                            success: false,
                            code: 'KYC_REQUIRED_FOR_COMPANY',
                            message: 'Access denied. You must complete KYC for your current company.'
                        });
                        return;
                    }
                }
            }

            // 5. Team Role Check
            if (options.teamRoles && user.role !== 'admin' && !options.teamRoles.includes(user.teamRole)) {
                res.status(403).json({
                    success: false,
                    code: 'INSUFFICIENT_TEAM_ROLE',
                    message: `Insufficient team privileges. Required: ${options.teamRoles.join(', ')}`
                });
                return;
            }

            // 6. Company Scope Match
            if (options.companyMatch) {
                const resourceCompanyId = req.params.companyId || req.body.companyId || req.query.companyId;

                if (resourceCompanyId && user.companyId?.toString() !== resourceCompanyId.toString()) {
                    if (user.role !== 'admin') {
                        logger.warn(`User ${user._id} attempted data access mismatch: UserCompany ${user.companyId} vs Target ${resourceCompanyId}`);
                        res.status(403).json({
                            success: false,
                            code: 'COMPANY_MISMATCH',
                            message: 'Access denied: Company mismatch'
                        });
                        return;
                    }
                }
            }

            next();
        } catch (error) {
            logger.error('Access control error:', error);
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Internal server error during authorization'
            });
        }
    };
};
