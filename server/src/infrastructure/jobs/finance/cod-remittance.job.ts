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
     *
     * NOTE:
     * - This method is only called when FeatureFlagService.useRealVelocityAPI() === true
     * - On any error, the caller will log and continue without crashing the worker
     */
    private static async fetchVelocitySettlement(remittanceId: string): Promise<{
        status: string;
        settlementId?: string;
        utr?: string;
        settledAmount?: number;
        settledAt?: Date;
        bankDetails?: unknown;
    }> {
        try {
            const { VelocityShipfastProvider } = await import(
                '../../../infrastructure/external/couriers/velocity/velocity-shipfast.provider.js'
            );

            // Get company ID from remittance (need to fetch remittance to get companyId)
            const remittance = await CODRemittance.findOne({ remittanceId }).select('companyId');
            if (!remittance) {
                throw new Error(`Remittance not found: ${remittanceId}`);
            }

            const velocityClient = new VelocityShipfastProvider(remittance.companyId);
            const settlement = await velocityClient.getSettlementStatus(remittanceId);

            return {
                status: settlement.status,
                settlementId: settlement.settlement_id,
                utr: settlement.utr_number,
                settledAmount: settlement.settled_amount,
                settledAt: settlement.settled_at ? new Date(settlement.settled_at) : undefined,
                bankDetails: settlement.bank_details
            };
        } catch (error: any) {
            // Check if error is 404 (Settlement not found) - Treat as pending
            if (error.statusCode === 404 || error.message.includes('not found')) {
                return { status: 'pending' };
            }

            logger.error('Velocity settlement API call failed', {
                remittanceId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
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
                    const payoutId = remittance.payout.razorpayPayoutId;
                    if (!payoutId) {
                        logger.warn('Skipping payout verification: No Payout ID', { remittanceId: remittance.remittanceId });
                        continue;
                    }

                    payoutStatus = await this.fetchRazorpayPayoutStatus(payoutId);
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
                    remittance.payout.failureReason = payoutStatus.failure_reason || undefined;
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
     *
     * NOTE:
     * - This method is only called when FeatureFlagService.useRealRazorpayAPI() === true
     * - On any error, the caller will log and continue without crashing the worker
     */
    private static async fetchRazorpayPayoutStatus(razorpayPayoutId: string): Promise<{
        status: string;
        utr?: string;
        failure_reason?: string;
        reversed_at?: Date | null;
        amount?: number;
        fees?: number;
        tax?: number;
    }> {
        try {
            // Fix: Cast imported module default to any to avoid "not constructable" TS error
            const RazorpayPayoutProviderClass = (await import(
                '../../../infrastructure/payment/razorpay/RazorpayPayoutProvider.js'
            )).default as any;

            const razorpayClient = new RazorpayPayoutProviderClass();
            const payout = await razorpayClient.getPayoutStatus(razorpayPayoutId);

            return {
                status: payout.status,
                utr: payout.utr || undefined,
                failure_reason: payout.failure_reason,
                // Razorpay payout object may include these fields; we keep them optional
                reversed_at: (payout as any).reversed_at
                    ? new Date((payout as any).reversed_at)
                    : null,
                amount: (payout as any).amount,
                fees: (payout as any).fees,
                tax: (payout as any).tax
            };
        } catch (error: any) {
            logger.error('Razorpay payout status API call failed', {
                razorpayPayoutId,
                error: error.message,
                stack: error.stack
            });
            throw error;
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
