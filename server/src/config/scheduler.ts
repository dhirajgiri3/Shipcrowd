import { CronJob } from 'cron';
import logger from '../shared/logger/winston.logger';
import { processScheduledDeletions } from '../infrastructure/jobs/system/maintenance/account-deletion.job';
import WeightDisputeJob from '../infrastructure/jobs/disputes/weight-dispute.job';
import CODRemittanceJob from '../infrastructure/jobs/finance/cod-remittance.job';
import InvoiceGenerationJob from '../infrastructure/jobs/finance/invoice-generation.job';
import LostShipmentDetectionJob from '../infrastructure/jobs/logistics/shipping/lost-shipment-detection.job';
import { startAutoRechargeScheduler } from '../infrastructure/schedulers/auto-recharge.scheduler';

/**
 * Initialize all scheduled jobs
 */
export const initializeScheduler = (): void => {
  try {
    // Schedule account deletion job to run daily at 3 AM
    const accountDeletionJob = new CronJob('0 3 * * *', async () => {
      try {
        await processScheduledDeletions();
      } catch (error) {
        logger.error('Error running scheduled account deletion job:', error);
      }
    });

    // Start the jobs
    accountDeletionJob.start();

    // Weight Dispute Automation
    // 1. Auto-resolve expired disputes (Daily at 2 AM)
    const wdAutoResolveJob = new CronJob('0 2 * * *', async () => {
      try {
        await WeightDisputeJob.queueAutoResolve();
      } catch (error) {
        logger.error('Error queuing WD auto-resolve job:', error);
      }
    });
    wdAutoResolveJob.start();

    // 2. Fraud Pattern Detection (Hourly at :00)
    const wdFraudCheckJob = new CronJob('0 * * * *', async () => {
      try {
        await WeightDisputeJob.queueFraudCheck();
      } catch (error) {
        logger.error('Error queuing WD fraud check job:', error);
      }
    });
    wdFraudCheckJob.start();

    // 3. Scan for pending updates (Hourly at :30)
    const wdScanUpdatesJob = new CronJob('30 * * * *', async () => {
      try {
        await WeightDisputeJob.queueScanUpdates();
      } catch (error) {
        logger.error('Error queuing WD scan updates job:', error);
      }
    });
    wdScanUpdatesJob.start();

    // COD Remittance Automation
    // 1. Daily Batch Creation (Daily at 4 AM)
    const codBatchJob = new CronJob('0 4 * * *', async () => {
      try {
        await CODRemittanceJob.queueDailyBatch();
      } catch (error) {
        logger.error('Error queuing COD daily batch job:', error);
      }
    });
    codBatchJob.start();

    // 2. Auto-Payout Processor (Every hour at :15)
    const codPayoutJob = new CronJob('15 * * * *', async () => {
      try {
        await CODRemittanceJob.queueAutoPayouts();
      } catch (error) {
        logger.error('Error queuing COD auto-payout job:', error);
      }
    });
    codPayoutJob.start();

    // Lost Shipment Detection (Daily at 5:30 AM)
    const lostShipmentJob = new CronJob('30 5 * * *', async () => {
      try {
        await LostShipmentDetectionJob.queueDailyDetection();
      } catch (error) {
        logger.error('Error queuing lost shipment detection job:', error);
      }
    });
    lostShipmentJob.start();

    // Auto-Recharge (Every 5 minutes or configured)
    startAutoRechargeScheduler();

    // Monthly Invoice Generation (1st of every month at 01:00 AM)
    const invoiceJob = new CronJob('0 1 1 * *', async () => {
      try {
        await InvoiceGenerationJob.queueMonthlyGeneration();
      } catch (error) {
        logger.error('Error queuing invoice generation job:', error);
      }
    });
    invoiceJob.start();

    logger.info('Scheduler initialized successfully');
  } catch (error) {
    logger.error('Error initializing scheduler:', error);
  }
};

export default {
  initializeScheduler,
};
