import { Job } from 'bullmq';
import mongoose from 'mongoose';
import { Company, WalletTransaction } from '../../database/mongoose/models';
import logger from '../../../shared/logger/winston.logger';

/**
 * Wallet Reconciliation Job
 * 
 * Purpose:
 * Runs periodically (e.g., nightly) to assert that:
 * Company.wallet.balance == Sum(Credit Tx) - Sum(Debit Tx)
 * 
 * Logic:
 * 1. Iterates through all active companies.
 * 2. Aggregates all 'completed' wallet transactions.
 * 3. Compares calculated balance with stored balance.
 * 4. Logs/Alerts on mismatches.
 */
export const walletReconciliationProcessor = async (job: Job) => {
    logger.info('Starting Wallet Reconciliation Job...');
    const session = await mongoose.startSession();

    try {
        const companies = await Company.find({ isDeleted: false }).select('_id wallet.balance name');
        let checkedCount = 0;
        let mismatchCount = 0;

        for (const company of companies) {
            checkedCount++;
            const companyId = company._id;
            const storedBalance = company.wallet?.balance || 0;

            // Aggregation: Calculate true balance from ledger
            // Refinement 2: Filter by status='completed'
            const aggregation = await WalletTransaction.aggregate([
                {
                    $match: {
                        company: companyId,
                        status: 'completed',
                        isDeleted: false
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalCredits: {
                            $sum: {
                                $cond: [{ $in: ['$type', ['credit', 'refund']] }, '$amount', 0]
                            }
                        },
                        totalDebits: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0]
                            }
                        }
                    }
                }
            ]);

            const result = aggregation[0] || { totalCredits: 0, totalDebits: 0 };
            const calculatedBalance = Math.round((result.totalCredits - result.totalDebits) * 100) / 100;

            // Compare with tolerance (floating point safety)
            const diff = Math.abs(storedBalance - calculatedBalance);

            if (diff > 0.01) {
                mismatchCount++;
                logger.error('CRITICAL: Wallet Balance Mismatch Detected', {
                    companyId,
                    companyName: company.name,
                    storedBalance,
                    calculatedBalance,
                    diff,
                    ledgerSummary: result
                });

                // TODO: Trigger Email Alert to Finance Ops
            }
        }

        logger.info('Wallet Reconciliation Job Completed', {
            checkedCount,
            mismatchCount,
            status: mismatchCount > 0 ? 'Passed with Warnings' : 'Passed Successfully'
        });

        return { checkedCount, mismatchCount };

    } catch (error) {
        logger.error('Wallet Reconciliation Job Failed', error);
        throw error;
    } finally {
        await session.endSession();
    }
};
