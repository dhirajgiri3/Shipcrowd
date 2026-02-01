import mongoose from 'mongoose';
import crypto from 'crypto';
import FeatureFlag from '../../../../infrastructure/database/mongoose/models/system/feature-flag.model';
import logger from '../../../../shared/logger/winston.logger';
import { AppError, ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

/**
 * Feature Flag Service
 * Manages feature flags for safe rollouts and A/B testing
 */

export interface EvaluationContext {
    userId?: string;
    companyId?: string;
    role?: string;
    email?: string;
    custom?: Record<string, any>;
    environment?: 'development' | 'sandbox' | 'production';
}

class FeatureFlagService {
    private flagCache: Map<string, any> = new Map();
    private cacheExpiry: Map<string, number> = new Map();
    private readonly CACHE_TTL = 60 * 1000; // 1 minute

    /**
     * Evaluate a feature flag for a given context
     */
    async evaluate(flagKey: string, context: EvaluationContext, defaultValue: any = false): Promise<any> {
        try {
            // Check cache first
            const cached = this.getFromCache(flagKey);
            if (cached !== null) {
                return this.evaluateWithContext(cached, context, defaultValue);
            }

            // Fetch from database
            const flag = await FeatureFlag.findOne({
                key: flagKey,
                isArchived: false,
            }).lean();

            if (!flag) {
                logger.warn(`Feature flag not found: ${flagKey}, using default value`);
                return defaultValue;
            }

            // Update cache
            this.setCache(flagKey, flag);

            // Update evaluation count (non-blocking)
            this.incrementEvaluationCount(flag._id.toString()).catch((err) =>
                logger.error('Error incrementing evaluation count:', err)
            );

            return this.evaluateWithContext(flag, context, defaultValue);
        } catch (error) {
            logger.error(`Error evaluating feature flag ${flagKey}:`, error);
            return defaultValue;
        }
    }

    /**
     * Evaluate flag with context (rules, percentage, etc.)
     */
    private evaluateWithContext(flag: any, context: EvaluationContext, defaultValue: any): any {
        // Check if flag is globally disabled
        if (!flag.isEnabled) {
            return this.getDefaultValue(flag, defaultValue);
        }

        // Check lifecycle dates
        const now = new Date();
        if (flag.startDate && now < new Date(flag.startDate)) {
            return this.getDefaultValue(flag, defaultValue);
        }
        if (flag.endDate && now > new Date(flag.endDate)) {
            return this.getDefaultValue(flag, defaultValue);
        }

        // Check environment
        const env = context.environment || process.env.NODE_ENV || 'development';
        if (flag.environments && flag.environments[env] === false) {
            return this.getDefaultValue(flag, defaultValue);
        }

        // Evaluate rules (highest priority)
        if (flag.rules && flag.rules.length > 0) {
            for (const rule of flag.rules) {
                if (!rule.enabled) continue;

                if (this.evaluateRule(rule, context)) {
                    return rule.value !== undefined ? rule.value : flag.value || true;
                }
            }
        }

        // Percentage rollout (gradual release)
        if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
            const attribute = flag.rolloutAttribute || 'userId';
            const attributeValue = (context as any)[attribute];

            if (attributeValue) {
                const hash = this.hashAttribute(attributeValue, flag.key);
                const percentage = hash % 100;

                if (percentage >= flag.rolloutPercentage) {
                    return this.getDefaultValue(flag, defaultValue);
                }
            }
        }

        // Return flag value based on type
        if (flag.type === 'boolean') {
            return true;
        }

        return flag.value !== undefined ? flag.value : defaultValue;
    }

    /**
     * Evaluate a single rule against context
     */
    private evaluateRule(rule: any, context: EvaluationContext): boolean {
        if (!rule.conditions || rule.conditions.length === 0) {
            return true; // No conditions = always match
        }

        // All conditions must match (AND logic)
        return rule.conditions.every((condition: any) => {
            const contextValue = this.getContextValue(condition.attribute, context);

            switch (condition.operator) {
                case 'equals':
                    return contextValue === condition.value;
                case 'not_equals':
                    return contextValue !== condition.value;
                case 'contains':
                    return String(contextValue).includes(String(condition.value));
                case 'in':
                    return Array.isArray(condition.value) && condition.value.includes(contextValue);
                case 'not_in':
                    return Array.isArray(condition.value) && !condition.value.includes(contextValue);
                case 'greater_than':
                    return Number(contextValue) > Number(condition.value);
                case 'less_than':
                    return Number(contextValue) < Number(condition.value);
                default:
                    return false;
            }
        });
    }

    /**
     * Get value from context based on attribute
     */
    private getContextValue(attribute: string, context: EvaluationContext): any {
        switch (attribute) {
            case 'userId':
                return context.userId;
            case 'companyId':
                return context.companyId;
            case 'role':
                return context.role;
            case 'email':
                return context.email;
            case 'custom':
                return context.custom;
            default:
                return undefined;
        }
    }

    /**
     * Hash attribute for consistent percentage rollout
     */
    private hashAttribute(value: string, salt: string): number {
        const hash = crypto.createHash('md5').update(`${value}:${salt}`).digest('hex');
        return parseInt(hash.substring(0, 8), 16);
    }

    /**
     * Get default value based on flag type
     */
    private getDefaultValue(flag: any, providedDefault: any): any {
        if (flag.type === 'boolean') {
            return providedDefault || false;
        }
        return flag.value !== undefined ? flag.value : providedDefault;
    }

    /**
     * Create a new feature flag
     */
    async createFlag(data: {
        key: string;
        name: string;
        description: string;
        type?: 'boolean' | 'percentage' | 'list' | 'json';
        value?: any;
        isEnabled?: boolean;
        rolloutPercentage?: number;
        category?: 'feature' | 'experiment' | 'ops' | 'billing';
        createdBy: string;
    }) {
        // Check if flag already exists
        const existing = await FeatureFlag.findOne({ key: data.key });
        if (existing) {
            throw new ValidationError(`Feature flag with key '${data.key}' already exists`);
        }

        const flag = await FeatureFlag.create({
            key: data.key,
            name: data.name,
            description: data.description,
            type: data.type || 'boolean',
            value: data.value,
            isEnabled: data.isEnabled || false,
            rolloutPercentage: data.rolloutPercentage,
            category: data.category || 'feature',
            createdBy: new mongoose.Types.ObjectId(data.createdBy),
            rules: [],
        });

        // Clear cache
        this.clearCache(data.key);

        logger.info(`Feature flag created: ${data.key}`, { flagId: flag._id });

        return flag;
    }

    /**
     * Update feature flag
     */
    async updateFlag(flagKey: string, updates: any, updatedBy: string) {
        const flag = await FeatureFlag.findOne({ key: flagKey, isArchived: false });

        if (!flag) {
            throw new NotFoundError('Feature flag not found', ErrorCode.RES_NOT_FOUND);
        }

        // Update fields
        if (updates.name !== undefined) flag.name = updates.name;
        if (updates.description !== undefined) flag.description = updates.description;
        if (updates.isEnabled !== undefined) flag.isEnabled = updates.isEnabled;
        if (updates.value !== undefined) flag.value = updates.value;
        if (updates.rolloutPercentage !== undefined) flag.rolloutPercentage = updates.rolloutPercentage;
        if (updates.rolloutAttribute !== undefined) flag.rolloutAttribute = updates.rolloutAttribute;
        if (updates.environments !== undefined) flag.environments = updates.environments;
        if (updates.startDate !== undefined) flag.startDate = updates.startDate;
        if (updates.endDate !== undefined) flag.endDate = updates.endDate;
        if (updates.rules !== undefined) flag.rules = updates.rules;
        if (updates.category !== undefined) flag.category = updates.category;
        if (updates.tags !== undefined) flag.tags = updates.tags;

        flag.updatedBy = new mongoose.Types.ObjectId(updatedBy);
        await flag.save();

        // Clear cache
        this.clearCache(flagKey);

        logger.info(`Feature flag updated: ${flagKey}`, {
            flagId: flag._id,
            changes: Object.keys(updates),
        });

        return flag;
    }

    /**
     * Toggle feature flag on/off
     */
    async toggleFlag(flagKey: string, isEnabled: boolean, updatedBy: string) {
        return this.updateFlag(flagKey, { isEnabled }, updatedBy);
    }

    /**
     * Delete (archive) feature flag
     */
    async deleteFlag(flagKey: string, deletedBy: string) {
        const flag = await FeatureFlag.findOne({ key: flagKey });

        if (!flag) {
            throw new NotFoundError('Feature flag not found', ErrorCode.RES_NOT_FOUND);
        }

        flag.isArchived = true;
        flag.isEnabled = false;
        flag.updatedBy = new mongoose.Types.ObjectId(deletedBy);
        await flag.save();

        // Clear cache
        this.clearCache(flagKey);

        logger.info(`Feature flag archived: ${flagKey}`, { flagId: flag._id });

        return flag;
    }

    /**
     * Get all feature flags
     */
    async getAllFlags(filters?: {
        isEnabled?: boolean;
        category?: string;
        environment?: string;
    }) {
        const query: any = { isArchived: false };

        if (filters?.isEnabled !== undefined) {
            query.isEnabled = filters.isEnabled;
        }

        if (filters?.category) {
            query.category = filters.category;
        }

        if (filters?.environment) {
            query[`environments.${filters.environment}`] = true;
        }

        const flags = await FeatureFlag.find(query)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        return flags;
    }

    /**
     * Get single feature flag
     */
    async getFlag(flagKey: string) {
        const flag = await FeatureFlag.findOne({ key: flagKey, isArchived: false })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .lean();

        if (!flag) {
            throw new NotFoundError('Feature flag not found', ErrorCode.RES_NOT_FOUND);
        }

        return flag;
    }

    /**
     * Increment evaluation count (analytics)
     */
    private async incrementEvaluationCount(flagId: string) {
        await FeatureFlag.updateOne(
            { _id: flagId },
            {
                $inc: { evaluationCount: 1 },
                $set: { lastEvaluatedAt: new Date() },
            }
        );
    }

    /**
     * Cache management
     */
    private getFromCache(key: string): any | null {
        const expiry = this.cacheExpiry.get(key);
        if (expiry && Date.now() < expiry) {
            return this.flagCache.get(key);
        }
        this.flagCache.delete(key);
        this.cacheExpiry.delete(key);
        return null;
    }

    private setCache(key: string, value: any) {
        this.flagCache.set(key, value);
        this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
    }

    private clearCache(key?: string) {
        if (key) {
            this.flagCache.delete(key);
            this.cacheExpiry.delete(key);
        } else {
            this.flagCache.clear();
            this.cacheExpiry.clear();
        }
    }

    /**
     * Clear all caches (admin function)
     */
    async clearAllCaches() {
        this.clearCache();
        logger.info('All feature flag caches cleared');
    }
}

export default new FeatureFlagService();
