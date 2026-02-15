import { NextFunction, Request, Response } from 'express';
import { AccessTier } from '../../../../core/domain/types/access-tier';
import { KYCState } from '../../../../core/domain/types/kyc-state';

/**
 * Helper to get numeric level of tier
 */
const getTierLevel = (tier: AccessTier): number => {
    switch (tier) {
        case AccessTier.PRODUCTION: return 3;
        case AccessTier.SANDBOX: return 2;
        case AccessTier.EXPLORER: return 1;
        default: return 0;
    }
};

/**
 * Determine the current tier of a user dynamically
 * 
 * SECURITY NOTE: This checks GLOBAL KYC status. For company-specific operations,
 * always use requireAccess() middleware which validates company-specific KYC records.
 */
export const determineUserTier = (user: any): AccessTier => {
    if (!user) return AccessTier.EXPLORER;

    // Production check: KYC Verified
    // WARNING: This is a global check. Company-specific KYC is validated in requireAccess()
    if (user.kycStatus?.isComplete || user.kycStatus?.state === KYCState.VERIFIED) {
        return AccessTier.PRODUCTION;
    }

    // Sandbox check: Email Verified
    if (user.isEmailVerified) {
        return AccessTier.SANDBOX;
    }

    return AccessTier.EXPLORER;
};

/**
 * Middleware to enforce minimum access tier
 */
export const requireAccessTier = (requiredTier: AccessTier) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Authentication required'
                });
            }

            // We use the full user object from req.user (populated by passport/auth middleware)
            // But sometimes req.user might be stale or partial, so if needed fetch fresh.
            // Assuming req.user has isEmailVerified and kycStatus populated.
            // If not, we might need to fetch. 
            // Standard auth middleware usually populates these.

            const currentTier = determineUserTier(user);
            const requiredLevel = getTierLevel(requiredTier);
            const currentLevel = getTierLevel(currentTier);

            if (currentLevel < requiredLevel) {
                return res.status(403).json({
                    success: false,
                    code: 'INSUFFICIENT_ACCESS_TIER',
                    message: `This feature requires ${requiredTier} access tier.`,
                    data: {
                        currentTier,
                        requiredTier,
                        upgradeSteps: getUpgradeSteps(currentTier, requiredTier)
                    }
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

const getUpgradeSteps = (current: AccessTier, required: AccessTier) => {
    const steps = [];
    if (current === AccessTier.EXPLORER && required !== AccessTier.EXPLORER) {
        steps.push({ action: 'verify_email', url: '/verify-email', label: 'Verify Email' });
    }
    if (required === AccessTier.PRODUCTION && current !== AccessTier.PRODUCTION) {
        steps.push({ action: 'complete_kyc', url: '/companies/kyc', label: 'Complete KYC' });
    }
    return steps;
};
