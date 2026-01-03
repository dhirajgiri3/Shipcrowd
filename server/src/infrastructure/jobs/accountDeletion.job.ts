import User from '../database/mongoose/models/user.model';
import { permanentlyDeleteAccount } from '../../core/application/services/user/account.service';
import logger from '../../shared/logger/winston.logger';
import mongoose from 'mongoose';

/**
 * Process scheduled account deletions
 * This job runs daily to check for accounts that have passed their scheduled deletion date
 */
export const processScheduledDeletions = async (): Promise<void> => {
  try {
    logger.info('Starting scheduled account deletion job');

    // Find accounts that have passed their scheduled deletion date
    const accounts = await User.find({
      scheduledDeletionDate: { $lt: new Date() },
      isDeleted: false,
    });

    logger.info(`Found ${accounts.length} accounts to process for deletion`);

    // Process each account
    for (const account of accounts) {
      try {
        // Anonymize the account (default behavior)
        const userId = account._id instanceof mongoose.Types.ObjectId ? account._id : String(account._id);
        await permanentlyDeleteAccount(userId, true);
        logger.info(`Successfully processed deletion for account: ${userId}`);
      } catch (error) {
        const accountId = account._id instanceof mongoose.Types.ObjectId ? account._id.toString() : String(account._id);
        logger.error(`Error processing deletion for account ${accountId}:`, error);
      }
    }

    logger.info('Completed scheduled account deletion job');
  } catch (error) {
    logger.error('Error in scheduled account deletion job:', error);
  }
};

export default {
  processScheduledDeletions,
};
