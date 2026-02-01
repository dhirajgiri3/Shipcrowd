import { Request, Response, NextFunction } from 'express';
import FeatureFlagService, { EvaluationContext } from '../../../../core/application/services/system/feature-flag.service';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Feature Flag Middleware
 * Checks if a feature is enabled before allowing access to route
 */

/**
 * Middleware to require a feature flag to be enabled
 */
export const requireFeatureFlag = (flagKey: string, options?: {
    defaultValue?: any;
    redirectOnDisabled?: string;
    messageOnDisabled?: string;
}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Build evaluation context from request
            const context: EvaluationContext = {
                userId: req.user?._id,
                companyId: req.user?.companyId,
                role: req.user?.role,
                email: (req.user as any)?.email,
                environment: (process.env.NODE_ENV as any) || 'development',
            };

            // Evaluate feature flag
            const isEnabled = await FeatureFlagService.evaluate(
                flagKey,
                context,
                options?.defaultValue || false
            );

            if (!isEnabled) {
                logger.warn(`Feature flag check failed: ${flagKey}`, {
                    userId: req.user?._id,
                    path: req.path,
                });

                // Handle disabled feature
                if (options?.redirectOnDisabled) {
                    res.redirect(options.redirectOnDisabled);
                    return;
                }

                res.status(403).json({
                    success: false,
                    code: 'FEATURE_DISABLED',
                    message: options?.messageOnDisabled || 'This feature is currently unavailable',
                });
                return;
            }

            // Feature enabled, attach to request for downstream use
            (req as any).featureFlags = (req as any).featureFlags || {};
            (req as any).featureFlags[flagKey] = isEnabled;

            next();
        } catch (error) {
            logger.error(`Error checking feature flag ${flagKey}:`, error);
            // Fail open in case of errors (security vs availability trade-off)
            next();
        }
    };
};

/**
 * Middleware to evaluate multiple feature flags and attach to request
 */
export const loadFeatureFlags = (flagKeys: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Build evaluation context
            const context: EvaluationContext = {
                userId: req.user?._id,
                companyId: req.user?.companyId,
                role: req.user?.role,
                email: (req.user as any)?.email,
                environment: (process.env.NODE_ENV as any) || 'development',
            };

            // Evaluate all flags in parallel
            const flagResults = await Promise.all(
                flagKeys.map(async (key) => {
                    const value = await FeatureFlagService.evaluate(key, context, false);
                    return { key, value };
                })
            );

            // Attach to request
            (req as any).featureFlags = flagResults.reduce((acc, { key, value }) => {
                acc[key] = value;
                return acc;
            }, {} as Record<string, any>);

            next();
        } catch (error) {
            logger.error('Error loading feature flags:', error);
            // Continue with empty flags
            (req as any).featureFlags = {};
            next();
        }
    };
};

/**
 * Helper to check if feature is enabled in route handler
 */
export const isFeatureEnabled = async (
    req: Request,
    flagKey: string,
    defaultValue: any = false
): Promise<any> => {
    // Check if already loaded
    if ((req as any).featureFlags && (req as any).featureFlags[flagKey] !== undefined) {
        return (req as any).featureFlags[flagKey];
    }

    // Evaluate on-demand
    const context: EvaluationContext = {
        userId: req.user?._id,
        companyId: req.user?.companyId,
        role: req.user?.role,
        email: (req.user as any)?.email,
        environment: (process.env.NODE_ENV as any) || 'development',
    };

    return await FeatureFlagService.evaluate(flagKey, context, defaultValue);
};

export default {
    requireFeatureFlag,
    loadFeatureFlags,
    isFeatureEnabled,
};
