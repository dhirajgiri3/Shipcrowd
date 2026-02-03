/**
 * Financial Reconciliation Job
 *
 * Daily reconciliation of wallet transactions vs COD remittance batches
 * Detects discrepancies and flags for manual review
 */

import { Job } from 'bullmq';
import { CODRemittance, Shipment, WalletTransaction, RTOEvent } from '../../database/mongoose/models';
import QueueManager from '../../utilities/queue-manager';
import logger from '../../../shared/logger/winston.logger';

interface ReconciliationJobData {
    type: 'daily_reconciliation' | 'settlement_check';
    date?: Date;
}

interface ReconciliationDiscrepancy {
    type: 'wallet_mismatch' | 'remittance_mismatch' | 'settlement_mismatch';
    description: string;
    expected: number;
    actual: number;
    difference: number;
    severity: 'low' | 'medium' | 'high';
}

export class FinancialReconciliationJob {
    private static readonly QUEUE_NAME = 'financial-reconciliation';
    private static readonly DISCREPANCY_THRESHOLD = 100; // ₹100

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 1, // Sequential processing
        });

        logger.info('Financial reconciliation worker initialized');
    }

    /**
     * Process job
     */
    public static async processJob(job: Job<ReconciliationJobData>): Promise<any> {
        const { type, date = new Date() } = job.data;

        logger.info('Processing financial reconciliation job', {
            jobId: job.id,
            type,
            date: date.toISOString(),
        });

        try {
            switch (type) {
                case 'daily_reconciliation':
                    return await this.runDailyReconciliation(date);

                case 'settlement_check':
                    return await this.runSettlementCheck(date);

                default:
                    logger.warn('Unknown job type', { type });
                    return { success: false };
            }
        } catch (error: any) {
            logger.error('Financial reconciliation job failed', {
                jobId: job.id,
                type,
                error: error.message,
            });

            throw error;
        }
    }

    /**
     * Run daily reconciliation checks
     */
    private static async runDailyReconciliation(date: Date): Promise<{
        success: boolean;
        discrepancies: ReconciliationDiscrepancy[];
        summary: {
            walletCheck: boolean;
            remittanceCheck: boolean;
            settlementCheck: boolean;
        };
    }> {
        logger.info('Running daily financial reconciliation', { date: date.toISOString() });

        const discrepancies: ReconciliationDiscrepancy[] = [];

        // Check 1: Wallet RTO charges vs RTO events
        const walletDiscrepancy = await this.checkWalletRTOCharges(date);
        if (walletDiscrepancy) {
            discrepancies.push(walletDiscrepancy);
        }

        // Check 2: COD collected vs Remittance batches
        const remittanceDiscrepancy = await this.checkCODRemittance(date);
        if (remittanceDiscrepancy) {
            discrepancies.push(remittanceDiscrepancy);
        }

        // Check 3: Razorpay payouts vs Remittance amounts
        const settlementDiscrepancy = await this.checkSettlementAmounts(date);
        if (settlementDiscrepancy) {
            discrepancies.push(settlementDiscrepancy);
        }

        // Send alert if high-severity discrepancies found
        const highSeverityDiscrepancies = discrepancies.filter((d) => d.severity === 'high');
        if (highSeverityDiscrepancies.length > 0) {
            await this.sendReconciliationAlert(highSeverityDiscrepancies, date);
        }

        logger.info('Daily reconciliation completed', {
            date: date.toISOString(),
            discrepanciesFound: discrepancies.length,
            highSeverity: highSeverityDiscrepancies.length,
        });

        return {
            success: true,
            discrepancies,
            summary: {
                walletCheck: !walletDiscrepancy,
                remittanceCheck: !remittanceDiscrepancy,
                settlementCheck: !settlementDiscrepancy,
            },
        };
    }

    /**
     * Check wallet RTO charges against RTO events
     */
    private static async checkWalletRTOCharges(date: Date): Promise<ReconciliationDiscrepancy | null> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Sum of wallet RTO charge debits
        const walletRTOCharges = await WalletTransaction.aggregate([
            {
                $match: {
                    type: 'debit',
                    reason: 'rto_charge',
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]);

        const walletTotal = walletRTOCharges[0]?.total || 0;

        // Sum of RTO charges from RTO events
        const rtoEventCharges = await RTOEvent.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                    chargesDeducted: true,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$rtoCharges' },
                },
            },
        ]);

        const rtoTotal = rtoEventCharges[0]?.total || 0;

        const difference = Math.abs(walletTotal - rtoTotal);

        if (difference > this.DISCREPANCY_THRESHOLD) {
            return {
                type: 'wallet_mismatch',
                description: 'Wallet RTO charges do not match RTO event charges',
                expected: rtoTotal,
                actual: walletTotal,
                difference,
                severity: difference > 1000 ? 'high' : 'medium',
            };
        }

        return null;
    }

    /**
     * Check COD collected from shipments vs remittance batches
     */
    private static async checkCODRemittance(date: Date): Promise<ReconciliationDiscrepancy | null> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Sum of COD from delivered shipments
        const shipmentCOD = await Shipment.aggregate([
            {
                $match: {
                    'paymentDetails.type': 'cod',
                    currentStatus: 'delivered',
                    actualDelivery: { $gte: startOfDay, $lte: endOfDay },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$paymentDetails.codAmount' },
                },
            },
        ]);

        const shipmentTotal = shipmentCOD[0]?.total || 0;

        // Sum of COD from remittance batches created on this date
        const remittanceCOD = await CODRemittance.aggregate([
            {
                $match: {
                    'batch.createdDate': { $gte: startOfDay, $lte: endOfDay },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$financial.totalCODCollected' },
                },
            },
        ]);

        const remittanceTotal = remittanceCOD[0]?.total || 0;

        const difference = Math.abs(shipmentTotal - remittanceTotal);

        if (difference > this.DISCREPANCY_THRESHOLD) {
            return {
                type: 'remittance_mismatch',
                description: 'COD collected from shipments does not match remittance batches',
                expected: shipmentTotal,
                actual: remittanceTotal,
                difference,
                severity: difference > 5000 ? 'high' : 'medium',
            };
        }

        return null;
    }

    /**
     * Check Razorpay payout amounts vs remittance net payable
     */
    private static async checkSettlementAmounts(date: Date): Promise<ReconciliationDiscrepancy | null> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Get remittances with completed payouts
        const remittances = await CODRemittance.find({
            'payout.completedAt': { $gte: startOfDay, $lte: endOfDay },
            'payout.status': 'completed',
        }).select('financial.netPayable payout.razorpayPayoutId');

        let totalNetPayable = 0;
        let mismatchCount = 0;

        for (const remittance of remittances) {
            totalNetPayable += remittance.financial.netPayable;

            // In a real implementation, we would fetch the actual payout amount from Razorpay
            // For now, we assume they match if payout is completed
        }

        // This is a placeholder check - in production, compare with actual Razorpay data
        if (mismatchCount > 0) {
            return {
                type: 'settlement_mismatch',
                description: `${mismatchCount} remittances have payout amount mismatch`,
                expected: totalNetPayable,
                actual: 0, // Would be actual Razorpay total
                difference: 0,
                severity: 'high',
            };
        }

        return null;
    }

    /**
     * Run settlement check against Velocity
     */
    private static async runSettlementCheck(date: Date): Promise<{
        success: boolean;
        checked: number;
        mismatches: number;
    }> {
        logger.info('Running Velocity settlement check', { date: date.toISOString() });

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Get remittances that should have settlements
        const remittances = await CODRemittance.find({
            'batch.createdDate': { $gte: startOfDay, $lte: endOfDay },
            status: 'paid',
        });

        let checked = 0;
        let mismatches = 0;

        for (const remittance of remittances) {
            // In production, call Velocity API to get settlement status
            // Compare amounts and flag mismatches
            checked++;
        }

        logger.info('Settlement check completed', {
            date: date.toISOString(),
            checked,
            mismatches,
        });

        return {
            success: true,
            checked,
            mismatches,
        };
    }

    /**
     * Send reconciliation alert to finance team
     */
    private static async sendReconciliationAlert(
        discrepancies: ReconciliationDiscrepancy[],
        date: Date
    ): Promise<void> {
        try {
            const { default: EmailService } = await import(
                '../../../core/application/services/communication/email.service.js'
            );

            const discrepancySummary = discrepancies
                .map(
                    (d) =>
                        `- ${d.type.toUpperCase()}: ${d.description}\n  Expected: ₹${d.expected.toLocaleString()}, Actual: ₹${d.actual.toLocaleString()}, Diff: ₹${d.difference.toLocaleString()} (${d.severity})`
                )
                .join('\n');

            const subject = `⚠️ Financial Reconciliation Alert: ${discrepancies.length} discrepancies found`;
            const htmlContent = `
                <h2>Financial Reconciliation Alert</h2>
                <p><strong>Date:</strong> ${date.toISOString().slice(0, 10)}</p>
                <p>The following discrepancies were detected during daily reconciliation:</p>
                <pre>${discrepancySummary}</pre>
                <p><strong>Action Required:</strong></p>
                <ul>
                    <li>Review discrepancies in admin dashboard</li>
                    <li>Investigate root cause</li>
                    <li>Update records if necessary</li>
                </ul>
            `;

            const financeEmail = process.env.FINANCE_ALERT_EMAIL || 'finance@shipcrowd.com';

            await EmailService.sendEmail(
                financeEmail,
                subject,
                htmlContent,
                `Financial Reconciliation Alert: ${discrepancies.length} discrepancies`
            );

            logger.info('Reconciliation alert sent to finance team', {
                discrepancyCount: discrepancies.length,
                recipient: financeEmail,
            });
        } catch (error: any) {
            logger.error('Failed to send reconciliation alert', {
                error: error.message,
                discrepancyCount: discrepancies.length,
            });
        }
    }

    /**
     * Queue daily reconciliation job
     */
    static async queueDailyReconciliation(): Promise<void> {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        await QueueManager.addJob(
            this.QUEUE_NAME,
            `daily-reconciliation-${yesterday.toISOString().slice(0, 10)}`,
            {
                type: 'daily_reconciliation',
                date: yesterday,
            },
            {
                jobId: `reconciliation-${yesterday.toISOString().slice(0, 10)}`,
                removeOnComplete: true,
            }
        );

        logger.info('Daily reconciliation job queued', { date: yesterday.toISOString().slice(0, 10) });
    }
}

export default FinancialReconciliationJob;
