import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { RedisManager } from '../redis/redis.manager'; // Updated import
import logger from '../../shared/logger/winston.logger';
import JobFailureLog from '../database/mongoose/models/system/job-failure-log.model';


/**
 * QueueManager
 *
 * Centralized queue management for BullMQ with Redis.
 */

interface QueueConfig {
  name: string;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  };
}

interface WorkerConfig {
  queueName: string;
  processor: (job: Job) => Promise<any>;
  concurrency?: number;
}

export class QueueManager {
  private static queues: Map<string, Queue> = new Map();
  private static workers: Map<string, Worker> = new Map();
  private static queueEvents: Map<string, QueueEvents> = new Map();


  /**
   * Initialize queue manager
   */
  static async initialize(): Promise<void> {
    logger.info('Initializing Queue Manager');

    // Test Redis connection via Manager
    const isConnected = await RedisManager.healthCheck();
    if (!isConnected) {
      throw new Error('Failed to connect to Redis');
    }

    // Create Shopify queues
    await this.createQueue({
      name: 'shopify-order-sync',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    await this.createQueue({
      name: 'shopify-inventory-sync',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    await this.createQueue({
      name: 'shopify-webhook-process',
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    });

    // Create WooCommerce queues
    await this.createQueue({
      name: 'woocommerce-order-sync',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    await this.createQueue({
      name: 'woocommerce-webhook-process',
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    });

    // Create Flipkart queues
    await this.createQueue({
      name: 'flipkart-order-sync',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    await this.createQueue({
      name: 'flipkart-webhook-process',
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    });

    // Create Amazon queues
    await this.createQueue({
      name: 'amazon-order-sync',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    await this.createQueue({
      name: 'amazon-inventory-sync',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    // Create NDR/RTO queues
    await this.createQueue({
      name: 'ndr-resolution',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });

    await this.createQueue({
      name: 'ndr-detection',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    // Create Email queue
    await this.createQueue({
      name: 'email-queue',
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 60000 },
        removeOnComplete: { age: 3600, count: 1000 } as any,
        removeOnFail: false
      },
    });

    // Create Weight Dispute queue
    await this.createQueue({
      name: 'weight-dispute',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });

    // Create COD Remittance queue
    await this.createQueue({
      name: 'cod-remittance',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });

    // Create Payout queue (Saga Pattern)
    await this.createQueue({
      name: 'payout-queue',
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 10000 }, // 10s backoff
        removeOnComplete: 500,
        removeOnFail: false, // Keep failed jobs for manual inspection
      },
    });

    // Create Carrier Sync queue
    await this.createQueue({
      name: 'carrier-sync',
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30000 }, // 30s initial delay
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    // Create Manifest Pickup Retry queue
    await this.createQueue({
      name: 'manifest-pickup-retry',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 }, // 1 minute initial delay
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    // Create Outbound Webhook queue
    await this.createQueue({
      name: 'outbound-webhooks',
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30000 }, // 30s initial retry delay
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    });

    // Create Warehouse Sync queue
    await this.createQueue({
      name: 'warehouse-sync',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 }, // 30s initial delay
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    // Create Seller Policy Bootstrap queue
    await this.createQueue({
      name: 'seller-policy-bootstrap',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    logger.info('Queue Manager initialized', {
      queues: Array.from(this.queues.keys()),
    });
  }

  /**
   * Create a queue
   */
  static async createQueue(config: QueueConfig): Promise<Queue> {
    const { name, defaultJobOptions } = config;

    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const connection = RedisManager.getBullMQConnection();

    const queue = new Queue(name, {
      connection,
      defaultJobOptions,
    });

    // Setup queue events
    const events = new QueueEvents(name, { connection });

    events.on('completed', ({ jobId, returnvalue }) => {
      logger.debug('Job completed', { queue: name, jobId, returnvalue });
    });

    events.on('failed', async ({ jobId, failedReason }) => {
      logger.error('Job failed', { queue: name, jobId, failedReason });

      // ✅ Archive failure to database
      try {
        const job = await queue.getJob(jobId);
        if (job) {
          // Only log if it has exhausted attempts or is a permanent failure
          // Note: 'failed' event fires on every attempt failure. 
          // We check if attemptsMade >= opts.attempts to determine if it's the "final" failure
          const maxAttempts = job.opts.attempts || 1;

          if (job.attemptsMade >= maxAttempts) {
            await JobFailureLog.create({
              jobId,
              queueName: name,
              jobName: job.name,
              data: job.data,
              error: failedReason,
              stackTrace: job.stacktrace ? job.stacktrace.join('\n') : undefined,
              attemptsMade: job.attemptsMade,
              failedAt: new Date(),
              status: 'open'
            });
            logger.info('Job failure archived to DB', { jobId, queue: name });
          }
        }
      } catch (err) {
        logger.error('Failed to archive job failure', { jobId, error: err });
      }
    });

    events.on('progress', ({ jobId, data }) => {
      logger.debug('Job progress', { queue: name, jobId, progress: data });
    });

    this.queues.set(name, queue);
    this.queueEvents.set(name, events);

    logger.info('Queue created', { name });

    return queue;
  }

  /**
   * Get queue by name
   */
  static getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  /**
   * Get email queue
   */
  static getEmailQueue(): Queue {
    const queue = this.getQueue('email-queue');
    if (!queue) {
      throw new Error('Email queue not initialized');
    }
    return queue;
  }

  /**
   * Register a worker for a queue
   */
  static async registerWorker(config: WorkerConfig): Promise<Worker> {
    const { queueName, processor, concurrency = 1 } = config;

    if (this.workers.has(queueName)) {
      logger.warn('Worker already registered', { queue: queueName });
      return this.workers.get(queueName)!;
    }

    const connection = RedisManager.getBullMQConnection();

    const worker = new Worker(queueName, processor, {
      connection,
      concurrency,
      limiter: {
        max: 10,
        duration: 1000,
      },
    });

    // Worker event handlers
    worker.on('completed', (job, result) => {
      logger.info('Worker completed job', {
        queue: queueName,
        jobId: job.id,
        duration: Date.now() - job.timestamp,
      });
    });

    worker.on('failed', (job, error) => {
      logger.error('Worker failed job', {
        queue: queueName,
        jobId: job?.id,
        error: error.message,
        attempts: job?.attemptsMade,
      });
    });

    worker.on('error', (error) => {
      logger.error('Worker error', {
        queue: queueName,
        error: error.message,
      });
    });

    worker.on('stalled', (jobId) => {
      logger.warn('Job stalled', {
        queue: queueName,
        jobId,
      });
    });

    this.workers.set(queueName, worker);

    logger.info('Worker registered', {
      queue: queueName,
      concurrency,
    });

    return worker;
  }

  /**
   * Add job to queue
   */
  static async addJob(
    queueName: string,
    jobName: string,
    data: any,
    options?: any
  ): Promise<Job> {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(jobName, data, options);

    logger.debug('Job added to queue', {
      queue: queueName,
      jobName,
      jobId: job.id,
    });

    return job;
  }

  /**
   * Add repeatable job (cron)
   */
  static async addRepeatableJob(
    queueName: string,
    jobName: string,
    data: any,
    cronExpression: string
  ): Promise<Job> {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(jobName, data, {
      repeat: {
        pattern: cronExpression,
      },
    });

    logger.info('Repeatable job added', {
      queue: queueName,
      jobName,
      cron: cronExpression,
    });

    return job;
  }

  /**
   * Remove repeatable job
   */
  static async removeRepeatableJob(
    queueName: string,
    jobKey: string
  ): Promise<boolean> {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const removed = await queue.removeRepeatableByKey(jobKey);

    logger.info('Repeatable job removed', {
      queue: queueName,
      jobKey,
      removed,
    });

    return removed;
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Get all queue statistics
   */
  static async getAllQueueStats() {
    const stats: Record<string, any> = {};

    for (const queueName of this.queues.keys()) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return stats;
  }

  /**
   * Clean old jobs from queue
   */
  static async cleanQueue(
    queueName: string,
    grace: number = 86400000 // 24 hours
  ): Promise<void> {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    // Clean completed jobs older than grace period
    await queue.clean(grace, 100, 'completed');

    // Clean failed jobs older than grace period
    await queue.clean(grace, 100, 'failed');

    logger.info('Queue cleaned', {
      queue: queueName,
      gracePeriod: grace,
    });
  }

  /**
   * Pause queue
   */
  static async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();

    logger.info('Queue paused', { queue: queueName });
  }

  /**
   * Resume queue
   */
  static async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();

    logger.info('Queue resumed', { queue: queueName });
  }

  /**
   * Shutdown all queues and workers gracefully
   */
  static async shutdown(): Promise<void> {
    logger.info('Shutting down Queue Manager');

    // Close all workers
    for (const [name, worker] of this.workers.entries()) {
      await worker.close();
      logger.info('Worker closed', { queue: name });
    }

    // Close all queue events
    for (const [name, events] of this.queueEvents.entries()) {
      await events.close();
      logger.info('Queue events closed', { queue: name });
    }

    // Close all queues
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      logger.info('Queue closed', { queue: name });
    }

    // RedisManager handles its own connection closing

    this.queues.clear();
    this.workers.clear();
    this.queueEvents.clear();

    logger.info('Queue Manager shutdown complete');
  }
}

export default QueueManager;
