import { createClient, RedisClientType } from 'redis';
import logger from '../../shared/logger/winston.logger';

/**
 * Redis Connection Manager
 *
 * Manages Redis connection for BullMQ queues with automatic reconnection
 * and error handling.
 */

export class RedisConnection {
  private static instance: RedisClientType | null = null;

  /**
   * Get Redis connection (singleton)
   */
  static async getConnection(): Promise<RedisClientType> {
    if (this.instance && this.instance.isOpen) {
      return this.instance;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    logger.info('Connecting to Redis', { url: redisUrl.replace(/:[^:]*@/, ':***@') });

    this.instance = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          const delay = Math.min(retries * 100, 3000);
          logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
      },
    });

    // Event listeners
    this.instance.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    this.instance.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.instance.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.instance.on('end', () => {
      logger.warn('Redis client disconnected');
    });

    this.instance.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    await this.instance.connect();

    return this.instance;
  }

  /**
   * Get Redis connection options for BullMQ
   */
  static getConnectionOptions() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const url = new URL(redisUrl);

    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      db: parseInt(url.pathname.slice(1)) || 0,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false, // Required for BullMQ
    };
  }

  /**
   * Close Redis connection
   */
  static async close(): Promise<void> {
    if (this.instance && this.instance.isOpen) {
      await this.instance.quit();
      this.instance = null;
      logger.info('Redis connection closed');
    }
  }

  /**
   * Test Redis connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const client = await this.getConnection();
      await client.ping();
      logger.info('Redis connection test successful');
      return true;
    } catch (error) {
      logger.error('Redis connection test failed', { error });
      return false;
    }
  }
}

export default RedisConnection;
