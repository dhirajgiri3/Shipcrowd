import { Request, Response, NextFunction } from 'express';
import FeatureFlagService from '../../../../core/application/services/system/feature-flag.service';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';
import { ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Feature Flag Controller
 * Admin endpoints for managing feature flags
 */

/**
 * GET /api/v1/admin/feature-flags
 * List all feature flags
 */
export const listFlags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { isEnabled, category, environment } = req.query;

        const filters: any = {};
        if (isEnabled !== undefined) {
            filters.isEnabled = isEnabled === 'true';
        }
        if (category) {
            filters.category = category as string;
        }
        if (environment) {
            filters.environment = environment as string;
        }

        const flags = await FeatureFlagService.getAllFlags(filters);

        sendSuccess(res, { flags, total: flags.length }, 'Feature flags retrieved successfully');
    } catch (error) {
        logger.error('Error listing feature flags:', error);
        next(error);
    }
};

/**
 * GET /api/v1/admin/feature-flags/:key
 * Get single feature flag
 */
export const getFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { key } = req.params;

        const flag = await FeatureFlagService.getFlag(key);

        sendSuccess(res, { flag }, 'Feature flag retrieved successfully');
    } catch (error) {
        logger.error('Error getting feature flag:', error);
        next(error);
    }
};

/**
 * POST /api/v1/admin/feature-flags
 * Create new feature flag
 */
export const createFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        const { key, name, description, type, value, isEnabled, rolloutPercentage, category } = req.body;

        if (!key || !name || !description) {
            throw new ValidationError('Key, name, and description are required');
        }

        // Validate key format (lowercase, alphanumeric, underscores)
        if (!/^[a-z0-9_]+$/.test(key)) {
            throw new ValidationError('Key must be lowercase alphanumeric with underscores only');
        }

        const flag = await FeatureFlagService.createFlag({
            key,
            name,
            description,
            type: type || 'boolean',
            value,
            isEnabled: isEnabled || false,
            rolloutPercentage,
            category: category || 'feature',
            createdBy: auth.userId,
        });

        logger.info(`Feature flag created: ${key}`, {
            createdBy: auth.userId,
            flagId: flag._id,
        });

        sendCreated(res, { flag }, 'Feature flag created successfully');
    } catch (error) {
        logger.error('Error creating feature flag:', error);
        next(error);
    }
};

/**
 * PATCH /api/v1/admin/feature-flags/:key
 * Update feature flag
 */
export const updateFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        const { key } = req.params;

        const flag = await FeatureFlagService.updateFlag(key, req.body, auth.userId);

        logger.info(`Feature flag updated: ${key}`, {
            updatedBy: auth.userId,
            changes: Object.keys(req.body),
        });

        sendSuccess(res, { flag }, 'Feature flag updated successfully');
    } catch (error) {
        logger.error('Error updating feature flag:', error);
        next(error);
    }
};

/**
 * POST /api/v1/admin/feature-flags/:key/toggle
 * Toggle feature flag on/off
 */
export const toggleFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        const { key } = req.params;
        const { isEnabled } = req.body;

        if (typeof isEnabled !== 'boolean') {
            throw new ValidationError('isEnabled must be a boolean');
        }

        const flag = await FeatureFlagService.toggleFlag(key, isEnabled, auth.userId);

        logger.info(`Feature flag toggled: ${key}`, {
            updatedBy: auth.userId,
            isEnabled,
        });

        sendSuccess(res, { flag }, `Feature flag ${isEnabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
        logger.error('Error toggling feature flag:', error);
        next(error);
    }
};

/**
 * DELETE /api/v1/admin/feature-flags/:key
 * Delete (archive) feature flag
 */
export const deleteFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        const { key } = req.params;

        const flag = await FeatureFlagService.deleteFlag(key, auth.userId);

        logger.info(`Feature flag deleted: ${key}`, {
            deletedBy: auth.userId,
        });

        sendSuccess(res, { flag }, 'Feature flag deleted successfully');
    } catch (error) {
        logger.error('Error deleting feature flag:', error);
        next(error);
    }
};

/**
 * POST /api/v1/admin/feature-flags/evaluate
 * Evaluate feature flags for testing
 */
export const evaluateFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { flagKey, context } = req.body;

        if (!flagKey) {
            throw new ValidationError('flagKey is required');
        }

        const result = await FeatureFlagService.evaluate(flagKey, context || {}, false);

        sendSuccess(res, { flagKey, result, context }, 'Feature flag evaluated successfully');
    } catch (error) {
        logger.error('Error evaluating feature flag:', error);
        next(error);
    }
};

/**
 * POST /api/v1/admin/feature-flags/clear-cache
 * Clear feature flag cache
 */
export const clearCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        await FeatureFlagService.clearAllCaches();

        logger.info('Feature flag cache cleared', {
            clearedBy: auth.userId,
        });

        sendSuccess(res, null, 'Feature flag cache cleared successfully');
    } catch (error) {
        logger.error('Error clearing feature flag cache:', error);
        next(error);
    }
};

export default {
    listFlags,
    getFlag,
    createFlag,
    updateFlag,
    toggleFlag,
    deleteFlag,
    evaluateFlag,
    clearCache,
};
