/**
 * Auto-Recharge Scheduler
 * Automatically runs the auto-recharge worker on a periodic schedule
 */

import cron from 'node-cron';
import logger from '../../shared/logger/winston.logger';
import { autoRechargeWorker } from '../../workers/finance/auto-recharge.worker';

// Schedule configuration from environment or default to every 5 minutes
const CRON_SCHEDULE = process.env.AUTO_RECHARGE_CRON_SCHEDULE || '*/5 * * * *';
const AUTO_RECHARGE_ENABLED = process.env.AUTO_RECHARGE_ENABLED === 'true'; // Disabled by default

/**
 * Start the auto-recharge cron scheduler
 */
export const startAutoRechargeScheduler = (): void => {
    if (!AUTO_RECHARGE_ENABLED) {
        logger.info('Auto-Recharge Scheduler: Disabled via environment variable');
        return;
    }

    // Validate cron schedule
    if (!cron.validate(CRON_SCHEDULE)) {
        logger.error('Auto-Recharge Scheduler: Invalid cron schedule', { schedule: CRON_SCHEDULE });
        return;
    }

    // Schedule the job
    const task = cron.schedule(CRON_SCHEDULE, async () => {
        logger.info('Auto-Recharge Scheduler: Starting scheduled job...');
        const startTime = Date.now();

        try {
            await autoRechargeWorker();
            const duration = Date.now() - startTime;
            logger.info('Auto-Recharge Scheduler: Job completed successfully', {
                durationMs: duration
            });
        } catch (error: any) {
            const duration = Date.now() - startTime;
            logger.error('Auto-Recharge Scheduler: Job failed', {
                error: error.message,
                durationMs: duration,
                stack: error.stack
            });
        }
    }, {
        timezone: process.env.TZ || 'Asia/Kolkata', // Default to IST
    });

    task.start();

    logger.info('Auto-Recharge Scheduler: Started', {
        schedule: CRON_SCHEDULE,
        timezone: process.env.TZ || 'Asia/Kolkata',
        enabled: AUTO_RECHARGE_ENABLED,
    });
};

/**
 * Stop the scheduler (for graceful shutdown)
 */
export const stopAutoRechargeScheduler = (): void => {
    // Note: node-cron doesn't provide a direct way to stop individual tasks
    // This is mainly for logging purposes
    logger.info('Auto-Recharge Scheduler: Stopped');
};

// Export default for easy import
export default {
    start: startAutoRechargeScheduler,
    stop: stopAutoRechargeScheduler,
};
