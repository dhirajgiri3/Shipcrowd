
import { RedisManager } from './redis.manager';
import logger from '../../shared/logger/winston.logger';
import Redis from 'ioredis';

export type CacheInvalidationMessage = {
    type: 'tags' | 'pattern' | 'key';
    target: string | string[];
    source?: string;
};

export class PubSubService {
    private static CHANNEL = 'shipcrowd:cache:invalidation';
    private static listeners: Map<string, (msg: CacheInvalidationMessage) => void> = new Map();
    private static isInitialized = false;

    /**
     * Initialize Subscriber with comprehensive error handling
     */
    static async initialize(): Promise<void> {
        if (this.isInitialized) {
            logger.warn('[PubSub] Already initialized, skipping...');
            return;
        }

        try {
            const subscriber = await RedisManager.getSubscriberClient() as Redis;

            // Subscribe to channel
            await subscriber.subscribe(this.CHANNEL);

            // Message handler with error isolation
            subscriber.on('message', async (channel, message) => {
                if (channel === this.CHANNEL) {
                    try {
                        await this.handleMessage(message);
                    } catch (error) {
                        logger.error('[PubSub] Message handler failed:', {
                            channel,
                            message: message.substring(0, 100), // Truncate for logging
                            error: error instanceof Error ? error.message : error
                        });
                        // Continue processing - don't let one bad message kill subscriber
                    }
                }
            });

            // Connection error handlers
            subscriber.on('error', (err) => {
                logger.error('[PubSub] Subscriber error:', err);
            });

            subscriber.on('close', () => {
                logger.warn('[PubSub] Subscriber closed, will auto-reconnect via IORedis');
                this.isInitialized = false;
            });

            subscriber.on('reconnecting', () => {
                logger.info('[PubSub] Subscriber reconnecting...');
            });

            subscriber.on('ready', () => {
                logger.info('[PubSub] Subscriber ready');
                this.isInitialized = true;
            });

            this.isInitialized = true;
            logger.info('[PubSub] Initialized cache invalidation bus');
        } catch (error) {
            logger.error('[PubSub] Failed to initialize:', error);
            throw error; // Re-throw to signal startup failure
        }
    }

    /**
     * Publish Invalidation Event
     */
    static async publish(message: CacheInvalidationMessage): Promise<void> {
        try {
            const publisher = await RedisManager.getPublisherClient() as Redis;
            await publisher.publish(this.CHANNEL, JSON.stringify(message));
            logger.debug('[PubSub] Published invalidation:', message);
        } catch (error) {
            logger.error('[PubSub] Failed to publish:', error);
        }
    }

    /**
     * Handle Incoming Message with isolated error handling per listener
     */
    private static async handleMessage(message: string): Promise<void> {
        try {
            const msg = JSON.parse(message) as CacheInvalidationMessage;

            // Call each listener with isolated error handling
            // Listeners are synchronous by type definition, but we wrap in Promise for safety
            for (const [id, listener] of this.listeners.entries()) {
                try {
                    listener(msg);
                } catch (error) {
                    logger.error(`[PubSub] Listener "${id}" failed:`, {
                        error: error instanceof Error ? error.message : error,
                        message: msg
                    });
                    // Continue with other listeners even if one fails
                }
            }
        } catch (err) {
            logger.error('[PubSub] Failed to parse message:', {
                error: err instanceof Error ? err.message : err,
                rawMessage: message.substring(0, 200)
            });
        }
    }

    /**
     * Register Listener
     */
    static onInvalidation(id: string, callback: (msg: CacheInvalidationMessage) => void): void {
        if (this.listeners.has(id)) {
            logger.warn(`[PubSub] Listener "${id}" already registered, overwriting...`);
        }
        this.listeners.set(id, callback);
        logger.debug(`[PubSub] Registered listener: ${id}`);
    }

    /**
     * Unregister Listener
     */
    static offInvalidation(id: string): boolean {
        const removed = this.listeners.delete(id);
        if (removed) {
            logger.debug(`[PubSub] Unregistered listener: ${id}`);
        }
        return removed;
    }
}
