/**
 * Payouts Seeder
 * 
 * Generates Payout records from Commission Transactions.
 * Aligns with production PayoutProcessingService logic:
 * - Groups approved commission transactions by sales representative
 * - Creates Payout records for each group
 * - Updates transactions with payoutBatch reference
 */

import mongoose from 'mongoose';
import Payout from '../../mongoose/models/finance/payouts/payout.model';
import CommissionTransaction from '../../mongoose/models/finance/commission/commission-transaction.model';
import SalesRepresentative from '../../mongoose/models/crm/sales/sales-representative.model';
import { logger, createTimer } from '../utils/logger.utils';
import { randomInt, selectRandom } from '../utils/random.utils';
import { subDays } from '../utils/date.utils';

// Payout status distribution
const PAYOUT_STATUS_DISTRIBUTION = {
    pending: 20,
    processing: 15,
    completed: 60,
    failed: 5,
};

/**
 * Select status based on distribution
 */
function selectPayoutStatus(): string {
    const rand = Math.random() * 100;
    let cumulative = 0;

    for (const [status, weight] of Object.entries(PAYOUT_STATUS_DISTRIBUTION)) {
        cumulative += weight;
        if (rand <= cumulative) {
            return status;
        }
    }

    return 'completed';
}

export async function seedPayouts(): Promise<void> {
    const timer = createTimer();
    logger.step(27, 'Seeding Payouts from Commission Transactions');

    try {
        // Find approved commission transactions that are NOT already in a payout batch
        const eligibleTransactions = await CommissionTransaction.find({
            status: 'approved',
            payoutBatch: null,
            isDeleted: false,
        })
            .populate('salesRepresentative')
            .populate('company')
            .lean();

        if (eligibleTransactions.length === 0) {
            logger.warn('No eligible commission transactions found. Skipping payouts seeder.');
            return;
        }

        // Group transactions by sales representative
        const transactionsBySalesRep = new Map<string, any[]>();

        for (const transaction of eligibleTransactions) {
            const txn = transaction as any;
            const salesRepId = txn.salesRepresentative?._id?.toString();

            if (!salesRepId) {
                logger.warn(`Transaction ${txn._id} has no sales representative, skipping`);
                continue;
            }

            if (!transactionsBySalesRep.has(salesRepId)) {
                transactionsBySalesRep.set(salesRepId, []);
            }

            transactionsBySalesRep.get(salesRepId)!.push(txn);
        }

        logger.info(`Grouped ${eligibleTransactions.length} transactions across ${transactionsBySalesRep.size} sales representatives`);

        const payouts: any[] = [];
        const transactionUpdates: any[] = [];

        // Create payout for each sales representative
        for (const [salesRepId, transactions] of transactionsBySalesRep.entries()) {
            const firstTxn = transactions[0];
            const salesRep = firstTxn.salesRepresentative;
            const company = firstTxn.company;

            // Validate relationships
            if (!salesRep || !salesRep._id) {
                logger.warn(`Skipping payout for sales rep ${salesRepId} - invalid sales representative object`);
                continue;
            }

            if (!company || !company._id) {
                logger.warn(`Skipping payout for sales rep ${salesRepId} - invalid company object`);
                continue;
            }

            // Calculate amounts
            const totalAmount = transactions.reduce((sum, t) => sum + (t.finalAmount || 0), 0);

            // Apply TDS (0-2% randomly for seeding purposes)
            const tdsRate = Math.random() > 0.7 ? randomInt(0, 2) : 0;
            const tdsDeducted = tdsRate > 0 ? Math.round((totalAmount * tdsRate) / 100) : 0;
            const netAmount = totalAmount - tdsDeducted;

            if (netAmount <= 0) {
                logger.warn(`Skipping payout for sales rep ${salesRepId} - net amount is ${netAmount}`);
                continue;
            }

            // Generate payout ID
            const timestamp = Date.now().toString(36).toUpperCase();
            const random = Math.random().toString(36).substring(2, 7).toUpperCase();
            const payoutId = `PAY-${timestamp}-${random}`;
            const payoutObjectId = new mongoose.Types.ObjectId();

            // Determine status
            const status = selectPayoutStatus();
            const createdAt = subDays(new Date(), randomInt(1, 30));

            // Create payout record
            const payoutData: any = {
                _id: payoutObjectId,
                payoutId,
                company: company._id,
                salesRepresentative: salesRep._id,
                payoutType: 'commission',
                commissionTransactions: transactions.map(t => t._id),
                totalAmount,
                tdsDeducted,
                netAmount,
                status,
                payoutDate: createdAt,
                metadata: {
                    source: 'commission_payout_seeder',
                    transactionCount: transactions.length,
                    salesRepName: salesRep.user?.name || 'Unknown',
                },
                createdAt,
                updatedAt: createdAt,
            };

            // Add status-specific fields
            if (['processing', 'completed', 'failed'].includes(status)) {
                // Add Razorpay mock data
                const razorpayPayoutId = `payout_${Math.random().toString(36).substring(2, 15)}`;
                payoutData.razorpay = {
                    payoutId: razorpayPayoutId,
                    fundAccountId: salesRep.razorpayFundAccountId || `fa_${Math.random().toString(36).substring(2, 15)}`,
                    status: status === 'completed' ? 'processed' : status,
                };
            }

            if (status === 'completed') {
                payoutData.processedAt = new Date(createdAt.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000);
                payoutData.razorpay.utr = `UTR${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
            }

            if (status === 'failed') {
                payoutData.failedAt = new Date(createdAt.getTime() + randomInt(1, 3) * 24 * 60 * 60 * 1000);
                payoutData.razorpay.failureReason = selectRandom([
                    'Insufficient balance',
                    'Invalid bank account',
                    'Transaction declined by bank',
                    'Account frozen',
                ]);
                payoutData.retryCount = randomInt(1, 3);
            }

            payouts.push(payoutData);

            // Prepare transaction updates to link them to this payout
            for (const txn of transactions) {
                transactionUpdates.push({
                    updateOne: {
                        filter: { _id: txn._id },
                        update: {
                            $set: {
                                payoutBatch: payoutObjectId,
                            }
                        },
                    },
                });
            }
        }

        // Insert payouts
        if (payouts.length > 0) {
            await Payout.insertMany(payouts);

            // Update transactions with payout batch references
            if (transactionUpdates.length > 0) {
                await CommissionTransaction.bulkWrite(transactionUpdates);
            }

            logger.complete('Payouts', payouts.length, timer.elapsed());
            logger.table({
                'Total Payouts': payouts.length,
                'Total Transactions': eligibleTransactions.length,
                'Sales Representatives': transactionsBySalesRep.size,
            });
        } else {
            logger.warn('No payouts created - all transactions had invalid amounts');
        }

    } catch (error) {
        logger.error('Failed to seed payouts:', error);
        throw error;
    }
}
