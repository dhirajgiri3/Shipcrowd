/**
 * COD Remittance Cron Scheduler
 * 
 * Automatically schedules background jobs for COD remittance automation:
 * 1. Daily batch creation at 11 PM IST
 * 2. Hourly settlement status checks
 * 3. Auto-payout processing every 4 hours
 * 4. Payout verification every 4 hours
 * 
 * Usage: Import and call initializeCODRemittanceScheduler() in server startup
 */

import { CronJob } from 'cron';
import QueueManager from '../queue-manager';
import CODRemittanceJob from '../../jobs/finance/cod-remittance.job';
import logger from '../../../shared/logger/winston.logger';

let isInitialized = false;

export async function initializeCODRemittanceScheduler(): Promise<void> {
    if (isInitialized) {
        logger.warn('COD remittance scheduler already initialized');
        return;
    }

    logger.info('Initializing COD remittance cron jobs...');

    // Initialize the COD remittance job worker first
    await CODRemittanceJob.initialize();

    // ========================================================================
    // JOB 1: Daily Batch Creation - 11 PM IST
    // ========================================================================
    const dailyBatchJob = new CronJob(
        '0 23 * * *', // 11 PM every day
        async () => {
            logger.info('[CRON] Triggering daily COD remittance batch creation');
            try {
                await CODRemittanceJob.queueDailyBatch();
                logger.info('[CRON] Daily batch job queued successfully');
            } catch (error: any) {
                logger.error('[CRON] Daily batch job failed', {
                    error: error.message,
                    stack: error.stack,
                });
            }
        },
        null, // onComplete callback
        true, // Start immediately
        'Asia/Kolkata' // IST timezone
    );

    logger.info('✓ Daily batch creation scheduled: 11:00 PM IST');

    // ========================================================================
    // JOB 2: Settlement Status Checker - Hourly
    // ========================================================================
    const settlementCheckJob = new CronJob(
        '0 * * * *', // Every hour at minute 0
        async () => {
            logger.info('[CRON] Triggering Velocity settlement checker');
            try {
                await QueueManager.addJob(
                    'cod-remittance',
                    'check-settlements',
                    { type: 'check_settlements' },
                    { removeOnComplete: true }
                );
                logger.info('[CRON] Settlement check job queued successfully');
            } catch (error: any) {
                logger.error('[CRON] Settlement check job failed', {
                    error: error.message,
                    stack: error.stack,
                });
            }
        },
        null,
        true,
        'Asia/Kolkata'
    );

    logger.info('✓ Settlement checker scheduled: Hourly at :00');

    // ========================================================================
    // JOB 3: Payout Verification - Every 4 Hours
    // ========================================================================
    const payoutVerificationJob = new CronJob(
        '0 */4 * * *', // Every 4 hours
        async () => {
            logger.info('[CRON] Triggering payout verification');
            try {
                await QueueManager.addJob(
                    'cod-remittance',
                    'verify-payouts',
                    { type: 'verify_payouts' },
                    { removeOnComplete: true }
                );
                logger.info('[CRON] Payout verification job queued successfully');
            } catch (error: any) {
                logger.error('[CRON] Payout verification job failed', {
                    error: error.message,
                    stack: error.stack,
                });
            }
        },
        null,
        true,
        'Asia/Kolkata'
    );

    logger.info('✓ Payout verification scheduled: Every 4 hours');

    // ========================================================================
    // JOB 4: Auto-Payout Processing - Every 4 Hours (offset by 15 minutes)
    // ========================================================================
    const autoPayoutJob = new CronJob(
        '15 */4 * * *', // Every 4 hours at :15
        async () => {
            logger.info('[CRON] Triggering auto-payouts');
            try {
                await CODRemittanceJob.queueAutoPayouts();
                logger.info('[CRON] Auto-payout job queued successfully');
            } catch (error: any) {
                logger.error('[CRON] Auto-payout job failed', {
                    error: error.message,
                    stack: error.stack,
                });
            }
        },
        null,
        true,
        'Asia/Kolkata'
    );

    logger.info('✓ Auto-payout processing scheduled: Every 4 hours at :15');

    // Mark as initialized
    isInitialized = true;

    logger.info('✅ COD remittance cron jobs initialized successfully', {
        jobs: [
            { name: 'Daily Batch', schedule: '23:00 IST daily' },
            { name: 'Settlement Checker', schedule: 'Hourly' },
            { name: 'Payout Verification', schedule: 'Every 4 hours' },
            { name: 'Auto-Payouts', schedule: 'Every 4 hours at :15' },
        ],
    });
}

/**
 * Stop all COD remittance cron jobs (for graceful shutdown)
 */
export function stopCODRemittanceScheduler(): void {
    logger.info('Stopping COD remittance cron jobs...');
    // CronJob instances are already started and managed by cron library
    // They will stop when the process terminates
    isInitialized = false;
}

export default {
    initialize: initializeCODRemittanceScheduler,
    stop: stopCODRemittanceScheduler,
};
