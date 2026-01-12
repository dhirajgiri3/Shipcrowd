/**
 * COD Remittance Job
 *
 * Background job for remittance automation:
 * 1. Daily remittance batch creation
 * 2. Velocity settlement checker
 * 3. Auto-payout processor
 * 4. Payout status verifier
 */

import { Job } from 'bullmq';
import mongoose from 'mongoose';
import QueueManager from '../../utilities/queue-manager';
import logger from '../../../shared/logger/winston.logger';
import CODRemittanceService from '../../../core/application/services/finance/cod-remittance.service';
import { Company } from '../../../infrastructure/database/mongoose/models';
import CODRemittance, { ICODRemittance } from '../../../infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model';

interface CODRemittanceJobData {
    type: 'daily_batch' | 'check_settlements' | 'process_payouts' | 'verify_payouts';
}

export class CODRemittanceJob {
    private static readonly QUEUE_NAME = 'cod-remittance';

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 1,
        });

        logger.info('COD remittance worker initialized');
    }

    /**
     * Process job
     */
    private static async processJob(job: Job<CODRemittanceJobData>): Promise<any> {
        const { type } = job.data;

        logger.info('Processing COD remittance job', {
            jobId: job.id,
            type,
        });

        try {
            switch (type) {
                case 'daily_batch':
                    await this.runDailyBatchCreation();
                    break;

                case 'check_settlements':
                    await this.runSettlementCheck();
                    break;

                case 'process_payouts':
                    await this.runAutoPayouts();
                    break;

                case 'verify_payouts':
                    await this.runPayoutVerification();
                    break;

                default:
                    logger.warn('Unknown job type', { type });
            }

            return { success: true };
        } catch (error: any) {
            logger.error('COD remittance job failed', {
                jobId: job.id,
                type,
                error: error.message,
            });

            throw error;
        }
    }

    /**
     * Create daily remittance batches for all eligible companies
     */
    private static async runDailyBatchCreation(): Promise<void> {
        logger.info('Starting daily remittance batch creation');

        // Find companies with 'daily' schedule or default
        // For MVP, we iterate all active companies with eligible shipments
        // In phases, we can filter by schedule preference

        // This approach scales poorly but fits MVP
        const companies = await Company.find({ isActive: true, isDeleted: false }).select('_id');

        let created = 0;
        let skipped = 0;

        for (const company of companies) {
            try {
                // Check if they have eligible shipments for today
                const eligible = await CODRemittanceService.getEligibleShipments(
                    company._id.toString(),
                    new Date()
                );

                if (eligible.summary.totalShipments > 0) {
                    await CODRemittanceService.createRemittanceBatch(
                        company._id.toString(),
                        'scheduled',
                        new Date(),
                        'system'
                    );
                    created++;
                } else {
                    skipped++;
                }
            } catch (error: any) {
                if (error.code !== 'RES_REMITTANCE_NOT_FOUND') {
                    logger.error(`Failed to create batch for company ${company._id}:`, error);
                }
                skipped++;
            }
        }

        logger.info(`Daily batch run completed: ${created} created, ${skipped} skipped`);
    }

    /**
     * Check for mock settlement logic
     */
    private static async runSettlementCheck(): Promise<void> {
        // In real integration, pull from Velocity API
        // Here we just log
        logger.info('Running settlement checker (Mock)');
    }

    /**
     * Process auto-payouts for approved remittances
     */
    private static async runAutoPayouts(): Promise<void> {
        const approvedRemittances = await CODRemittance.find({
            status: 'approved',
            'payout.status': 'pending'
        }).limit(50); // Batch size

        logger.info(`Processing ${approvedRemittances.length} approved remittances for payout`);

        for (const rem of approvedRemittances) {
            try {
                // If company has auto-payout enabled
                // For MVP, assume manual approval was the gate, so initiate now
                await CODRemittanceService.initiatePayout(rem.remittanceId);
            } catch (error) {
                logger.error(`Failed auto-payout for ${rem.remittanceId}`, error);
            }
        }
    }

    /**
     * Verify pending payouts status
     */
    private static async runPayoutVerification(): Promise<void> {
        const pendingPayouts = await CODRemittance.find({
            'payout.status': 'processing'
        }).limit(50);

        for (const rem of pendingPayouts) {
            // Call Razorpay API to check status if not updated via webhook
            // Mock implementation
            logger.info(`Verifying payout status for ${rem.remittanceId}`);
        }
    }

    /**
     * Queue Daily Batch Job
     */
    static async queueDailyBatch(): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            'daily-batch',
            { type: 'daily_batch' },
            {
                jobId: `daily-batch-${new Date().toISOString().slice(0, 10)}`,
                removeOnComplete: true
            }
        );
    }

    /**
     * Queue Auto Payout Job
     */
    static async queueAutoPayouts(): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            'auto-payouts',
            { type: 'process_payouts' },
            { removeOnComplete: true }
        );
    }
}

export default CODRemittanceJob;
