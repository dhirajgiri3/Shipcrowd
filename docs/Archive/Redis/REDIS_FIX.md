Analysis Complete: Your Redis Architecture Review
I've thoroughly analyzed your codebase against your plan. Here's my assessment:

Critical Issues Found in Your Current Implementation
1. ARCHITECTURAL FRAGMENTATION (Severe)

7 independent Redis connections running simultaneously:
redis.connection.ts:26 - redis library (for BullMQ)
cache.service.ts:31 - ioredis for analytics
pricing-cache.service.ts:25 - Independent ioredis instance
permission.service.ts:11-13 - THREE separate ioredis instances (main, pub, sub)
rate-limiter.ts:32 - Dedicated ioredis instance
require-permission.middleware.ts:8 - Another ioredis instance
rateLimit.config.ts:23 - redis library for express-rate-limit
jwt.ts:32 - ioredis for token blacklist
2. LIBRARY INCONSISTENCY (High Risk)

Mixing redis (node-redis v5) AND ioredis (v5.8.2)
BullMQ documentation recommends ioredis, but you're using redis library
Connection pooling conflicts between libraries
3. MISSING PATTERNS FROM YOUR PLAN

✅ Tag-based invalidation - NOT implemented (this is your "magic" feature)
✅ Stale-while-revalidate - NOT implemented for analytics
✅ Pub/Sub for cache invalidation - Partially exists for RBAC only
✅ Unified connection manager - NOT implemented
4. ANTI-PATTERNS DETECTED

pricing-cache.service.ts:114 & cache.service.ts:133 - Using KEYS command (blocks Redis in production)
cache-invalidation.listener.ts:58 - Using in-memory service for distributed invalidation
No connection pooling strategy for multiple clients
What Your Plan Gets RIGHT ✅
Tier-based classification - Excellent mental model
Tag-based invalidation concept - Game changer for list caching
Frontend-backend sync via React Query - Already partially implemented
Separation of concerns (main/subscriber/bclient) - Correct approach
What Your Plan MISSED ❌
No migration strategy - How to switch from 7 connections to 1?
BullMQ compatibility - Your plan doesn't account for BullMQ's specific connection requirements
Existing pub/sub - You already have RBAC pub/sub; plan should extend it
Health checks - No monitoring/alerting for Redis failures
Cluster mode - No consideration for Redis Cluster (horizontal scaling)
Connection limits - 7 connections × 10 max clients = potential 70 connections to Redis
ENHANCED IMPLEMENTATION PLAN
Phase 0: Pre-Migration Assessment ⚠️
0.1 Connection Audit & Dependency Resolution

 Run npm list redis ioredis to identify which packages depend on redis vs ioredis
 Check if rate-limit-redis supports ioredis (it does via @express-rate-limit/redis)
 Verify BullMQ works with ioredis (confirmed - it's the recommended client)
0.2 Feature Freeze Communication

 Document all current Redis key patterns in use
 Create Redis monitoring dashboard (current connection count, memory usage)
 Set up Redis MONITOR logging for 24h to capture all key patterns
Phase 1: Foundation Layer (Week 1)
1.1 Unified Redis Manager ⭐ CRITICAL
Create server/src/infrastructure/redis/redis.manager.ts:


import IORedis, { Redis, Cluster } from 'ioredis';
import logger from '../../shared/logger/winston.logger';

export class RedisManager {
  private static mainClient: Redis | null = null;
  private static subscriberClient: Redis | null = null;
  private static publisherClient: Redis | null = null;
  
  // Shared connection options (DRY principle)
  private static getBaseOptions() {
    return {
      maxRetriesPerRequest: null, // BullMQ compatibility
      enableReadyCheck: false,    // BullMQ compatibility
      retryStrategy: (times: number) => {
        if (times > 10) {
          logger.error('[RedisManager] Max retries exceeded');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      reconnectOnError: (err: Error) => {
        const targetErrors = ['READONLY', 'ECONNRESET'];
        return targetErrors.some(e => err.message.includes(e));
      },
    };
  }

  // Main client for GET/SET/DEL operations
  static async getMainClient(): Promise<Redis> {
    if (this.mainClient?.status === 'ready') return this.mainClient;
    
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.mainClient = new IORedis(url, this.getBaseOptions());
    
    this.setupEventHandlers(this.mainClient, 'MAIN');
    return this.mainClient;
  }

  // Subscriber client for Pub/Sub (dedicated connection required)
  static async getSubscriberClient(): Promise<Redis> {
    if (this.subscriberClient?.status === 'ready') return this.subscriberClient;
    
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.subscriberClient = new IORedis(url, this.getBaseOptions());
    
    this.setupEventHandlers(this.subscriberClient, 'SUBSCRIBER');
    return this.subscriberClient;
  }

  // Publisher client for Pub/Sub
  static async getPublisherClient(): Promise<Redis> {
    if (this.publisherClient?.status === 'ready') return this.publisherClient;
    
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.publisherClient = new IORedis(url, this.getBaseOptions());
    
    this.setupEventHandlers(this.publisherClient, 'PUBLISHER');
    return this.publisherClient;
  }

  // Get connection options for BullMQ (raw config, not client)
  static getBullMQConnection() {
    const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      db: parseInt(url.pathname.slice(1)) || 0,
      ...this.getBaseOptions(),
    };
  }

  private static setupEventHandlers(client: Redis, name: string) {
    client.on('connect', () => logger.info(`[Redis:${name}] Connected`));
    client.on('ready', () => logger.info(`[Redis:${name}] Ready`));
    client.on('error', (err) => logger.error(`[Redis:${name}] Error:`, err));
    client.on('close', () => logger.warn(`[Redis:${name}] Closed`));
    client.on('reconnecting', () => logger.info(`[Redis:${name}] Reconnecting`));
  }

  // Graceful shutdown
  static async closeAll(): Promise<void> {
    const clients = [this.mainClient, this.subscriberClient, this.publisherClient];
    await Promise.all(clients.filter(c => c).map(c => c!.quit()));
    logger.info('[RedisManager] All connections closed');
  }

  // Health check
  static async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getMainClient();
      await client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
1.2 Cache Repository with Tag Support ⭐ YOUR "MAGIC" FEATURE

Create server/src/infrastructure/redis/cache.repository.ts:


import { RedisManager } from './redis.manager';
import logger from '../../shared/logger/winston.logger';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export class CacheRepository {
  private prefix: string;

  constructor(prefix: string = 'sc') {
    this.prefix = prefix;
  }

  private key(k: string): string {
    return `${this.prefix}:${k}`;
  }

  private tagKey(tag: string): string {
    return `${this.prefix}:tag:${tag}`;
  }

  // Core: Get or Set pattern
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const client = await RedisManager.getMainClient();
    const fullKey = this.key(key);

    // Try cache first
    const cached = await client.get(fullKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // Cache miss - fetch fresh
    const fresh = await fetchFn();
    await this.setWithTags(key, fresh, options);
    return fresh;
  }

  // Set value with tag association (THE MAGIC)
  async setWithTags<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const client = await RedisManager.getMainClient();
    const fullKey = this.key(key);
    const ttl = options.ttl || 3600;

    const pipeline = client.pipeline();
    
    // 1. Store the actual value
    pipeline.setex(fullKey, ttl, JSON.stringify(value));

    // 2. Associate key with each tag
    if (options.tags) {
      for (const tag of options.tags) {
        const tagSetKey = this.tagKey(tag);
        pipeline.sadd(tagSetKey, fullKey); // Add key to tag's set
        pipeline.expire(tagSetKey, ttl + 60); // Tag expires slightly after data
      }
    }

    await pipeline.exec();
  }

  // Invalidate all keys associated with tags (THE GAME CHANGER)
  async invalidateTags(tags: string[]): Promise<number> {
    const client = await RedisManager.getMainClient();
    let totalDeleted = 0;

    for (const tag of tags) {
      const tagSetKey = this.tagKey(tag);
      
      // Get all keys associated with this tag
      const keys = await client.smembers(tagSetKey);
      
      if (keys.length > 0) {
        const pipeline = client.pipeline();
        keys.forEach(k => pipeline.del(k));
        pipeline.del(tagSetKey); // Remove the tag set itself
        await pipeline.exec();
        totalDeleted += keys.length;
      }
    }

    logger.info(`[CacheRepository] Invalidated ${totalDeleted} keys for tags:`, tags);
    return totalDeleted;
  }

  // Direct get
  async get<T>(key: string): Promise<T | null> {
    const client = await RedisManager.getMainClient();
    const cached = await client.get(this.key(key));
    return cached ? JSON.parse(cached) : null;
  }

  // Direct set
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const client = await RedisManager.getMainClient();
    await client.setex(this.key(key), ttl, JSON.stringify(value));
  }

  // Delete specific key
  async delete(key: string): Promise<void> {
    const client = await RedisManager.getMainClient();
    await client.del(this.key(key));
  }

  // SAFE pattern deletion using SCAN (not KEYS)
  async deletePattern(pattern: string): Promise<number> {
    const client = await RedisManager.getMainClient();
    const fullPattern = this.key(pattern);
    let deleted = 0;

    const stream = client.scanStream({
      match: fullPattern,
      count: 100
    });

    const keysToDelete: string[] = [];
    
    for await (const keyBatch of stream) {
      keysToDelete.push(...keyBatch);
    }

    if (keysToDelete.length > 0) {
      const pipeline = client.pipeline();
      keysToDelete.forEach(k => pipeline.del(k));
      await pipeline.exec();
      deleted = keysToDelete.length;
    }

    return deleted;
  }
}
1.3 Pub/Sub Event Bus (Unified Invalidation)

Create server/src/infrastructure/redis/pubsub.service.ts:


import { RedisManager } from './redis.manager';
import logger from '../../shared/logger/winston.logger';

export type CacheInvalidationMessage = {
  type: 'tags' | 'pattern' | 'key';
  target: string | string[];
  source?: string;
};

export class PubSubService {
  private static CHANNEL = 'shipcrowd:cache:invalidation';
  private static listeners: Map<string, (msg: CacheInvalidationMessage) => void> = new Map();

  // Initialize subscriber
  static async initialize(): Promise<void> {
    const subscriber = await RedisManager.getSubscriberClient();
    
    await subscriber.subscribe(this.CHANNEL);
    
    subscriber.on('message', (channel, message) => {
      if (channel === this.CHANNEL) {
        this.handleMessage(message);
      }
    });

    logger.info('[PubSub] Initialized cache invalidation bus');
  }

  // Publish invalidation event (to all app instances)
  static async publish(message: CacheInvalidationMessage): Promise<void> {
    const publisher = await RedisManager.getPublisherClient();
    await publisher.publish(this.CHANNEL, JSON.stringify(message));
    logger.debug('[PubSub] Published invalidation:', message);
  }

  // Handle incoming invalidation message
  private static handleMessage(message: string): void {
    try {
      const msg = JSON.parse(message) as CacheInvalidationMessage;
      this.listeners.forEach(listener => listener(msg));
    } catch (err) {
      logger.error('[PubSub] Failed to parse message:', err);
    }
  }

  // Register invalidation listener
  static onInvalidation(id: string, callback: (msg: CacheInvalidationMessage) => void): void {
    this.listeners.set(id, callback);
  }
}
Phase 2: Service Tier Implementation (Week 2-3)
2.1 Base Service Class (DRY for all services)

Create server/src/core/application/base/cached.service.ts:


import { CacheRepository } from '../../../infrastructure/redis/cache.repository';

export abstract class CachedService {
  protected cache: CacheRepository;
  protected abstract serviceName: string;

  constructor() {
    this.cache = new CacheRepository(this.serviceName);
  }

  // Helper: Generate cache key with company context
  protected cacheKey(companyId: string, ...parts: string[]): string {
    return `${companyId}:${parts.join(':')}`;
  }

  // Helper: Generate list cache key with query hash
  protected listCacheKey(companyId: string, queryParams: Record<string, any>): string {
    const hash = this.hashQuery(queryParams);
    return this.cacheKey(companyId, 'list', hash);
  }

  // Hash query params for consistent cache keys
  private hashQuery(params: Record<string, any>): string {
    const sorted = Object.keys(params).sort();
    return sorted.map(k => `${k}=${params[k]}`).join('&');
  }

  // Helper: Company-scoped tag
  protected companyTag(companyId: string, resource: string): string {
    return `company:${companyId}:${resource}`;
  }
}
2.2 Tier 1: Reference Data Services (Long TTL)

Example for Pincode/Zone Service:


export class PincodeLookupService extends CachedService {
  protected serviceName = 'pincode';

  async getZone(fromPincode: string, toPincode: string): Promise<string> {
    return this.cache.getOrSet(
      `zone:${fromPincode}:${toPincode}`,
      () => this.fetchZoneFromDB(fromPincode, toPincode),
      { 
        ttl: 86400, // 24 hours
        tags: ['ref:zones'] // Tag for admin invalidation
      }
    );
  }

  // Admin calls this when updating zones
  async invalidateAllZones(): Promise<void> {
    await this.cache.invalidateTags(['ref:zones']);
    await PubSubService.publish({
      type: 'tags',
      target: ['ref:zones'],
      source: 'PincodeLookupService'
    });
  }
}
2.3 Tier 2: User Context Services (Medium TTL + Push Invalidation)

Refactor PermissionService to use RedisManager:


// Replace lines 11-13 in permission.service.ts
const redis = await RedisManager.getMainClient();
const pub = await RedisManager.getPublisherClient();
const sub = await RedisManager.getSubscriberClient();
2.4 Tier 3: Transactional Lists ⭐ THE KILLER FEATURE

Example for Order List endpoint:


export class OrderService extends CachedService {
  protected serviceName = 'order';

  async listOrders(companyId: string, filters: OrderFilters, pagination: Pagination) {
    const cacheKey = this.listCacheKey(companyId, { ...filters, ...pagination });
    const tags = [this.companyTag(companyId, 'orders')];

    return this.cache.getOrSet(
      cacheKey,
      () => this.fetchOrdersFromDB(companyId, filters, pagination),
      { 
        ttl: 300, // 5 minutes
        tags // THE MAGIC: One tag for ALL order lists
      }
    );
  }

  async createOrder(data: CreateOrderDTO): Promise<Order> {
    const order = await Order.create(data);
    
    // Invalidate ALL order lists for this company
    await this.cache.invalidateTags([
      this.companyTag(data.companyId, 'orders')
    ]);

    // Publish to other app instances
    await PubSubService.publish({
      type: 'tags',
      target: [this.companyTag(data.companyId, 'orders')],
      source: 'OrderService.createOrder'
    });

    return order;
  }
}
2.5 Tier 4: Transactional Details (Short TTL, Direct Invalidation)


async getOrderById(orderId: string): Promise<Order> {
  return this.cache.getOrSet(
    `order:${orderId}`,
    () => Order.findById(orderId),
    { ttl: 300 } // 5 min burst protection
  );
}

async updateOrderStatus(orderId: string, status: string): Promise<void> {
  await Order.findByIdAndUpdate(orderId, { status });
  
  // Direct key deletion
  await this.cache.delete(`order:${orderId}`);
}
2.6 Tier 5: Analytics/Dashboard (Stale-While-Revalidate)

Create server/src/infrastructure/redis/stale-while-revalidate.ts:


export class StaleWhileRevalidate {
  constructor(
    private cache: CacheRepository,
    private staleThreshold: number = 300, // 5 min
    private maxAge: number = 900 // 15 min
  ) {}

  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    tags?: string[]
  ): Promise<T> {
    const client = await RedisManager.getMainClient();
    const dataKey = this.cache['key'](key);
    const timestampKey = `${dataKey}:ts`;

    // Get both cached value and timestamp
    const [cached, timestamp] = await Promise.all([
      client.get(dataKey),
      client.get(timestampKey)
    ]);

    const now = Date.now();
    const cachedTime = timestamp ? parseInt(timestamp) : 0;
    const age = now - cachedTime;

    // Cache hit - check if stale
    if (cached) {
      const data = JSON.parse(cached) as T;

      if (age < this.staleThreshold * 1000) {
        // Fresh - return immediately
        return data;
      } else if (age < this.maxAge * 1000) {
        // Stale but valid - return cached AND trigger background refresh
        this.backgroundRefresh(key, fetchFn, tags);
        return data;
      }
      // Too old - fall through to fresh fetch
    }

    // Cache miss or expired - fetch fresh
    const fresh = await fetchFn();
    await this.cache.setWithTags(key, fresh, { ttl: this.maxAge, tags });
    await client.setex(timestampKey, this.maxAge, now.toString());
    return fresh;
  }

  private async backgroundRefresh<T>(
    key: string,
    fetchFn: () => Promise<T>,
    tags?: string[]
  ): Promise<void> {
    // Fire and forget
    setImmediate(async () => {
      try {
        const fresh = await fetchFn();
        const client = await RedisManager.getMainClient();
        const dataKey = this.cache['key'](key);
        const timestampKey = `${dataKey}:ts`;
        
        await this.cache.setWithTags(key, fresh, { ttl: this.maxAge, tags });
        await client.setex(timestampKey, this.maxAge, Date.now().toString());
        
        logger.debug(`[SWR] Background refresh complete: ${key}`);
      } catch (err) {
        logger.error(`[SWR] Background refresh failed: ${key}`, err);
      }
    });
  }
}
Phase 3: Migration Execution (Week 4)
3.1 Dependency Cleanup


npm uninstall redis @types/redis rate-limit-redis
npm install @express-rate-limit/redis
3.2 File-by-File Migration Checklist

File	Action	Risk
redis.connection.ts	DELETE (replaced by RedisManager)	Low - only used by QueueManager
cache.service.ts	Refactor to extend CacheRepository	Medium - widely used
pricing-cache.service.ts	Refactor to use RedisManager	Low - isolated service
permission.service.ts	Replace 3 connections with RedisManager	High - auth critical
rate-limiter.ts	Use RedisManager	Medium
rateLimit.config.ts	Switch to @express-rate-limit/redis	Low
jwt.ts	Use RedisManager	High - token blacklist
queue-manager.ts	Use RedisManager.getBullMQConnection()	Critical - all queues
3.3 Gradual Rollout Strategy (ZERO DOWNTIME)

Step 1: Deploy RedisManager WITHOUT removing old connections


// Old connections still work
// New code uses RedisManager
// Both co-exist for 1 deployment cycle
Step 2: Feature flag migration


const USE_REDIS_MANAGER = process.env.REDIS_MANAGER_ENABLED === 'true';

if (USE_REDIS_MANAGER) {
  const redis = await RedisManager.getMainClient();
} else {
  const redis = new IORedis(/* old way */);
}
Step 3: Monitor for 48 hours

Connection count should drop from 7 to 3
No errors in logs
Performance metrics stable
Step 4: Remove old code

Phase 4: Frontend Optimization (Week 5)
4.1 Install Persistence Layer


cd client
npm install @tanstack/query-persist-client-core idb-keyval
4.2 Update Query Client in client/src/core/api/config/query-client.ts:


import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from './idb-persister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s default
      gcTime: 300_000, // 5 min
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Enable offline persistence
if (typeof window !== 'undefined') {
  persistQueryClient({
    queryClient,
    persister: createIDBPersister(),
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    buster: 'v1', // Change this to invalidate all cached data
  });
}
4.3 Align Stale Times with Backend TTLs

Data Type	Backend TTL	Frontend staleTime	Reasoning
Orders/Shipments	300s (5min)	30s	Frequently changing
Analytics Dashboard	300s SWR	300s (5min)	SWR keeps it fresh
Pricing (Zones/Rates)	3600s (1h)	Infinity	Static reference
Permissions	300s (5min)	300s	Match backend exactly
Wallet Balance	Direct	10s	High stakes, near real-time
Phase 5: Advanced Features (Week 6)
5.1 Redis Cluster Support (Horizontal Scaling)


// In RedisManager
static getMainClient(): Promise<Redis | Cluster> {
  if (process.env.REDIS_CLUSTER === 'true') {
    return new IORedis.Cluster([
      { host: 'redis-1', port: 6379 },
      { host: 'redis-2', port: 6379 },
      { host: 'redis-3', port: 6379 },
    ]);
  }
  // ... existing singleton logic
}
5.2 Cache Warming Strategy (Preload hot data)


// On server startup, preload critical data
async function warmCache() {
  const topCompanies = await Company.find().sort({ orderCount: -1 }).limit(10);
  
  for (const company of topCompanies) {
    // Warm order lists for top companies
    await orderService.listOrders(company._id, {}, { page: 1, limit: 20 });
    // Warm analytics
    await analyticsService.getDashboard(company._id);
  }
}
5.3 Redis Monitoring Middleware


// Track cache hit/miss rates
export class CacheMetrics {
  static hits = 0;
  static misses = 0;
  
  static recordHit() { this.hits++; }
  static recordMiss() { this.misses++; }
  
  static getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }
}
5.4 Health Check Endpoint


// GET /api/health/redis
export async function redisHealthCheck() {
  const [mainOk, subOk, pubOk] = await Promise.all([
    RedisManager.healthCheck(),
    RedisManager.getSubscriberClient().then(c => c.ping()),
    RedisManager.getPublisherClient().then(c => c.ping()),
  ]);

  return {
    main: mainOk ? 'connected' : 'disconnected',
    subscriber: subOk ? 'PONG' : 'error',
    publisher: pubOk ? 'PONG' : 'error',
    timestamp: new Date().toISOString(),
  };
}
Critical Fixes to YOUR PLAN
❌ Your Phase 1 said: "npm uninstall redis @types/redis -> npm install ioredis"

Problem: ioredis is already installed. redis library is implicit dependency.
Fix: Only uninstall rate-limit-redis, install @express-rate-limit/redis
❌ Your Tier 3 said: "invalidateTags(['company:{id}:orders'])"

Problem: Tag structure inconsistent (mixing colons)
Fix: Use company:123:orders format consistently
❌ Your Phase 3 said: "Install idb-keyval and tanstack-query-persist-client"

Problem: Packages are @tanstack/query-persist-client-core (scoped)
Fix: Correct package names in migration steps
❌ Your plan doesn't mention:

Shutdown hooks for graceful Redis disconnect
Connection leak prevention
SCAN vs KEYS migration (you're using KEYS everywhere)
Memory limit configuration (maxmemory-policy)
Updated Directory Structure

server/src/
├── infrastructure/
│   ├── redis/
│   │   ├── redis.manager.ts          ⭐ NEW - Connection pooling
│   │   ├── cache.repository.ts       ⭐ NEW - Tag-based caching
│   │   ├── pubsub.service.ts         ⭐ NEW - Distributed invalidation
│   │   └── stale-while-revalidate.ts ⭐ NEW - Analytics caching
│   ├── utilities/
│   │   ├── redis.connection.ts       ❌ DELETE
│   │   ├── cache.service.ts          🔧 REFACTOR (extend CacheRepository)
│   │   ├── rate-limiter.ts           🔧 REFACTOR (use RedisManager)
│   │   └── queue-manager.ts          🔧 REFACTOR (use RedisManager)
├── core/application/
│   ├── base/
│   │   └── cached.service.ts         ⭐ NEW - Base class for services
│   ├── services/
│   │   ├── auth/
│   │   │   ├── permission.service.ts 🔧 REFACTOR
│   │   │   └── session.service.ts    ✅ No changes (MongoDB-based)
│   │   ├── pricing/
│   │   │   └── pricing-cache.service.ts 🔧 REFACTOR
│   │   ├── shipping/
│   │   │   └── order.service.ts      🔧 REFACTOR (add tag invalidation)
│   │   └── analytics/
│   │       └── dashboard.service.ts   🔧 REFACTOR (use SWR)
├── shared/
│   ├── helpers/
│   │   └── jwt.ts                    🔧 REFACTOR
│   ├── config/
│   │   └── rateLimit.config.ts       🔧 REFACTOR
│   └── events/
│       ├── cache-invalidation.listener.ts 🔧 REFACTOR (use PubSubService)
│       └── eventBus.ts                ✅ Keep (in-memory events still valid)
Implementation Order (CRITICAL PATH)
Week 1: Foundation (No Breaking Changes)

Create RedisManager (new file, zero impact)
Create CacheRepository (new file, zero impact)
Create PubSubService (new file, zero impact)
Deploy - verify no regressions
Week 2: Low-Risk Migrations

Refactor PricingCacheService to use RedisManager
Refactor RateLimiter to use RedisManager
Update rateLimit.config.ts to use new store
Deploy - monitor connection count (should drop from 7 to 5)
Week 3: High-Risk Migrations

Refactor PermissionService (test RBAC extensively)
Refactor JWT blacklist (test logout flows)
Deploy - monitor auth endpoints closely
Week 4: Queue Migration (HIGHEST RISK)

Update QueueManager to use RedisManager.getBullMQConnection()
Test ALL 13 queues in staging
Deploy during low-traffic window
Monitor queue processing rates
Week 5: Service Layer (Tag Invalidation)

Implement CachedService base class
Migrate OrderService to tag-based invalidation
Migrate ShipmentService
Migrate WalletService
Deploy - measure cache hit rates
Week 6: Analytics (Stale-While-Revalidate)

Implement SWR for dashboard endpoints
Migrate analytics services
Frontend persistence setup
Deploy - measure dashboard load times
Success Metrics & Validation
Connection Count

Before: 7+ Redis connections per app instance
After: 3 connections (main, pub, sub) + BullMQ managed connections
Validation: redis-cli CLIENT LIST | grep Shipcrowd | wc -l
Cache Hit Rates (Target)

Zones: 70-80%
RateCards: 90%+
Order Lists: 60%+ (with tag invalidation)
Analytics: 80%+ (with SWR)
Performance Gains (Expected)

Dashboard load: 800ms → 200ms (75% improvement)
Order list API: 300ms → 50ms (83% improvement)
Pricing calculation: 50ms → 8ms (84% improvement - already achieved)
Memory Efficiency

Before: ~7 connection pools × 10 clients = 70 potential connections
After: 3 fixed connections + BullMQ workers = ~15-20 connections
Redis memory: Monitor with INFO memory (should stabilize <500MB for 100k keys)
Environment Variables (NEW)

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_CLUSTER=false # Set true for cluster mode
REDIS_MANAGER_ENABLED=true # Feature flag for migration
REDIS_MAX_RETRIES=10
REDIS_RETRY_DELAY=100

# Cache Configuration
CACHE_DEFAULT_TTL=3600
CACHE_ENABLE_TAGS=true
CACHE_ENABLE_SWR=true

# Monitoring
REDIS_MONITOR_ENABLED=false # Only enable for debugging
CACHE_METRICS_ENABLED=true
Testing Strategy
Unit Tests (Create these BEFORE migration):


describe('CacheRepository', () => {
  test('Tag invalidation removes all associated keys', async () => {
    const cache = new CacheRepository('test');
    
    await cache.setWithTags('list:1', { data: 'a' }, { tags: ['company:1:orders'] });
    await cache.setWithTags('list:2', { data: 'b' }, { tags: ['company:1:orders'] });
    
    await cache.invalidateTags(['company:1:orders']);
    
    expect(await cache.get('list:1')).toBeNull();
    expect(await cache.get('list:2')).toBeNull();
  });
});
Integration Tests:

Test RBAC invalidation across multiple app instances (simulate load balancer)
Test queue job processing during Redis failover
Test cache persistence during Redis restart
Load Tests:

1000 concurrent order creations (measure tag invalidation performance)
10000 permission checks (measure cache hit rate)
Analytics dashboard with 100 concurrent users (measure SWR effectiveness)
Rollback Plan (CRITICAL)
If migration fails:

Set REDIS_MANAGER_ENABLED=false
Old connections still exist in codebase (don't delete until Week 6)
Restart app - falls back to original architecture
Zero data loss (cache invalidation is non-destructive)
Canary Deployment:

Deploy to 1 server in cluster first
Monitor logs for 24h
Gradually roll out to remaining servers
Final Recommendations
DO THIS FIRST (Before any coding):

Set up Redis monitoring (RedisInsight or prometheus-exporter)
Document current cache hit rates (baseline)
Run Redis MONITOR for 1 hour to capture real traffic patterns
Create staging environment with production-like data
DON'T DO THIS:

❌ Big bang migration (too risky)
❌ Delete old connections immediately
❌ Skip testing tag invalidation (it's the core feature)
❌ Use KEYS command in production (your current code does this)
YOUR PLAN'S BIGGEST STRENGTH:
The Tier classification system is excellent. It provides clear mental models for developers.

YOUR PLAN'S BIGGEST WEAKNESS:
No migration strategy. You described the destination but not the journey. The enhanced plan above fills that gap with gradual rollout, feature flags, and rollback safety.

Would you like me to start implementing this enhanced plan? I recommend beginning with Phase 1 (RedisManager + CacheRepository) since those are additive changes with zero risk to existing functionality.