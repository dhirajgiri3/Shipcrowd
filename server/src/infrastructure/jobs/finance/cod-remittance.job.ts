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
import FeatureFlagService from '../../../core/application/services/system/feature-flags.service';
import MockDataService from '../../../core/application/services/system/mock-data.service';

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
     * Check settlement status from Velocity
     * Supports both real API and mark mode via feature flag
     */
    private static async runSettlementCheck(): Promise<void> {
        const useRealAPI = FeatureFlagService.useRealVelocityAPI();

        logger.info('Running Velocity settlement checker', {
            mode: useRealAPI ? 'REAL' : 'MOCK'
        });

        // Query pending remittances awaiting settlement
        const pendingRemittances = await CODRemittance.find({
            status: 'processing',
            'payout.razorpayPayoutId': { $exists: true },
            'settlement.status': { $in: ['pending', null] }
        }).limit(50);

        logger.info(`Found ${pendingRemittances.length} remittances to check`);

        for (const remittance of pendingRemittances) {
            try {
                let settlementData;

                if (useRealAPI) {
                    // REAL API MODE - Call actual Velocity API
                    settlementData = await this.fetchVelocitySettlement(remittance.remittanceId);
                } else {
                    // MOCK MODE - Simulate settlement check
                    await MockDataService.simulateDelay(
                        FeatureFlagService.getMockConfig().settlementDelayMs
                    );

                    settlementData = MockDataService.generateSettlement(
                        remittance.remittanceId,
                        remittance.financial.netPayable
                    );
                }

                // Update remittance based on settlement status
                if (settlementData.status === 'settled' && remittance.payout.razorpayPayoutId) {
                    await CODRemittanceService.handlePayoutWebhook(
                        remittance.payout.razorpayPayoutId!, // Non-null assertion - already checked above
                        'completed'
                    );

                    logger.info('Settlement confirmed', {
                        remittanceId: remittance.remittanceId,
                        settlementId: settlementData.settlementId,
                        utr: settlementData.utr,
                        mode: useRealAPI ? 'REAL' : 'MOCK'
                    });
                }
            } catch (error: any) {
                logger.error(`Settlement check failed for ${remittance.remittanceId}`, {
                    error: error.message,
                    mode: useRealAPI ? 'REAL' : 'MOCK'
                });
            }
        }
    }

    /**
     * Fetch settlement from Velocity API (Real mode only)
     * TODO: Implement when Velocity settlement API is ready
     */
    private static async fetchVelocitySettlement(remittanceId: string): Promise<any> {
        // TODO: Replace with actual Velocity API call
        // Example implementation:
        // const velocityClient = new VelocityAPIClient();
        // const settlement = await velocityClient.getSettlement(remittanceId);
        // return settlement;

        throw new Error('Velocity settlement API not yet implemented - use mock mode (set USE_REAL_VELOCITY_API=false)');
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
     * Verify payout status from Razorpay
     * Supports both real API and mock mode via feature flag
     */
    private static async runPayoutVerification(): Promise<void> {
        const useRealAPI = FeatureFlagService.useRealRazorpayAPI();

        logger.info('Running payout verification', {
            mode: useRealAPI ? 'REAL' : 'MOCK'
        });

        const pendingPayouts = await CODRemittance.find({
            'payout.status': 'processing',
            'payout.razorpayPayoutId': { $exists: true }
        }).limit(50);

        logger.info(`Found ${pendingPayouts.length} payouts to verify`);

        for (const remittance of pendingPayouts) {
            try {
                let payoutStatus;

                if (useRealAPI) {
                    // REAL API MODE - Call actual Razorpay API
                    payoutStatus = await this.fetchRazorpayPayoutStatus(
                        remittance.payout.razorpayPayoutId! // Non-null: query filters for existence
                    );
                } else {
                    // MOCK MODE - Simulate payout status check
                    await MockDataService.simulateDelay(1000);

                    payoutStatus = MockDataService.generatePayoutStatus(
                        remittance.payout.razorpayPayoutId! // Non-null: query filters for existence
                    );
                }

                // Update remittance based on payout status
                if (payoutStatus.status === 'processed') {
                    remittance.payout.status = 'completed';
                    remittance.payout.processedAt = new Date();
                    remittance.payout.completedAt = new Date();
                    remittance.status = 'paid'; // Correct enum value
                    await remittance.save();

                    logger.info('Payout verified as processed', {
                        remittanceId: remittance.remittanceId,
                        utr: payoutStatus.utr,
                        mode: useRealAPI ? 'REAL' : 'MOCK'
                    });
                } else if (payoutStatus.status === 'failed') {
                    remittance.payout.status = 'failed';
                    remittance.payout.failureReason = payoutStatus.failure_reason;
                    remittance.status = 'failed'; // Correct enum value
                    await remittance.save();

                    logger.error('Payout failed', {
                        remittanceId: remittance.remittanceId,
                        reason: payoutStatus.failure_reason,
                        mode: useRealAPI ? 'REAL' : 'MOCK'
                    });
                }
            } catch (error: any) {
                logger.error(`Payout verification failed for ${remittance.remittanceId}`, {
                    error: error.message,
                    mode: useRealAPI ? 'REAL' : 'MOCK'
                });
            }
        }
    }

    /**
     * Fetch payout status from Razorpay API (Real mode only)
     * TODO: Implement when Razorpay payout status API is ready
     */
    private static async fetchRazorpayPayoutStatus(razorpayPayoutId: string): Promise<any> {
        // TODO: Replace with actual Razorpay API call
        // Example implementation:
        // const razorpay = new Razorpay({
        //     key_id: process.env.RAZORPAY_KEY_ID,
        //     key_secret: process.env.RAZORPAY_KEY_SECRET
        // });
        // const payout = await razorpay.payouts.fetch(razorpayPayoutId);
        // return payout;

        throw new Error('Razorpay payout verification API not yet implemented - use mock mode (set USE_REAL_RAZORPAY_API=false)');
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
