import { Request, Response } from 'express';
import QueueManager from '../../../../infrastructure/utilities/queue-manager.js';
import logger from '../../../../shared/logger/winston.logger.js';

/**
 * Email Queue Controller
 * 
 * Admin endpoints for monitoring and managing the email queue
 */

/**
 * Get email queue statistics
 */
export async function getEmailQueueStats(req: Request, res: Response): Promise<void> {
    try {
        const emailQueue = QueueManager.getEmailQueue();

        const [waiting, active, completed, failed, delayed] = await Promise.all([
            emailQueue.getWaitingCount(),
            emailQueue.getActiveCount(),
            emailQueue.getCompletedCount(),
            emailQueue.getFailedCount(),
            emailQueue.getDelayedCount(),
        ]);

        const total = waiting + active + completed + failed + delayed;
        const health = failed < 10 ? 'healthy' : failed < 50 ? 'degraded' : 'critical';

        res.json({
            success: true,
            data: {
                waiting,
                active,
                completed,
                failed,
                delayed,
                total,
                health,
                successRate: total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : 'N/A',
            },
        });
    } catch (error) {
        logger.error('Error getting email queue stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get email queue statistics',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

/**
 * Get failed emails
 */
export async function getFailedEmails(req: Request, res: Response): Promise<void> {
    try {
        const { page = 1, limit = 50 } = req.query;
        const start = (Number(page) - 1) * Number(limit);
        const end = start + Number(limit);

        const emailQueue = QueueManager.getEmailQueue();
        const failed = await emailQueue.getFailed(start, end);

        const failedJobs = failed.map(job => ({
            id: job.id,
            type: job.data.type,
            to: job.data.to,
            subject: job.data.subject,
            failedAt: job.finishedOn,
            error: job.failedReason,
            attempts: job.attemptsMade,
            data: job.data,
            stacktrace: job.stacktrace,
        }));

        const totalFailed = await emailQueue.getFailedCount();

        res.json({
            success: true,
            data: {
                jobs: failedJobs,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: totalFailed,
                    pages: Math.ceil(totalFailed / Number(limit)),
                },
            },
        });
    } catch (error) {
        logger.error('Error getting failed emails:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get failed emails',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

/**
 * Retry a failed email
 */
export async function retryFailedEmail(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const emailQueue = QueueManager.getEmailQueue();

        const job = await emailQueue.getJob(jobId);

        if (!job) {
            res.status(404).json({
                success: false,
                message: 'Email job not found',
            });
            return;
        }

        await job.retry();

        logger.info(`Email job ${jobId} queued for retry`, {
            type: job.data.type,
            to: job.data.to,
        });

        res.json({
            success: true,
            message: `Email job ${jobId} queued for retry`,
            data: {
                jobId,
                type: job.data.type,
                to: job.data.to,
            },
        });
    } catch (error) {
        logger.error('Error retrying failed email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retry email',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

/**
 * Retry all failed emails
 */
export async function retryAllFailedEmails(req: Request, res: Response): Promise<void> {
    try {
        const emailQueue = QueueManager.getEmailQueue();
        const failed = await emailQueue.getFailed(0, 1000); // Get up to 1000 failed jobs

        let retried = 0;
        for (const job of failed) {
            try {
                await job.retry();
                retried++;
            } catch (error) {
                logger.error(`Failed to retry job ${job.id}:`, error);
            }
        }

        logger.info(`Retried ${retried} failed email jobs`);

        res.json({
            success: true,
            message: `Successfully queued ${retried} emails for retry`,
            data: {
                retried,
                total: failed.length,
            },
        });
    } catch (error) {
        logger.error('Error retrying all failed emails:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retry emails',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

/**
 * Delete a failed email job
 */
export async function deleteFailedEmail(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const emailQueue = QueueManager.getEmailQueue();

        const job = await emailQueue.getJob(jobId);

        if (!job) {
            res.status(404).json({
                success: false,
                message: 'Email job not found',
            });
            return;
        }

        await job.remove();

        logger.info(`Email job ${jobId} deleted`, {
            type: job.data.type,
            to: job.data.to,
        });

        res.json({
            success: true,
            message: `Email job ${jobId} deleted`,
        });
    } catch (error) {
        logger.error('Error deleting failed email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete email job',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

/**
 * Clean completed jobs from queue
 */
export async function cleanCompletedJobs(req: Request, res: Response): Promise<void> {
    try {
        const { olderThan = 3600000 } = req.query; // Default: 1 hour
        const emailQueue = QueueManager.getEmailQueue();

        await emailQueue.clean(Number(olderThan), 1000, 'completed');

        logger.info(`Cleaned completed email jobs older than ${olderThan}ms`);

        res.json({
            success: true,
            message: 'Completed jobs cleaned successfully',
        });
    } catch (error) {
        logger.error('Error cleaning completed jobs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clean completed jobs',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

/**
 * Get recent email jobs (completed and failed)
 */
export async function getRecentJobs(req: Request, res: Response): Promise<void> {
    try {
        const { limit = 20 } = req.query;
        const emailQueue = QueueManager.getEmailQueue();

        const [completed, failed] = await Promise.all([
            emailQueue.getCompleted(0, Number(limit)),
            emailQueue.getFailed(0, Number(limit)),
        ]);

        const recentJobs = [
            ...completed.map(job => ({
                id: job.id,
                type: job.data.type,
                to: job.data.to,
                subject: job.data.subject,
                status: 'completed',
                completedAt: job.finishedOn,
                attempts: job.attemptsMade,
            })),
            ...failed.map(job => ({
                id: job.id,
                type: job.data.type,
                to: job.data.to,
                subject: job.data.subject,
                status: 'failed',
                failedAt: job.finishedOn,
                error: job.failedReason,
                attempts: job.attemptsMade,
            })),
        ].sort((a, b) => {
            const timeA = (a as any).completedAt || (a as any).failedAt || 0;
            const timeB = (b as any).completedAt || (b as any).failedAt || 0;
            return timeB - timeA;
        }).slice(0, Number(limit));

        res.json({
            success: true,
            data: {
                jobs: recentJobs,
            },
        });
    } catch (error) {
        logger.error('Error getting recent jobs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recent jobs',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
