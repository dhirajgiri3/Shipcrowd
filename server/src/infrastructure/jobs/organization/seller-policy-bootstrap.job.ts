import { Job } from 'bullmq';
import sellerPolicyBootstrapService from '../../../core/application/services/organization/seller-policy-bootstrap.service';
import QueueManager from '../../utilities/queue-manager';
import logger from '../../../shared/logger/winston.logger';

interface SellerPolicyBootstrapJobData {
    companyId: string;
    triggeredBy: string;
    preserveExisting?: boolean;
}

export class SellerPolicyBootstrapJob {
    private static readonly QUEUE_NAME = 'seller-policy-bootstrap';
    private static readonly JOB_NAME = 'bootstrap-seller-policies';

    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 1,
        });

        logger.info('Seller policy bootstrap worker initialized');
    }

    static async enqueue(data: SellerPolicyBootstrapJobData): Promise<void> {
        await QueueManager.addJob(this.QUEUE_NAME, this.JOB_NAME, data, {
            removeOnComplete: 100,
            removeOnFail: 500,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
    }

    private static async processJob(job: Job<SellerPolicyBootstrapJobData>) {
        const { companyId, triggeredBy, preserveExisting } = job.data;

        logger.info('Processing seller policy bootstrap job', {
            jobId: job.id,
            companyId,
            preserveExisting,
        });

        const result = await sellerPolicyBootstrapService.bootstrapForCompany(
            companyId,
            triggeredBy,
            { preserveExisting }
        );

        logger.info('Seller policy bootstrap job completed', {
            jobId: job.id,
            companyId,
            created: result.created,
            skipped: result.skipped,
        });

        return result;
    }
}

export default SellerPolicyBootstrapJob;
