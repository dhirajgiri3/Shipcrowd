/**
 * Email Worker Initialization
 * 
 * Initializes and starts the email queue worker
 */

import { registerEmailWorker } from '../infrastructure/jobs/processors/email.processor';
import logger from '../shared/logger/winston.logger';

/**
 * Initialize email worker
 */
export async function initializeEmailWorker(): Promise<void> {
    try {
        logger.info('Initializing email worker...');

        const worker = registerEmailWorker();

        logger.info('✅ Email worker initialized successfully');

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, closing email worker...');
            await worker.close();
            logger.info('Email worker closed');
        });

        process.on('SIGINT', async () => {
            logger.info('SIGINT received, closing email worker...');
            await worker.close();
            logger.info('Email worker closed');
        });
    } catch (error) {
        logger.error('Failed to initialize email worker:', error);
        throw error;
    }
}
