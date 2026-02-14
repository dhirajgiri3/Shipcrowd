/**
 * Bulk Order Import Job
 *
 * Background job for processing large bulk order imports asynchronously:
 * - Processes files with 1000-20000+ rows in batches
 * - Tracks progress and status in database
 * - Handles errors gracefully per-row
 * - Updates job status for client polling
 */

import { Job } from 'bullmq';
import mongoose from 'mongoose';
import QueueManager from '../../utilities/queue-manager';
import logger from '../../../shared/logger/winston.logger';
import { BulkOrderImportJob } from '../../database/mongoose/models';
import { OrderService } from '../../../core/application/services/shipping/order.service';

export interface BulkOrderImportJobData {
    jobTrackingId: string;      // MongoDB _id of BulkOrderImportJob document
    companyId: string;
    rows: any[];                // Parsed rows from CSV/Excel
}

export interface BulkOrderImportJobResult {
    success: boolean;
    totalRows: number;
    successCount: number;
    errorCount: number;
}

export class BulkOrderImportJobProcessor {
    private static readonly QUEUE_NAME = 'bulk-order-import';
    private static readonly BATCH_SIZE = 1000; // Process 1000 rows per transaction

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 2, // Process 2 bulk imports concurrently
        });

        logger.info('Bulk Order Import worker initialized');
    }

    /**
     * Queue a new bulk import job
     */
    static async queueBulkImport(data: BulkOrderImportJobData): Promise<string> {
        const jobId = await QueueManager.addJob(
            this.QUEUE_NAME,
            `bulk-import-${data.jobTrackingId}`,
            data,
            {
                jobId: data.jobTrackingId, // Use tracking ID as job ID for idempotency
                removeOnComplete: 500,
                removeOnFail: false,
            }
        );

        logger.info('Bulk import job queued', {
            jobId,
            companyId: data.companyId,
            totalRows: data.rows.length,
        });

        return jobId;
    }

    /**
     * Process bulk import job
     */
    private static async processJob(job: Job<BulkOrderImportJobData>): Promise<BulkOrderImportJobResult> {
        const { jobTrackingId, companyId, rows } = job.data;

        logger.info('Processing bulk order import job', {
            jobId: job.id,
            jobTrackingId,
            companyId,
            totalRows: rows.length,
        });

        try {
            // Update job status to processing
            await BulkOrderImportJob.findByIdAndUpdate(
                jobTrackingId,
                {
                    status: 'processing',
                    startedAt: new Date(),
                },
                { new: true }
            );

            const totalRows = rows.length;
            const totalBatches = Math.ceil(totalRows / this.BATCH_SIZE);
            let processedRows = 0;
            let successCount = 0;
            let errorCount = 0;
            const allCreated: Array<{ orderNumber: string; id: any }> = [];
            const allErrors: Array<{ row: number; error: string; data?: any }> = [];

            // Process in batches
            for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
                const startIdx = batchIndex * this.BATCH_SIZE;
                const endIdx = Math.min(startIdx + this.BATCH_SIZE, totalRows);
                const batchRows = rows.slice(startIdx, endIdx);

                logger.info(`Processing batch ${batchIndex + 1}/${totalBatches}`, {
                    jobId: job.id,
                    startIdx,
                    endIdx,
                    batchSize: batchRows.length,
                });

                // Process batch using OrderService
                const batchResult = await OrderService.getInstance().bulkImportOrders({
                    rows: batchRows,
                    companyId: new mongoose.Types.ObjectId(companyId),
                });

                // Adjust row numbers in errors to match original file
                const adjustedErrors = batchResult.errors.map(err => ({
                    ...err,
                    row: err.row + startIdx,
                }));

                // Accumulate results
                allCreated.push(...batchResult.created);
                allErrors.push(...adjustedErrors);
                successCount += batchResult.created.length;
                errorCount += batchResult.errors.length;
                processedRows = endIdx;

                // Calculate progress
                const progress = Math.floor((processedRows / totalRows) * 100);

                // Update job progress in BullMQ
                await job.updateProgress(progress);

                // Update job tracking in database
                await BulkOrderImportJob.findByIdAndUpdate(
                    jobTrackingId,
                    {
                        processedRows,
                        successCount,
                        errorCount,
                        progress,
                        created: allCreated,
                        errors: allErrors,
                        'metadata.batchSize': this.BATCH_SIZE,
                        'metadata.batchesProcessed': batchIndex + 1,
                        'metadata.totalBatches': totalBatches,
                    },
                    { new: true }
                );

                logger.info(`Batch ${batchIndex + 1}/${totalBatches} completed`, {
                    jobId: job.id,
                    batchSuccess: batchResult.created.length,
                    batchErrors: batchResult.errors.length,
                    totalSuccess: successCount,
                    totalErrors: errorCount,
                    progress: `${progress}%`,
                });
            }

            // Mark job as completed
            await BulkOrderImportJob.findByIdAndUpdate(
                jobTrackingId,
                {
                    status: 'completed',
                    completedAt: new Date(),
                    processedRows: totalRows,
                    successCount,
                    errorCount,
                    progress: 100,
                },
                { new: true }
            );

            logger.info('Bulk order import job completed', {
                jobId: job.id,
                totalRows,
                successCount,
                errorCount,
            });

            return {
                success: true,
                totalRows,
                successCount,
                errorCount,
            };
        } catch (error: any) {
            logger.error('Bulk order import job failed', {
                jobId: job.id,
                jobTrackingId,
                error: error.message,
                stack: error.stack,
            });

            // Mark job as failed
            await BulkOrderImportJob.findByIdAndUpdate(
                jobTrackingId,
                {
                    status: 'failed',
                    completedAt: new Date(),
                    errorMessage: error.message,
                },
                { new: true }
            );

            throw error;
        }
    }
}
