import mongoose from 'mongoose';
import logger from '../../../../shared/logger/winston.logger';
import { CacheRepository } from '../../../../infrastructure/redis/cache.repository';
import { PubSubService } from '../../../../infrastructure/redis/pubsub.service';

// Use mongoose.model() to avoid circular imports
const getUser = () => mongoose.model('User');
const getMembership = () => mongoose.model('Membership');
const getRole = () => mongoose.model('Role');

/**
 * Permission Service - V6 RBAC
 * 
 * Resolves permissions for a user in a given context (company).
 * 
 * Improvements:
 * - Uses shared CacheRepository (Connection Pooling)
 * - Uses Tag-based Invalidation via PubSubService
 * - Clean separation of concerns
 */
export class PermissionService {
    // Cache instance for RBAC
    private static cache = new CacheRepository('rbac');

    /**
     * Initialize Service Listeners
     */
    static initialize() {
        // Listen for invalidation events from other nodes
        PubSubService.onInvalidation('permission-service', async (msg) => {
            if (msg.type === 'tags' && Array.isArray(msg.target)) {
                // Invalidate local cache tags
                // Note: cache.invalidateTags deletes keys in Redis. 
                // Since all nodes share Redis, we don't strictly *need* to re-run delete 
                // on every node if they use the same Redis.
                // However, if we had L1 memory cache, this is where we'd clear it.
                // For now, it's just a log or double-check.
                logger.debug(`[PermissionService] Received invalidation for tags: ${msg.target.join(', ')}`);
            }
        });
    }

    /**
     * Invalidate permissions for a user
     * 
     * Uses Tag-Based Invalidation:
     * - Tag: `user:{userId}:perms`
     * - Tag: `company:{companyId}:perms` (optional)
     */
    static async invalidate(userId: string, companyId?: string): Promise<void> {
        try {
            const tags = [`user:${userId}:perms`];
            if (companyId) {
                tags.push(`company:${companyId}:perms`);
            }

            // 1. Invalidate in Redis (clears all keys linked to these tags)
            await this.cache.invalidateTags(tags);

            // 2. Broadcast to other nodes (if we add in-memory L1 later)
            await PubSubService.publish({
                type: 'tags',
                target: tags,
                source: 'permission-service'
            });

            logger.info(`✅ Invalidated permissions for user ${userId}`);
        } catch (error) {
            logger.error('❌ Cache invalidation failed:', { userId, companyId, error });
        }
    }

    /**
     * Resolve all permissions for a user
     */
    static async resolve(
        userId: string,
        companyId?: string
    ): Promise<string[]> {
        const cacheKey = `perms:${userId}:${companyId || 'global'}`;
        const userTag = `user:${userId}:perms`;
        const tags = [userTag];
        if (companyId) tags.push(`company:${companyId}:perms`);

        // Atomic Check-or-Fetch with Tags
        return this.cache.getOrSet(
            cacheKey,
            async () => {
                return this.fetchPermissionsFromDB(userId, companyId);
            },
            {
                ttl: 300, // 5 minutes
                tags: tags
            }
        );
    }

    /**
     * Fetch from Database (Logic moved to separate method for clarity)
     */
    private static async fetchPermissionsFromDB(userId: string, companyId?: string): Promise<string[]> {
        try {
            const User = getUser();
            const Membership = getMembership();
            const Role = getRole();

            const user = await User.findById(userId).lean() as any;
            if (!user || !user.isActive) {
                return [];
            }

            const roleIds: string[] = [];

            // 1. Add platform role
            if (user.platformRole) {
                roleIds.push(user.platformRole.toString());
            }

            // 2. Add company roles (via Membership)
            if (companyId) {
                const membership = await Membership.findOne({
                    userId,
                    companyId,
                    status: 'active'
                }).lean() as any;

                if (membership && membership.roles?.length) {
                    roleIds.push(...membership.roles.map((r: any) => r.toString()));
                }
            }

            // 3. Batch load all roles
            if (roleIds.length === 0) {
                return [];
            }

            const roles = await Role.find({
                _id: { $in: roleIds },
                isDeprecated: false
            }).lean() as any[];

            // 4. Union effectivePermissions
            const permissions = new Set<string>();
            for (const role of roles) {
                if (role.effectivePermissions) {
                    role.effectivePermissions.forEach((p: string) => permissions.add(p));
                }
            }

            return Array.from(permissions);
        } catch (error) {
            logger.error('Permission fetch failed', { userId, companyId, error });
            return []; // Fail safe default
        }
    }

    /**
     * Check if user has a permission
     */
    static async hasPermission(
        userId: string,
        permission: string,
        companyId?: string
    ): Promise<boolean> {
        const permissions = await this.resolve(userId, companyId);
        return permissions.includes(permission);
    }

    /**
     * Get permission cache key (Helper)
     */
    static getCacheKey(userId: string, companyId?: string): string {
        return `rbac:perms:${userId}:${companyId || 'global'}`;
    }
}

// Auto-initialize listeners
PermissionService.initialize();

export default PermissionService;
