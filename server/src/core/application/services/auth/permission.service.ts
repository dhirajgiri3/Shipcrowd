import mongoose from 'mongoose';
import logger from '../../../../shared/logger/winston.logger';
import Redis from 'ioredis';

// Use mongoose.model() to avoid circular imports with user.model.ts
// Models are registered at app startup, so this is safe at runtime
const getUser = () => mongoose.model('User');
const getMembership = () => mongoose.model('Membership');
const getRole = () => mongoose.model('Role');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const pub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Subscribe to invalidation channel
const RBAC_CHANNEL = 'rbac:invalidation';
sub.subscribe(RBAC_CHANNEL);

sub.on('message', async (channel, message) => {
    if (channel === RBAC_CHANNEL) {
        try {
            const { userId, companyId } = JSON.parse(message);
            if (userId) {
                // Invalidate specific user cache on this node
                const pattern = `rbac:perms:${userId}:${companyId || '*'}`;
                const keys: string[] = [];

                // Collect all matching keys
                for await (const keyBatch of redis.scanStream({ match: pattern, count: 100 })) {
                    keys.push(...keyBatch);
                }

                // Delete all collected keys
                if (keys.length > 0) {
                    const pipeline = redis.pipeline();
                    keys.forEach(key => pipeline.del(key));
                    await pipeline.exec();
                    logger.debug(`Received invalidation and deleted ${keys.length} cache keys for user ${userId}`);
                }
            }
        } catch (e) {
            logger.error('Failed to process invalidation message', e);
        }
    }
});

/**
 * Permission Service - V5 RBAC
 * 
 * Resolves permissions for a user in a given context (company).
 * 
 * Key Optimizations:
 * - Batch loading: Single query for all roles
 * - Uses precomputed effectivePermissions
 * - Pub/Sub Cache Invalidation
 */

export class PermissionService {
    /**
     * Invalidate permissions for a user
     *
     * CRITICAL FIX: Await cache deletion before publishing
     *
     * The race condition occurred because:
     * 1. scanStream.on('data') is async but not awaited
     * 2. pub.publish() executes immediately
     * 3. Other nodes delete cache BEFORE this node deletes its own cache
     * 4. Cache miss on this node during the window, fetches fresh data
     * 5. Both fresh and stale data exist in cluster until TTL expires
     *
     * Solution: Use await for scan loop to ensure completion before publishing
     */
    static async invalidate(userId: string, companyId?: string): Promise<void> {
        const pattern = `rbac:perms:${userId}:${companyId || '*'}`;

        try {
            // 1. Delete local keys (MUST complete before pub/sub)
            // Collect all keys first, then delete them
            const keys: string[] = [];

            // Use for-await pattern for async iteration
            for await (const keyBatch of redis.scanStream({ match: pattern, count: 100 })) {
                keys.push(...keyBatch);
            }

            if (keys.length > 0) {
                // Delete all collected keys in a single pipeline for efficiency
                const pipeline = redis.pipeline();
                keys.forEach(key => pipeline.del(key));
                await pipeline.exec();
                logger.debug(`Deleted ${keys.length} cache keys for user ${userId}`);
            }

            // 2. ONLY THEN publish invalidation to other nodes
            // This ensures this node's cache is cleared before pub/sub message arrives at other nodes
            await pub.publish(RBAC_CHANNEL, JSON.stringify({ userId, companyId }));

            logger.info(`✅ Invalidated permissions for user ${userId}`);
        } catch (error) {
            logger.error('❌ Cache invalidation failed:', { userId, companyId, error });
            // Still attempt pub/sub even if local delete fails (fail-safe for cluster consistency)
            try {
                await pub.publish(RBAC_CHANNEL, JSON.stringify({ userId, companyId }));
            } catch (pubError) {
                logger.error('❌ Pub/sub also failed:', pubError);
            }
            throw error;
        }
    }

    /**
     * Resolve all permissions for a user
     */
    static async resolve(
        userId: string,
        companyId?: string
    ): Promise<string[]> {
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
            logger.error('Permission resolution failed', { userId, companyId, error });
            return [];
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
     * Get permission cache key
     */
    static getCacheKey(userId: string, companyId?: string): string {
        return `rbac:perms:${userId}:${companyId || 'global'}`;
    }
}

export default PermissionService;
