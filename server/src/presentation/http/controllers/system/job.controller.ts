import { Request, Response } from 'express';
import JobFailureLog from '../../../../infrastructure/database/mongoose/models/system/job-failure-log.model';
import QueueManager from '../../../../infrastructure/utilities/queue-manager';
import { NotFoundError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

export class JobController {
    /**
     * List failed jobs
     */
    async listFailedJobs(req: Request, res: Response): Promise<void> {
        const { page = 1, limit = 50, status = 'open', queueName } = req.query;

        const query: any = {};
        if (status) query.status = status;
        if (queueName) query.queueName = queueName;

        const skip = (Number(page) - 1) * Number(limit);

        const [jobs, total] = await Promise.all([
            JobFailureLog.find(query)
                .sort({ failedAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            JobFailureLog.countDocuments(query)
        ]);

        sendSuccess(res, {
            jobs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }

    /**
     * Retry a failed job
     */
    async retryJob(req: Request, res: Response): Promise<void> {
        const { jobId } = req.params;
        const userId = (req as any).user?._id;

        const failureLog = await JobFailureLog.findOne({ jobId });
        if (!failureLog) {
            throw new NotFoundError('Job failure log not found');
        }

        if (failureLog.status === 'resolved') {
            // Already resolved, just return success or info
            sendSuccess(res, { message: 'Job already resolved' });
            return;
        }

        // Re-queue the job
        try {
            await QueueManager.addJob(
                failureLog.queueName,
                failureLog.jobName,
                failureLog.data,
                {
                    attempts: 3, // Reset attempts for manual retry
                    backoff: { type: 'exponential', delay: 1000 }
                }
            );

            // Mark log as resolved
            failureLog.status = 'resolved';
            failureLog.resolutionNotes = 'Manually retried via Admin API';
            failureLog.resolvedBy = userId;
            failureLog.resolvedAt = new Date();
            await failureLog.save();

            logger.info('Manually retried failed job', {
                originalJobId: jobId,
                queue: failureLog.queueName,
                userId
            });

            sendSuccess(res, { message: 'Job queued for retry' });
        } catch (error: any) {
            logger.error('Failed to manually retry job', { error: error.message, jobId });
            throw error;
        }
    }
}

