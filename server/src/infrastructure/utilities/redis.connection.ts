import { createClient, RedisClientType } from 'redis';
import winston from 'winston';

/**
 * Redis Connection Manager
 *
 * Manages Redis connection for BullMQ queues with automatic reconnection
 * and error handling.
 */

export class RedisConnection {
  private static instance: RedisClientType | null = null;
  private static logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  /**
   * Get Redis connection (singleton)
   */
  static async getConnection(): Promise<RedisClientType> {
    if (this.instance && this.instance.isOpen) {
      return this.instance;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.logger.info('Connecting to Redis', { url: redisUrl.replace(/:[^:]*@/, ':***@') });

    this.instance = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            this.logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          const delay = Math.min(retries * 100, 3000);
          this.logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
      },
    });

    // Event listeners
    this.instance.on('error', (err) => {
      this.logger.error('Redis client error', { error: err.message });
    });

    this.instance.on('connect', () => {
      this.logger.info('Redis client connected');
    });

    this.instance.on('ready', () => {
      this.logger.info('Redis client ready');
    });

    this.instance.on('end', () => {
      this.logger.warn('Redis client disconnected');
    });

    this.instance.on('reconnecting', () => {
      this.logger.info('Redis client reconnecting');
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
      this.logger.info('Redis connection closed');
    }
  }

  /**
   * Test Redis connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const client = await this.getConnection();
      await client.ping();
      this.logger.info('Redis connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Redis connection test failed', { error });
      return false;
    }
  }
}

export default RedisConnection;
