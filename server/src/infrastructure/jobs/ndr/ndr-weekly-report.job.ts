import { Job } from 'bullmq';
import QueueManager from '../../utilities/queue-manager';
import logger from '../../../shared/logger/winston.logger';
import Company from '../../../infrastructure/database/mongoose/models/organization/core/company.model';
import NDRReportService from '../../../core/application/services/ndr/ndr-report.service';

/**
 * NDR Weekly Report Job
 * 
 * Background job to generate and send weekly NDR reports to all active companies.
 */
export class NDRWeeklyReportJob {
    private static readonly QUEUE_NAME = 'ndr-reports';

    /**
     * Initialize worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 5, // Process 5 reports in parallel
        });

        logger.info('NDR weekly report worker initialized');
    }

    /**
     * Queue weekly report jobs for all companies
     * Triggered by Scheduler
     */
    static async queueWeeklyReports(): Promise<void> {
        try {
            logger.info('Starting weekly NDR report generation...');

            // Fetch all active companies
            // In a real scenario, we might want to paginate this or filter by subscription status
            const companies = await Company.find({ status: 'active' }, '_id name');

            logger.info(`Found ${companies.length} companies for NDR reporting`);

            for (const company of companies) {
                await QueueManager.addJob(
                    this.QUEUE_NAME,
                    'generate-report',
                    { companyId: company._id.toString() },
                    {
                        jobId: `ndr-weekly-report-${company._id}-${new Date().toISOString().split('T')[0]}`,
                        removeOnComplete: true,
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 5000,
                        },
                    }
                );
            }

            logger.info(`Queued ${companies.length} weekly report jobs`);
        } catch (error) {
            logger.error('Error queuing weekly NDR reports:', error);
        }
    }

    /**
     * Process individual report job
     */
    static async processJob(job: Job): Promise<void> {
        const { companyId } = job.data;

        if (!companyId) {
            throw new Error('Company ID is required for NDR report job');
        }

        try {
            logger.info(`Processing weekly NDR report for company: ${companyId}`);
            await NDRReportService.sendWeeklyReport(companyId);
            logger.info(`Successfully sent weekly NDR report for company: ${companyId}`);
        } catch (error) {
            logger.error(`Failed to generate NDR report for company ${companyId}:`, error);
            throw error; // Let BullMQ handle retries
        }
    }
}

export default NDRWeeklyReportJob;
