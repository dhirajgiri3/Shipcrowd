
import Redis, { Cluster, RedisOptions } from 'ioredis';
import logger from '../../shared/logger/winston.logger';
import dotenv from 'dotenv';

dotenv.config();

export class RedisManager {
    private static mainClient: Redis | Cluster | null = null;
    private static subscriberClient: Redis | Cluster | null = null;
    private static publisherClient: Redis | Cluster | null = null;

    // Connection promises to prevent race conditions
    private static mainClientPromise: Promise<Redis | Cluster> | null = null;
    private static subscriberClientPromise: Promise<Redis | Cluster> | null = null;
    private static publisherClientPromise: Promise<Redis | Cluster> | null = null;

    // Circuit breaker state
    private static circuitOpen = false;
    private static lastFailure = 0;
    private static readonly CIRCUIT_RESET_TIMEOUT = 30000; // 30 seconds

    /**
     * Shared connection options for consistency
     */
    private static getBaseOptions(): RedisOptions {
        return {
            maxRetriesPerRequest: null, // Required for BullMQ
            enableReadyCheck: false,    // Required for BullMQ
            retryStrategy: (times: number) => {
                const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES || '10');
                if (times > maxRetries) {
                    logger.error('[RedisManager] Max retries exceeded');
                    return null; // Stop retrying
                }
                const delay = Math.min(times * 100, 3000);
                return delay;
            },
            reconnectOnError: (err: Error) => {
                const targetErrors = ['READONLY', 'ECONNRESET'];
                return targetErrors.some(e => err.message.includes(e));
            },
        };
    }

    /**
     * Get Connection URL or Config
     */
    private static getConnectionConfig(): string {
        return process.env.REDIS_URL || 'redis://localhost:6379';
    }

    /**
     * Initialize event handlers for a client
     */
    private static setupEventHandlers(client: Redis | Cluster, name: string) {
        client.on('connect', () => logger.info(`[Redis:${name}] Connected`));
        client.on('ready', () => logger.info(`[Redis:${name}] Ready`));
        client.on('error', (err) => logger.error(`[Redis:${name}] Error:`, err));
        client.on('close', () => logger.warn(`[Redis:${name}] Closed`));
        client.on('reconnecting', () => logger.info(`[Redis:${name}] Reconnecting`));
    }

    /**
     * Get Main Client (Get/Set/Cache)
     * Race-condition safe with circuit breaker
     */
    static async getMainClient(): Promise<Redis | Cluster> {
        // Fast path: client already ready
        if (this.mainClient && this.mainClient.status === 'ready') {
            return this.mainClient;
        }

        // Circuit breaker: fail fast if recently failed
        if (this.circuitOpen && Date.now() - this.lastFailure < this.CIRCUIT_RESET_TIMEOUT) {
            throw new Error('Redis circuit breaker open - connection recently failed');
        }

        // Race condition protection: wait for in-flight connection
        if (this.mainClientPromise) {
            return this.mainClientPromise;
        }

        // Create new connection promise
        this.mainClientPromise = this.createMainClient();

        try {
            this.mainClient = await this.mainClientPromise;
            this.circuitOpen = false; // Reset circuit on success
            return this.mainClient;
        } catch (error) {
            this.circuitOpen = true;
            this.lastFailure = Date.now();
            throw error;
        } finally {
            this.mainClientPromise = null; // Clear promise
        }
    }

    /**
     * Create Main Client (internal helper)
     */
    private static async createMainClient(): Promise<Redis | Cluster> {
        const url = this.getConnectionConfig();
        logger.info(`[RedisManager] Initializing MAIN client...`);

        const client = new Redis(url, this.getBaseOptions());
        this.setupEventHandlers(client, 'MAIN');

        // Wait for ready state with timeout
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Redis connection timeout after 10s'));
            }, 10000);

            client.once('ready', () => {
                clearTimeout(timeout);
                resolve(client);
            });

            client.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    /**
     * Get Subscriber Client (Pub/Sub)
     * Race-condition safe
     */
    static async getSubscriberClient(): Promise<Redis | Cluster> {
        if (this.subscriberClient && this.subscriberClient.status === 'ready') {
            return this.subscriberClient;
        }

        if (this.subscriberClientPromise) {
            return this.subscriberClientPromise;
        }

        this.subscriberClientPromise = this.createSubscriberClient();

        try {
            this.subscriberClient = await this.subscriberClientPromise;
            return this.subscriberClient;
        } finally {
            this.subscriberClientPromise = null;
        }
    }

    /**
     * Create Subscriber Client (internal helper)
     */
    private static async createSubscriberClient(): Promise<Redis | Cluster> {
        const url = this.getConnectionConfig();
        logger.info(`[RedisManager] Initializing SUBSCRIBER client...`);

        const client = new Redis(url, this.getBaseOptions());
        this.setupEventHandlers(client, 'SUBSCRIBER');

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Subscriber connection timeout after 10s'));
            }, 10000);

            client.once('ready', () => {
                clearTimeout(timeout);
                resolve(client);
            });

            client.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    /**
     * Get Publisher Client (Pub/Sub)
     * Race-condition safe
     */
    static async getPublisherClient(): Promise<Redis | Cluster> {
        if (this.publisherClient && this.publisherClient.status === 'ready') {
            return this.publisherClient;
        }

        if (this.publisherClientPromise) {
            return this.publisherClientPromise;
        }

        this.publisherClientPromise = this.createPublisherClient();

        try {
            this.publisherClient = await this.publisherClientPromise;
            return this.publisherClient;
        } finally {
            this.publisherClientPromise = null;
        }
    }

    /**
     * Create Publisher Client (internal helper)
     */
    private static async createPublisherClient(): Promise<Redis | Cluster> {
        const url = this.getConnectionConfig();
        logger.info(`[RedisManager] Initializing PUBLISHER client...`);

        const client = new Redis(url, this.getBaseOptions());
        this.setupEventHandlers(client, 'PUBLISHER');

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Publisher connection timeout after 10s'));
            }, 10000);

            client.once('ready', () => {
                clearTimeout(timeout);
                resolve(client);
            });

            client.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    /**
     * Get Connection Options for BullMQ
     * BullMQ needs raw options, it creates its own connections.
     */
    static getBullMQConnection(): any {
        const url = new URL(this.getConnectionConfig());
        return {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            db: parseInt(url.pathname.slice(1)) || 0,
            ...this.getBaseOptions(),
        };
    }

    /**
     * Graceful Shutdown
     */
    static async closeAll(): Promise<void> {
        const clients = [this.mainClient, this.subscriberClient, this.publisherClient];

        await Promise.all(
            clients.map(async (client) => {
                if (client) {
                    await client.quit();
                }
            })
        );

        this.mainClient = null;
        this.subscriberClient = null;
        this.publisherClient = null;

        logger.info('[RedisManager] All connections closed');
    }

    /**
     * Health Check
     */
    static async healthCheck(): Promise<boolean> {
        try {
            const client = await this.getMainClient();
            await client.ping();
            return true;
        } catch (error) {
            logger.error('[RedisManager] Health check failed', error);
            return false;
        }
    }
}
