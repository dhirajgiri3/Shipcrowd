import { CronJob } from 'cron';
import { processScheduledDeletions } from '../../../jobs/accountDeletion.job';
import logger from '../../../../shared/logger/winston.logger';

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
    
    logger.info('Scheduler initialized successfully');
  } catch (error) {
    logger.error('Error initializing scheduler:', error);
  }
};

export default {
  initializeScheduler,
};
